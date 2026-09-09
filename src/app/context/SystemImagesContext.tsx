import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  SYSTEM_IMAGES_DOC,
  SYSTEM_IMAGE_SLOTS,
  SYSTEM_IMAGE_GALLERIES,
  DEFAULT_CAROUSEL_SLIDES,
  resolveImageRef,
  type SystemImageSlotId,
  type SystemImageGalleryId,
  type CarouselSlide,
} from '../config/systemImages';

/**
 * Sustituciones de las imágenes propias del sistema, vivas desde Firestore.
 *
 * El documento `settings/system_images` guarda lo que la administración ha
 * cambiado; lo que no se ha tocado sale del estado inicial declarado en
 * `config/systemImages.ts`. Así una clave nueva en el código funciona aunque el
 * documento sea viejo.
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
  /** Diapositivas del carrusel, con su imagen y sus textos, en orden. */
  carousel?: CarouselSlide[];
}

interface SystemImagesContextValue {
  images: Record<string, string>;
  galleries: Record<string, string[]>;
  carousel: CarouselSlide[] | null;
  /** false mientras no ha llegado la primera respuesta de Firestore. */
  loaded: boolean;
  error: string | null;
}

const EMPTY: SystemImagesContextValue = {
  images: {},
  galleries: {},
  carousel: null,
  loaded: false,
  error: null,
};

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
          carousel: Array.isArray(data.carousel) ? data.carousel : null,
          loaded: true,
          error: null,
        });
      },
      err => {
        // Sin sustituciones la app funciona igual: se registra y se sigue con los assets locales.
        console.error('Error al escuchar settings/system_images:', err);
        setState({ images: {}, galleries: {}, carousel: null, loaded: true, error: err.message });
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
  SYSTEM_IMAGE_GALLERIES.map(gallery => [gallery.id, gallery.defaultRefs])
);

/** URL de un slot: la que haya puesto la administración o, si no ha tocado nada, la inicial. */
export function useSystemImage(slotId: SystemImageSlotId): string {
  const { images } = useSystemImages();
  return resolveImageRef(images[slotId]) || SLOT_DEFAULTS[slotId];
}

/** Referencias en crudo de una galería (lo que se guarda), para el panel de administración. */
export function useSystemGalleryRefs(galleryId: SystemImageGalleryId): string[] {
  const { galleries } = useSystemImages();
  const stored = galleries[galleryId];
  return useMemo(
    () => (Array.isArray(stored) ? stored : [...GALLERY_DEFAULTS[galleryId]]),
    [stored, galleryId]
  );
}

/**
 * Imágenes de una galería listas para pintar. Una lista vacía guardada es una
 * decisión válida (la administración las quitó todas), así que solo se cae a las
 * iniciales cuando NO hay ninguna lista guardada. Se descartan las referencias
 * que ya no resuelven, para no dejar huecos rotos en la tienda.
 */
export function useSystemGallery(galleryId: SystemImageGalleryId): string[] {
  const refs = useSystemGalleryRefs(galleryId);
  return useMemo(() => refs.map(resolveImageRef).filter(Boolean), [refs]);
}

/** Diapositivas en crudo (con referencias sin resolver), para el panel de administración. */
export function useCarouselSlideRefs(): CarouselSlide[] {
  const { carousel } = useSystemImages();
  return useMemo(() => carousel ?? DEFAULT_CAROUSEL_SLIDES, [carousel]);
}

/**
 * Diapositivas del carrusel con la imagen ya resuelta. Igual que las galerías:
 * una lista vacía guardada se respeta, y las diapositivas cuya imagen ya no
 * existe se descartan en vez de pintarse en blanco.
 */
export function useCarouselSlides(): Array<CarouselSlide & { url: string }> {
  const slides = useCarouselSlideRefs();
  return useMemo(
    () =>
      slides
        .map(slide => ({ ...slide, url: resolveImageRef(slide.ref) }))
        .filter(slide => slide.url !== ''),
    [slides]
  );
}
