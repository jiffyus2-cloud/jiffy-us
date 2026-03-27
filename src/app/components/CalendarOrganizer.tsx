import { useState, useEffect } from 'react';
import { Calendar } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import { ImageIcon, RectangleVertical } from 'lucide-react';

export interface CalendarCustomizationOptions {
  paperType: string;
  year: number;
  type: 'desk' | 'wall';
  imagesPerMonth: 1 | 4;
}

interface CalendarCustomizationProps {
  calendar: Calendar;
  onCustomizationComplete: (options: CalendarCustomizationOptions) => void;
}

export default function CalendarCustomization({ calendar, onCustomizationComplete }: CalendarCustomizationProps) {
  const { t } = useLanguage();
  const [paperType] = useState('Opalina'); // Fixed option
  const [year, setYear] = useState(2026);
  const [type, setType] = useState<'desk' | 'wall'>('desk');
  const [imagesPerMonth, setImagesPerMonth] = useState<1 | 4>(1);

  // Reset images per month if type is switched to desk
  useEffect(() => {
    if (type === 'desk') {
      setImagesPerMonth(1);
    }
  }, [type]);

  const handleContinue = () => {
    onCustomizationComplete({
      paperType,
      year,
      type,
      imagesPerMonth: type === 'wall' ? imagesPerMonth : 1,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
      {/* Calendar Preview */}
      <div className="mb-12">
        <h3 className="text-xl font-medium mb-4 text-center text-gray-400">{t('calendar.preview') || 'Vista Previa'}</h3>
        <div className="w-full max-w-[600px] mx-auto relative bg-gray-50 rounded-lg p-8 flex items-center justify-center border-2 border-gray-100 shadow-sm">
          <div className={`bg-white shadow-2xl rounded-sm overflow-hidden flex flex-col transition-all duration-500 ${
            type === 'desk' ? 'aspect-[21/28] w-[300px]' : 'aspect-[30/44] w-[300px]'
          }`}>
             <div className={`bg-gray-100 flex items-center justify-center transition-all duration-500 border-b border-gray-200 ${
                type === 'desk' ? 'h-[70%]' : 'h-1/2'
             }`}>
                {type === 'wall' && imagesPerMonth === 4 ? (
                  <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full p-1">
                    <div className="bg-gray-200 rounded-sm flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-300" /></div>
                    <div className="bg-gray-200 rounded-sm flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-300" /></div>
                    <div className="bg-gray-200 rounded-sm flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-300" /></div>
                    <div className="bg-gray-200 rounded-sm flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-300" /></div>
                  </div>
                ) : (
                  <ImageIcon className="w-16 h-16 text-gray-300" />
                )}
             </div>
             <div className={`p-4 flex flex-col justify-center items-center gap-1 flex-1 h-full w-full`}>
                <div className="text-2xl font-bold">{year}</div>
                <div className="text-[10px] uppercase tracking-widest text-gray-400">Calendar</div>
                {/* Mock grid */}
                <div className="flex-1 grid grid-cols-7 gap-1 w-full mt-2 min-h-0">
                   {Array.from({ length: 35 }).map((_, i) => (
                      <div key={i} className="bg-gray-50 rounded-[1px] min-h-[10px]" />
                   ))}
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* Tipo de Calendario */}
        <div>
          <h3 className="text-2xl mb-4 font-bold">{t('calendar.type') || 'Tipo de Calendario'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setType('desk')}
              className={`py-3 px-4 rounded-xl border-4 transition-all flex items-center gap-4 text-left ${
                type === 'desk'
                  ? 'bg-black text-white border-black shadow-lg scale-[1.02]'
                  : 'bg-white text-black border-gray-200 hover:border-black'
              }`}
            >
              <div className={`p-2 rounded-lg ${type === 'desk' ? 'bg-white/20' : 'bg-gray-100'}`}>
                <RectangleVertical className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold">De Escritorio</div>
                <p className={`text-sm ${type === 'desk' ? 'text-gray-300' : 'text-gray-500'}`}>Formato vertical compacto</p>
              </div>
            </button>
            <button
              onClick={() => setType('wall')}
              className={`py-3 px-4 rounded-xl border-4 transition-all flex items-center gap-4 text-left ${
                type === 'wall'
                  ? 'bg-black text-white border-black shadow-lg scale-[1.02]'
                  : 'bg-white text-black border-gray-200 hover:border-black'
              }`}
            >
              <div className={`p-2 rounded-lg ${type === 'wall' ? 'bg-white/20' : 'bg-gray-100'}`}>
                <RectangleVertical className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold">De Pared</div>
                <p className={`text-sm ${type === 'wall' ? 'text-gray-300' : 'text-gray-500'}`}>Formato grande (30x44 cm)</p>
              </div>
            </button>
          </div>
        </div>

        {/* Imágenes por Mes (condicional) */}
        {type === 'wall' && (
          <div>
            <h3 className="text-2xl mb-4 font-bold">{t('calendar.imagesPerMonth') || 'Imágenes por Mes'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setImagesPerMonth(1)}
                className={`py-6 rounded-lg border-4 transition-all ${ imagesPerMonth === 1 ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-gray-50' }`}
              >
                <div className="text-xl font-bold">1 Foto</div>
                <div className={`text-sm ${imagesPerMonth === 1 ? 'text-gray-300' : 'text-gray-500'}`}>Una imagen grande por mes</div>
              </button>
              <button
                onClick={() => setImagesPerMonth(4)}
                className={`py-6 rounded-lg border-4 transition-all ${ imagesPerMonth === 4 ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-gray-50' }`}
              >
                <div className="text-xl font-bold">4 Fotos</div>
                <div className={`text-sm ${imagesPerMonth === 4 ? 'text-gray-300' : 'text-gray-500'}`}>Un collage de 4 imágenes</div>
              </button>
            </div>
          </div>
        )}

        {/* Year Selection */}
        <div>
          <h3 className="text-2xl mb-4 font-bold">{t('calendar.year') || 'Año'}</h3>
          <div className="max-w-xs">
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="w-full p-4 border-4 border-black rounded-lg text-2xl font-bold focus:outline-none text-center"
              min="2024"
              max="2050"
            />
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="mt-12">
        <button
          onClick={handleContinue}
          className="w-full py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg font-bold"
        >
          {t('album.continue')}
          
        </button>
      </div> 
    </div>
  );
}
// testubg