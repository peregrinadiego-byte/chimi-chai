import { Project } from '../types/apu';

const PROJECT_STORAGE_KEY = 'ezapu_active_project';
const DATABASE_NAME = 'ezapu-storage';
const STORE_NAME = 'projects';
const PROJECT_RECORD_KEY = 'active';

function openProjectDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Guarda siempre en IndexedDB y usa localStorage como copia rápida. */
export async function saveProject(project: Project): Promise<void> {
  const serialized = JSON.stringify(project);
  try {
    localStorage.setItem(PROJECT_STORAGE_KEY, serialized);
  } catch (error) {
    console.warn('localStorage no pudo guardar el proyecto; se usará IndexedDB.', error);
  }

  try {
    const database = await openProjectDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(project, PROJECT_RECORD_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  } catch (error) {
    console.warn('No se pudo guardar el proyecto en IndexedDB.', error);
  }
}

/** Recupera el proyecto grande primero; luego deja localStorage como respaldo. */
export async function loadPersistedProject(): Promise<Project | null> {
  try {
    const database = await openProjectDatabase();
    const project = await new Promise<Project | null>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(PROJECT_RECORD_KEY);
      request.onsuccess = () => resolve((request.result as Project | undefined) || null);
      request.onerror = () => reject(request.error);
    });
    database.close();
    if (project) return project;
  } catch (error) {
    console.warn('No se pudo leer IndexedDB; se intentará localStorage.', error);
  }

  try {
    const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
    return saved ? JSON.parse(saved) as Project : null;
  } catch (error) {
    console.warn('No se pudo leer el proyecto guardado.', error);
    return null;
  }
}
