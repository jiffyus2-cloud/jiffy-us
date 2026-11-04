import { describe, expect, it } from 'vitest';
import { getPhotoAspect, getPhotoBoxes, getCalendarPrintPages, normalizeCalendarDesign } from './CalendarTemplate';

describe('getPhotoBoxes', () => {
  it('pared x4 sigue la plantilla: 2x2 a todo el ancho con 19,75 pt entre fotos', () => {
    const boxes = getPhotoBoxes('wall', 4);
    expect(boxes).toHaveLength(4);
    const [tl, tr, bl, br] = boxes;
    expect(tl.x).toBe(0);
    expect(tl.y).toBeCloseTo(27.88, 1);
    expect(tr.x + tr.w).toBeCloseTo(850.5, 1);
    expect(br.y + br.h).toBeCloseTo(595.38, 1);
    expect(tr.x - (tl.x + tl.w)).toBeCloseTo(19.75, 2);
    expect(bl.y - (tl.y + tl.h)).toBeCloseTo(19.75, 2);
    // Medidas del PDF: cada foto mide ~415 x ~274 pt
    expect(tl.w).toBeCloseTo(415.4, 0);
    expect(tl.h).toBeCloseTo(273.9, 0);
  });

  it('la foto única de pared no cambia', () => {
    expect(getPhotoBoxes('wall', 1)).toEqual([{ x: 0, y: 30.7, w: 850.5, h: 561.8 }]);
    expect(getPhotoAspect('wall', 4)).toBeCloseTo(415.375 / 273.875, 3);
  });
});

describe('diseño de escritorio "etiqueta"', () => {
  it('no lleva hoja de notas: 13 páginas', () => {
    const pages = getCalendarPrintPages('desk', 'label');
    expect(pages).toHaveLength(13);
    expect(pages.some(p => p.kind === 'notes')).toBe(false);
    expect(getCalendarPrintPages('desk')).toHaveLength(14);
  });

  it('solo aplica al escritorio', () => {
    expect(normalizeCalendarDesign('desk', 'label')).toBe('label');
    expect(normalizeCalendarDesign('wall', 'label')).toBe('classic');
    expect(normalizeCalendarDesign('desk', undefined)).toBe('classic');
  });
});
