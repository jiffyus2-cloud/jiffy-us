import { describe, it, expect } from 'vitest';
import {
  PAGE_ASPECT_RATIO,
  getAlbumFormat,
  getAllowedPhotosPerPage,
  getClosestAllowed,
  getPageSlots,
  getPageVariants,
  getSelectedVariantId,
  type SlotRect,
} from './pageLayouts';

const SQUARE_20 = 'Cuadrado 20x20 cm';
const SQUARE_30 = 'Cuadrado 30x30 cm';
const HORIZONTAL = 'Horizontal 21x28 cm';
const VERTICAL = 'Vertical 28x21 cm';

/** Proporción real del slot impreso: los % son de ejes distintos. */
const slotRatio = (s: SlotRect, size: string) =>
  (s.w / s.h) * PAGE_ASPECT_RATIO[getAlbumFormat(size)];

const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

describe('getAlbumFormat', () => {
  it('reconoce los cuatro tamaños del catálogo', () => {
    expect(getAlbumFormat(SQUARE_20)).toBe('square');
    expect(getAlbumFormat(SQUARE_30)).toBe('square');
    expect(getAlbumFormat(HORIZONTAL)).toBe('horizontal');
    expect(getAlbumFormat(VERTICAL)).toBe('vertical');
  });

  it('cae en cuadrado cuando el tamaño no dice orientación', () => {
    expect(getAlbumFormat('')).toBe('square');
    expect(getAlbumFormat(undefined)).toBe('square');
  });
});

describe('getAllowedPhotosPerPage', () => {
  it('20x20 y 30x30 admiten los mismos conteos', () => {
    expect(getAllowedPhotosPerPage(SQUARE_20)).toEqual([1, 2, 3, 4, 9]);
    expect(getAllowedPhotosPerPage(SQUARE_30)).toEqual([1, 2, 3, 4, 9]);
  });

  it('vertical no tiene layout de 4 fotos', () => {
    expect(getAllowedPhotosPerPage(VERTICAL)).toEqual([1, 2, 3, 6]);
    expect(getAllowedPhotosPerPage(HORIZONTAL)).toEqual([1, 2, 3, 4, 6]);
  });
});

describe('getClosestAllowed', () => {
  it('sube 4 fotos a la página de 6 en vertical', () => {
    expect(getClosestAllowed(4, VERTICAL)).toBe(6);
    expect(getClosestAllowed(4, HORIZONTAL)).toBe(4);
  });

  it('tope al máximo del formato cuando no cabe', () => {
    expect(getClosestAllowed(12, VERTICAL)).toBe(6);
    expect(getClosestAllowed(12, SQUARE_20)).toBe(9);
  });
});

describe('getPageSlots', () => {
  it('devuelve un marco por foto en todos los layouts del pliego', () => {
    for (const size of [SQUARE_20, HORIZONTAL, VERTICAL]) {
      for (const count of getAllowedPhotosPerPage(size)) {
        expect(getPageSlots(count, 'grid', size)).toHaveLength(count);
      }
    }
  });

  it('ningún marco se sale de la página, en ninguna variante', () => {
    for (const size of [SQUARE_20, HORIZONTAL, VERTICAL]) {
      for (const count of getAllowedPhotosPerPage(size)) {
        for (const variant of getPageVariants(count, size)) {
          for (const s of getPageSlots(count, variant.id, size)) {
            expect(s.x).toBeGreaterThanOrEqual(0);
            expect(s.y).toBeGreaterThanOrEqual(0);
            expect(s.x + s.w).toBeLessThanOrEqual(100.01);
            expect(s.y + s.h).toBeLessThanOrEqual(100.01);
          }
        }
      }
    }
  });

  it('los bloques quedan centrados en la página, en toda variante', () => {
    for (const size of [SQUARE_20, HORIZONTAL, VERTICAL]) {
      for (const count of getAllowedPhotosPerPage(size)) {
        for (const variant of getPageVariants(count, size)) {
          const slots = getPageSlots(count, variant.id, size);
          const left = Math.min(...slots.map(s => s.x));
          const right = 100 - Math.max(...slots.map(s => s.x + s.w));
          const top = Math.min(...slots.map(s => s.y));
          const bottom = 100 - Math.max(...slots.map(s => s.y + s.h));
          expect(near(left, right, 0.02)).toBe(true);
          expect(near(top, bottom, 0.02)).toBe(true);
        }
      }
    }
  });

  it('las variantes de 1 foto tienen las proporciones del pliego', () => {
    const ratioOf = (size: string, id: string) => slotRatio(getPageSlots(1, id, size)[0], size);
    // Cuadrado: cuadrada con margen, a sangre, vertical 0,70 y horizontal 1,43.
    expect(near(ratioOf(SQUARE_20, 'margin'), 1)).toBe(true);
    expect(near(ratioOf(SQUARE_20, 'bleed'), 1)).toBe(true);
    expect(near(ratioOf(SQUARE_20, 'portrait'), 0.7)).toBe(true);
    expect(near(ratioOf(SQUARE_20, 'landscape'), 1.43)).toBe(true);
    // Horizontal: panorámica 2,03 y vertical estrecha 0,67.
    expect(near(ratioOf(HORIZONTAL, 'panorama'), 2.03)).toBe(true);
    expect(near(ratioOf(HORIZONTAL, 'portrait'), 0.67)).toBe(true);
    // Vertical: la horizontal centrada, 1,17.
    expect(near(ratioOf(VERTICAL, 'landscape'), 1.17)).toBe(true);
  });

  it('respeta las proporciones de slot del pliego', () => {
    // Cuadrado: 3 verticales en fila (0,75) y 9 cuadradas (1,00).
    expect(near(slotRatio(getPageSlots(3, 'grid', SQUARE_20)[0], SQUARE_20), 0.75)).toBe(true);
    expect(near(slotRatio(getPageSlots(9, 'grid', SQUARE_20)[0], SQUARE_20), 1)).toBe(true);
    // Horizontal: 6 slots cuadrados aunque la página sea 4:3, y la panorámica 2,03.
    expect(near(slotRatio(getPageSlots(6, 'grid', HORIZONTAL)[0], HORIZONTAL), 1)).toBe(true);
    expect(near(slotRatio(getPageSlots(2, 'column', HORIZONTAL)[0], HORIZONTAL), 2.03)).toBe(true);
    // Vertical: slots de 0,73 tanto en la fila de 3 como en el 3x2.
    expect(near(slotRatio(getPageSlots(3, 'grid', VERTICAL)[0], VERTICAL), 0.73)).toBe(true);
    expect(near(slotRatio(getPageSlots(6, 'grid', VERTICAL)[0], VERTICAL), 0.73)).toBe(true);
  });

  it('mantiene los márgenes propios de cada layout', () => {
    // 17,3 % a los lados en las dos apiladas del cuadrado, contra 3,2 % en el 3x3.
    expect(getPageSlots(2, 'column', SQUARE_20)[0].x).toBeCloseTo(17.34, 1);
    expect(getPageSlots(9, 'grid', SQUARE_20)[0].x).toBeCloseTo(3.23, 1);
    // 13,2 % en el 2x2 horizontal, contra 2,7 % en el 3x2.
    expect(getPageSlots(4, 'grid', HORIZONTAL)[0].x).toBeCloseTo(13.23, 1);
    expect(getPageSlots(6, 'grid', HORIZONTAL)[0].x).toBeCloseTo(2.65, 1);
  });

  it('3 fotos van en fila en los tres formatos', () => {
    for (const size of [SQUARE_20, HORIZONTAL, VERTICAL]) {
      const slots = getPageSlots(3, 'grid', size);
      expect(new Set(slots.map(s => s.y)).size).toBe(1);   // una sola fila
      expect(new Set(slots.map(s => s.x)).size).toBe(3);   // tres columnas
    }
  });

  it('6 fotos van en 3 columnas por 2 filas', () => {
    for (const size of [HORIZONTAL, VERTICAL]) {
      const slots = getPageSlots(6, 'grid', size);
      expect(new Set(slots.map(s => s.x)).size).toBe(3);
      expect(new Set(slots.map(s => s.y)).size).toBe(2);
    }
  });

  it('la orientación en columna solo cambia las páginas de 2 del pliego', () => {
    expect(getPageSlots(2, 'column', SQUARE_20)).not.toEqual(getPageSlots(2, 'grid', SQUARE_20));
    expect(getPageSlots(2, 'column', HORIZONTAL)).not.toEqual(getPageSlots(2, 'grid', HORIZONTAL));
    // Vertical solo tiene las apiladas, y no hay 3 apiladas en ningún formato.
    expect(getPageSlots(2, 'column', VERTICAL)).toEqual(getPageSlots(2, 'grid', VERTICAL));
    expect(getPageSlots(3, 'column', SQUARE_20)).toEqual(getPageSlots(3, 'grid', SQUARE_20));
  });

  it('usa la cuadrícula de reserva para conteos que el pliego no define', () => {
    // Una página vertical de 4 fotos solo puede venir de un pedido antiguo.
    const legacy = getPageSlots(4, 'grid', VERTICAL);
    expect(legacy).toHaveLength(4);
    expect(legacy[0].x).toBeCloseTo(4, 5);
    expect(new Set(legacy.map(s => s.x)).size).toBe(2);
    expect(new Set(legacy.map(s => s.y)).size).toBe(2);
  });
});

describe('getPageVariants', () => {
  it('ofrece las cuatro páginas de 1 foto del pliego', () => {
    expect(getPageVariants(1, SQUARE_20).map(v => v.id)).toEqual(['margin', 'bleed', 'portrait', 'landscape']);
    expect(getPageVariants(1, HORIZONTAL).map(v => v.id)).toEqual(['margin', 'bleed', 'panorama', 'portrait']);
    // Vertical solo trae tres: no hay variante vertical estrecha.
    expect(getPageVariants(1, VERTICAL).map(v => v.id)).toEqual(['margin', 'bleed', 'landscape']);
  });

  it('las páginas de 2 tienen dos variantes salvo en vertical', () => {
    expect(getPageVariants(2, SQUARE_20)).toHaveLength(2);
    expect(getPageVariants(2, HORIZONTAL)).toHaveLength(2);
    expect(getPageVariants(2, VERTICAL)).toHaveLength(1);
  });

  it('el resto de conteos tiene una sola página', () => {
    for (const size of [SQUARE_20, HORIZONTAL, VERTICAL]) {
      for (const count of getAllowedPhotosPerPage(size)) {
        if (count <= 2) continue;
        expect(getPageVariants(count, size)).toHaveLength(1);
      }
    }
  });

  it('está vacío para los conteos que el pliego no define', () => {
    expect(getPageVariants(4, VERTICAL)).toEqual([]);
    expect(getPageVariants(7, SQUARE_20)).toEqual([]);
  });

  it('toda variante trae un marco por foto y una etiqueta', () => {
    for (const size of [SQUARE_20, HORIZONTAL, VERTICAL]) {
      for (const count of getAllowedPhotosPerPage(size)) {
        for (const v of getPageVariants(count, size)) {
          expect(v.slots).toHaveLength(count);
          expect(v.label.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('getSelectedVariantId', () => {
  it('el valor viejo «grid» cae en la variante por defecto', () => {
    expect(getSelectedVariantId(1, 'grid', SQUARE_20)).toBe('margin');
    expect(getSelectedVariantId(2, 'grid', SQUARE_20)).toBe('row');
    expect(getSelectedVariantId(2, undefined, HORIZONTAL)).toBe('row');
  });

  it('respeta la variante elegida', () => {
    expect(getSelectedVariantId(1, 'bleed', SQUARE_20)).toBe('bleed');
    expect(getSelectedVariantId(2, 'column', HORIZONTAL)).toBe('column');
  });

  it('una variante que el formato no tiene cae en la de por defecto', () => {
    expect(getSelectedVariantId(2, 'column', VERTICAL)).toBe('row');
    expect(getSelectedVariantId(1, 'portrait', VERTICAL)).toBe('margin');
  });

  it('es nulo donde no hay nada que elegir', () => {
    expect(getSelectedVariantId(4, 'grid', VERTICAL)).toBe(null);
  });
});
