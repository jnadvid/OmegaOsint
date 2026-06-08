import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useProject } from './ProjectContext.jsx';
import { enrichIdentifier } from '../enrichment/engine.js';
import { detectProxy, DEFAULT_PROXY_URL } from '../enrichment/proxy.js';
import {
  getEmails,
  getPhones,
  getUsername,
  getPersonName,
  getVin,
} from '../enrichment/extract.js';

const EnrichmentContext = createContext(null);

const CONFIG_KEY = 'osint-tool:enrichment-config';

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return { autoEnrich: true, proxyUrl: DEFAULT_PROXY_URL, ...JSON.parse(raw) };
  } catch {
    /* ignora */
  }
  return { autoEnrich: true, proxyUrl: DEFAULT_PROXY_URL };
}

/** ¿El identificador tiene algún dato que valga la pena consultar? */
export function hasEnrichableData(idf) {
  return !!(
    getEmails(idf).length ||
    getUsername(idf) ||
    getPhones(idf).length ||
    getVin(idf) ||
    getPersonName(idf)
  );
}

export function EnrichmentProvider({ children }) {
  const { project, updateIdentifier } = useProject();
  const [config, setConfig] = useState(loadConfig);
  const [proxyAvailable, setProxyAvailable] = useState(false);
  const [checkingProxy, setCheckingProxy] = useState(false);
  const [runningIds, setRunningIds] = useState(() => new Set());
  const runningRef = useRef(new Set());

  // Persiste la configuración.
  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch {
      /* ignora cuota */
    }
  }, [config]);

  const recheckProxy = useCallback(async () => {
    setCheckingProxy(true);
    const ok = await detectProxy(config.proxyUrl);
    setProxyAvailable(ok);
    setCheckingProxy(false);
    return ok;
  }, [config.proxyUrl]);

  // Detecta el proxy al montar y cuando cambia su URL.
  useEffect(() => {
    let cancelled = false;
    setCheckingProxy(true);
    detectProxy(config.proxyUrl).then((ok) => {
      if (!cancelled) {
        setProxyAvailable(ok);
        setCheckingProxy(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [config.proxyUrl]);

  const markRunning = useCallback((id, on) => {
    if (on) runningRef.current.add(id);
    else runningRef.current.delete(id);
    setRunningIds(new Set(runningRef.current));
  }, []);

  const enrichOne = useCallback(
    async (identifier, { force = false } = {}) => {
      if (!identifier) return;
      if (runningRef.current.has(identifier.id)) return;
      if (!force && identifier.enrichment) return;
      markRunning(identifier.id, true);
      try {
        const result = await enrichIdentifier(identifier, {
          proxy: { available: proxyAvailable, url: config.proxyUrl },
        });
        updateIdentifier(identifier.id, { enrichment: result });
      } catch (err) {
        updateIdentifier(identifier.id, {
          enrichment: {
            status: 'error',
            ranAt: new Date().toISOString(),
            findings: [],
            errors: [{ provider: 'engine', message: err?.message ?? String(err) }],
            providersRun: [],
            usedProxy: proxyAvailable,
          },
        });
      } finally {
        markRunning(identifier.id, false);
      }
    },
    [proxyAvailable, config.proxyUrl, updateIdentifier, markRunning],
  );

  const enrichAll = useCallback(
    async ({ force = false } = {}) => {
      const list = project?.identifiers ?? [];
      for (const idf of list) {
        if (force || !idf.enrichment) {
          // Sin await en serie estricta: enrichOne ya limita concurrencia interna
          // por identificador, pero lanzamos en tandas pequeñas para no saturar.
          // eslint-disable-next-line no-await-in-loop
          await enrichOne(idf, { force });
        }
      }
    },
    [project?.identifiers, enrichOne],
  );

  // --- Auto-enriquecimiento al añadir -------------------------------------
  // Cuando un identificador con datos consultables aparece sin enriquecimiento,
  // se lanza en segundo plano (si está activado).
  useEffect(() => {
    if (!config.autoEnrich || !project?.identifiers) return;
    for (const idf of project.identifiers) {
      if (
        !idf.enrichment &&
        !runningRef.current.has(idf.id) &&
        hasEnrichableData(idf)
      ) {
        enrichOne(idf);
      }
    }
    // Depende de la identidad del array (cambia en cada add/edit).
  }, [project?.identifiers, config.autoEnrich, enrichOne]);

  const setAutoEnrich = useCallback((on) => {
    setConfig((c) => ({ ...c, autoEnrich: on }));
  }, []);
  const setProxyUrl = useCallback((url) => {
    setConfig((c) => ({ ...c, proxyUrl: url }));
  }, []);

  return (
    <EnrichmentContext.Provider
      value={{
        autoEnrich: config.autoEnrich,
        proxyUrl: config.proxyUrl,
        proxyAvailable,
        checkingProxy,
        runningIds,
        enrichOne,
        enrichAll,
        recheckProxy,
        setAutoEnrich,
        setProxyUrl,
      }}
    >
      {children}
    </EnrichmentContext.Provider>
  );
}

export function useEnrichment() {
  const ctx = useContext(EnrichmentContext);
  if (!ctx)
    throw new Error('useEnrichment debe usarse dentro de EnrichmentProvider');
  return ctx;
}
