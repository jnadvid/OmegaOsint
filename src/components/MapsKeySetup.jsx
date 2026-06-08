import { useState } from 'react';
import { useAppConfig } from '../context/AppConfigContext.jsx';
import { APP_CONFIG_PATH_HINT } from '../utils/appConfig.js';
import './MapsKeySetup.css';

export default function MapsKeySetup({ compact = false, onSaved }) {
  const { setGoogleMapsApiKey, googleMapsApiKeySource, setMapProvider } =
    useAppConfig();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleUseOSM = async () => {
    await setMapProvider('osm');
    onSaved?.();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Pega primero tu clave de API de Google Maps.');
      return;
    }
    setGoogleMapsApiKey(trimmed);
    setValue('');
    setError('');
    onSaved?.();
  };

  return (
    <div className={`maps-setup ${compact ? 'compact' : ''}`}>
      <div className="maps-setup-card">
        <div className="maps-setup-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h2>Conectar Google Maps</h2>
        <p className="maps-setup-sub">
          El mapa necesita una clave de la API JavaScript de Google Maps. Tu
          clave se queda en este dispositivo — nunca se envía a ningún sitio ni
          se guarda en los archivos de proyecto.
        </p>

        <form onSubmit={handleSubmit} className="maps-setup-form">
          <label htmlFor="gmaps-key">Clave de API de Google Maps</label>
          <input
            id="gmaps-key"
            type="text"
            autoComplete="off"
            spellCheck="false"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="AIza..."
          />
          {error && <div className="maps-setup-error">{error}</div>}
          <div className="maps-setup-actions">
            <button type="submit" className="btn btn-primary">
              Guardar clave
            </button>
          </div>
        </form>

        <div className="maps-setup-divider"><span>o</span></div>

        {/* Escape hatch for users who don't want to deal with Google Cloud
            at all — one click switches the provider to OpenStreetMap. */}
        <button
          type="button"
          className="btn btn-secondary maps-setup-osm"
          onClick={handleUseOSM}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
          </svg>
          Usar OpenStreetMap en su lugar (sin clave)
        </button>

        <div className="maps-setup-alt">
          <p>
            ¿Prefieres editar un archivo? Copia <code>public/app.config.example.json</code> a{' '}
            <code>{APP_CONFIG_PATH_HINT}</code> y pega tu clave en{' '}
            <code>googleMaps.apiKey</code>. La app la lee al recargar.
          </p>
        </div>

        {googleMapsApiKeySource && (
          <div className="maps-setup-status">
            Origen de la clave actual: <strong>{googleMapsApiKeySource}</strong>
          </div>
        )}

        <details className="maps-setup-help">
          <summary>¿Cómo consigo una clave de API?</summary>
          <ol>
            <li>Abre la <strong>Consola de Google Cloud</strong> y crea o selecciona un proyecto.</li>
            <li>Activa la <strong>Maps JavaScript API</strong> (y la <strong>Places API</strong> si quieres autocompletado de lugares conocidos).</li>
            <li>En <strong>APIs y servicios → Credenciales</strong>, crea una clave de API.</li>
            <li>Por seguridad, restringe la clave a <code>http://localhost</code> y a cualquier otro origen que utilices.</li>
          </ol>
          <p className="maps-setup-warning">
            Google factura el uso según la capa gratuita y los precios de tu cuenta. Restringe tu clave.
          </p>
        </details>
      </div>
    </div>
  );
}
