import { describe, it, expect } from 'vitest';
import { withIntrinsicSize, PRINT_LOGO_DATA_URL } from './printLogo';
import { describeImg } from './pdfCapture';

describe('withIntrinsicSize', () => {
  it('cambia width/height="100%" por el tamaño del viewBox', () => {
    const out = withIntrinsicSize('<svg width="100%" height="100%" viewBox="0 0 907 269" xmlns="x"><g/></svg>');
    expect(out).toBe('<svg width="907" height="269" viewBox="0 0 907 269" xmlns="x"><g/></svg>');
  });

  it('añade el tamaño si no lo tiene y no toca los width de los hijos', () => {
    const out = withIntrinsicSize('<svg viewBox="0,0,10.5,4"><rect width="3"/></svg>');
    expect(out).toBe('<svg width="10.5" height="4" viewBox="0,0,10.5,4"><rect width="3"/></svg>');
  });

  it('sin viewBox lo deja igual', () => {
    expect(withIntrinsicSize('<svg width="100%"></svg>')).toBe('<svg width="100%"></svg>');
  });
});

describe('PRINT_LOGO_DATA_URL', () => {
  it('es un SVG incrustado (sin petición de red) y con tamaño propio', () => {
    expect(PRINT_LOGO_DATA_URL.startsWith('data:image/svg+xml')).toBe(true);
    const svg = decodeURIComponent(PRINT_LOGO_DATA_URL.split(',').slice(1).join(','));
    expect(svg).toMatch(/<svg width="907" height="269"/);
    expect(svg).not.toMatch(/<svg[^>]*width="100%"/);
  });
});

describe('describeImg', () => {
  const img = (alt: string, src: string) => ({ alt, src, getAttribute: () => src });
  it('nombra la imagen por su alt, o por el archivo', () => {
    expect(describeImg(img('logo de la contraportada', 'x'))).toBe('la imagen «logo de la contraportada»');
    expect(describeImg(img('', 'https://jiffyphotos.com/assets/JiffyLogo-8KV5lfe3.svg?v=1'))).toBe('una imagen de la página (JiffyLogo-8KV5lfe3.svg)');
    expect(describeImg(img('', 'data:image/png;base64,AAA'))).toBe('una imagen de la página (incrustada)');
  });
});
