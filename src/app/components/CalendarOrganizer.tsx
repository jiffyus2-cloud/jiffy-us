import { useState, useRef } from 'react';
import { 
  Upload, X, Image as ImageIcon, Trash2,
  Check, Edit3, Plus, Loader2, Calendar as CalendarIcon, Crop as CropIcon
} from 'lucide-react';
import { Calendar } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import { CalendarCustomizationOptions } from './CalendarCustomization';
import ImageCropper from './ImageCropper';
import CropModal from './CropModal';
import { getColombianHolidays, isHoliday } from '../utils/holidays';

interface CalendarOrganizerProps {
  calendar: Calendar;
  customization: CalendarCustomizationOptions;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  photoCrops: Record<number, { x: number; y: number; zoom: number }>;
  onPhotoCropsChange: (crops: Record<number, { x: number; y: number; zoom: number }>) => void;
  onComplete: (photos: string[]) => void;
}

type Step = 'upload' | 'editor';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const generateCalendarGrid = (year: number, monthIndex: number) => {
  const date = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOfWeek = date.getDay();
  const days = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) days.push(day);
  return days;
};

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
  const [step, setStep] = useState<Step>(photos.length > 0 ? 'editor' : 'upload');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [targetSlot, setTargetSlot] = useState<number | null>(null);
  
  const [cropModalData, setCropModalData] = useState<{ index: number, aspectRatio: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const specificFileInputRef = useRef<HTMLInputElement>(null);

  const year = customization.year || new Date().getFullYear();
  const holidays = getColombianHolidays(year);
  const requiredPhotos = customization.imagesPerMonth === 4 ? 48 : 12;

  const pageAspect = customization.type === 'desk' ? 21/14 : 30/22;
  const totalPrice = customization.type === 'wall' ? 80000 : 60000;

  const handleBatchUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    const filesArray = Array.from(files);
    const loadedPhotos = filesArray.map(file => URL.createObjectURL(file));

    const newPhotos = [...photos];
    while(newPhotos.length < requiredPhotos) newPhotos.push('');

    let loadedIdx = 0;
    for (let i = 0; i < requiredPhotos && loadedIdx < loadedPhotos.length; i++) {
      if (!newPhotos[i] || newPhotos[i].trim() === '') {
        newPhotos[i] = loadedPhotos[loadedIdx];
        loadedIdx++;
      }
    }

    onPhotosChange(newPhotos);
    setStep('editor');
    setIsProcessingFiles(false);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSpecificUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (targetSlot === null) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const newPhotos = [...photos];
    while(newPhotos.length < requiredPhotos) newPhotos.push('');
    
    newPhotos[targetSlot] = URL.createObjectURL(file);
    onPhotosChange(newPhotos);
    setTargetSlot(null);

    if (specificFileInputRef.current) specificFileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos[index] = ''; 
    onPhotosChange(newPhotos);
  };

  const handleCropChange = (index: number, crop: { x: number, y: number, zoom: number }) => {
    onPhotoCropsChange({
      ...photoCrops,
      [index]: crop
    });
  };

  const uploadedCount = photos.filter(p => p && p.trim() !== '').length;

  const renderSlot = (globalIdx: number) => {
    const photo = photos[globalIdx];
    const crop = photoCrops[globalIdx];

    return (
      <div key={globalIdx} className="relative bg-gray-200 rounded-sm overflow-hidden w-full h-full group">
        {photo && photo.trim() !== '' ? (
          <ImageCropper
            src={photo}
            position={crop || { x: 50, y: 50, zoom: 1 }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
            <ImageIcon className="w-6 h-6 mb-1 opacity-30" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-center">Espacio<br/>Vacío</span>
          </div>
        )}
        
        <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {photo && photo.trim() !== '' && (
            <button 
              onClick={() => setCropModalData({ index: globalIdx, aspectRatio: pageAspect })} 
              className="p-1.5 bg-white/90 text-black hover:bg-white rounded-full shadow-sm transition-all"
              title="Ajustar Recorte"
            >
              <CropIcon className="w-3.5 h-3.5"/>
            </button>
          )}
          {photo && photo.trim() !== '' && (
            <button 
              onClick={() => removePhoto(globalIdx)} 
              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-sm transition-all"
              title="Eliminar Foto"
            >
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          )}
          {(!photo || photo.trim() === '') && (
            <button 
              onClick={() => {
                setTargetSlot(globalIdx);
                specificFileInputRef.current?.click();
              }} 
              className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5"/>
            </button>
          )}
        </div>
      </div>
    );
  };

  if (step === 'upload') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-lg mb-4">
            <Upload className="w-10 h-10" />
          </div>
          <h2 className="text-3xl mb-2">{t('organizer.uploadTitle')}</h2>
          <p className="text-gray-600">
            Necesitas {requiredPhotos} fotos para tu calendario del año {year}.
          </p>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-lg p-12">
          {isProcessingFiles ? (
             <div className="w-full py-16 flex flex-col items-center justify-center gap-4">
               <Loader2 className="w-16 h-16 text-gray-400 animate-spin" />
               <p className="text-xl font-bold">Procesando imágenes...</p>
               <p className="text-sm text-gray-500">Alistando los meses del calendario...</p>
             </div>
          ) : (
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
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleBatchUpload}
            className="hidden"
            disabled={isProcessingFiles}
          />

          {uploadedCount > 0 && !isProcessingFiles && (
             <div className="mt-8 flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium">{uploadedCount} de {requiredPhotos} fotos seleccionadas</span>
                  <button onClick={() => onPhotosChange([])} className="text-red-500 hover:text-red-700 font-medium">Borrar todas</button>
                </div>
                <button
                  onClick={() => setStep('editor')}
                  className="w-full py-4 bg-black text-white rounded-lg text-lg font-medium hover:bg-gray-800 transition-all"
                >
                  {t('organizer.continueToPages')}
                </button>
             </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <input type="file" ref={specificFileInputRef} accept="image/*" onChange={handleSpecificUpload} className="hidden" />

      <div className="flex items-center justify-between mb-8 sticky top-24 bg-white/95 backdrop-blur-sm z-40 py-4 border-b">
        <div>
          <h2 className="text-2xl font-bold">{calendar.name} Editor</h2>
          <p className="text-gray-500">
            {uploadedCount} / {requiredPhotos} fotos subidas • Diseño: {customization.type === 'desk' ? 'Escritorio' : 'Pared'} • Total: ${totalPrice.toLocaleString('es-CO')} COP
          </p>
        </div>
        <button onClick={() => onComplete(photos)} className="px-8 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg font-medium">
          {t('organizer.complete')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {MONTHS_ES.map((month, monthIndex) => {
          const requiredForThisMonth = customization.imagesPerMonth === 4 ? 4 : 1;
          const startIndex = monthIndex * requiredForThisMonth;
          const slots = Array.from({ length: requiredForThisMonth }, (_, i) => startIndex + i);

          return (
            <div key={monthIndex} className="space-y-3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">{month} {year}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mx-auto w-full max-w-sm hover:shadow-xl transition-shadow" style={{ aspectRatio: customization.type === 'desk' ? '21/28' : '30/44' }}>
                <div className="flex flex-col h-full">
                  <div className="h-1/2 w-full border-b border-gray-100 bg-gray-50 relative p-1.5">
                    {requiredForThisMonth === 4 ? (
                      <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full">{slots.map(globalIdx => renderSlot(globalIdx))}</div>
                    ) : renderSlot(slots[0])}
                  </div>

                  <div className="h-1/2 w-full p-4 flex flex-col justify-center bg-white relative">
                    <div className="text-center mb-3"><span className="text-base sm:text-lg font-bold text-gray-900">{month} {year}</span></div>
                    <div className="flex-1 grid grid-cols-7 gap-1 min-h-0">
                      {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (<div key={i} className="text-center text-[10px] font-bold text-gray-400">{day}</div>))}
                      {generateCalendarGrid(year, monthIndex).map((day, i) => {
                        if (!day) return <div key={i} className="h-full min-h-[20px]" />;
                        const date = new Date(year, monthIndex, day);
                        const holiday = isHoliday(date, holidays);
                        return (
                          <div key={i} title={holiday ? holiday.name : undefined} className={`h-full min-h-[20px] flex items-center justify-center text-[10px] rounded cursor-default transition-colors ${holiday ? 'bg-red-50 text-red-600 font-bold border border-red-100 hover:bg-red-100' : 'bg-white border border-gray-100 text-gray-700 hover:bg-gray-50'}`}>
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cropModalData !== null && (
        <CropModal
          isOpen={true}
          onClose={() => setCropModalData(null)}
          imageSrc={photos[cropModalData.index]}
          currentCrop={photoCrops[cropModalData.index]}
          aspectRatio={cropModalData.aspectRatio}
          title={`Ajustar Foto del Calendario`}
          onSave={(newCrop) => handleCropChange(cropModalData.index, newCrop)}
        />
      )}
    </div>
  );
}