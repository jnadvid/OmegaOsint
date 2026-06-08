/**
 * Motor de enriquecimiento: dado un identificador, ejecuta todos los
 * proveedores aplicables (respetando si requieren proxy), agrega y deduplica
 * los hallazgos, y devuelve un registro de enriquecimiento listo para
 * guardarse en el identificador.
 *
 * Forma del registro (persistido en `identifier.enrichment`):
 *   {
 *     status: 'done' | 'error',
 *     ranAt: ISOString,
 *     findings: Finding[],
 *     errors: { provider, message }[],
 *     providersRun: string[],
 *     usedProxy: boolean,
 *   }
 */
import { PROVIDERS } from './providers.js';

const CONCURRENCY = 4;

/** Ejecuta tareas con un límite de concurrencia. */
async function runPool(items, worker, limit = CONCURRENCY) {
  const results = [];
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

/** Clave de deduplicación de un hallazgo. */
function dedupeKey(f) {
  return `${f.kind}|${(f.url ?? f.title).toLowerCase()}`;
}

/**
 * Enriquece un identificador.
 * @param {object} identifier
 * @param {object} ctx - { proxy: { available, url } }
 */
export async function enrichIdentifier(identifier, ctx) {
  const proxy = ctx?.proxy ?? { available: false, url: '' };
  const applicable = PROVIDERS.filter((p) => {
    if (p.requiresProxy && !proxy.available) return false;
    try {
      return !!p.appliesTo(identifier);
    } catch {
      return false;
    }
  });

  const findings = [];
  const errors = [];
  const providersRun = [];

  await runPool(applicable, async (provider) => {
    providersRun.push(provider.id);
    try {
      const res = await provider.run(identifier, { proxy });
      if (Array.isArray(res)) findings.push(...res);
    } catch (err) {
      errors.push({ provider: provider.id, message: err?.message ?? String(err) });
    }
  });

  // Deduplica conservando el primero (mayor prioridad por orden de proveedor).
  const seen = new Set();
  const deduped = [];
  for (const f of findings) {
    const k = dedupeKey(f);
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(f);
  }

  // Orden: confirmados primero, luego por severidad (warn arriba), pivotes al final.
  const confRank = { confirmed: 0, likely: 1, lead: 2 };
  const sevRank = { warn: 0, good: 1, info: 2 };
  deduped.sort((a, b) => {
    const c = (confRank[a.confidence] ?? 3) - (confRank[b.confidence] ?? 3);
    if (c !== 0) return c;
    return (sevRank[a.severity] ?? 3) - (sevRank[b.severity] ?? 3);
  });

  return {
    status: errors.length && deduped.length === 0 ? 'error' : 'done',
    ranAt: new Date().toISOString(),
    findings: deduped,
    errors,
    providersRun,
    usedProxy: proxy.available,
  };
}

/** Resumen rápido para insignias de UI. */
export function summarizeEnrichment(enrichment) {
  if (!enrichment) return { total: 0, breaches: 0, accounts: 0, confirmed: 0 };
  const findings = enrichment.findings ?? [];
  return {
    total: findings.length,
    breaches: findings.filter((f) => f.kind === 'breach').length,
    accounts: findings.filter((f) => f.kind === 'account' || f.kind === 'profile').length,
    confirmed: findings.filter((f) => f.confidence === 'confirmed').length,
  };
}
