import { useState } from 'react';
import { Calendar } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import { ImageIcon, RectangleVertical, RectangleHorizontal } from 'lucide-react';

export interface CalendarCustomizationOptions {
  size: string;
  paperType: string;
  year: number;
  orientation: 'vertical' | 'horizontal';
}

interface CalendarCustomizationProps {
  calendar: Calendar;
  onCustomizationComplete: (options: CalendarCustomizationOptions) => void;
}

export default function CalendarCustomization({ calendar, onCustomizationComplete }: CalendarCustomizationProps) {
  const { t } = useLanguage();
  const [size, setSize] = useState('8x10');
  const [paperType] = useState('Opalina'); // Fixed option
  const [year, setYear] = useState(2026);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');

  const sizes = [
    { id: '8x10', name: '8" x 10"', description: t('calendar.size.standard') || 'Standard size' },
    { id: '11x14', name: '11" x 14"', description: t('calendar.size.large') || 'Large' },
    { id: '12x12', name: '12" x 12"', description: t('calendar.size.square') || 'Square' },
  ];

  const orientations = [
    { id: 'vertical', name: t('calendar.orientation.vertical') || 'Vertical', icon: <RectangleVertical className="w-6 h-6" /> },
    { id: 'horizontal', name: t('calendar.orientation.horizontal') || 'Horizontal', icon: <RectangleHorizontal className="w-6 h-6" /> },
  ];

  // Generate years from 2026 to 2041
  const years = Array.from({ length: 16 }, (_, i) => 2026 + i);

  const handleContinue = () => {
    onCustomizationComplete({
      size,
      paperType,
      year,
      orientation,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
      {/* Calendar Preview */}
      <div className="mb-12">
        <h3 className="text-xl font-medium mb-4 text-center text-gray-400">{t('calendar.preview') || 'Vista Previa'}</h3>
        <div className="w-full max-w-[600px] mx-auto relative bg-gray-50 rounded-lg p-8 flex items-center justify-center overflow-hidden border-2 border-gray-100 shadow-sm transition-all duration-500">
          <div className={`bg-white shadow-2xl rounded-sm overflow-hidden flex transition-all duration-500 ${
            orientation === 'vertical' ? 'flex-col aspect-[21/28] w-[300px]' : 'flex-row aspect-[28/21] w-[450px]'
          }`}>
             <div className={`bg-gray-100 flex items-center justify-center transition-all duration-500 ${
                orientation === 'vertical' ? 'w-full h-1/2 border-b' : 'w-1/2 h-full border-r'
             } border-gray-200`}>
                <ImageIcon className="w-16 h-16 text-gray-300" />
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
        {/* Orientación */}
        <div>
          <h3 className="text-2xl mb-4 font-bold">{t('calendar.orientation') || 'Orientación'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orientations.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setOrientation(opt.id as 'vertical' | 'horizontal')}
                className={`py-3 px-4 rounded-xl border-4 transition-all flex items-center gap-4 text-left ${
                  orientation === opt.id
                    ? 'bg-black text-white border-black shadow-lg scale-[1.02]'
                    : 'bg-white text-black border-gray-200 hover:border-black'
                }`}
              >
                <div className={`p-2 rounded-lg ${orientation === opt.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                  {opt.icon}
                </div>
                <div className="text-lg font-bold">{opt.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tamaño */}
        <div>
          <h3 className="text-2xl mb-4 font-bold">{t('album.size')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sizes.map((sizeOption) => (
              <button
                key={sizeOption.id}
                onClick={() => setSize(sizeOption.id)}
                className={`py-6 rounded-lg border-4 transition-all ${
                  size === sizeOption.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-gray-50'
                }`}
              >
                <div className="text-xl font-bold">{sizeOption.name}</div>
                <div className={`text-sm ${size === sizeOption.id ? 'text-gray-300' : 'text-gray-500'}`}>{sizeOption.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Paper Type - Standardized Style */}
        <div>
          <h3 className="text-2xl mb-4 font-bold">{t('album.paperType')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
            <div className="py-6 px-4 bg-black text-white border-4 border-black rounded-lg flex flex-col items-center">
              <span className="text-xl font-bold">{paperType}</span>
              <span className="text-sm text-gray-300">Premium high-quality paper</span>
            </div>
          </div>
        </div>

        {/* Year Selection */}
        <div>
          <h3 className="text-2xl mb-4 font-bold">{t('calendar.year') || 'Año'}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {years.slice(0, 8).map((yearOption) => (
              <button
                key={yearOption}
                onClick={() => setYear(yearOption)}
                className={`py-4 rounded-lg border-4 transition-all text-xl ${
                  year === yearOption
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-gray-50'
                }`}
              >
                {yearOption}
              </button>
            ))}
            <div className="col-span-full mt-2">
               <select
                value={year > 2033 ? year : ''}
                onChange={(e) => e.target.value && setYear(parseInt(e.target.value))}
                className="w-full p-4 border-4 border-black rounded-lg text-lg focus:outline-none bg-white font-bold"
              >
                <option value="">{t('calendar.moreYears') || 'Más años...'}</option>
                {years.slice(8).map((yearOption) => (
                  <option key={yearOption} value={yearOption}>
                    {yearOption}
                  </option>
                ))}
              </select>
            </div>
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