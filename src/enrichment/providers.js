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

    for (const email of getEmails(idf)) {
      push(`Google: "${email}"`, `https://www.google.com/search?q=${q(`"${email}"`)}`);
      push(`HaveIBeenPwned: ${email}`, `https://haveibeenpwned.com/account/${q(email)}`);
      push(`Epieos: ${email}`, `https://epieos.com/?q=${q(email)}`);
      push(`IntelligenceX: ${email}`, `https://intelx.io/?s=${q(email)}`);
    }
    const username = getUsername(idf);
    if (username) {
      push(`Google: "${username}"`, `https://www.google.com/search?q=${q(`"${username}"`)}`);
      push(`WhatsMyName (web): ${username}`, `https://whatsmyname.app/`);
      push(`Social Searcher: ${username}`, `https://www.social-searcher.com/search-users/?q5=${q(username)}`);
    }
    for (const phone of getPhones(idf)) {
      const digits = phone.replace(/[^\d+]/g, '');
      push(`Google: ${phone}`, `https://www.google.com/search?q=${q(`"${phone}"`)}`);
      push(`Sync.me: ${digits}`, `https://sync.me/search/?number=${q(digits)}`);
    }
    const name = getPersonName(idf);
    if (name) {
      push(`Google: "${name}"`, `https://www.google.com/search?q=${q(`"${name}"`)}`);
      push(`LinkedIn: ${name}`, `https://www.linkedin.com/search/results/all/?keywords=${q(name)}`);
    }
    return out;
  },
};

export const PROVIDERS = [
  gravatar,
  breaches,
  phoneParse,
  vinDecode,
  usernameCheck,
  usernameProfiles,
  searchPivots,
];
