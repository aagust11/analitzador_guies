import { useMemo } from 'react';
import { createEmptyProjectState } from '../models';
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

  const createDummyState = () => {
    updateProjectState(() => {
      const empty = createEmptyProjectState();
      const now = new Date().toISOString();
      return {
        ...empty,
        createdAt: now,
        updatedAt: now,
        guides: [
          {
            id: 'dummy-guide',
            title: 'Exemple de guia',
            institution: 'Institut de prova',
            year: '2024',
            status: 'in_progress',
            sourceFileName: 'exemple.pdf',
            storageFileName: 'guide-dummy-guide.bin',
            mimeType: 'application/pdf',
            createdAt: now,
            updatedAt: now,
          },
        ],
      };
    });
  };

  return (
    <section className="page">
      <header className="page__header">
        <div>
          <h2>Configuració</h2>
          <p>Gestiona l'emmagatzematge local i fes proves amb l'estat del projecte.</p>
        </div>
        {isFileSystemSupported && (
          <button type="button" className="button button--primary" onClick={selectDirectory}>
            Tria una carpeta
          </button>
        )}
      </header>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3>Mode d'emmagatzematge</h3>
          <p>
            Actual: <strong>{storageMode === 'file-system' ? 'Carpeta local' : 'Mode navegador'}</strong>
          </p>
          {directoryHandle && <p>Carpeta seleccionada: {directoryHandle.name}</p>}
          {!isFileSystemSupported && (
            <p>
              Aquest navegador no suporta la File System Access API. Emprarem una còpia local (localStorage) i podràs
              exportar les dades més endavant.
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="button button--primary" onClick={createDummyState}>
            Genera estat de prova
          </button>
          <button type="button" className="button" onClick={reloadState}>
            Carrega l'estat desat
          </button>
        </div>
        {lastSavedAt && <p>Darrera sincronització: {new Date(lastSavedAt).toLocaleString()}</p>}
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
