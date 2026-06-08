/**
 * Proxy local opcional de Omega OSINT.
 *
 * Desbloquea las fuentes que el navegador no puede consultar por CORS o que
 * requieren clave de API:
 *   - POST /enrich/username  → verificación real de perfiles (estilo WhatsMyName)
 *   - GET  /enrich/breaches  → brechas de datos (HIBP con clave, o XposedOrNot)
 *   - GET  /health           → sonda de disponibilidad
 *
 * Privacidad: corre en tu máquina, no guarda nada en disco y solo contacta con
 * los sitios necesarios para la consulta. Las claves viven en variables de
 * entorno, nunca en el navegador.
 *
 * Arranque:  npm install && npm start   (puerto 8787 por defecto)
 */
import http from 'node:http';
import { SITES } from './sites.js';

const PORT = process.env.PORT || 8787;
const HIBP_API_KEY = process.env.HIBP_API_KEY || '';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
const REQUEST_TIMEOUT_MS = 8000;
const CONCURRENCY = 8;

// --- Utilidades --------------------------------------------------------------

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

async function fetchWithTimeout(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: '*/*' },
      signal: ctl.signal,
      ...opts,
    });
  } finally {
    clearTimeout(t);
  }
}

async function runPool(items, worker, limit = CONCURRENCY) {
  const out = [];
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx]);
    }
  });
  await Promise.all(runners);
  return out;
}

const cleanUsername = (u) =>
  String(u || '').trim().replace(/^@+/, '').replace(/[^\w.\-]/g, '');

// --- Verificación de nombres de usuario -------------------------------------

async function checkSite(site, username) {
  const url = site.url.replace('{u}', encodeURIComponent(username));
  try {
    const res = await fetchWithTimeout(url);
    const status = res.status;
    if (site.mCode && status === site.mCode) return null;
    if ((site.eCode ?? 200) !== status) {
      // Algunos sitios devuelven 200 siempre; deja que mString decida abajo.
      if (status >= 400) return null;
    }
    let body = '';
    if (site.mString || site.eString) {
      body = await res.text().catch(() => '');
      if (site.mString && body.includes(site.mString)) return null;
      if (site.eString && !body.includes(site.eString)) return null;
    }
    return { name: site.name, url, cat: site.cat };
  } catch {
    return null;
  }
}

async function enrichUsername(username) {
  const u = cleanUsername(username);
  if (!u) return { found: [], checked: 0 };
  const results = await runPool(SITES, (site) => checkSite(site, u));
  return { found: results.filter(Boolean), checked: SITES.length };
}

// --- Brechas de datos --------------------------------------------------------

async function breachesViaHIBP(email) {
  const res = await fetchWithTimeout(
    `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(
      email,
    )}?truncateResponse=true`,
    { headers: { 'User-Agent': 'OmegaOSINT', 'hibp-api-key': HIBP_API_KEY } },
  );
  if (res.status === 404) return { breaches: [[]] };
  if (!res.ok) throw new Error(`HIBP HTTP ${res.status}`);
  const data = await res.json();
  return { breaches: [data.map((b) => b.Name)] };
}

async function breachesViaXposed(email) {
  const res = await fetchWithTimeout(
    `https://api.xposedornot.com/v1/check-email/${encodeURIComponent(email)}`,
  );
  if (!res.ok) return { breaches: [[]] };
  const data = await res.json().catch(() => ({}));
  return { breaches: data?.breaches ?? [[]] };
}

async function enrichBreaches(email) {
  if (HIBP_API_KEY) {
    try {
      return await breachesViaHIBP(email);
    } catch {
      /* cae a XposedOrNot */
    }
  }
  return breachesViaXposed(email);
}

// --- Servidor ----------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, `http://localhost:${PORT}`);

  try {
    if (url.pathname === '/health') {
      return send(res, 200, { ok: true, service: 'omega-osint-proxy', hibp: !!HIBP_API_KEY });
    }

    if (url.pathname === '/enrich/username' && req.method === 'POST') {
      const body = await readBody(req);
      const result = await enrichUsername(body.username);
      return send(res, 200, result);
    }

    if (url.pathname === '/enrich/breaches' && req.method === 'GET') {
      const email = url.searchParams.get('email');
      if (!email) return send(res, 400, { error: 'falta el parámetro email' });
      const result = await enrichBreaches(email);
      return send(res, 200, result);
    }

    return send(res, 404, { error: 'no encontrado' });
  } catch (err) {
    return send(res, 500, { error: err?.message ?? 'error interno' });
  }
});

server.listen(PORT, () => {
  console.log(`⚛  Proxy de Omega OSINT escuchando en http://localhost:${PORT}`);
  console.log(`   HIBP: ${HIBP_API_KEY ? 'configurado' : 'no configurado (se usa XposedOrNot)'}`);
});
