import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { ProjectState } from '../models';
import { useStorage } from '../services/storage/StorageContext';
import './PageStyles.css';

export function SettingsPage() {
  const {
    storageMode,
    isFileSystemSupported,
    directoryHandle,
    selectDirectory,
    projectState,
    lastSavedAt,
    reloadState,
    updateProjectState,
  } = useStorage();

  const jsonPreview = useMemo(() => JSON.stringify(projectState, null, 2), [projectState]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const storageLabel = storageMode === 'file-system'
    ? 'Carpeta local (File System Access)'
    : 'Mode navegador (localStorage + IndexedDB)';

  const handleExportProject = () => {
    const blob = new Blob([JSON.stringify(projectState, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `analitzador-projecte-${new Date().toISOString()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleImportProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    event.target.value = '';
    if (file.name.endsWith('.zip')) {
      setImportError('De moment cal extreure manualment el JSON del ZIP per poder-lo importar.');
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ProjectState;
      updateProjectState(() => parsed);
      setImportError(null);
    } catch (error) {
      console.error('No s\'ha pogut importar el projecte', error);
      setImportError('El fitxer seleccionat no és un JSON vàlid.');
    }
  };

  return (
    <section className="page">
      <header className="page__header">
        <div>
          <h2>Configuració</h2>
          <p>Gestiona l'emmagatzematge local, exporta còpies de seguretat i comprova l'estat de la sincronització.</p>
        </div>
        {isFileSystemSupported && (
          <button type="button" className="button button--primary" onClick={selectDirectory}>
            Tria una carpeta local
          </button>
        )}
      </header>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3>Estat de l'emmagatzematge</h3>
          <ul>
            <li>
              Mode actual: <strong>{storageLabel}</strong>
            </li>
            <li>
              API File System Access disponible:{' '}
              <strong>{isFileSystemSupported ? 'sí' : 'no (s\'usarà el mode navegador)'}</strong>
            </li>
            <li>
              Carpeta seleccionada: <strong>{directoryHandle?.name ?? 'cap carpeta'}</strong>
            </li>
            <li>
              Darrera sincronització automàtica:{' '}
              <strong>{lastSavedAt ? new Date(lastSavedAt).toLocaleString() : 'encara no s\'ha desat'}</strong>
            </li>
          </ul>
          <p>
            Les notes, highlights i etiquetes es desen automàticament al cap d'uns segons de cada canvi. Pots forçar una
            recàrrega des del disc si cal.
          </p>
        </div>
        {!isFileSystemSupported && (
          <div
            style={{
              border: '1px solid #f97316',
              borderRadius: '0.75rem',
              padding: '0.75rem',
              background: '#fff7ed',
              color: '#9a3412',
            }}
          >
            Aquest navegador no suporta la File System Access API. Guardarem les dades en localStorage i IndexedDB. Usa
            l'exportació en JSON per moure el projecte entre dispositius o com a còpia de seguretat.
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {isFileSystemSupported && (
            <button type="button" className="button button--primary" onClick={selectDirectory}>
              Torna a seleccionar carpeta
            </button>
          )}
          <button type="button" className="button" onClick={reloadState}>
            Força recàrrega desada
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="button button--primary" onClick={handleExportProject}>
            Exporta projecte (JSON)
          </button>
          <button type="button" className="button" onClick={handleImportClick}>
            Importa projecte (JSON/ZIP)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json,.zip"
            style={{ display: 'none' }}
            onChange={handleImportProject}
          />
        </div>
        {importError && <p style={{ color: '#b91c1c', margin: 0 }}>{importError}</p>}
        <div>
          <h3>ProjectState (JSON)</h3>
          <pre
            style={{
              background: '#0f172a',
              color: '#e2e8f0',
              padding: '1rem',
              borderRadius: '0.75rem',
              maxHeight: '320px',
              overflow: 'auto',
            }}
          >
            {jsonPreview}
          </pre>
        </div>
      </div>
    </section>
  );
}

export default SettingsPage;
