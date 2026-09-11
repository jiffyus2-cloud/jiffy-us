import { describe, it, expect } from 'vitest';
import {
  VARIANT_SIZES,
  MIN_PAGES,
  MAX_PAGES,
  type DistributionVariant,
  type SizeCounts,
  variantForAlbumSize,
  variantForAllowedSizes,
  maxPhotosFor,
  checkFeasibility,
  nearestFeasiblePages,
  arrangeSizes,
  buildDistributionPlan,
  planIsConsistent,
} from './pageDistribution';

const VARIANTS: DistributionVariant[] = ['A', 'B', 'C'];
const bigOf = (v: DistributionVariant) => VARIANT_SIZES[v][VARIANT_SIZES[v].length - 1];

/** Fuerza bruta independiente: ¿es N suma de exactamente G tamaños permitidos? */
function bruteFeasible(photos: number, pages: number, variant: DistributionVariant): boolean {
  const sizes = VARIANT_SIZES[variant];
  let reachable = new Set([0]);
  for (let p = 0; p < pages; p++) {
    const next = new Set<number>();
    for (const sum of reachable) {
      for (const s of sizes) {
        const t = sum + s;
        if (t <= photos) next.add(t);
      }
    }
    reachable = next;
  }
  return reachable.has(photos);
}

/** El tamaño con más páginas del reparto; en empate, todos los empatados. */
function modalSizes(sizes: number[]): Set<number> {
  const counts = new Map<number, number>();
  for (const s of sizes) counts.set(s, (counts.get(s) ?? 0) + 1);
  const peak = Math.max(...counts.values());
  return new Set([...counts].filter(([, c]) => c === peak).map(([s]) => s));
}

// ── mapeo variante ↔ formato ─────────────────────────────────────────────────

describe('identificación de la variante', () => {
  it('sale del tamaño elegido en la personalización', () => {
    expect(variantForAlbumSize('Horizontal 21x28 cm')).toBe('A');
    expect(variantForAlbumSize('Cuadrado 20x20 cm')).toBe('B');
    expect(variantForAlbumSize('Cuadrado 30x30 cm')).toBe('B');
    expect(variantForAlbumSize('Vertical 28x21 cm')).toBe('C');
    expect(variantForAlbumSize(undefined)).toBe('B'); // por defecto, cuadrado
  });

  it('coincide con los tamaños que declara pageLayouts', () => {
    expect(variantForAllowedSizes([1, 2, 3, 4, 6])).toBe('A');
    expect(variantForAllowedSizes([1, 2, 3, 4, 9])).toBe('B');
    expect(variantForAllowedSizes([1, 2, 3, 6])).toBe('C');
    expect(variantForAllowedSizes([1, 2, 5])).toBeNull();
  });

  it('el máximo de fotos es el tamaño mayor en las 250 páginas', () => {
    expect(maxPhotosFor('A')).toBe(1500);
    expect(maxPhotosFor('B')).toBe(2250);
    expect(maxPhotosFor('C')).toBe(1500);
  });
});

// ── REGLA 1 — factibilidad ───────────────────────────────────────────────────

describe('REGLA 1 — factibilidad', () => {
  it('la fórmula cerrada coincide con la fuerza bruta en todo el espacio pequeño', () => {
    for (const variant of VARIANTS) {
      const big = bigOf(variant);
      for (let pages = 1; pages <= 12; pages++) {
        for (let photos = 0; photos <= big * pages + 2; photos++) {
          const closed = checkFeasibility(photos, pages, variant, { minPages: 1, minPhotos: 0 }).feasible;
          expect(
            closed,
            `variante ${variant}, N=${photos}, G=${pages}`
          ).toBe(bruteFeasible(photos, pages, variant));
        }
      }
    }
  });

  it('N = G es factible en las tres variantes (todas las páginas de 1)', () => {
    for (const variant of VARIANTS) {
      for (const pages of [MIN_PAGES, 41, 137, MAX_PAGES]) {
        expect(checkFeasibility(pages, pages, variant).feasible, `${variant} G=${pages}`).toBe(true);
      }
    }
  });

  it('N = tamaño_mayor × G es factible (todas las páginas al máximo)', () => {
    for (const variant of VARIANTS) {
      for (const pages of [MIN_PAGES, 41, MAX_PAGES]) {
        expect(checkFeasibility(bigOf(variant) * pages, pages, variant).feasible).toBe(true);
      }
    }
  });

  it('N = G − 1 no es factible: alguna página se quedaría vacía', () => {
    for (const variant of VARIANTS) {
      const r = checkFeasibility(99, 100, variant);
      expect(r.feasible).toBe(false);
      expect(r.reason).toBe('too_few_photos');
    }
  });

  it('pasarse del máximo se distingue del hueco de arriba', () => {
    for (const variant of VARIANTS) {
      const r = checkFeasibility(bigOf(variant) * 100 + 1, 100, variant);
      expect(r.feasible).toBe(false);
      expect(r.reason).toBe('too_many_photos');
    }
  });

  // ── los huecos del tope, variante por variante ──
  it('variante A: 6G − 1 es el único valor inalcanzable', () => {
    for (const pages of [MIN_PAGES, 41, 100, MAX_PAGES]) {
      const r = checkFeasibility(6 * pages - 1, pages, 'A');
      expect(r.feasible, `G=${pages}`).toBe(false);
      expect(r.reason).toBe('unreachable_combination');
      // Sus vecinos sí
      expect(checkFeasibility(6 * pages, pages, 'A').feasible).toBe(true);
      expect(checkFeasibility(6 * pages - 2, pages, 'A').feasible).toBe(true);
      expect(checkFeasibility(6 * pages - 3, pages, 'A').feasible).toBe(true);
    }
  });

  it('variante B: 9G − 1 hasta 9G − 4 son inalcanzables, 9G − 5 ya no', () => {
    for (const pages of [MIN_PAGES, 41, 100, MAX_PAGES]) {
      for (let gap = 1; gap <= 4; gap++) {
        const r = checkFeasibility(9 * pages - gap, pages, 'B');
        expect(r.feasible, `G=${pages}, 9G-${gap}`).toBe(false);
        expect(r.reason).toBe('unreachable_combination');
      }
      expect(checkFeasibility(9 * pages - 5, pages, 'B').feasible, `G=${pages}`).toBe(true);
      expect(checkFeasibility(9 * pages, pages, 'B').feasible).toBe(true);
    }
  });

  it('variante C: 6G − 1 y 6G − 2 son inalcanzables, 6G − 3 ya no', () => {
    for (const pages of [MIN_PAGES, 41, 100, MAX_PAGES]) {
      for (const gap of [1, 2]) {
        const r = checkFeasibility(6 * pages - gap, pages, 'C');
        expect(r.feasible, `G=${pages}, 6G-${gap}`).toBe(false);
        expect(r.reason).toBe('unreachable_combination');
      }
      expect(checkFeasibility(6 * pages - 3, pages, 'C').feasible, `G=${pages}`).toBe(true);
      expect(checkFeasibility(6 * pages, pages, 'C').feasible).toBe(true);
    }
  });

  it('rechaza páginas fuera de [40, 250] y fotos fuera de rango', () => {
    expect(checkFeasibility(100, 39, 'B').reason).toBe('pages_out_of_range');
    expect(checkFeasibility(100, 251, 'B').reason).toBe('pages_out_of_range');
    expect(checkFeasibility(39, 40, 'B').reason).toBe('photos_out_of_range');
    expect(checkFeasibility(2251, 250, 'B').reason).toBe('photos_out_of_range');
    expect(checkFeasibility(1501, 250, 'A').reason).toBe('photos_out_of_range');
  });

  it('informa del rango válido aunque la combinación falle', () => {
    const r = checkFeasibility(6 * 100 - 1, 100, 'A');
    expect(r.feasible).toBe(false);
    expect(r.minPhotos).toBe(100);
    expect(r.maxPhotos).toBe(600);
    // 599 fotos necesitan al menos 100 páginas (ceil(599/6)) y como mucho 599
    expect(r.minPages).toBe(100);
    expect(r.maxPages).toBe(599);
  });

  it('propone los recuentos de páginas factibles más cercanos', () => {
    // 6G−1 con G=100: 599 fotos. Hacia abajo/arriba debe encontrar alternativas.
    const near = nearestFeasiblePages(599, 100, 'A');
    expect(near.below).toBe(null); // 599 fotos no caben en menos de 100 páginas
    expect(near.above).toBe(101);
    expect(checkFeasibility(599, 101, 'A').feasible).toBe(true);
  });

  it('respeta el paso al buscar cercanos (el álbum cuenta páginas de dos en dos)', () => {
    const near = nearestFeasiblePages(599, 100, 'A', { step: 2 });
    expect(near.above).toBe(102);
    expect(near.above! % 2).toBe(0);
  });
});

// ── REGLA 2 — colocación ─────────────────────────────────────────────────────

describe('REGLA 2 — colocación de los tamaños', () => {
  const counts = (entries: [number, number][]): SizeCounts => new Map(entries);

  it('2a: abre con una página de 1 foto cuando hay alguna', () => {
    const sizes = arrangeSizes(counts([[1, 2], [2, 2], [4, 1]]));
    expect(sizes[0]).toBe(1);
  });

  it('2a: si el reparto no tiene ninguna página de 1, no la inventa', () => {
    const sizes = arrangeSizes(counts([[2, 3], [4, 2]]));
    expect(sizes).toHaveLength(5);
    expect(sizes.includes(1)).toBe(false);
  });

  it('2b: sin repetidos cuando ningún tamaño pasa de la mitad', () => {
    const sizes = arrangeSizes(counts([[1, 3], [2, 3], [4, 3], [6, 3]]));
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i], `posición ${i} de ${sizes.join(',')}`).not.toBe(sizes[i - 1]);
    }
  });

  it('2b: si hay repetidos, son del tamaño mayoritario', () => {
    const sizes = arrangeSizes(counts([[1, 1], [6, 8]])); // 6 ocupa 8 de 9 páginas
    const modal = modalSizes(sizes);
    for (let i = 1; i < sizes.length; i++) {
      if (sizes[i] === sizes[i - 1]) expect(modal.has(sizes[i])).toBe(true);
    }
  });

  it('no pierde ni inventa páginas', () => {
    const c = counts([[1, 4], [2, 7], [3, 2], [9, 5]]);
    const sizes = arrangeSizes(c);
    expect(sizes).toHaveLength(18);
    for (const [size, count] of c) {
      expect(sizes.filter(s => s === size)).toHaveLength(count);
    }
  });

  it('alterna en vez de agrupar por rachas', () => {
    const sizes = arrangeSizes(counts([[1, 3], [6, 3]]));
    expect(sizes).toEqual([1, 6, 1, 6, 1, 6]);
  });
});

// ── REGLA 3 y plan completo ──────────────────────────────────────────────────

describe('buildDistributionPlan', () => {
  it('devuelve null en las combinaciones no factibles, sin aproximar', () => {
    expect(buildDistributionPlan(6 * 100 - 1, 100, 'A')).toBeNull();
    expect(buildDistributionPlan(9 * 100 - 3, 100, 'B')).toBeNull();
    expect(buildDistributionPlan(6 * 100 - 2, 100, 'C')).toBeNull();
    expect(buildDistributionPlan(39, 40, 'B')).toBeNull();
  });

  it('el plan suma exactamente N en exactamente G páginas', () => {
    for (const variant of VARIANTS) {
      const big = bigOf(variant);
      for (const pages of [40, 41, 63, 250]) {
        for (const photos of [pages, pages + 1, pages * 2, pages * 3 + 7, big * pages - 5, big * pages]) {
          if (!checkFeasibility(photos, pages, variant).feasible) continue;
          const plan = buildDistributionPlan(photos, pages, variant)!;
          expect(plan, `${variant} N=${photos} G=${pages}`).not.toBeNull();
          expect(planIsConsistent(plan, photos, pages), `${variant} N=${photos} G=${pages}`).toBe(true);
        }
      }
    }
  });

  it('solo usa tamaños que el pliego sabe maquetar', () => {
    for (const variant of VARIANTS) {
      const allowed = new Set(VARIANT_SIZES[variant]);
      const plan = buildDistributionPlan(157, 60, variant)!;
      for (const size of plan.sizes) expect(allowed.has(size), `${variant}: tamaño ${size}`).toBe(true);
    }
  });

  it('REGLA 3: no usa páginas de 3 si hay alguna solución sin ellas', () => {
    for (const variant of VARIANTS) {
      for (const pages of [40, 55, 120]) {
        for (const photos of [pages, pages + 40, pages * 2, pages * 3]) {
          if (!checkFeasibility(photos, pages, variant).feasible) continue;
          const plan = buildDistributionPlan(photos, pages, variant)!;
          const threes = plan.counts.get(3) ?? 0;
          // Contraste independiente: ¿existía alguna solución con cero páginas de 3?
          const withoutThree = existsWithoutThrees(photos, pages, variant);
          if (withoutThree) expect(threes, `${variant} N=${photos} G=${pages}`).toBe(0);
        }
      }
    }
  });

  it('REGLA 2a: abre con página de 1 siempre que exista alguna solución que lo permita', () => {
    for (const variant of VARIANTS) {
      for (const pages of [40, 77, 150]) {
        for (const photos of [pages, pages + 3, pages * 2, pages * 4]) {
          if (!checkFeasibility(photos, pages, variant).feasible) continue;
          const plan = buildDistributionPlan(photos, pages, variant)!;
          // Con N < tamaño_mayor × G siempre sobra sitio para dejar una página de 1
          if (photos < bigOf(variant) * pages) {
            expect(plan.startsWithSingle, `${variant} N=${photos} G=${pages}`).toBe(true);
          }
        }
      }
    }
  });

  it('N = tamaño_mayor × G renuncia a la regla 2a: no hay ninguna página de 1', () => {
    for (const variant of VARIANTS) {
      const plan = buildDistributionPlan(bigOf(variant) * 50, 50, variant)!;
      expect(plan.startsWithSingle).toBe(false);
      expect(new Set(plan.sizes)).toEqual(new Set([bigOf(variant)]));
    }
  });

  it('REGLA 2b: cualquier repetición es del tamaño mayoritario', () => {
    for (const variant of VARIANTS) {
      for (const pages of [40, 61, 128]) {
        for (const photos of [pages, pages + 11, pages * 2, pages * 3, bigOf(variant) * pages - 6]) {
          if (!checkFeasibility(photos, pages, variant).feasible) continue;
          const plan = buildDistributionPlan(photos, pages, variant)!;
          const modal = modalSizes(plan.sizes);
          for (let i = 1; i < plan.sizes.length; i++) {
            if (plan.sizes[i] === plan.sizes[i - 1]) {
              expect(
                modal.has(plan.sizes[i]),
                `${variant} N=${photos} G=${pages}: repetido ${plan.sizes[i]} en ${i}`
              ).toBe(true);
            }
          }
        }
      }
    }
  });

  it('barrido completo: todo N factible con G=40 produce un plan consistente', () => {
    for (const variant of VARIANTS) {
      const big = bigOf(variant);
      let built = 0;
      for (let photos = 40; photos <= big * 40; photos++) {
        const feasible = checkFeasibility(photos, 40, variant).feasible;
        const plan = buildDistributionPlan(photos, 40, variant);
        expect(plan !== null, `${variant} N=${photos}: factible=${feasible}`).toBe(feasible);
        if (plan) {
          expect(planIsConsistent(plan, photos, 40), `${variant} N=${photos}`).toBe(true);
          const modal = modalSizes(plan.sizes);
          for (let i = 1; i < plan.sizes.length; i++) {
            if (plan.sizes[i] === plan.sizes[i - 1]) {
              expect(modal.has(plan.sizes[i]), `${variant} N=${photos} rep en ${i}`).toBe(true);
            }
          }
          built++;
        }
      }
      expect(built).toBeGreaterThan(100);
    }
  });

  it('aguanta el álbum más grande de cada variante', () => {
    for (const variant of VARIANTS) {
      const photos = maxPhotosFor(variant);
      const plan = buildDistributionPlan(photos, MAX_PAGES, variant)!;
      expect(planIsConsistent(plan, photos, MAX_PAGES)).toBe(true);
    }
  });
});

/** ¿Existe algún reparto de N en G páginas que no use ninguna página de 3? */
function existsWithoutThrees(photos: number, pages: number, variant: DistributionVariant): boolean {
  const sizes = VARIANT_SIZES[variant].filter(s => s !== 3);
  let reachable = new Set([0]);
  for (let p = 0; p < pages; p++) {
    const next = new Set<number>();
    for (const sum of reachable) {
      for (const s of sizes) {
        const t = sum + s;
        if (t <= photos) next.add(t);
      }
    }
    reachable = next;
  }
  return reachable.has(photos);
}
