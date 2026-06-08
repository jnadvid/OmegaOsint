/**
 * Datos locales para la clasificación de dominios de correo (sin red).
 * - DISPOSABLE: dominios de correo temporal/desechable.
 * - FREE: proveedores de correo gratuito comunes.
 * Listas no exhaustivas pero suficientes para una primera señal.
 */
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'temp-mail.org', 'throwawaymail.com', 'yopmail.com', 'getnada.com',
  'trashmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'dispostable.com',
  'maildrop.cc', 'mintemail.com', 'mohmal.com', 'fakeinbox.com', 'tempinbox.com',
  'spamgourmet.com', 'mailcatch.com', 'inboxbear.com', 'emailondeck.com',
  'tmpmail.net', 'tmpmail.org', 'moakt.com', 'burnermail.io', '33mail.com',
  'temp-mail.io', 'mailnesia.com', 'spam4.me', 'grr.la', 'tempr.email',
]);

export const FREE_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
  'msn.com', 'yahoo.com', 'yahoo.es', 'yahoo.co.uk', 'ymail.com', 'aol.com',
  'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com', 'pm.me',
  'gmx.com', 'gmx.net', 'gmx.es', 'mail.com', 'zoho.com', 'yandex.com',
  'yandex.ru', 'tutanota.com', 'tuta.io', 'fastmail.com', 'hey.com', 'web.de',
]);

/** Clasifica un dominio de correo. */
export function classifyEmailDomain(domain) {
  const d = String(domain || '').toLowerCase();
  if (DISPOSABLE_DOMAINS.has(d)) return { type: 'disposable', label: 'Desechable / temporal' };
  if (FREE_PROVIDERS.has(d)) return { type: 'free', label: 'Proveedor gratuito' };
  return { type: 'corporate', label: 'Dominio propio / corporativo' };
}
