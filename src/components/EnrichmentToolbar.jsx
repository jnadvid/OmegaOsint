import { useState } from 'react';
import { useEnrichment } from '../context/EnrichmentContext.jsx';
import { useProject } from '../context/ProjectContext.jsx';
import './EnrichmentToolbar.css';

/**
 * Barra de control del enriquecimiento OSINT en la pestaña Información:
 * estado del proxy local, interruptor de auto-enriquecimiento y un botón
 * "Enriquecer todo".
 */
export default function EnrichmentToolbar() {
  const { project } = useProject();
  const {
    autoEnrich,
    setAutoEnrich,
    proxyAvailable,
    checkingProxy,
    recheckProxy,
    enrichAll,
    runningIds,
    proxyUrl,
    setProxyUrl,
  } = useEnrichment();
  const [showConfig, setShowConfig] = useState(false);
  const [urlDraft, setUrlDraft] = useState(proxyUrl);

  const busy = runningIds.size > 0;
  const count = project?.identifiers?.length ?? 0;

  return (
    <div className="enrich-toolbar">
      <div className="enrich-toolbar-row">
        <button
          type="button"
          className={`enrich-proxy-chip ${proxyAvailable ? 'on' : 'off'}`}
          onClick={() => recheckProxy()}
          title={
            proxyAvailable
              ? 'Proxy local conectado — verificación de usuarios y más fuentes activas'
              : 'Proxy local no detectado. Haz clic para reintentar.'
          }
        >
          <span className="enrich-proxy-dot" />
          {checkingProxy
            ? 'Comprobando…'
            : proxyAvailable
              ? 'Proxy activo'
              : 'Proxy inactivo'}
        </button>
        <button
          type="button"
          className="icon-btn enrich-config-btn"
          onClick={() => setShowConfig((s) => !s)}
          title="Configurar enriquecimiento"
          aria-label="Configurar enriquecimiento"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      <div className="enrich-toolbar-row">
        <label className="enrich-auto-toggle" title="Enriquecer automáticamente cada identificador nuevo">
          <input
            type="checkbox"
            checked={autoEnrich}
            onChange={(e) => setAutoEnrich(e.target.checked)}
          />
          <span>Auto</span>
        </label>
        <button
          type="button"
          className="btn btn-secondary btn-sm enrich-all-btn"
          onClick={() => enrichAll({ force: true })}
          disabled={busy || count === 0}
        >
          {busy ? `Enriqueciendo… (${runningIds.size})` : 'Enriquecer todo'}
        </button>
      </div>

      {showConfig && (
        <div className="enrich-config">
          <label htmlFor="enrich-proxy-url">URL del proxy local</label>
          <div className="enrich-config-row">
            <input
              id="enrich-proxy-url"
              type="text"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              spellCheck="false"
              autoComplete="off"
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setProxyUrl(urlDraft.trim());
              }}
            >
              Guardar
            </button>
          </div>
          <p className="enrich-config-hint">
            Opcional. Arranca el proxy con <code>cd server &amp;&amp; npm i &amp;&amp; npm start</code>{' '}
            para desbloquear la verificación real de usuarios y APIs con clave.
            Sin él, se usan solo las fuentes gratuitas del navegador.
          </p>
        </div>
      )}
    </div>
  );
}
