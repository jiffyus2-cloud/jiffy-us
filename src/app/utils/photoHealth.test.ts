import { describe, it, expect } from 'vitest';
import { collectDesignPhotos, collectOrderPhotos, describePhotoLocations, getOrderPhotoKind } from './photoHealth';

describe('collectDesignPhotos', () => {
  it('álbum: portada + cada foto con su página y marco, sin huecos', () => {
    const refs = collectDesignPhotos([['a', null, 'b'], ['c']], 'cover', 'album');
    expect(refs).toEqual([
      { url: 'cover', pageIndex: -1, slotIndex: -1 },
      { url: 'a', pageIndex: 0, slotIndex: 0 },
      { url: 'b', pageIndex: 0, slotIndex: 2 },
      { url: 'c', pageIndex: 1, slotIndex: 0 },
    ]);
  });

  it('calendario: una foto por posición (string o [string]), conservando el índice', () => {
    expect(collectDesignPhotos(['x', '', ['y']], undefined, 'calendar')).toEqual([
      { url: 'x', pageIndex: 0, slotIndex: 0 },
      { url: 'y', pageIndex: 2, slotIndex: 0 },
    ]);
  });
});

describe('collectOrderPhotos / getOrderPhotoKind', () => {
  it('lee pages[].images y la portada de un álbum guardado', () => {
    const order = { product: { type: 'album' }, coverData: { image: 'c' }, pages: [{ images: ['p1'] }, { images: [null, 'p2'] }] };
    expect(getOrderPhotoKind(order)).toBe('album');
    expect(collectOrderPhotos(order, 'album').map(r => `${r.pageIndex}:${r.url}`)).toEqual(['-1:c', '0:p1', '1:p2']);
  });

  it('un calendario usa photos y no la portada', () => {
    const order = { productType: 'calendar', coverData: { image: 'c' }, photos: ['m1', 'm2'] };
    expect(getOrderPhotoKind(order)).toBe('calendar');
    expect(collectOrderPhotos(order, 'calendar').map(r => r.url)).toEqual(['m1', 'm2']);
  });
});

describe('describePhotoLocations', () => {
  const ref = (pageIndex: number) => ({ url: `u${pageIndex}`, pageIndex, slotIndex: 0 });

  it('nombra la portada y las páginas (1-based, sin repetir, ordenadas)', () => {
    expect(describePhotoLocations([ref(64), ref(62), ref(63), ref(63), ref(-1)], 'album'))
      .toBe('la portada y las páginas 63, 64 y 65');
  });

  it('singular y calendario', () => {
    expect(describePhotoLocations([ref(4)], 'album')).toBe('la página 5');
    expect(describePhotoLocations([ref(0), ref(2)], 'calendar')).toBe('las fotos 1 y 3');
  });

  it('acorta listas largas', () => {
    const refs = Array.from({ length: 15 }, (_, i) => ref(i));
    expect(describePhotoLocations(refs, 'album')).toBe('las páginas 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 y 3 más');
  });
});
