import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  INITIAL_STORAGE_POLICY,
  STORAGE_POLICY_DOC_ID,
  mergeStoragePolicy,
  type StoragePolicy,
} from '../app/utils/storagePolicyState';

export interface StoragePolicyState extends StoragePolicy {
  /** true en cuanto el servidor (no la caché) ha contestado. */
  loaded: boolean;
  /** false mientras la tienda funcione con los valores iniciales del código. */
  exists: boolean;
  error: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

/**
 * Política de almacenamiento en vivo desde `settings/storage_policy`.
 *
 * La leen el editor (tope de borradores), el panel del cliente y la pestaña
 * "Gestión de almacenamiento". Mientras no llegue el servidor devuelve los
 * valores iniciales con `loaded: false`, y —igual que `StoreConfigProvider`—
 * un "no existe" que viene de la caché local no cuenta como respuesta.
 */
export function useStoragePolicy(): StoragePolicyState {
  const [state, setState] = useState<StoragePolicyState>({
    ...INITIAL_STORAGE_POLICY,
    loaded: false,
    exists: false,
    error: null,
    updatedAt: null,
    updatedBy: null,
  });

  useEffect(() => {
    const ref = doc(db, 'settings', STORAGE_POLICY_DOC_ID);
    const unsubscribe = onSnapshot(
      ref,
      snap => {
        if (!snap.exists() && snap.metadata.fromCache) return;
        const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
        setState({
          ...mergeStoragePolicy(data),
          loaded: true,
          exists: snap.exists(),
          error: null,
          updatedAt: typeof data?.updatedAt === 'string' ? data.updatedAt : null,
          updatedBy: typeof data?.updatedBy === 'string' ? data.updatedBy : null,
        });
      },
      error => {
        console.error('Error al escuchar settings/storage_policy:', error);
        setState(prev => ({ ...prev, error: error.message }));
      }
    );
    return () => unsubscribe();
  }, []);

  return state;
}
