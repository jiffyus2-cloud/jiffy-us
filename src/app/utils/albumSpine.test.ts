import { describe, expect, it } from 'vitest';
import { getSpineWidthCm } from './albumSpine';

describe('getSpineWidthCm', () => {
  it('cumple la tabla del taller', () => {
    expect(getSpineWidthCm(40)).toBe(0.6);
    expect(getSpineWidthCm(80)).toBe(1.2);
    expect(getSpineWidthCm(160)).toBe(2.4);
  });

  it('interpola entre los puntos de la tabla', () => {
    expect(getSpineWidthCm(60)).toBe(0.9);
    expect(getSpineWidthCm(120)).toBe(1.8);
  });

  it('sin páginas, o con menos de las base, usa las 40 base', () => {
    expect(getSpineWidthCm()).toBe(0.6);
    expect(getSpineWidthCm(0)).toBe(0.6);
    expect(getSpineWidthCm(20)).toBe(0.6);
  });
});
