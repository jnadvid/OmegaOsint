/**
 * Proveedores de enriquecimiento OSINT.
 *
 * Cada proveedor declara:
 *   - id, label
 *   - requiresProxy: si necesita el proxy local (CORS / clave)
 *   - appliesTo(identifier): devuelve un valor "verdadero" si tiene algo que
 *     hacer con este identificador (típicamente el dato a consultar)
 *   - async run(identifier, ctx): devuelve un array de findings
 *
 * Se priorizan fuentes gratuitas y sin clave. Las que el navegador no puede
 * tocar por CORS (verificación de usuarios) se delegan al proxy local.
 */
import { fetchJSON, proxyJSON } from './proxy.js';
import {
  cleanHandle,
  getEmails,
  getPersonName,
  getPhones,
  getPlatform,
  getUsername,
  getVin,
} from './extract.js';
import { PLATFORMS, CROSS_CHECK_SITES } from './platforms.js';
import { classifyEmailDomain } from './emailData.js';

// --- Helpers de findings -----------------------------------------------------

export const SEVERITY = { INFO: 'info', GOOD: 'good', WARN: 'warn' };

let seq = 0;
function finding({
  providerId,
  providerLabel,
  kind,
  title,
  detail = '',
  url = null,
  severity = SEVERITY.INFO,
  confidence = 'lead',
}) {
  return {
    id: `f_${Date.now().toString(36)}_${(seq++).toString(36)}`,
    providerId,
    providerLabel,
    kind, // 'profile' | 'account' | 'breach' | 'attribute' | 'avatar' | 'pivot'
    title,
    detail,
    url,
    severity,
    confidence, // 'confirmed' | 'likely' | 'lead'
  };
}

// --- Helpers de navegador ----------------------------------------------------

/** ¿Existe la imagen en esa URL? (carga vía <img>, evita el bloqueo CORS) */
function imageExists(url, timeout = 7000) {
  return new Promise((resolve) => {
    const img = new Image();
    const done = (v) => {
      clearTimeout(t);
      img.onload = img.onerror = null;
      resolve(v);
    };
    const t = setTimeout(() => done(false), timeout);
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = url;
  });
}

/** JSONP: para endpoints (como Gravatar) que no envían cabeceras CORS. */
function jsonp(url, timeout = 7000) {
  return new Promise((resolve, reject) => {
    const cb = `__osint_jsonp_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const cleanup = () => {
      delete window[cb];
      script.remove();
      clearTimeout(t);
    };
    const t = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, timeout);
    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('JSONP error'));
    };
    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${cb}`;
    document.body.appendChild(script);
  });
}

/** SHA-256 hex (Gravatar acepta SHA-256 del correo, sin necesidad de MD5). */
async function sha256hex(text) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// --- Proveedor: Gravatar (correo) -------------------------------------------
// Gratis, sin clave. Detecta avatar y, sobre todo, perfil público con cuentas
// sociales vinculadas — oro puro para pivotar.

const gravatar = {
  id: 'gravatar',
  label: 'Gravatar',
  requiresProxy: false,
  appliesTo: (idf) => getEmails(idf)[0] ?? false,
  async run(idf) {
    const out = [];
    const email = getEmails(idf)[0];
    if (!email) return out;
    const hash = await sha256hex(email.trim().toLowerCase());
    const profileUrl = `https://www.gravatar.com/${hash}`;

    // 1) ¿Tiene avatar? (d=404 → 404 si no existe)
    const hasAvatar = await imageExists(
      `https://www.gravatar.com/avatar/${hash}?d=404&s=80`,
    );
    if (hasAvatar) {
      out.push(
        finding({
          providerId: 'gravatar',
          providerLabel: 'Gravatar',
          kind: 'avatar',
          title: 'Avatar de Gravatar encontrado',
          detail: email,
          url: `${profileUrl}.json`,
          severity: SEVERITY.GOOD,
          confidence: 'confirmed',
        }),
      );
    }

    // 2) Perfil público (JSONP) con cuentas vinculadas.
    try {
      const data = await jsonp(`${profileUrl}.json`);
      const entry = data?.entry?.[0];
      if (entry) {
        const name =
          entry.displayName || entry.name?.formatted || entry.preferredUsername;
        if (name) {
          out.push(
            finding({
              providerId: 'gravatar',
              providerLabel: 'Gravatar',
              kind: 'profile',
              title: `Perfil: ${name}`,
              detail: entry.currentLocation || entry.aboutMe || '',
              url: entry.profileUrl || profileUrl,
              severity: SEVERITY.GOOD,
              confidence: 'confirmed',
            }),
          );
        }
        for (const acc of entry.accounts ?? []) {
          out.push(
            finding({
              providerId: 'gravatar',
              providerLabel: 'Gravatar',
              kind: 'account',
              title: `${acc.shortname || acc.domain || 'Cuenta'}: ${acc.display || acc.username || ''}`,
              detail: acc.verified ? 'verificada' : '',
              url: acc.url,
              severity: SEVERITY.GOOD,
              confidence: acc.verified ? 'confirmed' : 'likely',
            }),
          );
        }
      }
    } catch {
      /* sin perfil público o JSONP bloqueado: no pasa nada */
    }
    return out;
  },
};

// --- Proveedor: Brechas de datos (correo) -----------------------------------
// XposedOrNot: API gratuita y sin clave. Se intenta desde el navegador; si CORS
// lo bloquea, el proxy hace de respaldo.

const breaches = {
  id: 'breaches',
  label: 'Brechas (XposedOrNot)',
  requiresProxy: false,
  appliesTo: (idf) => getEmails(idf)[0] ?? false,
  async run(idf, ctx) {
    const email = getEmails(idf)[0];
    if (!email) return [];

    const toFindings = (list) =>
      (list ?? []).map((name) =>
        finding({
          providerId: 'breaches',
          providerLabel: 'Brechas',
          kind: 'breach',
          title: name,
          detail: 'Correo expuesto en esta brecha',
          url: `https://xposedornot.com/xposed#${encodeURIComponent(name)}`,
          severity: SEVERITY.WARN,
          confidence: 'confirmed',
        }),
      );

    const parse = (data) => {
      // { "breaches": [[ "Site1", "Site2", ... ]] } o { Error: 'Not found' }
      if (data?.breaches?.[0]?.length) return toFindings(data.breaches[0]);
      return [];
    };

    // 1) Intento directo desde el navegador.
    try {
      const data = await fetchJSON(
        `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`,
      );
      return parse(data);
    } catch {
      /* CORS o 404: prueba el proxy */
    }
    // 2) Respaldo vía proxy local.
    if (ctx.proxy.available) {
      try {
        const data = await proxyJSON(
          ctx.proxy.url,
          `/enrich/breaches?email=${encodeURIComponent(email)}`,
        );
        return parse(data);
      } catch {
        /* nada */
      }
    }
    return [];
  },
};

// --- Proveedor: Teléfono (parsing local, sin red) ---------------------------

const TYPE_LABELS = {
  MOBILE: 'Móvil',
  FIXED_LINE: 'Fijo',
  FIXED_LINE_OR_MOBILE: 'Fijo o móvil',
  PREMIUM_RATE: 'Tarificación especial',
  TOLL_FREE: 'Gratuito',
  VOIP: 'VoIP',
  PERSONAL_NUMBER: 'Número personal',
  PAGER: 'Busca',
  UAN: 'UAN',
  VOICEMAIL: 'Buzón de voz',
};

const phoneParse = {
  id: 'phone',
  label: 'Análisis de teléfono',
  requiresProxy: false,
  appliesTo: (idf) => getPhones(idf)[0] ?? false,
  async run(idf) {
    const number = getPhones(idf)[0];
    if (!number) return [];
    // Import dinámico: solo se carga cuando hace falta.
    const { parsePhoneNumberFromString } = await import('libphonenumber-js');
    const country = String(idf.fields?.country ?? '').trim();
    const pn =
      parsePhoneNumberFromString(number) ||
      (country ? parsePhoneNumberFromString(number, country) : null);
    if (!pn) return [];
    const out = [];
    const add = (title, detail) =>
      out.push(
        finding({
          providerId: 'phone',
          providerLabel: 'Teléfono',
          kind: 'attribute',
          title,
          detail,
          severity: pn.isValid() ? SEVERITY.GOOD : SEVERITY.INFO,
          confidence: pn.isValid() ? 'confirmed' : 'likely',
        }),
      );
    add(
      pn.isValid() ? 'Número válido' : 'Formato reconocido',
      pn.formatInternational(),
    );
    if (pn.country) add('País', pn.country);
    if (pn.countryCallingCode) add('Prefijo', `+${pn.countryCallingCode}`);
    const type = pn.getType?.();
    if (type) add('Tipo de línea', TYPE_LABELS[type] ?? type);
    return out;
  },
};

// --- Proveedor: Decodificador de VIN (NHTSA vPIC, gratis y con CORS) ---------

const vinDecode = {
  id: 'vin',
  label: 'Decodificador VIN (NHTSA)',
  requiresProxy: false,
  appliesTo: (idf) => getVin(idf) || false,
  async run(idf) {
    const vin = getVin(idf);
    if (!vin) return [];
    try {
      const data = await fetchJSON(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`,
      );
      const r = data?.Results?.[0];
      if (!r) return [];
      const out = [];
      const pick = (label, value) => {
        if (value && String(value).trim()) {
          out.push(
            finding({
              providerId: 'vin',
              providerLabel: 'VIN',
              kind: 'attribute',
              title: label,
              detail: String(value),
              severity: SEVERITY.GOOD,
              confidence: 'confirmed',
            }),
          );
        }
      };
      pick('Marca', r.Make);
      pick('Modelo', r.Model);
      pick('Año', r.ModelYear);
      pick('Tipo', r.BodyClass || r.VehicleType);
      pick('Fabricante', r.Manufacturer);
      pick('Planta', [r.PlantCity, r.PlantCountry].filter(Boolean).join(', '));
      pick('Motor', [r.EngineCylinders && `${r.EngineCylinders} cil.`, r.DisplacementL && `${r.DisplacementL} L`, r.FuelTypePrimary].filter(Boolean).join(' · '));
      return out;
    } catch {
      return [];
    }
  },
};

// --- Proveedor: Perfiles de usuario (navegador, enlaces directos) -----------

const usernameProfiles = {
  id: 'username-profiles',
  label: 'Perfiles de usuario',
  requiresProxy: false,
  appliesTo: (idf) => getUsername(idf) || false,
  async run(idf) {
    const u = getUsername(idf);
    if (!u) return [];
    const out = [];
    const platform = getPlatform(idf);
    // 1) URL canónica de la propia plataforma.
    if (platform && PLATFORMS[platform]?.profile(u)) {
      out.push(
        finding({
          providerId: 'username-profiles',
          providerLabel: 'Perfil',
          kind: 'profile',
          title: `${PLATFORMS[platform].label}: @${u}`,
          url: PLATFORMS[platform].profile(u),
          severity: SEVERITY.GOOD,
          confidence: 'likely',
        }),
      );
    }
    // 2) El mismo handle en otras plataformas populares (pista para revisar).
    for (const site of CROSS_CHECK_SITES) {
      const url = site.url(u);
      if (!url) continue;
      out.push(
        finding({
          providerId: 'username-profiles',
          providerLabel: 'Mismo usuario',
          kind: 'pivot',
          title: `${site.name}: ${u}`,
          detail: 'Comprobar si existe',
          url,
          severity: SEVERITY.INFO,
          confidence: 'lead',
        }),
      );
    }
    return out;
  },
};

// --- Proveedor: Verificación real de usuarios (proxy, estilo WhatsMyName) ----

const usernameCheck = {
  id: 'username-check',
  label: 'Verificación de usuarios',
  requiresProxy: true,
  appliesTo: (idf) => getUsername(idf) || false,
  async run(idf, ctx) {
    const u = getUsername(idf);
    if (!u || !ctx.proxy.available) return [];
    try {
      const data = await proxyJSON(
        ctx.proxy.url,
        '/enrich/username',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u }),
        },
        45000,
      );
      return (data?.found ?? []).map((site) =>
        finding({
          providerId: 'username-check',
          providerLabel: 'Cuenta verificada',
          kind: 'account',
          title: `${site.name}: ${u}`,
          detail: 'Perfil existente (verificado)',
          url: site.url,
          severity: SEVERITY.GOOD,
          confidence: 'confirmed',
        }),
      );
    } catch {
      return [];
    }
  },
};

// --- Proveedor: GitHub (usuario) — perfil + correos de commits públicos -----
// api.github.com admite CORS y es gratis (límite por IP sin token).

const githubUser = {
  id: 'github',
  label: 'GitHub',
  requiresProxy: false,
  appliesTo: (idf) => getUsername(idf) || false,
  async run(idf) {
    const u = getUsername(idf);
    if (!u) return [];
    let user;
    try {
      user = await fetchJSON(`https://api.github.com/users/${encodeURIComponent(u)}`);
    } catch {
      return []; // 404 → no existe / límite alcanzado
    }
    if (!user || user.message || !user.login) return [];
    const out = [];
    const mk = (kind, title, detail, url, conf = 'confirmed') =>
      out.push(
        finding({
          providerId: 'github',
          providerLabel: 'GitHub',
          kind,
          title,
          detail,
          url,
          severity: SEVERITY.GOOD,
          confidence: conf,
        }),
      );
    mk('profile', `GitHub: ${user.name || user.login}`, user.bio || '', user.html_url);
    if (user.company) mk('attribute', 'Empresa', user.company);
    if (user.location) mk('attribute', 'Ubicación', user.location);
    if (user.email) mk('account', `Correo público: ${user.email}`, '', `mailto:${user.email}`);
    if (user.blog) mk('account', `Sitio web: ${user.blog}`, '', /^https?:/.test(user.blog) ? user.blog : `https://${user.blog}`);
    if (user.twitter_username)
      mk('account', `X / Twitter: @${user.twitter_username}`, '', `https://x.com/${user.twitter_username}`);
    mk(
      'attribute',
      'Actividad',
      `${user.public_repos ?? 0} repos · ${user.followers ?? 0} seguidores · desde ${String(user.created_at).slice(0, 4)}`,
    );
    // Correos reales filtrados de los commits de la actividad pública.
    try {
      const events = await fetchJSON(`https://api.github.com/users/${encodeURIComponent(u)}/events/public`);
      const emails = new Set();
      for (const ev of events ?? []) {
        if (ev.type !== 'PushEvent') continue;
        for (const c of ev.payload?.commits ?? []) {
          const e = c.author?.email;
          if (e && !/noreply|users\.noreply\.github/i.test(e)) emails.add(e.toLowerCase());
        }
      }
      for (const e of emails) {
        mk('account', `Correo en commits: ${e}`, 'Extraído de commits públicos', `mailto:${e}`);
      }
    } catch {
      /* sin eventos públicos */
    }
    return out;
  },
};

// --- Proveedor: Keybase (usuario) — pruebas sociales vinculadas --------------
// API pública con CORS. Devuelve proofs (twitter, github, reddit…) y cripto.

const keybase = {
  id: 'keybase',
  label: 'Keybase',
  requiresProxy: false,
  appliesTo: (idf) => getUsername(idf) || false,
  async run(idf) {
    const u = getUsername(idf);
    if (!u) return [];
    let data;
    try {
      data = await fetchJSON(
        `https://keybase.io/_/api/1.0/user/lookup.json?usernames=${encodeURIComponent(u)}&fields=basics,profile,proofs_summary,cryptocurrency_addresses`,
      );
    } catch {
      return [];
    }
    const them = data?.them?.[0];
    if (!them) return [];
    const out = [];
    const full = them.profile?.full_name;
    out.push(
      finding({
        providerId: 'keybase',
        providerLabel: 'Keybase',
        kind: 'profile',
        title: `Keybase: ${full || u}`,
        detail: them.profile?.location || them.profile?.bio || '',
        url: `https://keybase.io/${u}`,
        severity: SEVERITY.GOOD,
        confidence: 'confirmed',
      }),
    );
    for (const p of them.proofs_summary?.all ?? []) {
      out.push(
        finding({
          providerId: 'keybase',
          providerLabel: 'Keybase',
          kind: 'account',
          title: `${p.proof_type}: ${p.nametag}`,
          detail: 'Prueba verificada en Keybase',
          url: p.service_url || p.proof_url,
          severity: SEVERITY.GOOD,
          confidence: 'confirmed',
        }),
      );
    }
    for (const c of them.cryptocurrency_addresses?.bitcoin ?? []) {
      out.push(
        finding({
          providerId: 'keybase',
          providerLabel: 'Keybase',
          kind: 'attribute',
          title: `Bitcoin: ${c.address}`,
          url: `https://www.blockchain.com/btc/address/${c.address}`,
          severity: SEVERITY.INFO,
          confidence: 'confirmed',
        }),
      );
    }
    return out;
  },
};

// --- Proveedor: Hacker News (usuario) ---------------------------------------

const hackernews = {
  id: 'hackernews',
  label: 'Hacker News',
  requiresProxy: false,
  appliesTo: (idf) => getUsername(idf) || false,
  async run(idf) {
    const u = getUsername(idf);
    if (!u) return [];
    let data;
    try {
      data = await fetchJSON(
        `https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(u)}.json`,
      );
    } catch {
      return [];
    }
    if (!data || !data.id) return [];
    const out = [
      finding({
        providerId: 'hackernews',
        providerLabel: 'Hacker News',
        kind: 'profile',
        title: `Hacker News: ${data.id}`,
        detail: `${data.karma ?? 0} karma · desde ${new Date((data.created ?? 0) * 1000).getFullYear()}`,
        url: `https://news.ycombinator.com/user?id=${encodeURIComponent(u)}`,
        severity: SEVERITY.GOOD,
        confidence: 'confirmed',
      }),
    ];
    if (data.about) {
      // El "about" suele contener enlaces o contactos.
      const text = data.about.replace(/<[^>]+>/g, ' ').trim();
      if (text) {
        out.push(
          finding({
            providerId: 'hackernews',
            providerLabel: 'Hacker News',
            kind: 'attribute',
            title: 'Bio',
            detail: text.slice(0, 160),
            severity: SEVERITY.INFO,
            confidence: 'confirmed',
          }),
        );
      }
    }
    return out;
  },
};

// --- Proveedor: Chess.com (usuario) -----------------------------------------

const chesscom = {
  id: 'chesscom',
  label: 'Chess.com',
  requiresProxy: false,
  appliesTo: (idf) => getUsername(idf) || false,
  async run(idf) {
    const u = getUsername(idf);
    if (!u) return [];
    let data;
    try {
      data = await fetchJSON(`https://api.chess.com/pub/player/${encodeURIComponent(u.toLowerCase())}`);
    } catch {
      return [];
    }
    if (!data || !data.username) return [];
    const country = data.country ? data.country.split('/').pop() : '';
    return [
      finding({
        providerId: 'chesscom',
        providerLabel: 'Chess.com',
        kind: 'profile',
        title: `Chess.com: ${data.name || data.username}`,
        detail: [country, data.followers != null ? `${data.followers} seguidores` : '']
          .filter(Boolean)
          .join(' · '),
        url: data.url || `https://www.chess.com/member/${u}`,
        severity: SEVERITY.GOOD,
        confidence: 'confirmed',
      }),
    ];
  },
};

// --- Proveedor: Dominio de correo (clasificación + MX + RDAP) ----------------
// DNS-over-HTTPS de Google y RDAP admiten CORS y son gratis.

const emailDomain = {
  id: 'email-domain',
  label: 'Dominio de correo',
  requiresProxy: false,
  appliesTo: (idf) => getEmails(idf)[0] ?? false,
  async run(idf) {
    const email = getEmails(idf)[0];
    if (!email) return [];
    const domain = email.split('@')[1];
    if (!domain) return [];
    const out = [];
    const cls = classifyEmailDomain(domain);
    out.push(
      finding({
        providerId: 'email-domain',
        providerLabel: 'Dominio',
        kind: 'attribute',
        title: `Tipo de dominio: ${cls.label}`,
        detail: domain,
        severity: cls.type === 'disposable' ? SEVERITY.WARN : SEVERITY.INFO,
        confidence: 'confirmed',
      }),
    );
    // Registros MX → ¿puede recibir correo?
    try {
      const dns = await fetchJSON(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      );
      const mx = (dns?.Answer ?? []).filter((a) => a.type === 15);
      if (mx.length) {
        const host = mx[0].data.split(' ').pop().replace(/\.$/, '');
        out.push(
          finding({
            providerId: 'email-domain',
            providerLabel: 'Dominio',
            kind: 'attribute',
            title: 'El dominio puede recibir correo (MX)',
            detail: host,
            severity: SEVERITY.GOOD,
            confidence: 'confirmed',
          }),
        );
      }
    } catch {
      /* sin DoH */
    }
    // RDAP: datos de registro del dominio.
    try {
      const rdap = await fetchJSON(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
      const reg = (rdap?.events ?? []).find((e) => e.eventAction === 'registration');
      const registrar = (rdap?.entities ?? []).find((e) =>
        (e.roles ?? []).includes('registrar'),
      );
      if (reg?.eventDate) {
        out.push(
          finding({
            providerId: 'email-domain',
            providerLabel: 'Dominio',
            kind: 'attribute',
            title: 'Dominio registrado',
            detail: String(reg.eventDate).slice(0, 10),
            severity: SEVERITY.INFO,
            confidence: 'confirmed',
          }),
        );
      }
      const regName = registrar?.vcardArray?.[1]?.find?.((v) => v[0] === 'fn')?.[3];
      if (regName) {
        out.push(
          finding({
            providerId: 'email-domain',
            providerLabel: 'Dominio',
            kind: 'attribute',
            title: 'Registrador',
            detail: regName,
            severity: SEVERITY.INFO,
            confidence: 'confirmed',
          }),
        );
      }
    } catch {
      /* TLD sin RDAP */
    }
    return out;
  },
};

// --- Proveedor: Pivotes de búsqueda (navegador, sin red) --------------------

const searchPivots = {
  id: 'pivots',
  label: 'Pivotes de búsqueda',
  requiresProxy: false,
  appliesTo: () => true,
  async run(idf) {
    const out = [];
    const push = (title, url) =>
      out.push(
        finding({
          providerId: 'pivots',
          providerLabel: 'Pivote',
          kind: 'pivot',
          title,
          url,
          severity: SEVERITY.INFO,
          confidence: 'lead',
        }),
      );
    const q = (s) => encodeURIComponent(s);
    const f = idf.fields ?? {};

    for (const email of getEmails(idf)) {
      push(`Google: "${email}"`, `https://www.google.com/search?q=${q(`"${email}"`)}`);
      push(`HaveIBeenPwned: ${email}`, `https://haveibeenpwned.com/account/${q(email)}`);
      push(`Epieos: ${email}`, `https://epieos.com/?q=${q(email)}`);
      push(`IntelligenceX: ${email}`, `https://intelx.io/?s=${q(email)}`);
      push(`Hunter.io: ${email}`, `https://hunter.io/email-verifier/${q(email)}`);
      push(`Dehashed: ${email}`, `https://www.dehashed.com/search?query=${q(email)}`);
      push(`Skymem: ${email}`, `https://www.skymem.info/srch?q=${q(email)}`);
    }
    const username = getUsername(idf);
    if (username) {
      push(`Google: "${username}"`, `https://www.google.com/search?q=${q(`"${username}"`)}`);
      push(`WhatsMyName (web): ${username}`, `https://whatsmyname.app/`);
      push(`Social Searcher: ${username}`, `https://www.social-searcher.com/search-users/?q5=${q(username)}`);
      push(`Namechk: ${username}`, `https://namechk.com/`);
      push(`KnowEm: ${username}`, `https://knowem.com/checkusernames.php?u=${q(username)}`);
    }
    for (const phone of getPhones(idf)) {
      const digits = phone.replace(/[^\d+]/g, '');
      push(`Google: ${phone}`, `https://www.google.com/search?q=${q(`"${phone}"`)}`);
      push(`Truecaller: ${digits}`, `https://www.truecaller.com/search/global/${q(digits)}`);
      push(`Sync.me: ${digits}`, `https://sync.me/search/?number=${q(digits)}`);
      push(`NumLookup: ${digits}`, `https://www.numlookup.com/?phone=${q(digits)}`);
      push(`SpyDialer: ${digits}`, `https://www.spydialer.com/default.aspx`);
    }
    const name = getPersonName(idf);
    if (name) {
      push(`Google: "${name}"`, `https://www.google.com/search?q=${q(`"${name}"`)}`);
      push(`LinkedIn: ${name}`, `https://www.linkedin.com/search/results/all/?keywords=${q(name)}`);
      push(`TruePeopleSearch: ${name}`, `https://www.truepeoplesearch.com/results?name=${q(name)}`);
      push(`FastPeopleSearch: ${name}`, `https://www.fastpeoplesearch.com/name/${q(name.replace(/\s+/g, '-'))}`);
    }
    // Matrícula
    if (idf.type === 'licensePlate' && f.plate) {
      push(`Google: matrícula ${f.plate}`, `https://www.google.com/search?q=${q(`"${f.plate}"`)}`);
      push(`FaxVIN (placa): ${f.plate}`, `https://www.faxvin.com/license-plate-lookup`);
    }
    // VIN → historial / llamadas a revisión
    const vin = String(f.vin ?? '').trim();
    if (vin) {
      push(`NHTSA recalls: ${vin}`, `https://www.nhtsa.gov/recalls?vin=${q(vin)}`);
      push(`VINCheck (NICB): ${vin}`, `https://www.nicb.org/vincheck`);
    }
    // Dirección
    if (idf.type === 'address') {
      const addr = [f.line1, f.city, f.region, f.country].filter(Boolean).join(', ');
      if (addr) {
        push(`Google Maps: ${addr}`, `https://www.google.com/maps/search/${q(addr)}`);
        push(`Google: "${addr}"`, `https://www.google.com/search?q=${q(`"${addr}"`)}`);
      }
    }
    return out;
  },
};

export const PROVIDERS = [
  githubUser,
  keybase,
  gravatar,
  hackernews,
  chesscom,
  breaches,
  emailDomain,
  phoneParse,
  vinDecode,
  usernameCheck,
  usernameProfiles,
  searchPivots,
];
