import { useState, useEffect, useMemo } from 'react';
import { Calendar } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import { RichText } from './ui/RichText';
import { ImageIcon, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { CalendarMonthSheet, getCalendarYears, useCalendarHolidays } from './calendar/CalendarTemplate';
import HolidayCountryPicker from './calendar/HolidayCountryPicker';
import {
  DEFAULT_HOLIDAY_COUNTRY, NO_HOLIDAYS, getColombianHolidays, getHolidayCountries, getHolidayCountryName, type HolidayCountry,
} from '../utils/holidays';

/** Desde septiembre lo normal es comprar el calendario del año siguiente. */
const defaultCalendarYear = () => {
  const now = new Date();
  return now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
};

export interface CalendarCustomizationOptions {
  paperType: string;
  year: number;
  startMonth: number; // 1-12
  type: 'desk' | 'wall';
  imagesPerMonth: 1 | 4;
  /** Código ISO del país cuyos festivos se marcan ('NONE' = sin festivos). Sin él, Colombia. */
  holidayCountry?: string;
}

interface CalendarCustomizationProps {
  calendar: Calendar;
  onCustomizationComplete: (options: CalendarCustomizationOptions) => void;
}

export default function CalendarCustomization({ calendar, onCustomizationComplete }: CalendarCustomizationProps) {
  const { t } = useLanguage();
  const [paperType] = useState('Opalina'); // Fixed option
  const [year, setYear] = useState(defaultCalendarYear);
  const [startMonth, setStartMonth] = useState(1); // 1 = Enero
  const [type, setType] = useState<'desk' | 'wall'>('desk');
  const [imagesPerMonth, setImagesPerMonth] = useState<1 | 4>(1);
  const [holidayCountry, setHolidayCountry] = useState(DEFAULT_HOLIDAY_COUNTRY);
  const [countries, setCountries] = useState<HolidayCountry[]>([
    { code: DEFAULT_HOLIDAY_COUNTRY, name: getHolidayCountryName(DEFAULT_HOLIDAY_COUNTRY) },
  ]);

  // La lista completa de países llega con la librería de festivos (carga bajo demanda).
  useEffect(() => {
    let cancelled = false;
    getHolidayCountries().then(list => { if (!cancelled) setCountries(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const holidays = useCalendarHolidays(holidayCountry, year, startMonth);
  // Festivos que caen dentro de los 12 meses del calendario
  const holidayCount = useMemo(() => {
    const list = holidays ?? getCalendarYears(year, startMonth).flatMap(getColombianHolidays);
    const from = new Date(year, startMonth - 1, 1);
    const to = new Date(year, startMonth - 1 + 12, 1);
    return list.filter(h => h.date >= from && h.date < to).length;
  }, [holidays, year, startMonth]);

  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Calcula el mes y año de fin (11 meses después del inicio)
  const endMonthIndex = (startMonth - 1 + 11) % 12;
  const endYearActual = year + Math.floor((startMonth - 1 + 11) / 12);

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
      startMonth,
      type,
      imagesPerMonth: type === 'wall' ? imagesPerMonth : 1,
      holidayCountry,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
      {/* Calendar Preview */}
      <div className="mb-12">
        <h3 className="text-xl font-medium mb-4 text-center text-gray-400">{t('calendar.preview') || 'Vista Previa'}</h3>
        <div className="w-full max-w-[600px] mx-auto relative bg-gray-50 rounded-lg p-8 flex items-center justify-center border-2 border-gray-100 shadow-sm">
          <div className={`bg-white shadow-2xl overflow-hidden transition-all duration-500 ${type === 'desk' ? 'w-[260px]' : 'w-[340px]'}`}>
            <CalendarMonthSheet
              type={type}
              position={0}
              year={year}
              startMonth={startMonth}
              imagesPerMonth={type === 'wall' ? imagesPerMonth : 1}
              holidays={holidays}
              renderPhoto={() => (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                </div>
              )}
            />
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">hasta {MONTH_NAMES[endMonthIndex]} {endYearActual}</p>
      </div>

      <div className="space-y-10">
        {/* Tipo de Calendario */}
        <div>
          <h3 className="text-2xl mb-4 font-bold">{t('calendarSetup.typeTitle')}</h3>
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
                <div className="text-lg font-bold">{t('calendarSetup.desk')}</div>
                <p className={`text-sm ${type === 'desk' ? 'text-gray-300' : 'text-gray-500'}`}>{t('calendarSetup.deskDesc')}</p>
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
                <RectangleHorizontal className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold">{t('calendarSetup.wall')}</div>
                <p className={`text-sm ${type === 'wall' ? 'text-gray-300' : 'text-gray-500'}`}>{t('calendarSetup.wallDesc')}</p>
              </div>
            </button>
          </div>
        </div>

        {/* Imágenes por Mes (condicional) */}
        {type === 'wall' && (
          <div>
            <h3 className="text-2xl mb-4 font-bold">{t('calendarSetup.perMonthTitle')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setImagesPerMonth(1)}
                className={`py-6 rounded-lg border-4 transition-all ${ imagesPerMonth === 1 ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-gray-50' }`}
              >
                <div className="text-xl font-bold">{t('calendarSetup.onePhoto')}</div>
                <div className={`text-sm ${imagesPerMonth === 1 ? 'text-gray-300' : 'text-gray-500'}`}>{t('calendarSetup.onePhotoDesc')}</div>
              </button>
              <button
                onClick={() => setImagesPerMonth(4)}
                className={`py-6 rounded-lg border-4 transition-all ${ imagesPerMonth === 4 ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-gray-50' }`}
              >
                <div className="text-xl font-bold">{t('calendarSetup.fourPhotos')}</div>
                <div className={`text-sm ${imagesPerMonth === 4 ? 'text-gray-300' : 'text-gray-500'}`}>{t('calendarSetup.fourPhotosDesc')}</div>
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

        {/* Mes de Inicio */}
        <div>
          <h3 className="text-2xl mb-2 font-bold">{t('calendarSetup.startMonthTitle')}</h3>
          <p className="text-sm text-gray-500 mb-4">
            <RichText text={t('calendarSetup.range', { from: `${MONTH_NAMES[startMonth - 1]} ${year}`, to: `${MONTH_NAMES[endMonthIndex]} ${endYearActual}` })} />
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {MONTH_NAMES.map((name, idx) => (
              <button
                key={idx}
                onClick={() => setStartMonth(idx + 1)}
                className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  startMonth === idx + 1
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-black'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Festivos del país */}
        <div>
          <h3 className="text-2xl mb-2 font-bold">{t('calendarSetup.holidaysTitle')}</h3>
          <p className="text-sm text-gray-500 mb-4">
            <RichText text={holidayCountry === NO_HOLIDAYS
              ? t('calendarSetup.noHolidaysDesc')
              : t('calendarSetup.holidaysDesc', { count: holidayCount, country: getHolidayCountryName(holidayCountry) })} />
          </p>
          <div className="max-w-sm">
            <HolidayCountryPicker value={holidayCountry} countries={countries} onChange={setHolidayCountry} />
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