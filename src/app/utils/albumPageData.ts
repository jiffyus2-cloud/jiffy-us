// ============================================================================
// Album Page Data
// ============================================================================
// Cómo se leen las páginas internas de un álbum, venga del editor (estado en
// memoria) o de un pedido guardado (`order.pages`).
//
// `pageLayouts.ts` ya era la única fuente de la geometría, pero cada pantalla
// resolvía por su cuenta CUÁNTOS marcos pintar y de dónde sacar la foto, el
// texto y el recorte de cada uno, y esas copias volvieron a divergir: el visor
// del pedido (checkout y dashboards) se quedaba en la variante guardada aunque
// la página tuviera más fotos, así que enseñaba menos fotos de las que el
// cliente había colocado en el editor.
//
// Aquí vive esa lectura, una sola vez, para que el editor, el visor y el PDF de
// impresión pinten exactamente los mismos marcos con el mismo contenido.
// ============================================================================

import { getClosestAllowed, getPageSlots } from './pageLayouts';
import type { PageVariantId, SlotRect } from './pageLayouts';

/** Recorte por defecto: foto centrada y sin zoom. */
export const DEFAULT_CROP = { x: 50, y: 50, zoom: 1 };

export interface PhotoCrop {
  x: number;
  y: number;
  zoom: number;
  rotation?: number;
}

/** Un marco de la página, ya resuelto: qué lleva dentro y dónde va. */
export interface AlbumPageSlot {
  photo: string | null;
  /** Caja de texto del marco cuando no hay foto, o `null`. */
  text: any | null;
  crop: PhotoCrop;
  rect: SlotRect;
}

/**
 * Pedido o borrador del que se leen las páginas.
 *
 * Los campos sueltos (`pageLayouts`, `textBoxSlots`, `photoCrops`) son el
 * formato viejo, anterior a que cada página guardara lo suyo dentro de
 * `pages[i]`; los pedidos ya cursados los siguen usando.
 */
export interface AlbumPageSource {
  pages?: any[];
  pageLayouts?: Record<number | string, PageVariantId>;
  pageLayoutVariants?: Record<number | string, number>;
  textBoxSlots?: Record<number | string, Record<number | string, any>>;
  photoCrops?: Record<string, PhotoCrop>;
}

/** Las fotos de una página, tanto si es `{ images }` como el array plano viejo. */
export function getPageImages(pageObj: any): (string | null)[] {
  if (Array.isArray(pageObj)) return pageObj;
  return pageObj?.images || [];
}

/**
 * Cuántos marcos pintar en una página.
 *
 * Nunca menos que las fotos que ya tiene: si la variante guardada se quedó
 * corta —un pedido viejo, o un cambio de tamaño que redujo el máximo— la página
 * se dibuja igualmente completa en vez de esconder las fotos sobrantes.
 */
export function getPageSlotCount(
  photoCount: number,
  storedVariant?: number | null,
  size?: string | null,
): number {
  return Math.max(storedVariant ?? 0, getClosestAllowed(photoCount, size), photoCount);
}

/**
 * Los marcos de la página `pageIndex`, en orden de lectura.
 *
 * Lo que guarda la propia página manda sobre los campos sueltos del pedido.
 */
export function getAlbumPageSlots(
  order: AlbumPageSource,
  pageIndex: number,
  size?: string | null,
): AlbumPageSlot[] {
  const pageObj = order.pages?.[pageIndex];
  const fromPage = pageObj && !Array.isArray(pageObj) ? pageObj : null;

  const images = getPageImages(pageObj);
  const storedVariant = fromPage?.variant ?? order.pageLayoutVariants?.[pageIndex];
  const layout = fromPage?.layout ?? order.pageLayouts?.[pageIndex];

  const count = getPageSlotCount(images.length, storedVariant, size);
  const rects = getPageSlots(count, layout, size);

  const slots: AlbumPageSlot[] = [];
  for (let i = 0; i < count; i++) {
    const rect = rects[i];
    if (!rect) continue;
    const photo = images[i] || null;
    slots.push({
      photo,
      text: fromPage?.texts?.[i] ?? order.textBoxSlots?.[pageIndex]?.[i] ?? null,
      crop: fromPage?.crops?.[i] || order.photoCrops?.[`${pageIndex}-${i}`] || DEFAULT_CROP,
      rect,
    });
  }
  return slots;
}
