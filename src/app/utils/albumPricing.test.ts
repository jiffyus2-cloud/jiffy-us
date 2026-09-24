import { describe, it, expect } from 'vitest';
import { getAlbumPrice, getExtraPagesCost, applyStoreDiscount, ALBUM_BASE_PAGES } from './albumPricing';
import { INITIAL_STORE_CONFIG } from './storeConfigState';

const P = INITIAL_STORE_CONFIG.prices;

describe('getAlbumPrice', () => {
  it('elige el precio por tamaño y tapa', () => {
    expect(getAlbumPrice(P, 'Cuadrado 20x20 cm', false)).toEqual({ base: P.album20x20, extraPage: P.albumExtra20x20 });
    expect(getAlbumPrice(P, 'Cuadrado 20x20 cm', true)).toEqual({ base: P.albumTela20x20, extraPage: P.albumExtra20x20 });
    expect(getAlbumPrice(P, 'Cuadrado 30x30 cm', true)).toEqual({ base: P.albumTela30x30, extraPage: P.albumExtra30x30 });
    expect(getAlbumPrice(P, 'Horizontal 21x28 cm', false)).toEqual({ base: P.albumRect, extraPage: P.albumExtraRect });
    expect(getAlbumPrice(P, 'Vertical 28x21 cm', true)).toEqual({ base: P.albumTelaRect, extraPage: P.albumExtraRect });
  });

  it('un tamaño desconocido cae al 20x20', () => {
    expect(getAlbumPrice(P, undefined, false).base).toBe(P.album20x20);
    expect(getAlbumPrice(P, 'raro', false).base).toBe(P.album20x20);
  });
});

describe('getExtraPagesCost', () => {
  const price = { base: 100, extraPage: 5 };
  it('no cobra las páginas base', () => {
    expect(getExtraPagesCost(price, ALBUM_BASE_PAGES)).toEqual({ count: 0, cost: 0 });
    expect(getExtraPagesCost(price, 10)).toEqual({ count: 0, cost: 0 });
  });
  it('cobra cada página por encima de las base', () => {
    expect(getExtraPagesCost(price, 46)).toEqual({ count: 6, cost: 30 });
  });
});

describe('applyStoreDiscount', () => {
  it('solo descuenta si está activo', () => {
    expect(applyStoreDiscount(150000, { active: false, percentage: 10 })).toBe(150000);
    expect(applyStoreDiscount(150000, { active: true, percentage: 10 })).toBe(135000);
    expect(applyStoreDiscount(150000, { active: true, percentage: 0 })).toBe(150000);
  });
});
