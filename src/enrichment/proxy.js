/**
 * Detección y acceso al proxy local opcional.
 *
 * El proxy (carpeta `server/`) desbloquea fuentes que el navegador no puede
 * consultar por CORS: verificación de usuarios estilo WhatsMyName y APIs con
 * clave. Si no está disponible, el motor degrada con elegancia y usa solo las
 * fuentes que funcionan en el navegador.
 */

export const DEFAULT_PROXY_URL = 'http://localhost:8787';

/** Comprueba si el proxy responde en `${url}/health`. */
export async function detectProxy(url, timeout = 1500) {
  if (!url) return false;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/health`, {
      signal: ctl.signal,
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return data?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** fetch + JSON con timeout y aborto. Lanza en errores HTTP. */
export async function fetchJSON(url, opts = {}, timeout = 9000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: ctl.signal });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Llamada JSON al proxy local. */
export function proxyJSON(proxyUrl, path, opts = {}, timeout = 20000) {
  const base = proxyUrl.replace(/\/$/, '');
  return fetchJSON(`${base}${path}`, opts, timeout);
}
