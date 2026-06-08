import { useEnrichment } from '../context/EnrichmentContext.jsx';
import './EnrichmentBadge.css';

/**
 * Indicador compacto del estado de enriquecimiento de un identificador.
 * - En curso: spinner.
 * - Con brechas: chip rojo con el número.
 * - Con hallazgos: átomo + recuento.
 * Devuelve null si no hay nada que mostrar.
 */
export default function EnrichmentBadge({ identifier }) {
  const { runningIds } = useEnrichment();
  const running = runningIds.has(identifier?.id);
  const enrichment = identifier?.enrichment;

  if (running) {
    return (
      <span className="enrich-badge running" title="Enriqueciendo…" aria-label="Enriqueciendo">
        <span className="enrich-badge-spinner" />
      </span>
    );
  }
  if (!enrichment) return null;

  const findings = enrichment.findings ?? [];
  const breaches = findings.filter((f) => f.kind === 'breach').length;
  const solid = findings.filter(
    (f) => f.confidence === 'confirmed' || f.confidence === 'likely',
  ).length;

  if (breaches > 0) {
    return (
      <span className="enrich-badge breach" title={`${breaches} brecha(s) de datos`}>
        ⚠ {breaches}
      </span>
    );
  }
  if (solid > 0) {
    return (
      <span className="enrich-badge ok" title={`${solid} hallazgo(s) relevante(s)`}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <ellipse cx="12" cy="12" rx="10" ry="4.2" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        </svg>
        {solid}
      </span>
    );
  }
  return null;
}
