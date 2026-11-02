import { useRef, useState } from 'react';
import { ArrowLeftRight, Image as ImageIcon, Settings, X } from 'lucide-react';
import ImageCropper from '../ImageCropper';
import { useLanguage } from '../../context/LanguageContext';
import { RichText } from '../ui/RichText';
import type { CalendarCrop } from './calendarReorder';

interface CalendarMonthPhotosModalProps {
  /** Mes que se está editando (posición 0–11 dentro del calendario). */
  position: number;
  /** Etiquetas de los 12 meses, p. ej. "Enero 2027". */
  monthLabels: string[];
  photos: string[];
  crops: Record<number, CalendarCrop>;
  imagesPerMonth: number;
  /** Ancho / alto de cada hueco de foto. */
  photoAspect: number;
  /** Intercambia dos fotos por su índice plano (photos[mes * imagesPerMonth + hueco]). */
  onSwap: (from: number, to: number) => void;
  onClose: () => void;
}

type Drag = { from: number; to: number | null; overSendZone: boolean };

/**
 * Ajustes de un mes del calendario de 4 fotos, como los de una página del álbum:
 * arrastra una foto sobre otra para intercambiarlas, o suéltala en la zona de
 * abajo para cambiarla por una foto de otro mes. Los meses tienen siempre 4
 * huecos, así que entre meses no se "agrega": se intercambia.
 */
export default function CalendarMonthPhotosModal({
  position, monthLabels, photos, crops, imagesPerMonth, photoAspect, onSwap, onClose,
}: CalendarMonthPhotosModalProps) {
  const { t } = useLanguage();
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  // Foto (índice plano) que se va a cambiar por una de otro mes.
  const [swapFrom, setSwapFrom] = useState<number | null>(null);

  const slotIndexes = Array.from({ length: imagesPerMonth }, (_, s) => position * imagesPerMonth + s);
  const hasPhoto = (i: number) => !!photos[i] && photos[i].trim() !== '';

  const startDrag = (from: number, e: React.PointerEvent) => {
    if (!hasPhoto(from)) return;
    e.preventDefault();
    const set = (d: Drag | null) => { dragRef.current = d; setDrag(d); };
    set({ from, to: null, overSendZone: false });

    const onMove = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const cur = dragRef.current;
      if (!cur) return;
      if (el?.closest('[data-cal-send-zone]')) return set({ ...cur, to: null, overSendZone: true });
      const slot = el?.closest('[data-cal-slot]') as HTMLElement | null;
      set({ ...cur, to: slot ? Number(slot.dataset.calSlot) : null, overSendZone: false });
    };
    const onUp = () => {
      try {
        const cur = dragRef.current;
        if (cur?.overSendZone) setSwapFrom(cur.from);
        else if (cur && cur.to !== null && cur.to !== cur.from) onSwap(cur.from, cur.to);
      } finally {
        set(null);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
      }
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };

  const renderPhoto = (i: number) => hasPhoto(i)
    ? <ImageCropper src={photos[i]} position={crops[i] || { x: 50, y: 50, zoom: 1 }} />
    : (
      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
        <ImageIcon className="w-5 h-5 opacity-40" />
      </div>
    );

  return (
    <>
      <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-4 sm:p-6 max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
            <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" /> {monthLabels[position]}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Cerrar">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-gray-500 mb-4 text-center">
            <RichText text={t('calendarOrg.monthModalDesc')} />
          </p>

          <div className="bg-gray-50 rounded-2xl p-3 sm:p-5 border border-gray-200 shadow-inner">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 select-none">
              {slotIndexes.map(i => {
                const isDragging = drag?.from === i;
                const isTarget = drag?.to === i && drag.from !== i;
                return (
                  <div
                    key={i}
                    data-cal-slot={i}
                    onPointerDown={e => startDrag(i, e)}
                    className={`relative overflow-hidden bg-white transition-all ${hasPhoto(i) ? 'cursor-grab' : ''} ${
                      isDragging ? 'opacity-40 ring-4 ring-black' : isTarget ? 'ring-4 ring-black scale-[0.97]' : ''
                    }`}
                    style={{ aspectRatio: String(photoAspect), touchAction: 'none' }}
                  >
                    <div className="absolute inset-0 pointer-events-none">{renderPhoto(i)}</div>
                  </div>
                );
              })}
            </div>

            <div
              data-cal-send-zone="true"
              className={`mt-4 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed text-xs sm:text-sm font-bold uppercase tracking-wide transition-all ${
                drag?.overSendZone ? 'border-black bg-black text-white' : 'border-gray-300 text-gray-400'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4 shrink-0 pointer-events-none" />
              <span className="pointer-events-none">{t('calendarOrg.monthSendZone')}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-4 px-6 py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors w-full shadow-md text-sm"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>

      {swapFrom !== null && (
        <div className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-3 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 shrink-0 overflow-hidden rounded border-2 border-black" style={{ aspectRatio: String(photoAspect) }}>
                  {renderPhoto(swapFrom)}
                </div>
                <h3 className="text-lg sm:text-xl font-bold">{t('calendarOrg.monthSwapTitle')}</h3>
              </div>
              <button onClick={() => setSwapFrom(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">{t('calendarOrg.monthSwapDesc')}</p>
            <div className="overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
              {monthLabels.map((label, m) => m === position ? null : (
                <div key={m} className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 text-center">{label}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {Array.from({ length: imagesPerMonth }, (_, s) => {
                      const target = m * imagesPerMonth + s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { onSwap(swapFrom, target); setSwapFrom(null); }}
                          aria-label={`Intercambiar con la foto ${s + 1} de ${label}`}
                          className="group relative overflow-hidden rounded-sm border border-gray-200 hover:border-black"
                          style={{ aspectRatio: String(photoAspect) }}
                        >
                          <div className="absolute inset-0 pointer-events-none">{renderPhoto(target)}</div>
                          <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-colors">
                            <ArrowLeftRight className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
