// ============================================================================
// Page Distribution
// ============================================================================
// Cuántas fotos lleva cada página del álbum.
//
// El reparto anterior repartía "a ojo": una foto por página y las sobrantes de
// una en una sobre las menos llenas. Salían páginas con cualquier número de
// fotos, incluidos conteos que el pliego no sabe maquetar, y no había forma de
// decirle al usuario que su combinación de fotos y páginas era imposible.
//
// Ahora el reparto se plantea como lo que es: escribir N (fotos) como suma de
// exactamente G (páginas) valores tomados del conjunto de tamaños que admite el
// formato. Eso tiene solución o no la tiene, y cuando no la tiene hay que
// decirlo — nunca redondear ni aproximar.
//
// Tres variantes, una por formato de página:
//   A — horizontal: {1, 2, 3, 4, 6}
//   B — cuadrado:   {1, 2, 3, 4, 9}
//   C — vertical:   {1, 2, 3, 6}     (el pliego vertical no tiene página de 4)
//
// Coinciden con ALLOWED_PHOTOS_PER_PAGE de pageLayouts.ts, que sigue siendo la
// única fuente de verdad de qué sabe maquetar cada formato; aquí solo se le
// pone nombre de variante (ver variantForFormat).
//
// Prioridades, en este orden:
//   REGLA 1  factibilidad matemática — obligatoria, o se rechaza
//   REGLA 2  (a) la primera página de 1 foto  (b) sin dos páginas iguales
//            seguidas, salvo el tamaño mayoritario
//   REGLA 3  usar el menor número posible de páginas de 3
// ============================================================================

import { getAlbumFormat, type AlbumFormat } from './pageLayouts';

export type DistributionVariant = 'A' | 'B' | 'C';

/** Tamaños de página que admite cada variante, en orden ascendente. */
export const VARIANT_SIZES: Record<DistributionVariant, number[]> = {
  A: [1, 2, 3, 4, 6],
  B: [1, 2, 3, 4, 9],
  C: [1, 2, 3, 6],
};

/** El tamaño que la regla 3 pide minimizar. */
const SCARCE_SIZE = 3;

export const MIN_PAGES = 40;
export const MAX_PAGES = 250;
export const MIN_PHOTOS = 40;

const VARIANT_BY_FORMAT: Record<AlbumFormat, DistributionVariant> = {
  horizontal: 'A',
  square: 'B',
  vertical: 'C',
};

export function variantForFormat(format: AlbumFormat): DistributionVariant {
  return VARIANT_BY_FORMAT[format];
}

/** Variante a partir de la cadena de `customization.size`. */
export function variantForAlbumSize(size?: string | null): DistributionVariant {
  return variantForFormat(getAlbumFormat(size));
}

/**
 * Variante a partir de la lista de tamaños permitidos, que es lo que llevan
 * `AlbumConfig` y el resto del editor. Devuelve null si la lista no es ninguna
 * de las tres del pliego.
 */
export function variantForAllowedSizes(allowed: number[]): DistributionVariant | null {
  const key = [...allowed].sort((a, b) => a - b).join(',');
  for (const [variant, sizes] of Object.entries(VARIANT_SIZES)) {
    if (sizes.join(',') === key) return variant as DistributionVariant;
  }
  return null;
}

interface VariantSpec {
  sizes: number[];
  /** Tamaño mayor de la variante (6, 9 o 6). */
  big: number;
  /** Tamaño inmediatamente inferior al mayor (4, 4 o 3). */
  second: number;
  hasFour: boolean;
}

function specFor(variant: DistributionVariant): VariantSpec {
  const sizes = VARIANT_SIZES[variant];
  return {
    sizes,
    big: sizes[sizes.length - 1],
    second: sizes[sizes.length - 2],
    hasFour: sizes.includes(4),
  };
}

/** Máximo de fotos que admite la variante: el tamaño mayor en las 250 páginas. */
export function maxPhotosFor(variant: DistributionVariant, maxPages = MAX_PAGES): number {
  return specFor(variant).big * maxPages;
}

// ── REGLA 1 — factibilidad ───────────────────────────────────────────────────

export type InfeasibleReason =
  /** G fuera de [40, 250]. */
  | 'pages_out_of_range'
  /** N fuera de [40, tamaño_mayor × 250]. */
  | 'photos_out_of_range'
  /** N < G: alguna página se quedaría sin foto. */
  | 'too_few_photos'
  /** N > tamaño_mayor × G: no caben ni llenando todas las páginas al máximo. */
  | 'too_many_photos'
  /** Dentro del rango, pero N no se puede escribir como suma de G tamaños. */
  | 'unreachable_combination';

export interface FeasibilityResult {
  feasible: boolean;
  reason?: InfeasibleReason;
  /** Fotos mínimas y máximas que admiten esas G páginas. */
  minPhotos: number;
  maxPhotos: number;
  /** Páginas mínimas y máximas que admiten esas N fotos. */
  minPages: number;
  maxPages: number;
}

export interface FeasibilityOptions {
  minPages?: number;
  maxPages?: number;
  minPhotos?: number;
}

/**
 * ¿Se puede repartir N fotos en exactamente G páginas usando solo los tamaños
 * de la variante? Fórmula cerrada, O(1), sin bucles.
 *
 * El razonamiento es el mismo para las tres variantes. Se cuentan los "extras"
 * de cada página sobre el mínimo de 1 foto: E = N − G. Una página del tamaño
 * mayor aporta `bigX` extras; cualquier otra aporta como mucho `smallX`. Si `k`
 * es cuántas páginas son del tamaño mayor:
 *
 *     E = bigX·k + resto,     0 ≤ resto ≤ smallX·(G − k)
 *
 * De ahí salen las dos cotas de k, y hay solución si dejan algún entero dentro:
 *
 *     k ≥ (E − smallX·G) / (bigX − smallX)      y      k ≤ E / bigX
 *
 * Sustituyendo los valores de cada variante se obtienen exactamente las tres
 * fórmulas del enunciado — incluido el hueco de la variante A en N = 6G − 1,
 * que aquí no hay que tratar aparte: las cotas se cruzan solas.
 *
 * Los huecos cerca del tope no son uno por variante sino tantos como distancia
 * haya entre los dos tamaños mayores: A no alcanza 6G−1; B no alcanza 9G−1 a
 * 9G−4; C no alcanza 6G−1 ni 6G−2. Son los N que exigirían bajar del máximo
 * "menos de lo que mide el salto" entre el tamaño mayor y el siguiente.
 */
export function checkFeasibility(
  photos: number,
  pages: number,
  variant: DistributionVariant,
  opts: FeasibilityOptions = {}
): FeasibilityResult {
  const spec = specFor(variant);
  const lowPages = opts.minPages ?? MIN_PAGES;
  const highPages = opts.maxPages ?? MAX_PAGES;
  const lowPhotos = opts.minPhotos ?? MIN_PHOTOS;
  const highPhotos = spec.big * highPages;

  const base: Omit<FeasibilityResult, 'feasible' | 'reason'> = {
    minPhotos: pages,
    maxPhotos: spec.big * pages,
    minPages: Math.ceil(photos / spec.big),
    maxPages: photos,
  };

  if (!Number.isInteger(pages) || pages < lowPages || pages > highPages) {
    return { ...base, feasible: false, reason: 'pages_out_of_range' };
  }
  if (!Number.isInteger(photos) || photos < lowPhotos || photos > highPhotos) {
    return { ...base, feasible: false, reason: 'photos_out_of_range' };
  }

  const extras = photos - pages;
  if (extras < 0) return { ...base, feasible: false, reason: 'too_few_photos' };

  const bigX = spec.big - 1;
  const smallX = spec.second - 1;
  if (extras > bigX * pages) return { ...base, feasible: false, reason: 'too_many_photos' };

  const kMin = Math.max(0, Math.ceil((extras - smallX * pages) / (bigX - smallX)));
  const kMax = Math.min(pages, Math.floor(extras / bigX));

  return kMin <= kMax
    ? { ...base, feasible: true }
    : { ...base, feasible: false, reason: 'unreachable_combination' };
}

/**
 * Los recuentos de páginas factibles más cercanos por debajo y por encima de
 * `pages`, para poder proponerle al usuario algo concreto en vez de un "no se
 * puede" a secas. `step` permite pedir solo pares, que es como el editor cuenta
 * las páginas del álbum.
 */
export function nearestFeasiblePages(
  photos: number,
  pages: number,
  variant: DistributionVariant,
  opts: FeasibilityOptions & { step?: number } = {}
): { below: number | null; above: number | null } {
  const lowPages = opts.minPages ?? MIN_PAGES;
  const highPages = opts.maxPages ?? MAX_PAGES;
  const step = opts.step ?? 1;

  let below: number | null = null;
  for (let g = pages - step; g >= lowPages; g -= step) {
    if (checkFeasibility(photos, g, variant, opts).feasible) { below = g; break; }
  }
  let above: number | null = null;
  for (let g = pages + step; g <= highPages; g += step) {
    if (checkFeasibility(photos, g, variant, opts).feasible) { above = g; break; }
  }
  return { below, above };
}

// ── REGLA 3 (+ 2a) — elegir cuántas páginas de cada tamaño ───────────────────

/** Cuántas páginas hay de cada tamaño. Indexado por tamaño. */
export type SizeCounts = Map<number, number>;

function totalPhotos(counts: SizeCounts): number {
  let n = 0;
  for (const [size, count] of counts) n += size * count;
  return n;
}

function totalPages(counts: SizeCounts): number {
  let n = 0;
  for (const count of counts.values()) n += count;
  return n;
}

/**
 * ¿Existe reparto con exactamente `three` páginas de 3 y `big` páginas del
 * tamaño mayor? Devuelve cuántas páginas y cuántas fotos quedan para el resto
 * de tamaños, o null si esa combinación ya no cuadra.
 */
function remainderFor(
  photos: number, pages: number, spec: VariantSpec, three: number, big: number
): { restPages: number; restPhotos: number } | null {
  const restPages = pages - three - big;
  if (restPages < 0) return null;
  const restPhotos = photos - SCARCE_SIZE * three - spec.big * big;
  if (restPhotos < restPages) return null; // ni a una foto por página llega
  return { restPages, restPhotos };
}

/**
 * ¿Caben `restPhotos` fotos en `restPages` páginas usando solo los tamaños
 * pequeños distintos de 3 — {1,2,4} en A y B, {1,2} en C — dejando al menos
 * `minOnes` páginas de una sola foto?
 *
 * Sobre el mínimo de una foto por página quedan `spare` fotos que repartir en
 * incrementos de 1 (página de 2) o 3 (página de 4). Gastar el menor número de
 * páginas en ese excedente es lo que deja más páginas de 1 libres, así que basta
 * comprobar ese mínimo.
 */
function restFits(
  restPages: number, restPhotos: number, spec: VariantSpec, minOnes: number
): boolean {
  const spare = restPhotos - restPages;
  if (spare < 0) return false;
  const pagesUsed = spec.hasFour
    ? Math.floor(spare / 3) + (spare % 3)  // tantas de 4 como se pueda, el resto de 2
    : spare;                               // sin tamaño 4: cada extra es una página de 2
  return pagesUsed + minOnes <= restPages;
}

interface CandidateCounts {
  counts: SizeCounts;
  /** Páginas que ocupa el tamaño más repetido: cuantas menos, menos repeticiones fuerza la regla 2b. */
  peak: number;
  distinctSizes: number;
}

function scoreOf(counts: SizeCounts): { peak: number; distinctSizes: number } {
  let peak = 0, distinctSizes = 0;
  for (const count of counts.values()) {
    if (count > 0) distinctSizes++;
    if (count > peak) peak = count;
  }
  return { peak, distinctSizes };
}

/** ¿`a` es preferible a `b`? Menor pico primero; a igualdad, más variedad de tamaños. */
function isBetter(a: CandidateCounts, b: CandidateCounts): boolean {
  if (a.peak !== b.peak) return a.peak < b.peak;
  return a.distinctSizes > b.distinctSizes;
}

/**
 * Elige cuántas páginas hay de cada tamaño.
 *
 * Recorre el número de páginas de 3 de menor a mayor y se queda con el primero
 * que admita solución (REGLA 3: el menor posible). Dentro de ese, explora todos
 * los repartos válidos y se queda con el mejor según `isBetter`.
 *
 * `requireOne` exige al menos una página de 1 foto, que es lo que necesita la
 * REGLA 2a para poder abrir el álbum con ella.
 */
function findCounts(
  photos: number, pages: number, spec: VariantSpec, requireOne: boolean
): SizeCounts | null {
  const minOnes = requireOne ? 1 : 0;

  for (let three = 0; three <= pages; three++) {
    // ¿Este número de páginas de 3 admite alguna solución? O(G).
    let viable = false;
    for (let big = 0; big <= pages - three; big++) {
      const rest = remainderFor(photos, pages, spec, three, big);
      if (rest && restFits(rest.restPages, rest.restPhotos, spec, minOnes)) { viable = true; break; }
    }
    if (!viable) continue;

    // Sí: ahora se explora a fondo ese `three` y se elige el mejor reparto.
    let best: CandidateCounts | null = null;

    for (let big = 0; big <= pages - three; big++) {
      const rest = remainderFor(photos, pages, spec, three, big);
      if (!rest) continue;
      const spare = rest.restPhotos - rest.restPages;
      if (spare < 0) continue;

      // `fours` es el único grado de libertad que queda: fijado él, las páginas
      // de 2 y de 1 salen de las dos ecuaciones (total de páginas y de fotos).
      const maxFours = spec.hasFour ? Math.min(Math.floor(spare / 3), rest.restPages) : 0;
      for (let fours = 0; fours <= maxFours; fours++) {
        const twos = spare - 3 * fours;
        const ones = rest.restPages - twos - fours;
        if (twos < 0 || ones < minOnes) continue;

        const counts: SizeCounts = new Map([
          [1, ones], [2, twos], [3, three], [spec.big, big],
        ]);
        if (spec.hasFour) counts.set(4, fours);

        const candidate: CandidateCounts = { counts, ...scoreOf(counts) };
        if (!best || isBetter(candidate, best)) best = candidate;
      }
    }

    if (best) return best.counts;
  }

  return null;
}

// ── REGLA 2 — colocar los tamaños en las páginas ─────────────────────────────

/**
 * Ordena los tamaños elegidos a lo largo del álbum:
 *
 *   2a — la primera página es de 1 foto siempre que haya alguna.
 *   2b — nunca dos páginas iguales seguidas… salvo el tamaño mayoritario, que
 *        cuando ocupa más de la mitad del álbum no tiene dónde esconderse.
 *
 * Es el reparto codicioso clásico: en cada página se coloca el tamaño al que le
 * quedan más páginas por colocar de entre los que no acaban de salir. Solo
 * cuando ya no queda ningún otro se repite el anterior, y ese caso solo lo
 * alcanza el tamaño mayoritario.
 *
 * Empates: gana el que lleve más tiempo sin salir. Sin ese desempate el álbum
 * agrupa los tamaños en rachas (todos los de 6 al principio) en vez de
 * alternarlos.
 */
export function arrangeSizes(counts: SizeCounts): number[] {
  const remaining = new Map(counts);
  const lastUsedAt = new Map<number, number>();
  for (const size of remaining.keys()) lastUsedAt.set(size, -1);

  const total = totalPages(counts);
  const result: number[] = [];
  let prev: number | null = null;

  for (let i = 0; i < total; i++) {
    let pick: number | null = null;

    // REGLA 2a: abrir con una página de una sola foto.
    if (i === 0 && (remaining.get(1) ?? 0) > 0) {
      pick = 1;
    } else {
      for (const [size, left] of remaining) {
        if (left <= 0 || size === prev) continue;
        if (pick === null) { pick = size; continue; }
        const leftPick = remaining.get(pick)!;
        if (left > leftPick) { pick = size; continue; }
        if (left === leftPick && lastUsedAt.get(size)! < lastUsedAt.get(pick)!) pick = size;
      }
      // Solo queda el tamaño que acaba de salir: se repite (excepción de 2b).
      if (pick === null && prev !== null && (remaining.get(prev) ?? 0) > 0) pick = prev;
    }

    if (pick === null) break; // los recuentos no sumaban `total`; no debería ocurrir
    result.push(pick);
    remaining.set(pick, remaining.get(pick)! - 1);
    lastUsedAt.set(pick, i);
    prev = pick;
  }

  return result;
}

// ── API pública ──────────────────────────────────────────────────────────────

export interface DistributionPlan {
  /** Fotos que lleva cada página, en orden. Longitud = número de páginas. */
  sizes: number[];
  counts: SizeCounts;
  /** false si no se pudo cumplir la regla 2a (no hay ninguna página de 1). */
  startsWithSingle: boolean;
  /** Páginas del tamaño mayoritario que quedaron pegadas a otra igual. */
  repeatedPairs: number;
}

/**
 * El plan de reparto completo: cuántas fotos lleva cada página, en orden.
 *
 * Devuelve null si la combinación no es factible (REGLA 1). Quien llame debe
 * avisar al usuario — nunca redondear el número de páginas ni descartar fotos.
 */
export function buildDistributionPlan(
  photos: number,
  pages: number,
  variant: DistributionVariant,
  opts: FeasibilityOptions = {}
): DistributionPlan | null {
  if (!checkFeasibility(photos, pages, variant, opts).feasible) return null;

  const spec = specFor(variant);
  // REGLA 2a por delante de la 3: primero se busca un reparto que tenga alguna
  // página de 1; solo si no existe ninguno se renuncia a abrir con ella.
  const counts = findCounts(photos, pages, spec, true) ?? findCounts(photos, pages, spec, false);
  if (!counts) return null;

  const sizes = arrangeSizes(counts);

  let repeatedPairs = 0;
  for (let i = 1; i < sizes.length; i++) if (sizes[i] === sizes[i - 1]) repeatedPairs++;

  return {
    sizes,
    counts,
    startsWithSingle: sizes[0] === 1,
    repeatedPairs,
  };
}

/** Comprobación de invariantes, para los tests y para asserts defensivos. */
export function planIsConsistent(plan: DistributionPlan, photos: number, pages: number): boolean {
  return (
    plan.sizes.length === pages &&
    plan.sizes.reduce((a, b) => a + b, 0) === photos &&
    totalPages(plan.counts) === pages &&
    totalPhotos(plan.counts) === photos
  );
}
