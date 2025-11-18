import { ProjectState } from '../../models';

export type StorageMode = 'browser' | 'file-system';

/**
 * The storage layer supports two modes:
 * - Native File System Access (preferred) storing files in a user-selected folder.
 * - Browser fallback (localStorage + IndexedDB) storing JSON/base64 payloads.
 *
 * The fallback mode is intentionally simple and is primarily meant to unblock
 * development environments where the File System Access API is not yet available
 * (Firefox/Safari). For production we recommend encouraging the file-system flow.
 */
const PROJECT_STATE_FILE = 'project-state.json';
const LOCAL_STATE_KEY = 'analitzador-guies::project-state';
const GUIDE_FILE_PREFIX = 'analitzador-guies::guide::';
const HANDLE_DB_NAME = 'analitzador-guies-fs';
const HANDLE_STORE_NAME = 'handles';

const GUIDE_DIRECTORY_NAME = 'guides';

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function ensurePersistencePermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }
  try {
    return navigator.storage.persist();
  } catch (error) {
    console.warn('Unable to request persistent storage', error);
    return false;
  }
}

async function openHandleDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    throw new Error('IndexedDB is not available in this environment');
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(HANDLE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        db.createObjectStore(HANDLE_STORE_NAME);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function persistDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(HANDLE_STORE_NAME).put(handle, 'root-directory');
    });
  } catch (error) {
    console.warn('Could not persist directory handle. A new selection will be required next time.', error);
  }
}

export async function loadPersistedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openHandleDb();
    return await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, 'readonly');
      tx.onerror = () => reject(tx.error);
      const request = tx.objectStore(HANDLE_STORE_NAME).get('root-directory');
      request.onsuccess = () => {
        resolve((request.result as FileSystemDirectoryHandle | undefined) ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Could not restore directory handle from IndexedDB', error);
    return null;
  }
}

export async function clearPersistedDirectoryHandle(): Promise<void> {
  try {
    const db = await openHandleDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(HANDLE_STORE_NAME).delete('root-directory');
    });
  } catch (error) {
    console.warn('Could not clear directory handle from IndexedDB', error);
  }
}

function guideFileKey(guideId: string): string {
  return `${GUIDE_FILE_PREFIX}${guideId}`;
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const length = bytes.byteLength;
  for (let i = 0; i < length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = window.atob(base64);
  const length = binary.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}

export class StorageService {
  private mode: StorageMode = 'browser';

  private directoryHandle: FileSystemDirectoryHandle | null = null;

  async initWithDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    this.directoryHandle = handle;
    this.mode = 'file-system';
    await ensurePersistencePermission();
    await persistDirectoryHandle(handle);
  }

  getMode(): StorageMode {
    return this.mode;
  }

  getDirectoryHandle(): FileSystemDirectoryHandle | null {
    return this.directoryHandle;
  }

  async clearDirectoryHandle(): Promise<void> {
    this.directoryHandle = null;
    this.mode = 'browser';
    await clearPersistedDirectoryHandle();
  }

  async saveProjectState(state: ProjectState): Promise<void> {
    if (this.mode === 'file-system' && this.directoryHandle) {
      await this.saveStateToFileSystem(state);
      return;
    }
    const storage = getLocalStorage();
    if (!storage) {
      throw new Error('localStorage is not available for fallback persistence');
    }
    storage.setItem(LOCAL_STATE_KEY, JSON.stringify(state));
  }

  async loadProjectState(): Promise<ProjectState | null> {
    if (this.mode === 'file-system' && this.directoryHandle) {
      const file = await this.readStateFromFileSystem();
      if (!file) {
        return null;
      }
      try {
        return JSON.parse(file);
      } catch (error) {
        console.error('Unable to parse project state file', error);
        return null;
      }
    }
    const storage = getLocalStorage();
    if (!storage) {
      return null;
    }
    const stored = storage.getItem(LOCAL_STATE_KEY);
    if (!stored) {
      return null;
    }
    try {
      return JSON.parse(stored) as ProjectState;
    } catch (error) {
      console.error('Unable to parse project state from localStorage', error);
      return null;
    }
  }

  async saveGuideFile(file: File, guideId: string): Promise<void> {
    if (this.mode === 'file-system' && this.directoryHandle) {
      await this.writeGuideToFileSystem(file, guideId);
      return;
    }

    const storage = getLocalStorage();
    if (!storage) {
      throw new Error('localStorage is not available for fallback persistence');
    }
    const payload = {
      type: file.type,
      name: file.name,
      base64: await blobToBase64(file),
      updatedAt: new Date().toISOString(),
    };
    storage.setItem(guideFileKey(guideId), JSON.stringify(payload));
  }

  async getGuideFileUrl(guideId: string): Promise<string> {
    if (this.mode === 'file-system' && this.directoryHandle) {
      const fileHandle = await this.getGuideFileHandle(guideId);
      if (!fileHandle) {
        throw new Error('Guide file not found');
      }
      const file = await fileHandle.getFile();
      return URL.createObjectURL(file);
    }

    const storage = getLocalStorage();
    if (!storage) {
      throw new Error('localStorage is not available for fallback persistence');
    }
    const stored = storage.getItem(guideFileKey(guideId));
    if (!stored) {
      throw new Error('Guide file not found in fallback storage');
    }
    const { base64, type } = JSON.parse(stored) as { base64: string; type: string };
    const blob = base64ToBlob(base64, type || 'application/pdf');
    return URL.createObjectURL(blob);
  }

  private async saveStateToFileSystem(state: ProjectState): Promise<void> {
    if (!this.directoryHandle) {
      throw new Error('Directory handle is not available');
    }
    const fileHandle = await this.directoryHandle.getFileHandle(PROJECT_STATE_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(state, null, 2));
    await writable.close();
  }

  private async readStateFromFileSystem(): Promise<string | null> {
    if (!this.directoryHandle) {
      return null;
    }
    try {
      const fileHandle = await this.directoryHandle.getFileHandle(PROJECT_STATE_FILE);
      const file = await fileHandle.getFile();
      return file.text();
    } catch (error) {
      console.warn('No project state file found in the selected directory yet', error);
      return null;
    }
  }

  private async ensureGuidesDirectory(): Promise<FileSystemDirectoryHandle> {
    if (!this.directoryHandle) {
      throw new Error('Directory handle is not available');
    }
    return this.directoryHandle.getDirectoryHandle(GUIDE_DIRECTORY_NAME, { create: true });
  }

  private async writeGuideToFileSystem(file: File, guideId: string): Promise<void> {
    const guidesDirectory = await this.ensureGuidesDirectory();
    const fileName = `${guideId}.bin`;
    const fileHandle = await guidesDirectory.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
  }

  private async getGuideFileHandle(guideId: string): Promise<FileSystemFileHandle | null> {
    try {
      const guidesDirectory = await this.ensureGuidesDirectory();
      return guidesDirectory.getFileHandle(`${guideId}.bin`);
    } catch (error) {
      console.warn('Guide file handle not found', error);
      return null;
    }
  }
}
