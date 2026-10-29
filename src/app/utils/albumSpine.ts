// ============================================================================
// Album Spine
// ============================================================================
// Geometría del lomo de las carátulas de Papel (Tela no lleva lomo). La usan
// el preview (CoverPreview.tsx), el PDF de impresión (OwnerDashboard.tsx) y el
// cálculo de caracteres del lomo (coverTextLimits.ts), para que los tres
// dibujen el mismo lomo.
// ============================================================================

import { ALBUM_BASE_PAGES } from './albumPricing';

/**
 * Grosor del lomo por página, según la tabla del taller:
 *   40 páginas → 0,6 cm · 80 páginas → 1,2 cm · 160 páginas → 2,4 cm
 * Los tres puntos caen en la misma recta (0,015 cm por página), así que los
 * números intermedios se interpolan sobre ella.
 */
export const SPINE_CM_PER_PAGE = 0.6 / 40;

/** El texto del lomo arranca a 1 cm del borde superior en todos los tamaños. */
export const SPINE_TEXT_TOP_CM = 1;

/** Fuente del texto del lomo: 11pt (= 0.3881 cm), igual en todos los grosores. */
export const SPINE_FONT_CM = 0.3881;

/**
 * Ancho del lomo en cm para un álbum de `pageCount` páginas. Sin páginas
 * todavía (personalización, antes de organizar las fotos) se usan las 40 base.
 */
export function getSpineWidthCm(pageCount?: number | null): number {
  const pages = pageCount && pageCount > 0 ? Math.max(pageCount, ALBUM_BASE_PAGES) : ALBUM_BASE_PAGES;
  return Math.round(pages * SPINE_CM_PER_PAGE * 100) / 100;
}
