import { describe, it, expect } from 'vitest';
import { compareFileNames, sortPhotosBySelection, type OrderablePhoto } from './photoOrdering';

const photo = (url: string, name: string, order?: number): OrderablePhoto => ({ url, name, order });
const urls = (items: OrderablePhoto[]) => items.map(i => i.url);

describe('compareFileNames', () => {
  it('compara los tramos numéricos por valor, no carácter a carácter', () => {
    expect(compareFileNames('IMG_2.jpg', 'IMG_10.jpg')).toBeLessThan(0);
    expect(compareFileNames('IMG_10.jpg', 'IMG_2.jpg')).toBeGreaterThan(0);
  });

  it('ignora mayúsculas para ordenar pero desempata de forma estable', () => {
    expect(compareFileNames('foto.jpg', 'Foto2.jpg')).toBeLessThan(0);
    expect(compareFileNames('Foto.JPG', 'foto.JPG')).not.toBe(0);
  });

  it('es simétrica', () => {
    const names = ['a1.jpg', 'A10.jpg', 'b2.png', 'IMG_0001.heic'];
    // `|| 0` normaliza el -0 que devuelve Math.sign al comparar un nombre consigo mismo.
    const sign = (n: number) => Math.sign(n) || 0;
    for (const a of names) {
      for (const b of names) {
        expect(sign(compareFileNames(a, b))).toBe(sign(-compareFileNames(b, a)));
      }
    }
  });
});

describe('sortPhotosBySelection', () => {
  it('respeta el orden de selección aunque el array llegue desordenado', () => {
    const items = [photo('c', 'z.jpg', 2), photo('a', 'a.jpg', 0), photo('b', 'm.jpg', 1)];
    expect(urls(sortPhotosBySelection(items))).toEqual(['a', 'b', 'c']);
  });

  it('NO reordena por nombre cuando hay orden de selección', () => {
    // El usuario tocó primero la foto que alfabéticamente iría la última.
    const items = [photo('a', 'zebra.jpg', 0), photo('b', 'antilope.jpg', 1)];
    expect(urls(sortPhotosBySelection(items))).toEqual(['a', 'b']);
  });

  it('cae a alfanumérico natural cuando ninguna trae orden', () => {
    const items = [photo('c', 'IMG_10.jpg'), photo('a', 'IMG_2.jpg'), photo('b', 'IMG_9.jpg')];
    expect(urls(sortPhotosBySelection(items))).toEqual(['a', 'b', 'c']);
  });

  it('pone las que no tienen orden al final, sin trocear la secuencia conocida', () => {
    const items = [
      photo('sinOrden2', 'b.jpg'),
      photo('con1', 'z.jpg', 1),
      photo('sinOrden1', 'a.jpg'),
      photo('con0', 'y.jpg', 0),
    ];
    expect(urls(sortPhotosBySelection(items))).toEqual(['con0', 'con1', 'sinOrden1', 'sinOrden2']);
  });

  it('trata order 0 como orden válido, no como ausente', () => {
    const items = [photo('b', 'a.jpg'), photo('a', 'z.jpg', 0)];
    expect(urls(sortPhotosBySelection(items))).toEqual(['a', 'b']);
  });

  it('descarta órdenes no finitos y los ordena por nombre', () => {
    const items = [
      photo('nan', 'b.jpg', Number.NaN),
      photo('ok', 'z.jpg', 5),
      photo('inf', 'a.jpg', Number.POSITIVE_INFINITY),
    ];
    expect(urls(sortPhotosBySelection(items))).toEqual(['ok', 'inf', 'nan']);
  });

  it('no muta el array de entrada', () => {
    const items = [photo('b', 'b.jpg', 1), photo('a', 'a.jpg', 0)];
    const snapshot = urls(items);
    sortPhotosBySelection(items);
    expect(urls(items)).toEqual(snapshot);
  });

  it('no pierde ni duplica ninguna foto', () => {
    const items = [
      photo('a', 'a.jpg', 3), photo('b', 'b.jpg'), photo('c', 'c.jpg', 0),
      photo('d', 'd.jpg'), photo('e', 'e.jpg', 1),
    ];
    const result = sortPhotosBySelection(items);
    expect(result).toHaveLength(items.length);
    expect(new Set(urls(result))).toEqual(new Set(urls(items)));
  });

  it('devuelve vacío para entrada vacía', () => {
    expect(sortPhotosBySelection([])).toEqual([]);
  });
});
