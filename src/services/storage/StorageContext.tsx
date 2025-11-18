import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ProjectState, createEmptyProjectState } from '../../models';
import {
  StorageMode,
  StorageService,
  isFileSystemAccessSupported,
  loadPersistedDirectoryHandle,
} from './StorageService';

interface StorageContextValue {
  isReady: boolean;
  storageMode: StorageMode;
  isFileSystemSupported: boolean;
  directoryHandle: FileSystemDirectoryHandle | null;
  projectState: ProjectState;
  lastSavedAt: string | null;
  selectDirectory: () => Promise<void>;
  saveState: (state?: ProjectState) => Promise<void>;
  reloadState: () => Promise<void>;
  updateProjectState: (updater: (state: ProjectState) => ProjectState) => void;
  storageService: StorageService;
}

const StorageContext = createContext<StorageContextValue | undefined>(undefined);

export function StorageProvider({ children }: { children: ReactNode }) {
  const storageServiceRef = useRef(new StorageService());
  const storageService = storageServiceRef.current;

  const [isReady, setIsReady] = useState(false);
  const [storageMode, setStorageMode] = useState<StorageMode>('browser');
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [projectState, setProjectState] = useState<ProjectState>(() => createEmptyProjectState());
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const isFileSystemSupported = isFileSystemAccessSupported();

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      let initialState: ProjectState | null = null;
      if (isFileSystemSupported) {
        const handle = await loadPersistedDirectoryHandle();
        if (handle) {
          try {
            await storageService.initWithDirectoryHandle(handle);
            setDirectoryHandle(handle);
            setStorageMode('file-system');
            initialState = await storageService.loadProjectState();
          } catch (error) {
            console.warn('Stored directory handle is no longer valid, falling back to browser mode', error);
            await storageService.clearDirectoryHandle();
          }
        }
      }
      if (!initialState) {
        initialState = await storageService.loadProjectState();
      }
      if (!cancelled) {
        setProjectState(initialState ?? createEmptyProjectState());
        setIsReady(true);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [storageService, isFileSystemSupported]);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    storageService
      .saveProjectState(projectState)
      .then(() => {
        setLastSavedAt(new Date().toISOString());
      })
      .catch((error) => console.error('No s\'ha pogut sincronitzar l\'estat del projecte', error));
  }, [projectState, isReady, storageService]);

  const selectDirectory = useCallback(async () => {
    if (!isFileSystemSupported) {
      alert('Aquest navegador no suporta la selecció de carpetes (File System Access API).');
      return;
    }
    const picker = window.showDirectoryPicker;
    if (!picker) {
      alert('Aquest navegador no exposa encara la funció showDirectoryPicker.');
      return;
    }
    const handle = await picker();
    await storageService.initWithDirectoryHandle(handle);
    setDirectoryHandle(handle);
    setStorageMode('file-system');
    const loaded = await storageService.loadProjectState();
    setProjectState(loaded ?? createEmptyProjectState());
  }, [isFileSystemSupported, storageService]);

  const saveState = useCallback(
    async (state?: ProjectState) => {
      const payload = state ?? projectState;
      await storageService.saveProjectState(payload);
      setLastSavedAt(new Date().toISOString());
    },
    [projectState, storageService],
  );

  const reloadState = useCallback(async () => {
    const loaded = await storageService.loadProjectState();
    setProjectState(loaded ?? createEmptyProjectState());
  }, [storageService]);

  const updateProjectState = useCallback((updater: (state: ProjectState) => ProjectState) => {
    setProjectState((prev) => {
      const next = updater(prev);
      return { ...next, updatedAt: new Date().toISOString() };
    });
  }, []);

  const value = useMemo<StorageContextValue>(
    () => ({
      isReady,
      storageMode,
      isFileSystemSupported,
      directoryHandle,
      projectState,
      lastSavedAt,
      selectDirectory,
      saveState,
      reloadState,
      updateProjectState,
      storageService,
    }),
    [
      directoryHandle,
      isFileSystemSupported,
      isReady,
      lastSavedAt,
      projectState,
      reloadState,
      saveState,
      selectDirectory,
      storageMode,
      storageService,
      updateProjectState,
    ],
  );

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
}

export function useStorage() {
  const ctx = useContext(StorageContext);
  if (!ctx) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return ctx;
}
