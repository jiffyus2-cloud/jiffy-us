// ============================================================================
// Photo Ordering
// ============================================================================
// En qué orden entran las fotos al álbum antes de repartirlas en páginas.
//
// Hasta ahora el orden lo decidía un modelo externo (1clic.ai) al que se le
// mandaban los metadatos de cada archivo. Ese módulo quedó obsoleto: el orden
// ahora sale del propio usuario.
//
// Regla, en este orden:
//   1. El orden en que el selector entregó los archivos, que es el orden en que
//      el usuario los fue tocando en el carrete (iOS lo respeta y los numera).
//   2. Para los que no traen esa posición —fotos recuperadas de una copia
//      antigua de IndexedDB, o añadidas por una vía que no la registra— orden
//      alfanumérico por nombre de archivo, con comparación natural para que
//      IMG_2 vaya antes que IMG_10.
//
// Los que no tienen posición van al final: así la secuencia conocida se
// mantiene intacta en vez de quedar troceada por los desconocidos.
// ============================================================================

export interface OrderablePhoto {
  url: string;
  /** Nombre del archivo original; solo se usa cuando falta `order`. */
  name: string;
  /** Posición con la que el selector entregó el archivo. `undefined` si se desconoce. */
  order?: number;
}

/**
 * Comparación natural de nombres: los tramos numéricos se comparan por valor,
 * no carácter a carácter, para que "IMG_2" vaya antes que "IMG_10".
 */
const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function compareFileNames(a: string, b: string): number {
  const byName = naturalCollator.compare(a, b);
  // Desempate estable para nombres que el collator considera iguales
  // ("Foto.JPG" vs "foto.jpg"): sin él el orden dependería del motor.
  return byName !== 0 ? byName : (a < b ? -1 : a > b ? 1 : 0);
}

function hasOrder(item: OrderablePhoto): boolean {
  return typeof item.order === 'number' && Number.isFinite(item.order);
}

/**
 * Devuelve un array nuevo con las fotos en el orden en que deben entrar al
 * álbum. No muta la entrada.
 */
export function sortPhotosBySelection<T extends OrderablePhoto>(items: T[]): T[] {
  const known = items.filter(hasOrder).sort((a, b) => a.order! - b.order!);
  const unknown = items.filter(item => !hasOrder(item)).sort((a, b) => compareFileNames(a.name, b.name));
  return [...known, ...unknown];
}
