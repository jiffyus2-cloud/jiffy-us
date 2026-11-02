import { useEffect, useMemo, useState } from 'react';
import { Check, Image as ImageIcon, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { RichText } from '../ui/RichText';

interface CalendarPhotoChooserProps {
  files: File[];
  /** Cuántas fotos caben todavía en el calendario. */
  max: number;
  onConfirm: (files: File[]) => void;
  onCancel: () => void;
}

/**
 * El selector de archivos del navegador no permite limitar cuántas fotos se
 * eligen. Cuando el cliente escoge más de las que caben en el calendario, esta
 * ventana le muestra todas y le deja tocar las que quiere DESCARTAR hasta que
 * las que quedan caben; solo entonces se puede confirmar.
 */
export default function CalendarPhotoChooser({ files, max, onConfirm, onCancel }: CalendarPhotoChooserProps) {
  const { t } = useLanguage();
  const [discarded, setDiscarded] = useState<Set<number>>(new Set());
  const [broken, setBroken] = useState<Set<number>>(new Set());

  const urls = useMemo(() => files.map(f => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach(u => URL.revokeObjectURL(u)), [urls]);

  const keptCount = files.length - discarded.size;
  const stillToDiscard = Math.max(0, keptCount - max);
  const canConfirm = stillToDiscard === 0 && keptCount > 0;

  const toggle = (i: number) => {
    setDiscarded(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else if (files.length - next.size > 1) next.add(i); // siempre queda al menos una
      return next;
    });
  };

  /** Atajo: descarta las últimas que sobran (lo que hacía antes la app sin preguntar). */
  const discardLast = () => {
    setDiscarded(prev => {
      const next = new Set(prev);
      for (let i = files.length - 1; i >= 0 && files.length - next.size > max; i--) next.add(i);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 pb-4 text-center border-b">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('calendarOrg.chooseTitle')}</h3>
          <p className="text-sm text-gray-500">
            <RichText text={t('calendarOrg.chooseDesc', { selected: files.length, max })} />
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {files.map((file, i) => {
              const isDiscarded = discarded.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={isDiscarded}
                  aria-label={`${isDiscarded ? 'Recuperar' : 'Descartar'} ${file.name}`}
                  title={file.name}
                  className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 border-4 transition-all ${
                    isDiscarded ? 'border-red-500' : 'border-black'
                  }`}
                >
                  {broken.has(i) ? (
                    // HEIC y similares no se pueden previsualizar fuera de Safari
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1 text-gray-400">
                      <ImageIcon className="w-6 h-6" />
                      <span className="text-[9px] leading-tight break-all line-clamp-2">{file.name}</span>
                    </div>
                  ) : (
                    <img
                      src={urls[i]}
                      alt={file.name}
                      className={`w-full h-full object-cover transition-all ${isDiscarded ? 'opacity-30 grayscale' : ''}`}
                      onError={() => setBroken(prev => new Set(prev).add(i))}
                    />
                  )}
                  <span className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center shadow text-white ${
                    isDiscarded ? 'bg-red-500' : 'bg-black'
                  }`}>
                    {isDiscarded ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* pr-20 en móvil: el botón flotante de WhatsApp (z-400) tapaba la esquina de "Usar" */}
        <div className="p-4 pr-20 sm:pr-4 border-t flex flex-col sm:flex-row items-center gap-3">
          <div className="flex flex-col items-center sm:items-start">
            <span className={`text-sm font-bold ${stillToDiscard > 0 ? 'text-red-600' : 'text-green-700'}`}>
              {stillToDiscard > 0
                ? t('calendarOrg.chooseRemaining', { count: stillToDiscard })
                : t('calendarOrg.chooseReady')}
              <span className="font-medium text-gray-500"> · {keptCount} / {max}</span>
            </span>
            {stillToDiscard > 0 && (
              <button type="button" onClick={discardLast} className="text-xs text-gray-500 underline hover:text-black">
                {t('calendarOrg.chooseDiscardLast', { count: stillToDiscard })}
              </button>
            )}
          </div>
          <div className="flex gap-3 w-full sm:w-auto sm:ml-auto">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-3 whitespace-nowrap bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
            >
              {t('calendarOrg.chooseCancel')}
            </button>
            <button
              type="button"
              disabled={!canConfirm}
              onClick={() => onConfirm(files.filter((_, i) => !discarded.has(i)))}
              className="flex-1 sm:flex-none px-4 sm:px-6 py-3 whitespace-nowrap bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('calendarOrg.chooseConfirm', { count: keptCount })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
