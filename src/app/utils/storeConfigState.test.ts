import { describe, it, expect } from 'vitest';
import {
  INITIAL_STORE_CONFIG,
  mergeStoredConfig,
  pickStoreConfig,
  type StoreConfig,
} from './storeConfigState';

/**
 * La regla que protegen estos tests: lo guardado por la tienda manda siempre que
 * exista. Cada vez que los valores de fábrica ganaban a lo guardado, la tienda
 * amanecía con precios y promociones viejos.
 */
describe('mergeStoredConfig', () => {
  it('sin nada guardado, devuelve el estado inicial', () => {
    expect(mergeStoredConfig(null)).toEqual(INITIAL_STORE_CONFIG);
    expect(mergeStoredConfig(undefined)).toEqual(INITIAL_STORE_CONFIG);
    expect(mergeStoredConfig({})).toEqual(INITIAL_STORE_CONFIG);
  });

  it('un precio guardado gana al inicial', () => {
    const merged = mergeStoredConfig({ prices: { album20x20: 1 } as any });
    expect(merged.prices.album20x20).toBe(1);
  });

  it('rellena con el inicial las claves que el documento no tiene', () => {
    // Es el caso de un producto nuevo: el documento viejo no lo conoce y sin
    // este relleno se quedaría sin precio.
    const merged = mergeStoredConfig({ prices: { album20x20: 1 } as any });
    expect(merged.prices.calendarWall).toBe(INITIAL_STORE_CONFIG.prices.calendarWall);
  });

  it('respeta un precio a cero en vez de tomarlo por ausente', () => {
    const merged = mergeStoredConfig({ prices: { shippingCali: 0 } as any });
    expect(merged.prices.shippingCali).toBe(0);
  });

  it('respeta una lista de promociones vacía: vaciarlas es una decisión válida', () => {
    const merged = mergeStoredConfig({ promotions: [] });
    expect(merged.promotions).toEqual([]);
  });

  it('devuelve las promociones guardadas tal cual, sin colar las iniciales', () => {
    const promotions = [
      { id: 'p1', title: 'Solo esta', desc: 'x', icon: 'Tag', colorTheme: 'blue', active: false },
    ];
    expect(mergeStoredConfig({ promotions })).toMatchObject({ promotions });
  });

  it('respeta el descuento guardado aunque venga a medias', () => {
    const merged = mergeStoredConfig({ discounts: { active: true } as any });
    expect(merged.discounts.active).toBe(true);
    expect(merged.discounts.percentage).toBe(INITIAL_STORE_CONFIG.discounts.percentage);
  });

  it('ignora secciones con un tipo que no toca en vez de reventar', () => {
    const merged = mergeStoredConfig({ prices: 'roto' as any, promotions: 'roto' as any });
    expect(merged.prices).toEqual(INITIAL_STORE_CONFIG.prices);
    expect(merged.promotions).toEqual(INITIAL_STORE_CONFIG.promotions);
  });

  it('no muta el estado inicial', () => {
    const snapshot = JSON.parse(JSON.stringify(INITIAL_STORE_CONFIG));
    mergeStoredConfig({ prices: { album20x20: 999 } as any, promotions: [] });
    expect(INITIAL_STORE_CONFIG).toEqual(snapshot);
  });
});

describe('pickStoreConfig', () => {
  it('deja fuera las banderas del contexto, que no deben acabar en el documento', () => {
    const contextValue = {
      ...INITIAL_STORE_CONFIG,
      configLoaded: true,
      configError: null,
      configExists: true,
    } as unknown as StoreConfig;

    const picked = pickStoreConfig(contextValue);
    expect(Object.keys(picked).sort()).toEqual(['discounts', 'prices', 'promotions']);
  });

  it('copia en profundidad: editar el formulario no toca el estado ya guardado', () => {
    const picked = pickStoreConfig(INITIAL_STORE_CONFIG);
    picked.prices.calendarWall = 1;
    picked.promotions[0].title = 'otra cosa';
    expect(INITIAL_STORE_CONFIG.prices.calendarWall).not.toBe(1);
    expect(INITIAL_STORE_CONFIG.promotions[0].title).not.toBe('otra cosa');
  });
});
