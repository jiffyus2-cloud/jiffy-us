import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { EDITABLE_TEXTS } from './editableTexts';
import { APP_TEXTS_ES } from './appTexts';
import { DEFAULT_TEXTS } from './translations';

// Todo el código de la app (sin el propio diccionario ni los tests).
function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== 'i18n') sources(p, out);
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}
const CODE = sources(join(__dirname, '..', '..')).map(f => readFileSync(f, 'utf8')).join('\n');

// Claves que el código construye con una plantilla (`faq.${n}.q`).
const DYNAMIC = [/^faq\.\d+\.[qa]$/, /^customAlbum\.step\d+\.(desc|title)$/];

describe('Textos de la Tienda', () => {
  it('cada texto del panel se usa en la app (editarlo tiene efecto)', () => {
    const unused = EDITABLE_TEXTS
      .map(t => t.key)
      .filter(key => !CODE.includes(`'${key}'`) && !DYNAMIC.some(r => r.test(key)));
    expect(unused).toEqual([]);
  });

  it('los títulos de sección también se pueden editar', () => {
    const title = EDITABLE_TEXTS.find(t => t.key === 'product.title');
    expect(title).toMatchObject({ defaultValue: 'Elige Tu Producto', kind: 'short', group: 'Elige tu producto' });
    expect(EDITABLE_TEXTS.find(t => t.key === 'customAlbum.step1.title')?.kind).toBe('short');
    expect(EDITABLE_TEXTS.find(t => t.key === 'faq.1.q')?.kind).toBe('long');
  });

  it('cada texto cae en una sección con nombre (ninguno en «Otros»)', () => {
    expect(EDITABLE_TEXTS.filter(t => t.group === 'Otros').map(t => t.key)).toEqual([]);
  });

  it('una clave de appTexts no pisa otra del diccionario original', () => {
    const es = DEFAULT_TEXTS.es;
    for (const key of Object.keys(APP_TEXTS_ES)) expect(es[key]).toBe(APP_TEXTS_ES[key]);
  });

  it('cada pregunta frecuente tiene pregunta y respuesta', () => {
    const faq = EDITABLE_TEXTS.filter(t => t.key.startsWith('faq.')).map(t => t.key);
    const numbers = [...new Set(faq.map(k => k.split('.')[1]))];
    for (const n of numbers) {
      expect(faq).toContain(`faq.${n}.q`);
      expect(faq).toContain(`faq.${n}.a`);
    }
  });
});
