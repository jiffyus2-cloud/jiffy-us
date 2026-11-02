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
