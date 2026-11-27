// ============================================================================
// FUENTES INCRUSTADAS PARA LOS PDF (html-to-image)
// ============================================================================
// html-to-image no puede leer la hoja de Google Fonts (otro origen), así que el
// PDF descarga la hoja y cada archivo de fuente y los pasa como Data URL.
//
// Antes bastaba con que UNO de los ~14 archivos fallara (un parpadeo de red, un
// 5xx de Google) para descartarlo todo; tras 3 intentos en ~2 s el PDF de la
// portada —el primero que se genera— se cancelaba con "no se pudieron descargar
// las fuentes", y al reintentar un rato después salía bien. Ahora cada archivo
// se reintenta por su cuenta con esperas crecientes, se comprueba `res.ok` (un
// error HTTP ya no se incrusta como si fuera una fuente) y lo ya descargado se
// recuerda, de modo que un reintento solo vuelve a pedir lo que faltó.

export interface FetchRetryOptions {
  attempts?: number;
  /** Espera antes del reintento n (1-based): baseDelayMs × n. */
  baseDelayMs?: number;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** `fetch` que solo da por buena una respuesta 2xx, con reintentos y esperas crecientes. */
export async function fetchOkWithRetry(url: string, opts: FetchRetryOptions = {}): Promise<Response> {
  const { attempts = 4, baseDelayMs = 700, fetchFn = fetch, sleep = defaultSleep } = opts;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(baseDelayMs * i);
    try {
      const res = await fetchFn(url, i === 0 ? undefined : { cache: 'reload' });
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status} en ${url}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

const blobToDataURL = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

/** Archivos de fuente ya convertidos a Data URL (sobrevive a los reintentos de la hoja). */
const fontFileCache = new Map<string, string>();

export interface InlineFontCssDeps extends FetchRetryOptions {
  toDataUrl?: (blob: Blob) => Promise<string>;
}

/**
 * Descarga la hoja `cssUrl`, se queda con los bloques `latin` y sustituye la URL
 * de cada archivo por su Data URL. Lanza si algo no se pudo descargar: nunca
 * devuelve una hoja a medias.
 */
export async function inlineLatinFontCss(cssUrl: string, deps: InlineFontCssDeps = {}): Promise<string> {
  const toDataUrl = deps.toDataUrl ?? blobToDataURL;
  const css = await (await fetchOkWithRetry(cssUrl, deps)).text();
  const latinBlocks = css.split(/(?=\/\*\s*[\w-]+\s*\*\/)/).filter(b => /^\/\*\s*latin\s*\*\//.test(b));
  if (latinBlocks.length === 0) throw new Error('la hoja de fuentes llegó vacía o con otro formato');
  const inlined = await Promise.all(latinBlocks.map(async block => {
    const url = block.match(/url\((https:[^)]+)\)/)?.[1];
    if (!url) return block;
    let dataUrl = fontFileCache.get(url);
    if (!dataUrl) {
      dataUrl = await toDataUrl(await (await fetchOkWithRetry(url, deps)).blob());
      fontFileCache.set(url, dataUrl);
    }
    return block.replace(url, dataUrl);
  }));
  return inlined.join('\n');
}

/** Solo para tests. */
export const __clearFontFileCache = () => fontFileCache.clear();
