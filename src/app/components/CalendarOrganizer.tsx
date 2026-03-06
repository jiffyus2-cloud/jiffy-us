import { useState, useRef } from 'react';
import { 
  Upload, X, ChevronUp, ChevronDown, 
  Image as ImageIcon, Edit3, Check, 
  ArrowLeft, ArrowRight
} from 'lucide-react';
import { Calendar } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import type { CalendarCustomizationOptions } from './CalendarCustomization';
import { getColombianHolidays, isHoliday } from '../utils/holidays';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import ImageCropper from './ImageCropper';

interface CalendarOrganizerProps {
  calendar: Calendar;
  customization: CalendarCustomizationOptions;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  photoCrops: Record<number, { x: number; y: number; zoom: number }>;
  onPhotoCropsChange: (crops: Record<number, { x: number; y: number; zoom: number }>) => void;
  onComplete: (photos: string[]) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type Step = 'upload' | 'editor';

export default function CalendarOrganizer({ 
  calendar, 
  customization, 
  photos, 
  onPhotosChange,
  photoCrops,
  onPhotoCropsChange,
  onComplete 
}: CalendarOrganizerProps) {
  const { t } = useLanguage();
  const { year } = customization;
  const [step, setStep] = useState<Step>(photos.some(p => p !== '') ? 'editor' : 'upload');
  const [editingMonthIndex, setEditingMonthIndex] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const holidays = getColombianHolidays(year);

  // Initial Batch Upload
  const handleBatchUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const filesArray = Array.from(files);
    const loadedPhotos: string[] = [];
    let loadedCount = 0;

    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          loadedPhotos.push(result);
          loadedCount++;
          if (loadedCount === filesArray.length) {
            const newPhotos = [...photos];
            let photoIdx = 0;
            for (let i = 0; i < 12 && photoIdx < loadedPhotos.length; i++) {
              if (!newPhotos[i]) {
                newPhotos[i] = loadedPhotos[photoIdx++];
              }
            }
            onPhotosChange(newPhotos);
            setStep('editor');
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCropChange = (index: number, crop: { x: number, y: number, zoom: number }) => {
    onPhotoCropsChange({
      ...photoCrops,
      [index]: crop
    });
  };

  const generateCalendarGrid = (monthIndex: number) => {
    const date = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDayOfWeek = date.getDay();

    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  };

  const totalPhotos = photos.filter(p => p !== '').length;

  if (step === 'upload') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-lg mb-4">
            <Upload className="w-10 h-10" />
          </div>
          <h2 className="text-3xl mb-2">{t('organizer.uploadTitle')}</h2>
          <p className="text-gray-600">
            {t('calendar.uploadDesc') || 'Select the photos you want for each month of your calendar.'}
          </p>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-lg p-12">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-4"
          >
            <ImageIcon className="w-16 h-16 text-gray-400" />
            <div className="text-center">
              <p className="text-xl mb-2">{t('organizer.clickToSelect')}</p>
              <p className="text-sm text-gray-500">{t('organizer.selectMultiple')}</p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleBatchUpload}
            className="hidden"
          />

          <div className="mt-8 flex flex-col gap-4">
            <button
              disabled={totalPhotos === 0}
              onClick={() => setStep('editor')}
              className={`w-full py-4 rounded-lg text-lg font-medium transition-all ${
                totalPhotos > 0
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {totalPhotos === 0 
                ? t('calendar.uploadPrompt') || 'Upload photos to continue'
                : t('organizer.continueToPages')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8 sticky top-24 bg-white/95 backdrop-blur-sm z-40 py-4 border-b">
        <div>
          <h2 className="text-2xl font-bold">{calendar.name} Editor</h2>
          <p className="text-gray-500">{totalPhotos} / 12 months filled</p>
        </div>
        <button
          onClick={() => onComplete(photos)}
          className="px-8 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg font-medium"
        >
          {t('organizer.complete')}
        </button>
      </div>

      <div className="space-y-12">
        {MONTHS.map((month, index) => (
          <div key={index} className="relative group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">
                {month} {year}
              </span>
              <button
                onClick={() => setEditingMonthIndex(editingMonthIndex === index ? null : index)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                  editingMonthIndex === index
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-200 hover:border-black'
                }`}
              >
                {editingMonthIndex === index ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                <span className="text-xs font-bold uppercase tracking-tight">
                  {editingMonthIndex === index ? 'Finalizar Edición' : 'Habilitar Edición'}
                </span>
              </button>
            </div>

            <div 
              className={`bg-white rounded-xl shadow-sm border-2 transition-all overflow-hidden ${
                editingMonthIndex === index ? 'border-black ring-4 ring-black/5' : 'border-gray-100'
              }`}
              style={{ aspectRatio: customization.orientation === 'horizontal' ? '4/3' : '3/4' }}
            >
              <div className={`grid h-full ${customization.orientation === 'horizontal' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {/* Photo Section */}
                <div className={`bg-gray-50 relative ${
                  customization.orientation === 'horizontal' ? 'border-r border-gray-100' : 'h-[60%] border-b border-gray-100'
                }`}>
                  {photos[index] ? (
                    <>
                      <ImageCropper 
                        src={photos[index]} 
                        defaultPosition={photoCrops[index] || { x: 50, y: 50, zoom: 1 }}
                        defaultZoom={photoCrops[index]?.zoom || 1}
                        onCropChange={(newCrop) => handleCropChange(index, newCrop)}
                        isEditable={editingMonthIndex === index}
                      />
                      {editingMonthIndex === index && (
                        <button 
                          onClick={() => {
                            const newPhotos = [...photos];
                            newPhotos[index] = '';
                            onPhotosChange(newPhotos);
                          }}
                          className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg z-10"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e: any) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const newPhotos = [...photos];
                              newPhotos[index] = ev.target?.result as string;
                              onPhotosChange(newPhotos);
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      className="w-full h-full flex flex-col items-center justify-center gap-4 hover:bg-gray-100 transition-colors"
                    >
                      <ImageIcon className="w-16 h-16 text-gray-300" />
                      <span className="text-sm font-bold uppercase text-gray-400">Add Photo</span>
                    </button>
                  )}
                </div>

                {/* Calendar Grid Section */}
                <div className={`p-6 flex flex-col justify-center bg-gray-50/50 ${
                  customization.orientation === 'vertical' ? 'flex-1' : ''
                }`}>
                   <div className="text-center mb-4">
                      <span className="text-xl font-bold">{month} {year}</span>
                   </div>
                   <TooltipProvider>
                    <div className="grid grid-cols-7 gap-1">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className="text-center text-[10px] font-bold text-gray-400 py-2">
                          {day}
                        </div>
                      ))}
                      {generateCalendarGrid(index).map((day, i) => {
                        if (!day) return <div key={i} className="aspect-square" />;
                        const date = new Date(year, index, day);
                        const holiday = isHoliday(date, holidays);
                        const content = (
                          <div className={`aspect-square flex items-center justify-center text-[10px] sm:text-xs rounded ${
                            holiday ? 'bg-red-50 text-red-600 font-bold border border-red-100' : 'bg-white border border-gray-100'
                          }`}>
                            {day}
                          </div>
                        );
                        return holiday ? (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>{content}</TooltipTrigger>
                            <TooltipContent><p>{holiday.name}</p></TooltipContent>
                          </Tooltip>
                        ) : <div key={i}>{content}</div>;
                      })}
                    </div>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center pb-20">
        <button
          onClick={() => onComplete(photos)}
          disabled={totalPhotos < 12}
          className={`px-12 py-4 rounded-full text-lg font-bold shadow-xl transition-all ${
            totalPhotos >= 12 
              ? 'bg-black text-white hover:bg-gray-800' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {totalPhotos < 12 ? `Faltan ${12 - totalPhotos} fotos` : t('organizer.complete')}
        </button>
      </div>
    </div>
  );
}

