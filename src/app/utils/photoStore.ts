/**
 * Copia de seguridad en IndexedDB de las fotos que el usuario acaba de elegir.
 *
 * Por qué existe: las fotos seleccionadas viven como `blob:` URLs en memoria de
 * la pestaña. iOS descarta la pestaña sin avisar (memoria, app en segundo plano
 * mientras se abre Fototeca/Files, PWA suspendida) y al volver TODAS las `blob:`
 * están muertas: el contador se vuelve cero o las fotos quedan rotas y no se
 * suben nunca. Guardar el Blob en IndexedDB deja los bytes en disco, así que la
 * selección sobrevive a la recarga aunque no haya sesión iniciada ni borrador
 * en el servidor.
 *
 * Reglas de la casa:
 * - Ninguna función lanza: si IndexedDB falla (modo privado, cuota llena,
 *   navegador antiguo) la app sigue funcionando exactamente como antes.
 * - Es una copia temporal, no un almacén: los registros caducan a las 24 h y se
 *   purgan al arrancar.
 */

const DB_NAME = 'JiffyPhotoStore';
const DB_VERSION = 1;
const STORE = 'pending';
const SIGNATURE_INDEX = 'signature';

/** Caducidad de la copia. Pasado este tiempo la selección ya no se ofrece. */
export const PENDING_PHOTO_TTL_MS = 24 * 60 * 60 * 1000;

export interface PendingPhotoInput {
  id: string;
  blob: Blob;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  /** `nombre|tamaño|lastModified`, la misma clave que usa el detector de duplicados. */
  signature: string;
  /** Posición dentro de la selección, para restaurarla en el mismo orden. */
  order: number;
}

export interface PendingPhoto extends PendingPhotoInput {
  savedAt: number;
}

const hasIndexedDB = () => typeof indexedDB !== 'undefined';

function openDB(): Promise<IDBDatabase | null> {
  if (!hasIndexedDB()) return Promise.resolve(null);
  return new Promise(resolve => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex(SIGNATURE_INDEX, 'signature', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function runTx<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => void,
  result: () => T,
  fallback: T
): Promise<T> {
  return openDB().then(db => {
    if (!db) return fallback;
    return new Promise<T>(resolve => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(STORE, mode);
      } catch {
        db.close();
        resolve(fallback);
        return;
      }
      tx.oncomplete = () => { db.close(); resolve(result()); };
      tx.onerror = () => { db.close(); resolve(fallback); };
      tx.onabort = () => { db.close(); resolve(fallback); };
      try {
        work(tx.objectStore(STORE));
      } catch {
        // Un put que revienta por cuota aborta la transacción y cae en onabort.
      }
    });
  });
}

/**
 * Guarda (o reemplaza) las fotos indicadas. Devuelve `true` si la copia quedó
 * escrita; `false` si no se pudo (cuota, modo privado…), sin romper la subida.
 */
export function savePendingPhotos(items: PendingPhotoInput[]): Promise<boolean> {
  if (items.length === 0) return Promise.resolve(true);
  const savedAt = Date.now();
  return runTx(
    'readwrite',
    store => { items.forEach(item => store.put({ ...item, savedAt })); },
    () => true,
    false
  );
}

/** Devuelve la selección guardada, en orden, descartando la caducada. */
export function loadPendingPhotos(ttlMs = PENDING_PHOTO_TTL_MS): Promise<PendingPhoto[]> {
  const cutoff = Date.now() - ttlMs;
  let rows: PendingPhoto[] = [];
  return runTx(
    'readonly',
    store => {
      const req = store.getAll();
      req.onsuccess = () => {
        rows = (req.result as PendingPhoto[])
          .filter(r => r && r.blob && r.savedAt >= cutoff)
          .sort((a, b) => a.order - b.order);
      };
    },
    () => rows,
    []
  );
}

/** Busca una foto por su firma `nombre|tamaño|lastModified`. */
export function findPendingPhotoBySignature(signature: string): Promise<PendingPhoto | null> {
  if (!signature) return Promise.resolve(null);
  let found: PendingPhoto | null = null;
  return runTx(
    'readonly',
    store => {
      const req = store.index(SIGNATURE_INDEX).get(signature);
      req.onsuccess = () => {
        const row = req.result as PendingPhoto | undefined;
        found = row && row.blob ? row : null;
      };
    },
    () => found,
    null
  );
}

/** Borra la copia entera (el usuario quitó todas las fotos o descartó la recuperación). */
export function clearPendingPhotos(): Promise<boolean> {
  return runTx('readwrite', store => { store.clear(); }, () => true, false);
}

/** Borra solo lo caducado. Se llama al montar el organizador. */
export function purgeExpiredPendingPhotos(ttlMs = PENDING_PHOTO_TTL_MS): Promise<boolean> {
  const cutoff = Date.now() - ttlMs;
  return runTx(
    'readwrite',
    store => {
      const req = store.getAll();
      req.onsuccess = () => {
        (req.result as PendingPhoto[]).forEach(row => {
          if (!row || !row.blob || row.savedAt < cutoff) store.delete(row.id);
        });
      };
    },
    () => true,
    false
  );
}
