import { describe, it, expect, beforeEach } from 'vitest';
import { fetchOkWithRetry, inlineLatinFontCss, __clearFontFileCache } from './fontEmbed';

const noSleep = async () => {};
const res = (status: number, body = '') => new Response(body, { status });

const CSS = `/* cyrillic */
@font-face { src: url(https://f/cyr.woff2) format('woff2'); }
/* latin */
@font-face { font-family: 'A'; src: url(https://f/a.woff2) format('woff2'); }
/* latin */
@font-face { font-family: 'B'; src: url(https://f/b.woff2) format('woff2'); }
`;

describe('fetchOkWithRetry', () => {
  it('reintenta errores de red y respuestas no-2xx hasta obtener una buena', async () => {
    const calls: string[] = [];
    const outcomes: Array<() => Response> = [
      () => { throw new TypeError('Failed to fetch'); },
      () => res(503),
      () => res(200, 'ok'),
    ];
    const fetchFn = (async (url: string) => { calls.push(url); return outcomes[calls.length - 1](); }) as any;
    const r = await fetchOkWithRetry('u', { fetchFn, sleep: noSleep });
    expect(await r.text()).toBe('ok');
    expect(calls).toHaveLength(3);
  });

  it('lanza tras agotar los intentos', async () => {
    const fetchFn = (async () => res(500)) as any;
    await expect(fetchOkWithRetry('u', { fetchFn, sleep: noSleep, attempts: 2 })).rejects.toThrow('HTTP 500');
  });
});

describe('inlineLatinFontCss', () => {
  beforeEach(() => __clearFontFileCache());
  const toDataUrl = async (b: Blob) => `data:${await b.text()}`;

  it('incrusta solo los bloques latin; un archivo que falla una vez se reintenta solo', async () => {
    let bFails = 1;
    const fetchFn = (async (url: string) => {
      if (url === 'css') return res(200, CSS);
      if (url === 'https://f/b.woff2' && bFails-- > 0) throw new TypeError('Failed to fetch');
      return res(200, url.slice(-7));
    }) as any;
    const out = await inlineLatinFontCss('css', { fetchFn, sleep: noSleep, toDataUrl });
    expect(out).toContain('url(data:a.woff2)');
    expect(out).toContain('url(data:b.woff2)');
    expect(out).not.toContain('cyr');
  });

  it('nunca devuelve una hoja a medias, y lo ya descargado no se vuelve a pedir', async () => {
    const requested: string[] = [];
    let bOk = false;
    const fetchFn = (async (url: string) => {
      requested.push(url);
      if (url === 'css') return res(200, CSS);
      if (url === 'https://f/b.woff2' && !bOk) return res(404);
      return res(200, url.slice(-7));
    }) as any;
    await expect(inlineLatinFontCss('css', { fetchFn, sleep: noSleep, toDataUrl, attempts: 2 })).rejects.toThrow();
    bOk = true;
    requested.length = 0;
    await inlineLatinFontCss('css', { fetchFn, sleep: noSleep, toDataUrl, attempts: 2 });
    expect(requested).toEqual(['css', 'https://f/b.woff2']);
  });
});
