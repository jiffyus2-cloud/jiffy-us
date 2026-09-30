// ============================================================================
// Importar desde Google Fotos (Google Photos Picker API)
// ============================================================================
// Flujo oficial para webs (la Library API ya no deja leer la fototeca entera):
//   1. OAuth en el navegador con Google Identity Services → access token con
//      el scope `photospicker.mediaitems.readonly` (solo ve lo que el cliente
//      elige, nada más).
//   2. POST /v1/sessions → `pickerUri`, que se abre en otra ventana (o en la
//      app de Google Fotos en el celular).
//   3. Se consulta la sesión cada pocos segundos hasta `mediaItemsSet`.
//   4. GET /v1/mediaItems → baseUrl de cada foto; `${baseUrl}=d` es el original.
//   5. Las fotos se convierten en `File` y entran por el mismo camino que las
//      del selector de archivos (HEIC, duplicados, calidad…).
//
// Solo hace falta VITE_GOOGLE_CLIENT_ID (ID de cliente OAuth "Aplicación web"
// con la Photos Picker API habilitada). Sin él, el botón no aparece.
// ============================================================================

const SCOPE = 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly';
const API = 'https://photospicker.googleapis.com/v1';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

export const GOOGLE_PHOTOS_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
export const isGooglePhotosEnabled = (): boolean => GOOGLE_PHOTOS_CLIENT_ID.length > 0;

export class GooglePhotosError extends Error {
  constructor(public code: 'auth' | 'cancelled' | 'timeout' | 'network' | 'api', message: string) {
    super(message);
  }
}

// ── OAuth (Google Identity Services, token model) ───────────────────────────

interface TokenResponse { access_token?: string; expires_in?: number; error?: string }
interface TokenClient { requestAccessToken: (o?: { prompt?: string }) => void }
interface GoogleOAuth2 {
  initTokenClient: (cfg: {
    client_id: string;
    scope: string;
    callback: (r: TokenResponse) => void;
    error_callback?: (e: { type?: string }) => void;
  }) => TokenClient;
}
declare global {
  interface Window { google?: { accounts?: { oauth2?: GoogleOAuth2 } } }
}

let gisPromise: Promise<GoogleOAuth2> | null = null;
function loadGis(): Promise<GoogleOAuth2> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2);
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = GIS_SRC;
      s.async = true;
      s.onload = () => {
        const oauth2 = window.google?.accounts?.oauth2;
        if (oauth2) resolve(oauth2);
        else reject(new GooglePhotosError('network', 'Google Identity Services no cargó'));
      };
      s.onerror = () => {
        gisPromise = null;
        reject(new GooglePhotosError('network', 'No se pudo cargar Google Identity Services'));
      };
      document.head.appendChild(s);
    });
  }
  return gisPromise;
}

/** Precarga el script de Google para que el clic del cliente abra el popup de inmediato. */
export function preloadGoogleIdentity(): void {
  if (isGooglePhotosEnabled()) loadGis().catch(() => { /* se reintenta al pulsar */ });
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Token vigente (con 2 min de margen) o null si hay que pedir permiso. */
export function currentGoogleToken(): string | null {
  if (cachedToken && cachedToken.expiresAt - 120_000 > Date.now()) return cachedToken.token;
  return null;
}

/** Abre el popup de consentimiento de Google. Debe llamarse desde un clic. */
export async function requestGoogleToken(): Promise<string> {
  const oauth2 = await loadGis();
  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_PHOTOS_CLIENT_ID,
      scope: SCOPE,
      callback: r => {
        if (!r.access_token) {
          reject(new GooglePhotosError('auth', r.error || 'Permiso denegado'));
          return;
        }
        cachedToken = { token: r.access_token, expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 };
        resolve(r.access_token);
      },
      error_callback: e => {
        reject(new GooglePhotosError(e?.type === 'popup_closed' ? 'cancelled' : 'auth', e?.type || 'Error de autorización'));
      },
    });
    client.requestAccessToken();
  });
}

// ── Picker API ──────────────────────────────────────────────────────────────

export interface PickerSession {
  id: string;
  pickerUri: string;
  mediaItemsSet?: boolean;
  pollingConfig?: { pollInterval?: string; timeoutIn?: string };
}

interface PickedMediaItem {
  id: string;
  type?: 'PHOTO' | 'VIDEO' | 'TYPE_UNSPECIFIED';
  createTime?: string;
  mediaFile?: { baseUrl: string; mimeType?: string; filename?: string };
}

async function api<T>(token: string, path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      signal,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
  } catch (err) {
    if (signal?.aborted) throw new GooglePhotosError('cancelled', 'Cancelado');
    throw new GooglePhotosError('network', (err as Error).message);
  }
  if (res.status === 401 || res.status === 403) {
    cachedToken = null;
    throw new GooglePhotosError('auth', `Google respondió ${res.status}`);
  }
  if (!res.ok) throw new GooglePhotosError('api', `Google respondió ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export function createPickerSession(token: string): Promise<PickerSession> {
  return api<PickerSession>(token, '/sessions', { method: 'POST', body: '{}' });
}

/** URL para abrir el selector; `/autoclose` cierra la ventana al terminar (web). */
export function pickerUrl(session: PickerSession): string {
  return `${session.pickerUri.replace(/\/$/, '')}/autoclose`;
}

/** "5s" / "1800.5s" → milisegundos. */
export function parseDuration(value: string | undefined, fallbackMs: number): number {
  const m = value ? /^(\d+(?:\.\d+)?)s$/.exec(value) : null;
  return m ? Math.round(parseFloat(m[1]) * 1000) : fallbackMs;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new GooglePhotosError('cancelled', 'Cancelado'));
    }, { once: true });
  });

/** Espera a que el cliente termine de elegir en Google Fotos. */
export async function waitForSelection(token: string, session: PickerSession, signal?: AbortSignal): Promise<void> {
  const interval = Math.max(parseDuration(session.pollingConfig?.pollInterval, 3000), 1000);
  const deadline = Date.now() + parseDuration(session.pollingConfig?.timeoutIn, 30 * 60_000);
  for (;;) {
    const s = await api<PickerSession>(token, `/sessions/${session.id}`, {}, signal);
    if (s.mediaItemsSet) return;
    // Google alarga el intervalo o acorta el plazo durante la sesión: usar lo último.
    const nextInterval = Math.max(parseDuration(s.pollingConfig?.pollInterval, interval), 1000);
    if (s.pollingConfig?.timeoutIn === '0s' || Date.now() > deadline) {
      throw new GooglePhotosError('timeout', 'La sesión de Google Fotos caducó');
    }
    await sleep(nextInterval, signal);
  }
}

async function listPickedPhotos(token: string, sessionId: string, signal?: AbortSignal): Promise<PickedMediaItem[]> {
  const out: PickedMediaItem[] = [];
  let pageToken = '';
  do {
    const q = new URLSearchParams({ sessionId, pageSize: '100' });
    if (pageToken) q.set('pageToken', pageToken);
    const r = await api<{ mediaItems?: PickedMediaItem[]; nextPageToken?: string }>(token, `/mediaItems?${q}`, {}, signal);
    out.push(...(r.mediaItems ?? []));
    pageToken = r.nextPageToken ?? '';
  } while (pageToken);
  // Los videos no sirven para el álbum.
  return out.filter(i => i.mediaFile?.baseUrl && i.type !== 'VIDEO' && !i.mediaFile.mimeType?.startsWith('video/'));
}

function extensionFor(mime: string | undefined): string {
  switch (mime) {
    case 'image/heic': return '.heic';
    case 'image/heif': return '.heif';
    case 'image/png': return '.png';
    case 'image/webp': return '.webp';
    case 'image/gif': return '.gif';
    default: return '.jpg';
  }
}

async function downloadItem(token: string, item: PickedMediaItem, signal?: AbortSignal): Promise<File> {
  const mf = item.mediaFile!;
  let res: Response;
  try {
    res = await fetch(`${mf.baseUrl}=d`, { headers: { Authorization: `Bearer ${token}` }, signal });
  } catch (err) {
    if (signal?.aborted) throw new GooglePhotosError('cancelled', 'Cancelado');
    throw new GooglePhotosError('network', (err as Error).message);
  }
  if (!res.ok) throw new GooglePhotosError(res.status === 401 || res.status === 403 ? 'auth' : 'api', `Descarga ${res.status}`);
  const blob = await res.blob();
  const type = mf.mimeType || blob.type || 'image/jpeg';
  const name = mf.filename || `google-fotos-${item.id.slice(-10)}${extensionFor(type)}`;
  // lastModified = fecha de la foto: la detección de duplicados y el orden por
  // fecha la usan igual que con un archivo del carrete.
  const lastModified = item.createTime ? Date.parse(item.createTime) || Date.now() : Date.now();
  return new File([blob], name, { type, lastModified });
}

/**
 * Descarga las fotos elegidas (4 a la vez) y las devuelve en el orden en que
 * el cliente las marcó. Una foto que falla no tumba el resto: se cuenta aparte.
 */
export async function downloadPickedPhotos(
  token: string,
  sessionId: string,
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<{ files: File[]; failed: number }> {
  const items = await listPickedPhotos(token, sessionId, signal);
  const results: Array<File | null> = new Array(items.length).fill(null);
  let next = 0;
  let done = 0;
  let failed = 0;
  onProgress(0, items.length);

  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = await downloadItem(token, items[i], signal);
      } catch (err) {
        if (err instanceof GooglePhotosError && err.code === 'cancelled') throw err;
        console.warn('[GoogleFotos] descarga fallida', items[i].id, err);
        failed++;
      }
      onProgress(++done, items.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, worker));
  return { files: results.filter((f): f is File => f !== null), failed };
}

/** Libera la sesión en Google (buena práctica; si falla no importa). */
export function deletePickerSession(token: string, sessionId: string): void {
  fetch(`${API}/sessions/${sessionId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    .catch(() => { /* sin efecto para el cliente */ });
}
