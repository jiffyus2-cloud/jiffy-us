import { useState, useRef } from 'react';
import { 
  Upload, X, Image as ImageIcon, Trash2,
  Check, Edit3, Plus, Loader2, Calendar as CalendarIcon, Crop as CropIcon, AlertCircle
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
  
  // Estados para validación de resolución
  const [isValidating, setIsValidating] = useState(false);
  const [lowResImages, setLowResImages] = useState<{file: File, url: string, width: number, height: number}[]>([]);
  const [currentLowResIndex, setCurrentLowResIndex] = useState(0);
  const [approvedFiles, setApprovedFiles] = useState<File[]>([]);
  const [uploadMode, setUploadMode] = useState<'batch' | 'specific' | null>(null);
  const [applyToAllLowRes, setApplyToAllLowRes] = useState(false); // NUEVO ESTADO

  const fileInputRef = useRef<HTMLInputElement>(null);
  const specificFileInputRef = useRef<HTMLInputElement>(null);

  const year = customization.year || new Date().getFullYear();
  const holidays = getColombianHolidays(year);
  const requiredPhotos = customization.imagesPerMonth === 4 ? 48 : 12;

  const pageAspect = customization.type === 'desk' ? 21/14 : 30/22;
  const totalPrice = customization.type === 'wall' ? 80000 : 60000;

  // ==========================================================================
  // VALIDADOR DE RESOLUCIÓN
  // ==========================================================================
  const checkImageDimensions = (file: File): Promise<{file: File, url: string, isLowRes: boolean, width: number, height: number}> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const minDim = Math.min(img.width, img.height);
        resolve({ file, url, isLowRes: minDim < 1080, width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve({ file, url, isLowRes: false, width: 0, height: 0 }); 
      };
      img.src = url;
    });
  };

  const handleBatchUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsValidating(true);
    const filesArray = Array.from(files);
    
    const results = await Promise.all(filesArray.map(checkImageDimensions));
    const valid = results.filter(r => !r.isLowRes).map(r => r.file);
    const lowRes = results.filter(r => r.isLowRes);

    if (lowRes.length > 0) {
      setApprovedFiles(valid);
      setLowResImages(lowRes);
      setCurrentLowResIndex(0);
      setApplyToAllLowRes(false);
      setUploadMode('batch');
      setIsValidating(false);
    } else {
      setIsValidating(false);
      processBatchUpload(valid);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSpecificUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (targetSlot === null) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setIsValidating(true);
    const result = await checkImageDimensions(file);

    if (result.isLowRes) {
      setApprovedFiles([]);
      setLowResImages([result]);
      setCurrentLowResIndex(0);
      setApplyToAllLowRes(false);
      setUploadMode('specific');
      setIsValidating(false);
    } else {
      setIsValidating(false);
      processSpecificUpload(file);
    }

    if (specificFileInputRef.current) specificFileInputRef.current.value = '';
  };

  const handleLowResDecision = (keep: boolean) => {
    let newApproved = [...approvedFiles];
    
    if (applyToAllLowRes) {
      if (keep) {
        for (let i = currentLowResIndex; i < lowResImages.length; i++) {
          newApproved.push(lowResImages[i].file);
        }
      }
      
      setLowResImages([]);
      setCurrentLowResIndex(0);
      setApplyToAllLowRes(false);
      
      if (uploadMode === 'batch') {
        processBatchUpload(newApproved);
      } else if (uploadMode === 'specific') {
        if (newApproved.length > 0) processSpecificUpload(newApproved[0]);
        else setTargetSlot(null);
      }
      setUploadMode(null);
    } else {
      const current = lowResImages[currentLowResIndex];
      if (keep) {
        newApproved.push(current.file);
      }
      
      if (currentLowResIndex + 1 < lowResImages.length) {
        setApprovedFiles(newApproved);
        setCurrentLowResIndex(currentLowResIndex + 1);
      } else {
        setLowResImages([]);
        setCurrentLowResIndex(0);
        setApplyToAllLowRes(false);
        
        if (uploadMode === 'batch') {
          processBatchUpload(newApproved);
        } else if (uploadMode === 'specific') {
          if (newApproved.length > 0) processSpecificUpload(newApproved[0]);
          else setTargetSlot(null);
        }
        setUploadMode(null);
      }
    }
  };

  const processBatchUpload = async (finalFiles: File[]) => {
    if (finalFiles.length === 0) return;
    setIsProcessingFiles(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    const loadedPhotos = finalFiles.map(file => URL.createObjectURL(file));
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
  };

  const processSpecificUpload = (file: File) => {
    if (targetSlot === null) return;
    const newPhotos = [...photos];
    while(newPhotos.length < requiredPhotos) newPhotos.push('');
    newPhotos[targetSlot] = URL.createObjectURL(file);
    onPhotosChange(newPhotos);
    setTargetSlot(null);
  };

  // ==========================================================================

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

  const renderLowResModal = () => {
    if (lowResImages.length === 0) return null;
    const remainingCount = lowResImages.length - currentLowResIndex;

    return (
      <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in zoom-in-95 duration-200 text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Baja Resolución Detectada</h3>
          <p className="text-sm text-gray-500 mb-6">
            Esta imagen mide <strong>{lowResImages[currentLowResIndex].width}x{lowResImages[currentLowResIndex].height}px</strong> (menor a 1080p). Al imprimirla podría verse pixelada o borrosa.
          </p>

          <div className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden mb-6 relative flex items-center justify-center">
            <img src={lowResImages[currentLowResIndex].url} className="w-full h-full object-contain" alt="Low res preview" />
            <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full font-mono font-bold shadow-lg">
              {currentLowResIndex + 1} / {lowResImages.length}
            </div>
          </div>

          {remainingCount > 1 && (
            <label className="flex items-center justify-center gap-2 mb-6 cursor-pointer bg-gray-50 p-3 rounded-xl border border-gray-200 hover:border-black transition-colors">
              <input 
                type="checkbox" 
                checked={applyToAllLowRes} 
                onChange={(e) => setApplyToAllLowRes(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black accent-black"
              />
              <span className="text-sm font-bold text-gray-700">Aplicar a las {remainingCount} fotos restantes</span>
            </label>
          )}

          <div className="flex gap-3">
            <button onClick={() => handleLowResDecision(false)} className="flex-1 py-3 bg-white border-2 border-gray-200 text-red-500 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-all">
              Descartar
            </button>
            <button onClick={() => handleLowResDecision(true)} className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-md">
              Usar de todos modos
            </button>
          </div>
        </div>
      </div>
    );
  };

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
        {renderLowResModal()}

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
          {isValidating ? (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-16 h-16 text-gray-400 animate-spin" />
              <p className="text-xl font-bold">Verificando calidad de imágenes...</p>
              <p className="text-sm text-gray-500">Asegurando la mejor resolución para tu impresión</p>
            </div>
          ) : isProcessingFiles ? (
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
            disabled={isProcessingFiles || isValidating}
          />

          {uploadedCount > 0 && !isProcessingFiles && !isValidating && (
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
      {renderLowResModal()}

      {/* OVERLAY DE VALIDACIÓN PARA SUBIDA ESPECÍFICA */}
      {isValidating && uploadMode === null && step === 'editor' && (
        <div className="fixed inset-0 z-[150] bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center">
           <Loader2 className="w-16 h-16 text-gray-900 animate-spin mb-4" />
           <p className="text-xl font-bold">Verificando calidad de la imagen...</p>
        </div>
      )}

      <input type="file" ref={specificFileInputRef} accept="image/*" onChange={handleSpecificUpload} className="hidden" disabled={isValidating || isProcessingFiles} />

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