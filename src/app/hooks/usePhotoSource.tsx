/**
 * Origen de las fotos, igual en todos los puntos de subida de la app.
 *
 * Cada botón de "subir foto" llama a `choose()` con dos salidas:
 *   - `device`: abre el selector de archivos de siempre (DEBE llamarse dentro
 *     del clic, por eso se le pasa una función y no un input).
 *   - `onFiles`: recibe las fotos ya descargadas de Google Fotos, como `File`,
 *     para que entren por el mismo camino que las del dispositivo.
 *
 * Sin VITE_GOOGLE_CLIENT_ID no hay menú: `choose()` abre directamente el
 * selector de archivos, exactamente como antes.
 *
 * El componente que use el hook debe pintar `ui` (menú, pantalla de progreso
 * de Google Fotos y aviso de error).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, Image as ImageIcon, Loader2, Smartphone, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { RichText } from '../components/ui/RichText';
import {
  isGooglePhotosEnabled,
  preloadGoogleIdentity,
  currentGoogleToken,
  requestGoogleToken,
  createPickerSession,
  pickerUrl,
  waitForSelection,
  downloadPickedPhotos,
  deletePickerSession,
  GooglePhotosError,
  type PickerSession,
} from '../utils/googlePhotosPicker';

export interface PhotoSourceRequest {
  /** Abre el selector de archivos del dispositivo. */
  device: () => void;
  /** Recibe las fotos traídas de Google Fotos (nunca vacío). */
  onFiles: (files: File[]) => void | Promise<void>;
  /** Cuántas fotos como máximo deja elegir Google (1 = una sola). */
  maxItems?: number;
}

type GooglePhase =
  | { phase: 'auth' }
  | { phase: 'picking'; url: string; opened: boolean }
  | { phase: 'downloading'; done: number; total: number };

export function usePhotoSource() {
  const { t } = useLanguage();
  const enabled = isGooglePhotosEnabled();
  const [menu, setMenu] = useState<PhotoSourceRequest | null>(null);
  const [google, setGoogle] = useState<GooglePhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const windowRef = useRef<Window | null>(null);

  useEffect(() => {
    preloadGoogleIdentity();
    return () => abortRef.current?.abort();
  }, []);

  /** Trae fotos de Google Fotos. Debe llamarse desde un clic (abre ventanas). */
  const importFromGoogle = useCallback(async (req: Pick<PhotoSourceRequest, 'onFiles' | 'maxItems'>) => {
    if (abortRef.current) return;
    setError(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let token = currentGoogleToken();
    // Con permiso ya dado, la ventana se abre YA (dentro del clic) para que el
    // navegador no la bloquee; se le pone la URL cuando exista la sesión.
    const win = token ? window.open('', '_blank') : null;
    let session: PickerSession | null = null;
    try {
      if (!token) {
        setGoogle({ phase: 'auth' });
        token = await requestGoogleToken();
      }
      if (ctrl.signal.aborted) throw new GooglePhotosError('cancelled', 'Cancelado');
      session = await createPickerSession(token, req.maxItems);
      const url = pickerUrl(session);
      if (win && !win.closed) win.location.href = url;
      windowRef.current = win;
      setGoogle({ phase: 'picking', url, opened: !!win });

      await waitForSelection(token, session, ctrl.signal);
      try { windowRef.current?.close(); } catch { /* ya cerrada */ }

      setGoogle({ phase: 'downloading', done: 0, total: 0 });
      const { files, failed } = await downloadPickedPhotos(
        token,
        session.id,
        (done, total) => setGoogle({ phase: 'downloading', done, total }),
        ctrl.signal,
      );
      setGoogle(null);
      if (failed > 0) setError(t('organizer.googlePhotosFailed', { failed }));
      const usable = req.maxItems ? files.slice(0, req.maxItems) : files;
      if (usable.length > 0) await req.onFiles(usable);
    } catch (err) {
      try { if (win && !session) win.close(); } catch { /* ya cerrada */ }
      setGoogle(null);
      const code = err instanceof GooglePhotosError ? err.code : 'api';
      console.warn('[GoogleFotos]', err);
      if (code !== 'cancelled') {
        setError(
          code === 'auth' ? 'Google no dio permiso para ver tus fotos. Inténtalo de nuevo y acepta el acceso.'
          : code === 'timeout' ? 'Pasó demasiado tiempo sin elegir fotos en Google Fotos. Inténtalo de nuevo.'
          : code === 'network' ? 'No hubo conexión con Google Fotos. Revisa tu internet e inténtalo de nuevo.'
          : 'Google Fotos no respondió como esperábamos. Inténtalo de nuevo en un momento.'
        );
      }
    } finally {
      if (token && session) deletePickerSession(token, session.id);
      windowRef.current = null;
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  }, [t]);

  /** Punto de entrada de cada botón de subida. Llamar dentro del clic. */
  const choose = useCallback((req: PhotoSourceRequest) => {
    if (!enabled) { req.device(); return; }
    setMenu(req);
  }, [enabled]);

  const cancelGoogle = () => {
    abortRef.current?.abort();
    try { windowRef.current?.close(); } catch { /* ya cerrada */ }
    setGoogle(null);
  };

  const reopenGoogle = (url: string) => {
    const w = window.open(url, '_blank');
    if (w) windowRef.current = w;
    setGoogle(prev => (prev?.phase === 'picking' ? { ...prev, opened: !!w } : prev));
  };

  const single = menu?.maxItems === 1;

  const ui: ReactNode = (
    <>
      {menu && (
        <div
          className="fixed inset-0 z-[300] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setMenu(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-5 pb-7 sm:pb-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-bold">{t(single ? 'photos.source.titleOne' : 'photos.source.title')}</p>
              <button onClick={() => setMenu(null)} className="p-1 text-gray-400 hover:text-black" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <button
                data-photo-source="device"
                onClick={() => { const r = menu; setMenu(null); r.device(); }}
                className="w-full flex items-center gap-3 border-2 border-black bg-black text-white font-semibold px-5 py-3 rounded-full hover:bg-gray-800 transition-colors"
              >
                <Smartphone className="w-5 h-5 shrink-0" />
                {t('photos.source.device')}
              </button>
              <button
                data-photo-source="google"
                onClick={() => { const r = menu; setMenu(null); void importFromGoogle(r); }}
                className="w-full flex items-center gap-3 border-2 border-gray-300 bg-white text-gray-800 font-semibold px-5 py-3 rounded-full hover:bg-gray-50 transition-colors"
              >
                <ImageIcon className="w-5 h-5 shrink-0" />
                {t('photos.source.google')}
              </button>
            </div>
          </div>
        </div>
      )}

      {google && (
        <div className="fixed inset-0 z-[300] bg-white flex flex-col items-center justify-center gap-6 p-8">
          <Loader2 className="w-16 h-16 text-black animate-spin" />
          {google.phase === 'auth' && (
            <div className="text-center">
              <p className="text-2xl font-bold">Conectando con Google Fotos</p>
              <p className="text-gray-500 mt-2">Acepta el permiso en la ventana de Google</p>
            </div>
          )}
          {google.phase === 'picking' && (
            <>
              <div className="text-center max-w-sm">
                <p className="text-2xl font-bold">Esperando tus fotos</p>
                <p className="text-gray-600 mt-2">
                  <RichText text={t('organizer.googlePhotosWaiting')} />
                </p>
              </div>
              <button
                onClick={() => reopenGoogle(google.url)}
                className="inline-flex items-center gap-2 bg-black text-white font-semibold px-6 py-3 rounded-full hover:bg-gray-800"
              >
                <ImageIcon className="w-5 h-5" />
                {google.opened ? 'Volver a abrir Google Fotos' : 'Abrir Google Fotos'}
              </button>
            </>
          )}
          {google.phase === 'downloading' && (
            <>
              <div className="text-center">
                <p className="text-2xl font-bold">Trayendo tus fotos de Google Fotos</p>
                <p className="text-gray-500 mt-2">
                  {google.total > 0 ? `Foto ${google.done} de ${google.total}` : 'Preparando…'}
                </p>
              </div>
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                <div
                  className="bg-black h-2 rounded-full transition-all duration-300"
                  style={{ width: `${google.total > 0 ? (google.done / google.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 text-center max-w-xs">Por favor espera sin cerrar la app</p>
            </>
          )}
          <button
            onClick={cancelGoogle}
            className="mt-2 px-6 py-2 border border-gray-300 rounded-xl text-gray-500 text-sm"
          >
            Cancelar
          </button>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:max-w-sm z-[300] flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="flex-1">{error}</p>
          <button onClick={() => setError(null)} className="shrink-0 text-red-700" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );

  return { enabled, busy: !!google, choose, importFromGoogle, ui };
}
