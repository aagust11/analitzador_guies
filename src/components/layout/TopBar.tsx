import { useMemo } from 'react';
import { useStorage } from '../../services/storage/StorageContext';
import './TopBar.css';

type TopBarProps = {
  title?: string;
  subtitle?: string;
};

export function TopBar({ title = 'Analitzador de guies', subtitle }: TopBarProps) {
  const { storageMode, lastSavedAt, isAutoSaving, hasPendingChanges, isFileSystemSupported } = useStorage();

  const storageLabel = storageMode === 'file-system' ? 'Carpeta local' : 'Mode navegador';
  const supportHint = isFileSystemSupported ? 'File System Access' : 'Sense File System Access';

  const savingLabel = useMemo(() => {
    if (isAutoSaving) {
      return 'Desant canvis…';
    }
    if (hasPendingChanges) {
      return 'Canvis pendents';
    }
    if (lastSavedAt) {
      return `Desat ${new Date(lastSavedAt).toLocaleTimeString()}`;
    }
    return 'Sense canvis pendents';
  }, [hasPendingChanges, isAutoSaving, lastSavedAt]);

  const statusState = isAutoSaving ? 'saving' : hasPendingChanges ? 'pending' : 'idle';

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="topbar__actions">
        <span className="topbar__hint">
          {storageLabel} · {supportHint}
        </span>
        <span className="topbar__autosave" data-state={statusState}>
          <span className="topbar__autosave-indicator" aria-hidden="true" />
          {savingLabel}
        </span>
      </div>
    </header>
  );
}

export default TopBar;
