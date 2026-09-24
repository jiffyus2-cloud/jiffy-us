import { describe, it, expect } from 'vitest';
import {
  entriesToMap,
  mapToEntries,
  parseSystemTextsDoc,
  resolveText,
  interpolate,
  placeholdersOf,
  validateEditedText,
  EMPTY_OVERRIDES,
} from './systemTexts';

const DEFAULTS = {
  es: { 'a.title': 'Hola', 'a.only': 'Solo español', 'a.count': 'Tienes {count} fotos' },
  en: { 'a.title': 'Hello' },
};

describe('entriesToMap / mapToEntries', () => {
  it('convierte claves con puntos sin interpretarlas como rutas', () => {
    const map = entriesToMap([{ key: 'landing.hero.title', value: 'Hola' }]);
    expect(map).toEqual({ 'landing.hero.title': 'Hola' });
    expect(mapToEntries(map)).toEqual([{ key: 'landing.hero.title', value: 'Hola' }]);
  });

  it('descarta entradas mal formadas o vacías', () => {
    expect(entriesToMap([{ key: 'a', value: '  ' }, { key: 1, value: 'x' }, null, 'x'])).toEqual({});
    expect(entriesToMap(undefined)).toEqual({});
  });

  it('un documento inexistente no sustituye nada', () => {
    expect(parseSystemTextsDoc(undefined)).toEqual(EMPTY_OVERRIDES);
  });
});

describe('resolveText', () => {
  it('lo editado manda sobre el código', () => {
    const overrides = { es: { 'a.title': 'Buenas' }, en: {} };
    expect(resolveText('a.title', 'es', overrides, DEFAULTS)).toBe('Buenas');
  });

  it('sin edición sale el texto del código', () => {
    expect(resolveText('a.title', 'es', EMPTY_OVERRIDES, DEFAULTS)).toBe('Hola');
    expect(resolveText('a.title', 'en', EMPTY_OVERRIDES, DEFAULTS)).toBe('Hello');
  });

  it('una clave solo en español se usa también en inglés, con su edición', () => {
    expect(resolveText('a.only', 'en', EMPTY_OVERRIDES, DEFAULTS)).toBe('Solo español');
    const overrides = { es: { 'a.only': 'Editado' }, en: {} };
    expect(resolveText('a.only', 'en', overrides, DEFAULTS)).toBe('Editado');
  });

  it('una clave desconocida devuelve undefined', () => {
    expect(resolveText('nope', 'es', EMPTY_OVERRIDES, DEFAULTS)).toBeUndefined();
  });
});

describe('interpolate / placeholdersOf', () => {
  it('rellena todas las apariciones', () => {
    expect(interpolate('{n} de {n}', { n: 3 })).toBe('3 de 3');
  });

  it('lista las variables sin repetir', () => {
    expect(placeholdersOf('{a} y {b} y {a}')).toEqual(['a', 'b']);
  });
});

describe('validateEditedText', () => {
  it('acepta un texto que conserva sus variables', () => {
    expect(validateEditedText('Tienes {count} fotos', 'Ya van {count} fotos')).toEqual([]);
  });

  it('rechaza perder una variable, inventar otra o dejarlo vacío', () => {
    expect(validateEditedText('Tienes {count} fotos', 'Tienes fotos')).toHaveLength(1);
    expect(validateEditedText('Hola', 'Hola {nombre}')).toHaveLength(1);
    expect(validateEditedText('Hola', '   ')).toHaveLength(1);
  });
});
