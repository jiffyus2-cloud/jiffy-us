// ============================================================================
// Page Layouts
// ============================================================================
// Única fuente de verdad para la maquetación de las páginas internas del álbum.
//
// Antes esta lógica estaba copiada en PhotoOrganizer (editor), OwnerDashboard
// (render del PDF de impresión) y OrderDetailsModal (vista del pedido), y las
// copias habían divergido: la de impresión ignoraba `layout === 'row'` en las
// páginas de 3 fotos, así que un álbum vertical que el cliente aprobaba en fila
// se imprimía en columna.
//
// La geometría sale de los pliegos de "Páginas Internas" (Cuadrado 20x20 y
// 30x30, Horizontal, Vertical). Cada slot lleva su rectángulo explícito en % de
// la página, con origen arriba-izquierda: los pliegos no usan una cuadrícula
// uniforme, sino márgenes y proporciones distintos en cada layout (17,3 % a los
// lados en las dos apiladas del cuadrado, 13,2 % en el 2x2 horizontal, 3,2 % en
// el 3x3). Antes se pintaba todo con una cuadrícula de margen 4 % y calle 2 %,
// estirando cada foto a su celda.
//
// Los dos tamaños cuadrados comparten exactamente los mismos nueve layouts, por
// eso aquí solo hay tres formatos.
// ============================================================================

export type AlbumFormat = 'square' | 'horizontal' | 'vertical';

/** Orientación elegida por el usuario cuando el pliego ofrece dos variantes. */
export type PageLayoutOrientation = 'grid' | 'row' | 'column';

/** Marco de una foto, en % del ancho y del alto de la página. */
export interface SlotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Proporción ancho/alto de la página de cada formato. */
export const PAGE_ASPECT_RATIO: Record<AlbumFormat, number> = {
  square: 1,
  horizontal: 4 / 3,
  vertical: 3 / 4,
};

/**
 * Fotos por página que admite cada pliego.
 *
 * Vertical no tiene layout de 4: el pliego solo define páginas de 1, 2, 3 y 6.
 */
export const ALLOWED_PHOTOS_PER_PAGE: Record<AlbumFormat, number[]> = {
  square: [1, 2, 3, 4, 9],
  horizontal: [1, 2, 3, 4, 6],
  vertical: [1, 2, 3, 6],
};

/**
 * Marcos de cada layout del pliego.
 *
 * `row` es la variante por defecto; `column` solo existe donde el pliego define
 * de verdad una segunda disposición (las páginas de 2 fotos en cuadrado y en
 * horizontal). En vertical hay una sola forma de página de 2 fotos, y no hay
 * ningún layout de 3 fotos apiladas en ninguno de los cuatro documentos.
 */
const PAGE_SLOTS: Record<AlbumFormat, Record<number, { row: SlotRect[]; column?: SlotRect[] }>> = {
  square: {
    1: {
      // Una foto cuadrada con margen del 5 % (1 cm en 20x20, 1,5 cm en 30x30).
      row: [
        { x: 5.03, y: 5.03, w: 89.93, h: 89.93 },
      ],
    },
    2: {
      // Dos verticales lado a lado / dos horizontales apiladas.
      row: [
        { x: 3.78, y: 17.34, w: 45.7, h: 65.32 },
        { x: 50.51, y: 17.34, w: 45.7, h: 65.32 },
      ],
      column: [
        { x: 17.34, y: 3.78, w: 65.32, h: 45.7 },
        { x: 17.34, y: 50.51, w: 65.32, h: 45.7 },
      ],
    },
    3: {
      row: [
        { x: 0.87, y: 28.74, w: 31.83, h: 42.52 },
        { x: 34.09, y: 28.74, w: 31.83, h: 42.52 },
        { x: 67.31, y: 28.74, w: 31.83, h: 42.52 },
      ],
    },
    4: {
      row: [
        { x: 3.53, y: 3.75, w: 45.53, h: 45.53 },
        { x: 50.94, y: 3.75, w: 45.53, h: 45.53 },
        { x: 3.53, y: 50.72, w: 45.53, h: 45.53 },
        { x: 50.94, y: 50.72, w: 45.53, h: 45.53 },
      ],
    },
    9: {
      row: [
        { x: 3.23, y: 3.14, w: 30.17, h: 30.17 },
        { x: 34.92, y: 3.14, w: 30.17, h: 30.17 },
        { x: 66.6, y: 3.14, w: 30.17, h: 30.17 },
        { x: 3.23, y: 34.92, w: 30.17, h: 30.17 },
        { x: 34.92, y: 34.92, w: 30.17, h: 30.17 },
        { x: 66.6, y: 34.92, w: 30.17, h: 30.17 },
        { x: 3.23, y: 66.69, w: 30.17, h: 30.17 },
        { x: 34.92, y: 66.69, w: 30.17, h: 30.17 },
        { x: 66.6, y: 66.69, w: 30.17, h: 30.17 },
      ],
    },
  },
  horizontal: {
    1: {
      row: [
        { x: 5.53, y: 7.09, w: 88.94, h: 85.83 },
      ],
    },
    2: {
      // Dos verticales lado a lado / dos panorámicas apiladas.
      row: [
        { x: 4.54, y: 5.8, w: 44.5, h: 88.41 },
        { x: 50.96, y: 5.8, w: 44.5, h: 88.41 },
      ],
      column: [
        { x: 17.15, y: 4.87, w: 65.71, h: 43.06 },
        { x: 17.15, y: 52.07, w: 65.71, h: 43.06 },
      ],
    },
    3: {
      row: [
        { x: 10.75, y: 27.46, w: 25.47, h: 45.08 },
        { x: 37.27, y: 27.46, w: 25.47, h: 45.08 },
        { x: 63.78, y: 27.46, w: 25.47, h: 45.08 },
      ],
    },
    4: {
      row: [
        { x: 13.23, y: 6.43, w: 36.09, h: 42.89 },
        { x: 50.68, y: 6.43, w: 36.09, h: 42.89 },
        { x: 13.23, y: 50.68, w: 36.09, h: 42.89 },
        { x: 50.68, y: 50.68, w: 36.09, h: 42.89 },
      ],
    },
    6: {
      // Slots cuadrados exactos aunque la página no lo sea.
      row: [
        { x: 2.65, y: 7.9, w: 30.36, h: 40.45 },
        { x: 34.82, y: 7.9, w: 30.36, h: 40.45 },
        { x: 66.99, y: 7.9, w: 30.36, h: 40.45 },
        { x: 2.65, y: 51.65, w: 30.36, h: 40.45 },
        { x: 34.82, y: 51.65, w: 30.36, h: 40.45 },
        { x: 66.99, y: 51.65, w: 30.36, h: 40.45 },
      ],
    },
  },
  vertical: {
    1: {
      row: [
        { x: 7.2, y: 5.33, w: 85.61, h: 89.34 },
      ],
    },
    2: {
      // El pliego vertical solo trae las apiladas.
      row: [
        { x: 14.52, y: 9.16, w: 70.96, h: 39.17 },
        { x: 14.52, y: 51.67, w: 70.96, h: 39.17 },
      ],
    },
    3: {
      row: [
        { x: 3.82, y: 34.46, w: 30.29, h: 31.07 },
        { x: 34.86, y: 34.46, w: 30.29, h: 31.07 },
        { x: 65.89, y: 34.46, w: 30.29, h: 31.07 },
      ],
    },
    6: {
      row: [
        { x: 3.82, y: 16.74, w: 30.29, h: 31.07 },
        { x: 34.86, y: 16.74, w: 30.29, h: 31.07 },
        { x: 65.89, y: 16.74, w: 30.29, h: 31.07 },
        { x: 3.82, y: 52.19, w: 30.29, h: 31.07 },
        { x: 34.86, y: 52.19, w: 30.29, h: 31.07 },
        { x: 65.89, y: 52.19, w: 30.29, h: 31.07 },
      ],
    },
  },
};

/**
 * El tamaño llega como la cadena de `customization.size` ("Cuadrado 20x20 cm",
 * "Horizontal 21x28 cm", "Vertical 28x21 cm"). Cuando no dice orientación se
 * asume cuadrado, que es la proporción con la que se dibuja la página en ese
 * mismo caso (aspectRatio 1/1).
 */
export function getAlbumFormat(size?: string | null): AlbumFormat {
  const s = size || '';
  if (s.includes('Horizontal')) return 'horizontal';
  if (s.includes('Vertical')) return 'vertical';
  return 'square';
}

export function getAllowedPhotosPerPage(size?: string | null): number[] {
  return ALLOWED_PHOTOS_PER_PAGE[getAlbumFormat(size)];
}

/** Primer conteo permitido que cabe `count` fotos, o el máximo del formato. */
export function getClosestAllowed(count: number, size?: string | null): number {
  const allowed = getAllowedPhotosPerPage(size);
  return allowed.find(opt => opt >= count) ?? allowed[allowed.length - 1];
}

/**
 * ¿Esta página admite elegir orientación? Solo donde el pliego define las dos
 * variantes: páginas de 2 fotos en cuadrado y en horizontal.
 */
export function hasOrientationChoice(count: number, size?: string | null): boolean {
  return PAGE_SLOTS[getAlbumFormat(size)][count]?.column !== undefined;
}

/**
 * Cuadrícula de reserva para conteos que el pliego no define. Solo la alcanzan
 * pedidos antiguos con variantes que ya no se pueden crear (p. ej. una página
 * vertical de 4 fotos): mantiene el reparto uniforme de margen 4 % y calle 2 %
 * que se usaba antes, para que esos álbumes se sigan viendo como se aprobaron.
 */
function fallbackSlots(count: number, format: AlbumFormat): SlotRect[] {
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const ar = PAGE_ASPECT_RATIO[format];
  // El `p-[4%]` original resolvía contra el ancho también en vertical.
  const padX = 4, gapX = 2;
  const padY = 4 * ar, gapY = 2 * ar;
  const w = (100 - 2 * padX - gapX * (cols - 1)) / cols;
  const h = (100 - 2 * padY - gapY * (rows - 1)) / rows;
  const out: SlotRect[] = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    out.push({ x: padX + c * (w + gapX), y: padY + r * (h + gapY), w, h });
  }
  return out;
}

/**
 * Marcos de las `count` fotos de una página, en % de la página.
 *
 * El índice de cada marco es el índice de la foto, en orden de lectura.
 */
export function getPageSlots(
  count: number,
  layout?: PageLayoutOrientation | string | null,
  size?: string | null,
): SlotRect[] {
  const format = getAlbumFormat(size);
  const entry = PAGE_SLOTS[format][count];
  if (!entry) return fallbackSlots(count, format);
  return layout === 'column' && entry.column ? entry.column : entry.row;
}
