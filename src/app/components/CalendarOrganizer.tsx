import { useState, useRef } from 'react';
import { 
  Upload, X, Image as ImageIcon, Trash2,
  Check, Edit3, Plus, Pencil, Loader2, Calendar as CalendarIcon, Crop as CropIcon, AlertCircle
} from 'lucide-react';
import { Calendar } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import { RichText } from './ui/RichText';
import { CalendarCustomizationOptions } from './CalendarCustomization';
import ImageCropper from './ImageCropper';
import CropModal from './CropModal';
import { convertFileIfHeic } from '../utils/imageUtils';
import { CalendarMonthSheet, CalendarTemplatePage, getCalendarMonths, getPhotoAspect, MONTHS_ES, normalizeCalendarDesign, normalizeCalendarType, useCalendarHolidays } from './calendar/CalendarTemplate';
import jiffyLogo from '../../assets/JiffyLogo.svg';
import CalendarPhotoChooser from './calendar/CalendarPhotoChooser';
import { moveCalendarMonth, swapCalendarMonths, swapCalendarPhotos, type CalendarPhotoState } from './calendar/calendarReorder';
import CalendarMonthPhotosModal from './calendar/CalendarMonthPhotosModal';

interface CalendarOrganizerProps {
  calendar: Calendar;
  customization: CalendarCustomizationOptions;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  photoCrops: Record<number, { x: number; y: number; zoom: number }>;
  onPhotoCropsChange: (crops: Record<number, { x: number; y: number; zoom: number }>) => void;
  onComplete: (photos: string[]) => void;
  isSaving?: boolean;
}

type Step = 'upload' | 'editor';

export default function CalendarOrganizer({ 
  calendar, 
  customization, 
  photos,
  onPhotosChange,
  photoCrops,
  onPhotoCropsChange,
  onComplete,
  isSaving = false,
}: CalendarOrganizerProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>(photos.length > 0 ? 'editor' : 'upload');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [targetSlot, setTargetSlot] = useState<number | null>(null);
  
  const [cropModalData, setCropModalData] = useState<{ index: number, aspectRatio: number } | null>(null);
  
  // Estados para validación de resolución
  const [isValidating, setIsValidating] = useState(false);
  const [lowResInfo, setLowResInfo] = useState<Record<string, {width: number, height: number}>>({});
  const [selectedLowResWarning, setSelectedLowResWarning] = useState<{url: string, slotIndex: number, width: number, height: number} | null>(null);
  // Mapa clave de archivo → info de baja resolución, para aplicarla cuando se crea la URL definitiva
  const pendingLowResRef = useRef<Map<string, {width: number, height: number}>>(new Map());

  // Firmas de archivo por slot (para detección de duplicados)
  const [fileSignatures, setFileSignatures] = useState<string[]>([]);
  // Modal de foto duplicada
  const [duplicateModal, setDuplicateModal] = useState<{
    file: File;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  // Fotos elegidas de más: el cliente decide cuáles caben (ver CalendarPhotoChooser)
  const [photoChoice, setPhotoChoice] = useState<{ files: File[]; max: number } | null>(null);

  // Reordenar meses como las páginas del álbum: mantener presionado selecciona,
  // tocar otro mes abre Intercambiar / Insertar aquí.
  const [reorderSelected, setReorderSelected] = useState<number | null>(null);
  const [reorderTarget, setReorderTarget] = useState<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Calendario de 4 fotos: ajustes del mes (reordenar dentro del mes o cambiar con otro mes)
  const [monthModal, setMonthModal] = useState<number | null>(null);

  const getFileKey = (file: File) => `${file.name}|${file.size}|${file.lastModified}`;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const specificFileInputRef = useRef<HTMLInputElement>(null);

  const year = customization.year || new Date().getFullYear();
  const startMonth = customization.startMonth || 1;
  const calendarMonths = getCalendarMonths(startMonth, year);
  const calendarType = normalizeCalendarType(customization.type);
  const calendarDesign = normalizeCalendarDesign(customization.type, customization.design);
  const imagesPerMonth = calendarType === 'wall' && customization.imagesPerMonth === 4 ? 4 : 1;
  const requiredPhotos = imagesPerMonth * 12;

  const pageAspect = getPhotoAspect(calendarType, imagesPerMonth);
  const uploadedCount = photos.filter(p => p && p.trim() !== '').length;
  const remainingSlots = Math.max(0, requiredPhotos - uploadedCount);
  const holidays = useCalendarHolidays(customization.holidayCountry, year, startMonth);
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

    const filesArray = Array.from(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (remainingSlots <= 0) return;

    // Más fotos de las que caben: que el cliente elija cuáles, no solo las primeras.
    if (filesArray.length > remainingSlots) {
      setPhotoChoice({ files: filesArray, max: remainingSlots });
      return;
    }
    await uploadChosenFiles(filesArray);
  };

  const uploadChosenFiles = async (filesArray: File[]) => {
    if (filesArray.length === 0) return;
    setIsValidating(true);
    const convertedFiles = await Promise.all(filesArray.map(convertFileIfHeic));
    const results = await Promise.all(convertedFiles.map(checkImageDimensions));

    // Guardar info de baja resolución para mostrar el ícono después
    results.filter(r => r.isLowRes).forEach(r => {
      pendingLowResRef.current.set(getFileKey(r.file), { width: r.width, height: r.height });
    });

    setIsValidating(false);
    processBatchUpload(results.map(r => r.file));
  };

  const handleSpecificUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (targetSlot === null) return;
    let file = event.target.files?.[0];
    if (!file) return;

    file = await convertFileIfHeic(file);
    setIsValidating(true);
    const result = await checkImageDimensions(file);
    if (result.isLowRes) {
      pendingLowResRef.current.set(getFileKey(file), { width: result.width, height: result.height });
    }
    setIsValidating(false);
    processSpecificUpload(file);

    if (specificFileInputRef.current) specificFileInputRef.current.value = '';
  };

  const processBatchUpload = async (finalFiles: File[]) => {
    if (finalFiles.length === 0) return;

    // Separar duplicados de nuevos
    const newSigs = [...fileSignatures];
    while (newSigs.length < requiredPhotos) newSigs.push('');
    const existingKeys = new Set(newSigs.filter(Boolean));

    const duplicates: File[] = [];
    const unique: File[] = [];
    for (const file of finalFiles) {
      if (existingKeys.has(getFileKey(file))) duplicates.push(file);
      else unique.push(file);
    }

    const doUpload = (filesToUpload: File[]) => {
      if (filesToUpload.length === 0) return;
      setIsProcessingFiles(true);
      setTimeout(() => {
        const newPhotos = [...photos];
        while (newPhotos.length < requiredPhotos) newPhotos.push('');
        const updatedSigs = [...newSigs];
        const newLowResInfo: Record<string, {width: number, height: number}> = {};
        let idx = 0;
        for (let i = 0; i < requiredPhotos && idx < filesToUpload.length; i++) {
          if (!newPhotos[i] || newPhotos[i].trim() === '') {
            const newUrl = URL.createObjectURL(filesToUpload[idx]);
            newPhotos[i] = newUrl;
            updatedSigs[i] = getFileKey(filesToUpload[idx]);
            const fk = getFileKey(filesToUpload[idx]);
            if (pendingLowResRef.current.has(fk)) {
              newLowResInfo[newUrl] = pendingLowResRef.current.get(fk)!;
              pendingLowResRef.current.delete(fk);
            }
            idx++;
          }
        }
        if (Object.keys(newLowResInfo).length > 0) {
          setLowResInfo(prev => ({ ...prev, ...newLowResInfo }));
        }
        onPhotosChange(newPhotos);
        setFileSignatures(updatedSigs);
        setStep('editor');
        setIsProcessingFiles(false);
      }, 50);
    };

    if (duplicates.length > 0) {
      // Mostrar modal para el primer duplicado; luego procesar los únicos
      setDuplicateModal({
        file: duplicates[0],
        onConfirm: () => {
          setDuplicateModal(null);
          doUpload([...unique, ...duplicates]);
        },
        onCancel: () => {
          setDuplicateModal(null);
          doUpload(unique);
        },
      });
    } else {
      doUpload(unique);
    }
  };

  const processSpecificUpload = (file: File) => {
    if (targetSlot === null) return;
    const key = getFileKey(file);
    const existingKeys = new Set(fileSignatures.filter(Boolean));

    const doUpload = () => {
      const newUrl = URL.createObjectURL(file);
      const newPhotos = [...photos];
      while (newPhotos.length < requiredPhotos) newPhotos.push('');
      newPhotos[targetSlot!] = newUrl;
      const newSigs = [...fileSignatures];
      while (newSigs.length < requiredPhotos) newSigs.push('');
      newSigs[targetSlot!] = key;
      if (pendingLowResRef.current.has(key)) {
        const info = pendingLowResRef.current.get(key)!;
        pendingLowResRef.current.delete(key);
        setLowResInfo(prev => ({ ...prev, [newUrl]: info }));
      }
      onPhotosChange(newPhotos);
      setFileSignatures(newSigs);
      setTargetSlot(null);
    };

    if (existingKeys.has(key)) {
      setDuplicateModal({
        file,
        onConfirm: () => { setDuplicateModal(null); doUpload(); },
        onCancel: () => { setDuplicateModal(null); setTargetSlot(null); },
      });
    } else {
      doUpload();
    }
  };

  // ==========================================================================

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos[index] = '';
    onPhotosChange(newPhotos);
    const newSigs = [...fileSignatures];
    if (newSigs[index]) newSigs[index] = '';
    setFileSignatures(newSigs);
  };

  const applyReorder = (fn: (state: CalendarPhotoState) => CalendarPhotoState) => {
    const next = fn({ photos, crops: photoCrops, signatures: fileSignatures });
    onPhotosChange(next.photos);
    onPhotoCropsChange(next.crops);
    setFileSignatures(next.signatures);
  };

  const exitReorderMode = () => {
    setReorderSelected(null);
    setReorderTarget(null);
  };

  const handleMonthLongPress = (position: number, e: React.PointerEvent) => {
    const startX = e.clientX;
    const startY = e.clientY;

    const cancel = () => {
      if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', cancel);
      document.removeEventListener('pointercancel', cancel);
    };

    const onMove = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - startX) > 10 || Math.abs(ev.clientY - startY) > 10) cancel();
    };

    longPressTimerRef.current = setTimeout(() => {
      cancel();
      if (navigator.vibrate) navigator.vibrate(60);
      setReorderSelected(position);
      setReorderTarget(null);
    }, 200);

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', cancel);
    document.addEventListener('pointercancel', cancel);
  };

  const handleCropChange = (index: number, crop: { x: number, y: number, zoom: number }) => {
    onPhotoCropsChange({
      ...photoCrops,
      [index]: crop
    });
  };


  const renderDuplicateModal = () => {
    if (!duplicateModal) return null;
    return (
      <div className="fixed inset-0 z-[210] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 sm:p-8 animate-in zoom-in-95 duration-200 text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Foto repetida</h3>
          <p className="text-sm text-gray-500 mb-4">
            <RichText text={t('calendarOrg.duplicateDesc', { name: duplicateModal.file.name })} />
          </p>
          <div className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden mb-6">
            <img
              src={URL.createObjectURL(duplicateModal.file)}
              className="w-full h-full object-contain"
              alt="Foto duplicada"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={duplicateModal.onCancel}
              className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
            >
              Elegir otra
            </button>
            <button
              onClick={duplicateModal.onConfirm}
              className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all"
            >
              Usar de todos modos
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderLowResWarningModal = () => {
    if (!selectedLowResWarning) return null;
    const { url, slotIndex, width, height } = selectedLowResWarning;
    return (
      <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in zoom-in-95 duration-200 text-center">
          <div className="w-16 h-16 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Baja Resolución Detectada</h3>
          <p className="text-sm text-gray-500 mb-6">
            <RichText text={t('photos.lowResDesc', { size: `${width}x${height}px` })} />
          </p>
          <div className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden mb-6 flex items-center justify-center">
            <img src={url} className="w-full h-full object-contain" alt="Low res preview" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                removePhoto(slotIndex);
                setLowResInfo(prev => { const n = { ...prev }; delete n[url]; return n; });
                setSelectedLowResWarning(null);
              }}
              className="flex-1 py-3 bg-white border-2 border-gray-200 text-red-500 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-all"
            >
              Descartar
            </button>
            <button
              onClick={() => {
                setLowResInfo(prev => { const n = { ...prev }; delete n[url]; return n; });
                setSelectedLowResWarning(null);
              }}
              className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-md"
            >
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
    const isPhotoLowRes = photo && photo.trim() !== '' && lowResInfo[photo];

    return (
      <div key={globalIdx} className="relative bg-gray-200 overflow-hidden w-full h-full group">
        {photo && photo.trim() !== '' ? (
          <ImageCropper
            src={photo}
            position={crop || { x: 50, y: 50, zoom: 1 }}
            onRetry={() => {
              setTargetSlot(globalIdx);
              specificFileInputRef.current?.click();
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
            <ImageIcon className="w-6 h-6 mb-1 opacity-30" />
            <span className="text-[8px] font-bold uppercase tracking-wider text-center">Espacio<br/>Vacío</span>
          </div>
        )}

        {isPhotoLowRes && (
          <button
            className="absolute top-1 left-1 z-20 w-5 h-5 rounded-full bg-purple-200 text-purple-600 flex items-center justify-center text-xs font-bold shadow-md hover:bg-purple-300 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedLowResWarning({ url: photo!, slotIndex: globalIdx, ...lowResInfo[photo!] });
            }}
            title="Advertencia de resolución"
          >
            !
          </button>
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

  const renderSheetCard = (label: string, key: string | number, sheet: React.ReactNode) => (
    <div key={key} className="space-y-3">
      <div className="flex items-center justify-center gap-2 mb-2">
        <CalendarIcon className="w-4 h-4 text-gray-400" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">{label}</p>
      </div>
      <div className="bg-white shadow-lg border border-gray-100 overflow-hidden mx-auto w-full max-w-sm hover:shadow-xl transition-shadow">
        {sheet}
      </div>
    </div>
  );

  if (step === 'upload') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        {renderDuplicateModal()}
        {renderLowResWarningModal()}
        {photoChoice && (
          <CalendarPhotoChooser
            files={photoChoice.files}
            max={photoChoice.max}
            onCancel={() => setPhotoChoice(null)}
            onConfirm={(chosen) => { setPhotoChoice(null); uploadChosenFiles(chosen); }}
          />
        )}

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-lg mb-4">
            <Upload className="w-10 h-10" />
          </div>
          <h2 className="text-3xl mb-2">{t('organizer.uploadTitle')}</h2>
          <p className="text-gray-600">
            Necesitas {requiredPhotos} fotos para tu calendario de {MONTHS_ES[startMonth - 1]} {year} a {calendarMonths[11].name} {calendarMonths[11].year}.
          </p>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-lg p-12">
          {isValidating ? (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-16 h-16 text-gray-400 animate-spin" />
              <p className="text-xl font-bold">Verificando calidad de imágenes...</p>
              <p className="text-sm text-gray-500">{t('photos.checkingQualityDesc')}</p>
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
              disabled={remainingSlots === 0}
              className="w-full py-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:bg-white"
            >
              <ImageIcon className="w-16 h-16 text-gray-400" />
              <div className="text-center">
                {remainingSlots === 0 ? (
                  <p className="text-xl mb-2">{t('calendarOrg.full')}</p>
                ) : (
                  <>
                    <p className="text-xl mb-2">{t('organizer.clickToSelect')}</p>
                    <p className="text-sm text-gray-500">{t('organizer.selectMultiple')}</p>
                    <p className="text-sm text-gray-700 mt-1">
                      <RichText text={t('calendarOrg.pickLimit', { count: remainingSlots })} />
                    </p>
                  </>
                )}
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
      {renderDuplicateModal()}
      {renderLowResWarningModal()}

      {/* OVERLAY DE VALIDACIÓN PARA SUBIDA ESPECÍFICA */}
      {isValidating && step === 'editor' && (
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
            {uploadedCount} / {requiredPhotos} fotos subidas • Diseño: {customization.type === 'desk' ? (calendarDesign === 'label' ? 'Escritorio (Etiqueta)' : 'Escritorio') : 'Pared'} • Total: ${totalPrice.toLocaleString('es-CO')} COP
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{t('calendarOrg.longPressHint')}</p>
        </div>
        <button
          onClick={() => { if (!isSaving) onComplete(photos); }}
          disabled={isSaving}
          className="px-8 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('organizer.complete')}
        </button>

        {/* Banner superpuesto (absolute) para no cambiar la altura del header sticky */}
        {reorderSelected !== null && (
          <div className="absolute left-0 right-0 top-full mt-2 flex items-center justify-between bg-black text-white rounded-lg px-3 py-2 text-xs font-bold shadow-inner z-50">
            <span>📌 {calendarMonths[reorderSelected].name} seleccionado — toca otro mes para moverlo</span>
            <button onClick={exitReorderMode} className="ml-3 p-0.5 hover:bg-white/20 rounded-full transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Cada tarjeta es la página real de la plantilla 2027 (la misma que se imprime) */}
      <div className={`grid grid-cols-1 gap-10 ${calendarType === 'desk' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}`}>
        {renderSheetCard('Portada', 'cover', (
          <CalendarTemplatePage type={calendarType} design={calendarDesign} page={{ kind: 'cover' }} year={year} startMonth={startMonth} logoSrc={jiffyLogo} />
        ))}

        {calendarMonths.map(({ name, year: monthYear }, position) => {
          const isReorderMode = reorderSelected !== null;
          const isSelected = reorderSelected === position;
          const isTarget = reorderTarget === position;
          return (
            <div
              key={position}
              className={`relative space-y-3 transition-all duration-200 ${isReorderMode && !isSelected && !isTarget ? 'opacity-50' : ''}`}
            >
              {/* Capa de toque para elegir el mes destino */}
              {isReorderMode && !isSelected && reorderTarget === null && (
                <button
                  onClick={() => setReorderTarget(position)}
                  className="absolute inset-0 z-20 w-full h-full cursor-pointer"
                  aria-label={`Elegir ${name} ${monthYear} como destino`}
                />
              )}

              <div className="flex items-center justify-center gap-2 mb-2 h-7">
                <CalendarIcon className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-gray-400'}`} />
                <p className={`text-xs font-bold uppercase tracking-widest text-center ${isSelected ? 'text-black' : 'text-gray-400'}`}>
                  {name} {monthYear}
                </p>
                {imagesPerMonth > 1 && !isReorderMode && (
                  <button
                    onClick={() => setMonthModal(position)}
                    className="relative z-10 flex items-center gap-1 px-2.5 py-1 rounded-full border-2 bg-white text-black border-gray-200 hover:border-black transition-all"
                  >
                    <Pencil className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Ajustes</span>
                  </button>
                )}
                {isSelected && (
                  <button
                    onClick={exitReorderMode}
                    className="p-1 rounded-full bg-black text-white"
                    title="Cancelar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="relative mx-auto w-full max-w-sm">
                <div
                  className={`bg-white shadow-lg border overflow-hidden hover:shadow-xl transition-all ${
                    isSelected ? 'border-black ring-4 ring-black/15' : isTarget ? 'border-black ring-2 ring-black/30' : 'border-gray-100'
                  }`}
                  style={{ userSelect: 'none' }}
                  onPointerDown={!isReorderMode ? e => handleMonthLongPress(position, e) : undefined}
                >
                  <CalendarMonthSheet
                    type={calendarType}
                    design={calendarDesign}
                    position={position}
                    year={year}
                    startMonth={startMonth}
                    imagesPerMonth={imagesPerMonth}
                    holidays={holidays}
                    renderPhoto={(pos, slot) => renderSlot(pos * imagesPerMonth + slot)}
                  />
                </div>

                {/* Acciones al elegir el mes destino (mismas que en el álbum) */}
                {isTarget && reorderSelected !== null && (
                  <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-2.5 z-30 p-3">
                    <button
                      onClick={() => { applyReorder(s => swapCalendarMonths(s, reorderSelected, position, 12, imagesPerMonth)); exitReorderMode(); }}
                      className="w-full max-w-xs py-3 bg-white text-black font-bold rounded-xl text-sm hover:bg-gray-100 transition-colors"
                    >
                      ↕ Intercambiar posiciones
                    </button>
                    <button
                      onClick={() => { applyReorder(s => moveCalendarMonth(s, reorderSelected, position, 12, imagesPerMonth)); exitReorderMode(); }}
                      className="w-full max-w-xs py-3 bg-transparent text-white font-bold rounded-xl text-sm border-2 border-white/70 hover:bg-white/10 transition-colors"
                    >
                      → Insertar en esta posición
                    </button>
                    <button
                      onClick={() => setReorderTarget(null)}
                      className="text-white/60 text-xs mt-1 hover:text-white/90 transition-colors"
                    >
                      ← Elegir otro mes
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {calendarType === 'desk' && calendarDesign === 'classic' && renderSheetCard('Última hoja', 'notes', (
          <CalendarTemplatePage type="desk" page={{ kind: 'notes' }} year={year} startMonth={startMonth} holidays={holidays} />
        ))}
      </div>

      {monthModal !== null && (
        <CalendarMonthPhotosModal
          position={monthModal}
          monthLabels={calendarMonths.map(m => `${m.name} ${m.year}`)}
          photos={photos}
          crops={photoCrops}
          imagesPerMonth={imagesPerMonth}
          photoAspect={pageAspect}
          onSwap={(from, to) => applyReorder(st => swapCalendarPhotos(st, from, to))}
          onClose={() => setMonthModal(null)}
        />
      )}

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