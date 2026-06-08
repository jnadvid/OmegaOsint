import { useEffect, useRef, useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import {
  loadRecents,
  removeRecent,
  hasUnsavedChanges,
} from '../utils/recentProjects.js';
import ThemeToggle from './ThemeToggle.jsx';
import ClearAllDataButton from './ClearAllDataButton.jsx';
import AtomLogo from './AtomLogo.jsx';
import './Landing.css';

function relativeTime(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 45) return 'hace un momento';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} día${d > 1 ? 's' : ''}`;
  return new Date(iso).toLocaleDateString('es-ES');
}

export default function Landing() {
  const { newProject, openProjectFromFile, openProjectFromSnapshot } =
    useProject();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [targetName, setTargetName] = useState('');
  const [error, setError] = useState('');
  const [recents, setRecents] = useState(() => loadRecents());
  const fileInputRef = useRef(null);

  // Re-read on mount so a fresh back-out shows up immediately.
  useEffect(() => {
    setRecents(loadRecents());
  }, []);

  const handleResume = (entry) => {
    openProjectFromSnapshot(entry.snapshot);
  };

  const handleRemoveRecent = (e, id) => {
    e.stopPropagation();
    setRecents(removeRecent(id));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre del proyecto es obligatorio.');
      return;
    }
    newProject({ name, targetName });
  };

  const handleOpenClick = () => {
    setError('');
    fileInputRef.current?.click();
  };

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await openProjectFromFile(file);
    } catch (err) {
      setError(`No se pudo abrir el proyecto: ${err.message}`);
    }
  };

  return (
    <div className="landing">
      <div className="landing-topbar">
        <ThemeToggle />
      </div>

      <div className="landing-content">
        <div className="landing-brand">
          <div className="landing-logo">
            <AtomLogo size={46} />
          </div>
          <h1 className="landing-title">Omega OSINT</h1>
          <p className="landing-tagline">
            Organiza identificadores, traza conexiones y fija ubicaciones de cualquier objetivo.
          </p>
        </div>

        <div className="landing-actions">
          <button className="btn btn-primary landing-cta" onClick={() => setShowNew(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Nuevo proyecto
          </button>
          <button className="btn btn-secondary landing-cta" onClick={handleOpenClick}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            Abrir proyecto
          </button>
        </div>

        {recents.length > 0 && (
          <div className="landing-recents">
            <div className="landing-recents-header">Continuar recientes</div>
            <ul className="landing-recents-list">
              {recents.map((r) => {
                const unsaved = hasUnsavedChanges(r);
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="landing-recent-item"
                      onClick={() => handleResume(r)}
                      title={`Reanudar ${r.name}`}
                    >
                      <div className="landing-recent-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10" />
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                        </svg>
                      </div>
                      <div className="landing-recent-body">
                        <div className="landing-recent-name">{r.name}</div>
                        <div className="landing-recent-meta">
                          Editado {relativeTime(r.snapshotAt)}
                          {unsaved && (
                            <span className="landing-recent-unsaved">
                              · sin guardar
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="landing-recent-remove"
                        role="button"
                        tabIndex={0}
                        aria-label={`Quitar ${r.name} de recientes`}
                        title="Quitar de recientes"
                        onClick={(e) => handleRemoveRecent(e, r.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleRemoveRecent(e, r.id);
                          }
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {error && <div className="landing-error">{error}</div>}

        {/* Visually hidden but still in layout — `display: none` works in
            Chrome but Firefox silently refuses to open the native file
            picker for an input that isn't rendered. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileChosen}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        />
      </div>

      <div className="landing-footer">
        Solo local · Tus datos se quedan en este dispositivo ·{' '}
        <ClearAllDataButton variant="inline" />
      </div>

      {showNew && (
        <div className="modal-backdrop" onClick={() => setShowNew(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleCreate}>
            <h2>Nuevo proyecto</h2>
            <p className="modal-sub">Crea un espacio de trabajo para un nuevo objetivo de investigación.</p>

            <div className="field">
              <label htmlFor="project-name">Nombre del proyecto</label>
              <input
                id="project-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="p. ej. Caso 0042"
              />
            </div>

            <div className="field">
              <label htmlFor="target-name">Nombre del objetivo <span style={{ textTransform: 'none', opacity: 0.6 }}>(opcional)</span></label>
              <input
                id="target-name"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                placeholder="p. ej. Juan Pérez"
              />
            </div>

            {error && <div className="landing-error">{error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowNew(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Crear
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
