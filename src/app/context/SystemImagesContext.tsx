import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  SYSTEM_IMAGES_DOC,
  SYSTEM_IMAGE_SLOTS,
  SYSTEM_IMAGE_GALLERIES,
  type SystemImageSlotId,
  type SystemImageGalleryId,
} from '../config/systemImages';

/**
 * Sustituciones de las imágenes propias del sistema, vivas desde Firestore.
 *
 * El documento `settings/system_images` guarda SOLO lo que la administradora ha
 * cambiado; todo lo demás sigue saliendo del asset por defecto declarado en
 * `config/systemImages.ts`. Así una clave nueva en el código funciona aunque el
 * documento sea viejo, y borrar una sustitución devuelve la imagen original.
 *
 * La lectura es pública (ver firestore.rules), de modo que también funciona para
 * visitantes sin sesión. Si Firestore falla, `overrides` queda vacío y la app se
 * ve exactamente como antes de esta función.
 */

export interface SystemImagesDoc {
  /** id de slot → URL de Storage */
  images?: Record<string, string>;
  /** id de galería → lista ordenada de URLs de Storage */
  galleries?: Record<string, string[]>;
}

interface SystemImagesContextValue {
  images: Record<string, string>;
  galleries: Record<string, string[]>;
  /** false mientras no ha llegado la primera respuesta de Firestore. */
  loaded: boolean;
  error: string | null;
}

const EMPTY: SystemImagesContextValue = { images: {}, galleries: {}, loaded: false, error: null };

const SystemImagesContext = createContext<SystemImagesContextValue>(EMPTY);

export const SystemImagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SystemImagesContextValue>(EMPTY);

  useEffect(() => {
    const ref = doc(db, SYSTEM_IMAGES_DOC.collection, SYSTEM_IMAGES_DOC.id);
    const unsubscribe = onSnapshot(
      ref,
      snap => {
        const data = (snap.exists() ? snap.data() : {}) as SystemImagesDoc;
        setState({
          images: data.images ?? {},
          galleries: data.galleries ?? {},
          loaded: true,
          error: null,
        });
      },
      err => {
        // Sin sustituciones la app funciona igual: se registra y se sigue con los assets locales.
        console.error('Error al escuchar settings/system_images:', err);
        setState({ images: {}, galleries: {}, loaded: true, error: err.message });
      }
    );
    return () => unsubscribe();
  }, []);

  return <SystemImagesContext.Provider value={state}>{children}</SystemImagesContext.Provider>;
};

export const useSystemImages = () => useContext(SystemImagesContext);

const SLOT_DEFAULTS: Record<string, string> = Object.fromEntries(
  SYSTEM_IMAGE_SLOTS.map(slot => [slot.id, slot.defaultUrl])
);

const GALLERY_DEFAULTS: Record<string, readonly string[]> = Object.fromEntries(
  SYSTEM_IMAGE_GALLERIES.map(gallery => [gallery.id, gallery.defaultUrls])
);

/** URL de un slot: la sustitución si existe, si no la imagen que viaja en el bundle. */
export function useSystemImage(slotId: SystemImageSlotId): string {
  const { images } = useSystemImages();
  return images[slotId] || SLOT_DEFAULTS[slotId];
}

/**
 * Imágenes de una galería. Una lista vacía guardada en Firestore es una decisión
 * válida (la administradora las quitó todas), así que solo se cae a las de por
 * defecto cuando NO hay ninguna lista guardada.
 */
export function useSystemGallery(galleryId: SystemImageGalleryId): string[] {
  const { galleries } = useSystemImages();
  const stored = galleries[galleryId];
  return useMemo(
    () => (Array.isArray(stored) ? stored : [...GALLERY_DEFAULTS[galleryId]]),
    [stored, galleryId]
  );
}
