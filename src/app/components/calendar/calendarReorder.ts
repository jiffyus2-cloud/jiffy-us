// Reordenamiento de meses del calendario, igual que las páginas del álbum:
// "intercambiar" cambia dos meses de lugar e "insertar" mueve uno a otra
// posición desplazando los demás. Las fotos van en un arreglo plano
// (photos[mes * imagesPerMonth + slot]) y los recortes y las firmas usan el
// mismo índice, así que los tres se mueven juntos en bloques de un mes.

export type CalendarCrop = { x: number; y: number; zoom: number };

export interface CalendarPhotoState {
  photos: string[];
  crops: Record<number, CalendarCrop>;
  signatures: string[];
}

type MonthBlock = { photos: string[]; crops: (CalendarCrop | undefined)[]; signatures: string[] };

const toMonths = (state: CalendarPhotoState, months: number, perMonth: number): MonthBlock[] =>
  Array.from({ length: months }, (_, m) => {
    const idx = Array.from({ length: perMonth }, (_, s) => m * perMonth + s);
    return {
      photos: idx.map(i => state.photos[i] ?? ''),
      crops: idx.map(i => state.crops[i]),
      signatures: idx.map(i => state.signatures[i] ?? ''),
    };
  });

const fromMonths = (blocks: MonthBlock[]): CalendarPhotoState => {
  const crops: Record<number, CalendarCrop> = {};
  blocks.flatMap(b => b.crops).forEach((c, i) => { if (c) crops[i] = c; });
  return {
    photos: blocks.flatMap(b => b.photos),
    crops,
    signatures: blocks.flatMap(b => b.signatures),
  };
};

export function swapCalendarMonths(
  state: CalendarPhotoState, a: number, b: number, months: number, perMonth: number,
): CalendarPhotoState {
  if (a === b) return state;
  const blocks = toMonths(state, months, perMonth);
  [blocks[a], blocks[b]] = [blocks[b], blocks[a]];
  return fromMonths(blocks);
}

export function moveCalendarMonth(
  state: CalendarPhotoState, from: number, to: number, months: number, perMonth: number,
): CalendarPhotoState {
  if (from === to) return state;
  const blocks = toMonths(state, months, perMonth);
  const [moved] = blocks.splice(from, 1);
  blocks.splice(to, 0, moved);
  return fromMonths(blocks);
}

/**
 * Intercambia dos fotos sueltas por su índice plano (mismo mes o meses
 * distintos), con su recorte y firma. En el calendario de 4 fotos no se puede
 * "agregar" a otro mes porque el diseño es fijo: siempre es un intercambio.
 */
export function swapCalendarPhotos(state: CalendarPhotoState, i: number, j: number): CalendarPhotoState {
  if (i === j) return state;
  const len = Math.max(state.photos.length, i + 1, j + 1);
  const photos = Array.from({ length: len }, (_, k) => state.photos[k] ?? '');
  const signatures = Array.from({ length: len }, (_, k) => state.signatures[k] ?? '');
  [photos[i], photos[j]] = [photos[j], photos[i]];
  [signatures[i], signatures[j]] = [signatures[j], signatures[i]];
  const crops = { ...state.crops };
  const ci = state.crops[i], cj = state.crops[j];
  if (cj) crops[i] = cj; else delete crops[i];
  if (ci) crops[j] = ci; else delete crops[j];
  return { photos, crops, signatures };
}
