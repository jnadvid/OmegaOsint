/**
 * Extractores: a partir de un identificador del proyecto, obtienen los
 * valores "consultables" (usuario, correos, teléfonos, nombre…) que los
 * proveedores de enriquecimiento usan como entrada.
 */
import { PLATFORMS } from './platforms.js';

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /[+()\d][\d\s().-]{6,}\d/;

/** Limpia un handle: quita @, prefijo u/ y restos de URL. */
export function cleanHandle(value) {
  let v = String(value ?? '').trim();
  if (!v) return '';
  // Si es una URL, quédate con el último segmento no vacío.
  const urlMatch = v.match(/^https?:\/\/[^/]+\/(.+)$/i);
  if (urlMatch) v = urlMatch[1].split(/[/?#]/)[0];
  return v.replace(/^@+/, '').replace(/^u\//i, '').trim();
}

/** Plataforma social asociada al tipo del identificador, si aplica. */
export function getPlatform(identifier) {
  return PLATFORMS[identifier?.type] ? identifier.type : null;
}

/** Nombre de usuario principal de un identificador social. */
export function getUsername(identifier) {
  if (!identifier || !PLATFORMS[identifier.type]) return '';
  const f = identifier.fields ?? {};
  const raw =
    f.username || f.handle || f.channelName || f.fullName || f.displayName || '';
  return cleanHandle(raw);
}

/** Todos los correos presentes en los campos del identificador (deduplicados). */
export function getEmails(identifier) {
  const out = new Set();
  const f = identifier?.fields ?? {};
  for (const v of Object.values(f)) {
    const s = String(v ?? '').trim();
    const m = s.match(EMAIL_RE);
    if (m) out.add(m[0].toLowerCase());
  }
  return [...out];
}

/** Todos los teléfonos presentes en los campos del identificador. */
export function getPhones(identifier) {
  const out = new Set();
  const f = identifier?.fields ?? {};
  // El tipo "phone" guarda el número en `number`; otros pueden tener `phone`.
  for (const [key, v] of Object.entries(f)) {
    const s = String(v ?? '').trim();
    if (!s) continue;
    if (/phone|number|tel/i.test(key) || identifier.type === 'phone') {
      const m = s.match(PHONE_RE);
      if (m) out.add(m[0].replace(/\s+/g, ' ').trim());
    }
  }
  return [...out];
}

/** Nombre de persona, si el identificador lo aporta. */
export function getPersonName(identifier) {
  if (!identifier) return '';
  const f = identifier.fields ?? {};
  if (['name', 'family', 'linkedin'].includes(identifier.type)) {
    return String(f.fullName || f.name || '').trim();
  }
  return '';
}

/** VIN de un identificador de vehículo/VIN. */
export function getVin(identifier) {
  const f = identifier?.fields ?? {};
  const vin = String(f.vin ?? '').trim().toUpperCase();
  return /^[A-HJ-NPR-Z0-9]{11,17}$/.test(vin) ? vin : '';
}

const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
const IPV6_RE = /\b(?:[a-f0-9]{1,4}:){2,7}[a-f0-9]{1,4}\b/gi;
const BTC_RE = /\b(?:bc1[ac-hj-np-z02-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g;
const ETH_RE = /\b0x[a-fA-F0-9]{40}\b/g;
const URL_RE = /https?:\/\/[^\s"'<>]+/gi;

function collect(identifier, re, transform = (x) => x) {
  const out = new Set();
  const f = identifier?.fields ?? {};
  const haystack = [...Object.values(f), identifier?.notes]
    .map((v) => String(v ?? ''))
    .join('\n');
  for (const m of haystack.matchAll(re)) {
    const v = transform(m[0]);
    if (v) out.add(v);
  }
  return [...out];
}

/** Direcciones IP (v4 y v6) presentes en los campos/notas. */
export function getIPs(identifier) {
  return [...collect(identifier, IPV4_RE), ...collect(identifier, IPV6_RE)];
}

/** Direcciones de criptomoneda detectadas (BTC y ETH). */
export function getCryptoAddresses(identifier) {
  const btc = collect(identifier, BTC_RE).map((a) => ({ chain: 'btc', address: a }));
  const eth = collect(identifier, ETH_RE).map((a) => ({ chain: 'eth', address: a }));
  return [...btc, ...eth];
}

/** URLs http(s) presentes en los campos del identificador. */
export function getUrls(identifier) {
  return collect(identifier, URL_RE, (u) => u.replace(/[.,)]+$/, ''));
}

