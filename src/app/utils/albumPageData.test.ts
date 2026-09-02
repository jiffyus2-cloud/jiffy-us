import { describe, it, expect } from 'vitest';
import { getAlbumPageSlots, getPageImages, getPageSlotCount, DEFAULT_CROP } from './albumPageData';
import { getPageSlots } from './pageLayouts';

const SQUARE = 'Cuadrado 20x20 cm';
const HORIZONTAL = 'Horizontal 21x28 cm';
const VERTICAL = 'Vertical 28x21 cm';

describe('getPageImages', () => {
  it('lee tanto la página nueva como el array plano viejo', () => {
    expect(getPageImages({ images: ['a', 'b'] })).toEqual(['a', 'b']);
    expect(getPageImages(['a', 'b'])).toEqual(['a', 'b']);
    expect(getPageImages(undefined)).toEqual([]);
    expect(getPageImages({})).toEqual([]);
  });
});

describe('getPageSlotCount', () => {
  it('sube al siguiente conteo que admite el pliego', () => {
    expect(getPageSlotCount(1, null, SQUARE)).toBe(1);
    expect(getPageSlotCount(5, null, SQUARE)).toBe(9);
    expect(getPageSlotCount(5, null, HORIZONTAL)).toBe(6);
    expect(getPageSlotCount(4, null, VERTICAL)).toBe(6);
  });

  it('respeta la variante elegida aunque sobren marcos', () => {
    expect(getPageSlotCount(1, 4, SQUARE)).toBe(4);
    expect(getPageSlotCount(0, 9, SQUARE)).toBe(9);
  });

  it('nunca esconde fotos cuando la variante guardada se queda corta', () => {
    // Una variante de 9 (cuadrado) en un álbum pasado a horizontal, que solo
    // admite 6: la página se pinta con las 9 fotos, no con 6.
    expect(getPageSlotCount(9, 6, HORIZONTAL)).toBe(9);
    expect(getPageSlotCount(3, 2, SQUARE)).toBe(3);
  });
});

describe('getAlbumPageSlots', () => {
  it('lee foto, texto y recorte de la propia página', () => {
    const order = {
      pages: [{
        images: ['foto-a', null],
        variant: 2,
        layout: 'column',
        texts: { 1: { text: 'Hola' } },
        crops: { 0: { x: 10, y: 20, zoom: 2 } },
      }],
    };
    const slots = getAlbumPageSlots(order, 0, SQUARE);

    expect(slots).toHaveLength(2);
    expect(slots[0].photo).toBe('foto-a');
    expect(slots[0].crop).toEqual({ x: 10, y: 20, zoom: 2 });
    expect(slots[1].photo).toBeNull();
    expect(slots[1].text).toEqual({ text: 'Hola' });
    expect(slots[1].crop).toEqual(DEFAULT_CROP);
    // La variante elegida manda sobre la de por defecto.
    expect(slots.map(s => s.rect)).toEqual(getPageSlots(2, 'column', SQUARE));
  });

  it('cae en los campos sueltos de los pedidos viejos', () => {
    const order = {
      pages: [['foto-a', null]],
      pageLayouts: { 0: 'column' },
      pageLayoutVariants: { 0: 2 },
      textBoxSlots: { 0: { 1: { text: 'Hola' } } },
      photoCrops: { '0-0': { x: 10, y: 20, zoom: 2 } },
    };
    const slots = getAlbumPageSlots(order, 0, SQUARE);

    expect(slots.map(s => s.photo)).toEqual(['foto-a', null]);
    expect(slots[0].crop).toEqual({ x: 10, y: 20, zoom: 2 });
    expect(slots[1].text).toEqual({ text: 'Hola' });
    expect(slots.map(s => s.rect)).toEqual(getPageSlots(2, 'column', SQUARE));
  });

  it('pinta todas las fotos aunque la variante guardada se haya quedado corta', () => {
    const order = { pages: [{ images: ['a', 'b', 'c'], variant: 2 }] };
    expect(getAlbumPageSlots(order, 0, SQUARE).map(s => s.photo)).toEqual(['a', 'b', 'c']);
  });

  it('el layout viejo o desconocido cae en la variante por defecto', () => {
    const order = { pages: [{ images: ['a', 'b'], variant: 2, layout: 1 }] };
    expect(getAlbumPageSlots(order, 0, SQUARE).map(s => s.rect))
      .toEqual(getPageSlots(2, 'row', SQUARE));
  });

  it('una página sin fotos deja un marco vacío, como en el editor', () => {
    const blank = getAlbumPageSlots({ pages: [[]] }, 0, SQUARE);
    expect(blank).toHaveLength(1);
    expect(blank[0].photo).toBeNull();
    expect(blank[0].text).toBeNull();
  });
});
