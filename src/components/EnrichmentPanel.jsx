import { useMemo } from 'react';
import { useEnrichment } from '../context/EnrichmentContext.jsx';
import './EnrichmentPanel.css';

const GROUPS = [
  { key: 'identity', label: 'Cuentas y perfiles', kinds: ['avatar', 'profile', 'account'] },
  { key: 'breach', label: 'Brechas de datos', kinds: ['breach'] },
  { key: 'attr', label: 'Atributos detectados', kinds: ['attribute'] },
  { key: 'pivot', label: 'Pivotes de búsqueda', kinds: ['pivot'] },
];

function relTime(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'hace un momento';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString('es-ES');
}

export default function EnrichmentPanel({ identifier }) {
  const { runningIds, enrichOne, proxyAvailable } = useEnrichment();
  const enrichment = identifier?.enrichment;
  const running = runningIds.has(identifier?.id);

  const grouped = useMemo(() => {
    const findings = enrichment?.findings ?? [];
    return GROUPS.map((g) => ({
      ...g,
      items: findings.filter((f) => g.kinds.includes(f.kind)),
    })).filter((g) => g.items.length > 0);
  }, [enrichment]);

  const total = enrichment?.findings?.length ?? 0;
  const breachCount =
    enrichment?.findings?.filter((f) => f.kind === 'breach').length ?? 0;

  return (
    <div className="enrich-panel">
      <div className="enrich-head">
        <div className="enrich-head-title">
          <span className="enrich-atom" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <ellipse cx="12" cy="12" rx="10" ry="4.2" />
              <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
              <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
              <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span>Enriquecimiento OSINT</span>
          {breachCount > 0 && (
            <span className="enrich-breach-chip" title="Brechas de datos">
              {breachCount} brecha{breachCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => enrichOne(identifier, { force: true })}
          disabled={running}
        >
          {running ? 'Buscando…' : enrichment ? 'Re-enriquecer' : 'Enriquecer'}
        </button>
      </div>

      {running && (
        <div className="enrich-loading">
          <span className="enrich-spinner" aria-hidden="true" />
          Recolectando de fuentes abiertas…
        </div>
      )}

      {!running && !enrichment && (
        <p className="enrich-empty">
          Aún sin recolectar. Pulsa «Enriquecer» para buscar este identificador
          en fuentes OSINT gratuitas.
        </p>
      )}

      {!running && enrichment && total === 0 && (
        <p className="enrich-empty">
          Sin hallazgos automáticos. Revisa los pivotes de búsqueda manualmente.
        </p>
      )}

      {!running && enrichment && (
        <div className="enrich-meta">
          {total} hallazgo{total === 1 ? '' : 's'} · {relTime(enrichment.ranAt)}
          {enrichment.usedProxy && <span className="enrich-tag">proxy</span>}
          {!proxyAvailable && (
            <span className="enrich-tag muted" title="Inicia el proxy local para verificar usuarios y más fuentes">
              proxy inactivo
            </span>
          )}
        </div>
      )}

      {grouped.map((g) => (
        <div key={g.key} className="enrich-group">
          <h5 className={`enrich-group-title ${g.key}`}>
            {g.label} <span className="enrich-count">{g.items.length}</span>
          </h5>
          <ul className="enrich-list">
            {g.items.map((f) => (
              <li key={f.id} className={`enrich-item sev-${f.severity}`}>
                <span className={`enrich-dot conf-${f.confidence}`} />
                <div className="enrich-item-body">
                  <div className="enrich-item-title">{f.title}</div>
                  {f.detail && <div className="enrich-item-detail">{f.detail}</div>}
                </div>
                {f.url && (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="enrich-item-link"
                    title="Abrir en una pestaña nueva"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17 17 7M7 7h10v10" />
                    </svg>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
