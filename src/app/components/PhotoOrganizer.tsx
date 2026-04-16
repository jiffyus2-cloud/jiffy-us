import { useState, useRef, useEffect } from 'react';
import { 
  Upload, X, ChevronUp, ChevronDown, Plus, Trash2,
  Image as ImageIcon, Grid3x3, Edit3, Check, 
  ArrowLeft, ArrowRight, Layers, Type, ALargeSmall, Settings, Crop as CropIcon,
  AlertCircle, Loader2
} from 'lucide-react';
import { Album } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import type { CustomizationOptions } from './AlbumCustomization';
import ImageCropper from './ImageCropper';
import CropModal from './CropModal';

// --- NUEVA IMAGEN DE JIFFY ---
import jiffy2Img from '../../assets/Jiffy2.png';

// ============================================================================
// COMPONENTE DE CARGA PERSONALIZADO (JiffyLoader)
// ============================================================================
interface JiffyLoaderProps {
  t?: (key: string) => string;
}

const JiffyLoader: React.FC<JiffyLoaderProps> = ({ t }) => {
  return (
    <div className="w-full py-16 flex flex-col items-center justify-center gap-10 bg-gray-50 rounded-none border border-gray-200 shadow-inner">
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div
          className="absolute w-12 h-14 animate-spin-right-t1"
          style={{ top: '20%', left: '-8%', transform: 'translate(50%, 50%)', transformOrigin: '50% 50%', animationDelay: '0ms' }}
        >
          <svg viewBox="0 0 256 292" className="w-full h-full drop-shadow-md">
            <path fill="#fcd3ba" d="M0,0 L0,292 L256,146  Z" />
          </svg>
        </div>

        <div
          className="absolute w-12 h-14 animate-spin-left-t2"
          style={{ top: '0%', left: '0%', transform: 'translate(50%, 50%)', transformOrigin: '50% 50%', animationDelay: '0ms' }}
        >
          <svg viewBox="0 0 256 292" className="w-full h-full drop-shadow-lg">
            <path fill="#ff7300" d="M256,0 L0,146 L256,292 Z" />
          </svg>
        </div>
      </div>

      <div className="text-center animate-pulse">
        <p className="text-xl font-bold text-gray-900">
          {t ? t('organizer.aiSorting') : 'Organizando con 1Clic.ai'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {t ? t('organizer.aiSortingDesc') : 'Preparando tu diseño...'}
        </p>
      </div>

      <style>{`
        @keyframes spinRightT1 {
          0% { opacity: 0.1; transform: translate(50%, 50%) rotate(180deg) scale(0.5); }
          50% { opacity: 1; transform: translate(50%, 50%) rotate(0deg) scale(0.75); }
          100% { opacity: 0.1; transform: translate(50%, 50%) rotate(-180deg) scale(0.5); }
        }
        @keyframes spinLeftT2 {
          0% { opacity: 0.1; transform: translate(50%, 50%) rotate(-180deg) scale(0.8); }
          50% { opacity: 1; transform: translate(50%, 50%) rotate(0deg) scale(1.1); }
          100% { opacity: 0.1; transform: translate(50%, 50%) rotate(180deg) scale(0.8); }
        }
        .animate-spin-right-t1 { animation: spinRightT1 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .animate-spin-left-t2 { animation: spinLeftT2 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
};

interface PhotoOrganizerProps {
  album: Album;
  customization: CustomizationOptions;
  photos: string[][];
  onPhotosChange: (photos: string[][]) => void;
  photoCrops: Record<string, { x: number; y: number; zoom: number }>;
  onPhotoCropsChange: (crops: Record<string, { x: number; y: number; zoom: number }>) => void;
  textBoxSlots: Record<number, Record<number, any>>;
  onTextBoxSlotsChange: (slots: Record<number, Record<number, any>>) => void;
  pageLayouts: Record<number, 'grid' | 'row' | 'column'>;
  onPageLayoutsChange: (layouts: Record<number, 'grid' | 'row' | 'column'>) => void;
  pageLayoutVariants: Record<number, number>;
  onPageLayoutVariantsChange: (variants: Record<number, number>) => void;
  onComplete?: () => void;
}

type Step = 'upload' | 'pages' | 'editor';

const AlbumEditorPhotoSlot: React.FC<{
  photo: string | null;
  textBox: any;
  crop: { x: number; y: number; zoom: number };
  isHalfHeightLayout: boolean;
  pageIndex: number;
  photoIndex: number;
  editingPageIndex: number | null;
  handleMovePhotoWithinPage: (pageIndex: number, photoIndex: number, direction: 'left' | 'right') => void;
  handleRemovePhotoFromPage: (pageIndex: number, photoIndex: number) => void;
  setEditingTextSlot: (slot: { pageIndex: number, photoIndex: number } | null) => void;
  handleRemoveTextBox: (pageIndex: number, photoIndex: number) => void;
  handleAddPhotoToPage: (pageIndex: number, file: File, targetPhotoIndex?: number) => void;
  handleAddTextBox: (pageIndex: number, photoIndex: number) => void;
  onOpenCropModal: (pageIndex: number, photoIndex: number, aspect: number) => void;
  t: (key: string) => string;
}> = ({
  photo, textBox, crop, isHalfHeightLayout, pageIndex, photoIndex, editingPageIndex,
  handleMovePhotoWithinPage, handleRemovePhotoFromPage, setEditingTextSlot,
  handleRemoveTextBox, handleAddPhotoToPage, handleAddTextBox, onOpenCropModal, t
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`relative group/photo overflow-hidden rounded-none bg-white flex items-center justify-center`}>
      {photo ? (
        <div ref={containerRef} className={isHalfHeightLayout ? "w-full h-[65%] relative my-auto" : "w-full h-full relative"}>
            <ImageCropper 
              src={photo} 
              position={crop || { x: 50, y: 50, zoom: 1 }}
            />
            {editingPageIndex === pageIndex && (
              <div className="absolute bottom-1 sm:top-1 sm:bottom-auto left-0 right-0 sm:left-auto sm:right-1 flex flex-wrap justify-center sm:justify-end items-center sm:items-start gap-1.5 sm:gap-1 transition-opacity z-10 pointer-events-none px-1 sm:px-0">
                {/* GRUPO DE MOVIMIENTO */}
                <div className="flex gap-1 pointer-events-auto bg-black/20 backdrop-blur-md rounded-full p-0.5 shrink-0">
                  <button onClick={() => handleMovePhotoWithinPage(pageIndex, photoIndex, 'left')} className="p-2 sm:p-1.5 bg-white/90 hover:bg-white text-black shadow-sm rounded-full" title="Mover Izquierda"><ArrowLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
                  <button onClick={() => handleMovePhotoWithinPage(pageIndex, photoIndex, 'right')} className="p-2 sm:p-1.5 bg-white/90 hover:bg-white text-black shadow-sm rounded-full" title="Mover Derecha"><ArrowRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
                </div>
                {/* GRUPO DE ACCIONES */}
                <div className="flex gap-1 pointer-events-auto shrink-0">
                  <button
                     onClick={() => {
                        const aspect = containerRef.current ? containerRef.current.offsetWidth / containerRef.current.offsetHeight : 1;
                        onOpenCropModal(pageIndex, photoIndex, aspect);
                     }}
                     className="p-2 sm:p-1.5 bg-blue-500 text-white hover:bg-blue-600 shadow-sm rounded-full"
                     title="Ajustar Recorte"
                  >
                     <CropIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                  <button onClick={() => handleRemovePhotoFromPage(pageIndex, photoIndex)} className="p-2 sm:p-1.5 bg-red-500 text-white hover:bg-red-600 shadow-sm rounded-full" title="Eliminar"><Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
                </div>
              </div>
            )}
        </div>
      ) : textBox ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-white relative" style={{ containerType: 'inline-size' }}>
          <div 
            style={{ 
              width: '90%', 
              fontSize: `${textBox.fontSize * 0.25}cqi`, 
              fontFamily: textBox.fontFamily, 
              color: textBox.color, 
              textAlign: 'center', 
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap', 
              lineHeight: '1.3'       
            }} 
          >
            {textBox.text || t('organizer.addText') + '...'}
          </div>
          {editingPageIndex === pageIndex && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity p-1 pb-2 sm:pb-1 z-10">
              <div className="flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 w-full max-w-[95%] pointer-events-none">
                {/* GRUPO DE MOVIMIENTO */}
                <div className="flex gap-1 pointer-events-auto bg-white/20 backdrop-blur-md rounded-full p-0.5 shrink-0">
                  <button onClick={() => handleMovePhotoWithinPage(pageIndex, photoIndex, 'left')} className="p-2 sm:p-1.5 bg-white/90 hover:bg-white text-black shadow-sm rounded-full" title="Mover Izquierda"><ArrowLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
                  <button onClick={() => handleMovePhotoWithinPage(pageIndex, photoIndex, 'right')} className="p-2 sm:p-1.5 bg-white/90 hover:bg-white text-black shadow-sm rounded-full" title="Mover Derecha"><ArrowRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
                </div>
                {/* GRUPO DE ACCIONES */}
                <div className="flex gap-1 pointer-events-auto shrink-0">
                  <button onClick={() => setEditingTextSlot({ pageIndex, photoIndex })} className="p-2 sm:p-1.5 bg-white text-black hover:bg-gray-100 shadow-md rounded-full" title="Editar Texto"><Edit3 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
                  <button onClick={() => handleRemoveTextBox(pageIndex, photoIndex)} className="p-2 sm:p-1.5 bg-red-500 text-white hover:bg-red-600 shadow-md rounded-full" title="Eliminar"><Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        editingPageIndex === pageIndex && (
          <div className="flex flex-col gap-1 sm:gap-2 p-1 items-center justify-center w-full h-full">
            <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => { const file = e.target.files?.[0]; if (file) handleAddPhotoToPage(pageIndex, file, photoIndex); }; input.click(); }} className="flex flex-col items-center gap-0.5 sm:gap-1 text-gray-400 hover:text-black transition-colors">
              <div className="p-1.5 sm:p-2 bg-gray-200 group-hover:bg-gray-300 rounded-full"><ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" /></div>
              <span className="text-[8px] sm:text-[10px] font-bold uppercase leading-none">{t('organizer.addPhoto')}</span>
            </button>
            <div className="h-px bg-gray-200 w-6 sm:w-10 mx-auto" />
            <button onClick={() => handleAddTextBox(pageIndex, photoIndex)} className="flex flex-col items-center gap-0.5 sm:gap-1 text-gray-400 hover:text-black transition-colors">
              <div className="p-1.5 sm:p-2 bg-gray-200 group-hover:bg-gray-300 rounded-full"><Type className="w-4 h-4 sm:w-5 sm:h-5" /></div>
              <span className="text-[8px] sm:text-[10px] font-bold uppercase leading-none">{t('organizer.addText')}</span>
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default function PhotoOrganizer({ 
  album, customization = {} as CustomizationOptions, photos = [], onPhotosChange, photoCrops = {},
  onPhotoCropsChange, textBoxSlots = {}, onTextBoxSlotsChange, pageLayouts = {},
  onPageLayoutsChange, pageLayoutVariants = {}, onPageLayoutVariantsChange, onComplete 
}: PhotoOrganizerProps) {
  const { t } = useLanguage();
  
  const safePhotos = photos || [];
  const sizeStr = customization?.size || 'Cuadrado 20x20 cm';
  
  const [step, setStep] = useState<Step>(safePhotos.length > 0 ? 'editor' : 'upload');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [pendingFilesData, setPendingFilesData] = useState<{id: string, url: string, metadata: any}[]>([]);
  const [numPages, setNumPages] = useState<number | string>(40);
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null);
  
  const [advancedSettingsModal, setAdvancedSettingsModal] = useState<number | null>(null);
  const [cropModalData, setCropModalData] = useState<{ pageIndex: number, photoIndex: number, aspectRatio: number } | null>(null);
  const [isSortingWithAI, setIsSortingWithAI] = useState(false);
  const [editingTextSlot, setEditingTextSlot] = useState<{ pageIndex: number, photoIndex: number } | null>(null);
  
  const [layoutChangeModal, setLayoutChangeModal] = useState<{
    type: 'decrease' | 'increase';
    pageIndex: number;
    newVariant: number;
    overflowCount: number;
  } | null>(null);
  const [selectedTargetPage, setSelectedTargetPage] = useState<number>(0);

  // NUEVO ESTADO PARA EL MODAL DE PÁGINAS VACÍAS
  const [emptyPagesModalData, setEmptyPagesModalData] = useState<{
    indices: number[];
    isOdd: boolean;
    totalCurrent: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Mapa URL → clave de archivo, para trasladar firmas desde processUpload hasta handleFinalizeSetup
  const pendingFileKeysRef = useRef<Map<string, string>>(new Map());

  const [isValidating, setIsValidating] = useState(false);
  const [lowResImages, setLowResImages] = useState<{file: File, url: string, width: number, height: number}[]>([]);
  const [currentLowResIndex, setCurrentLowResIndex] = useState(0);
  const [approvedFiles, setApprovedFiles] = useState<File[]>([]);
  const [applyToAllLowRes, setApplyToAllLowRes] = useState(false); 
  
  const [uploadMode, setUploadMode] = useState<'batch' | 'specific' | null>(null);
  const [targetSlotInfo, setTargetSlotInfo] = useState<{pageIndex: number, photoIndex?: number} | null>(null);

  // Firmas de archivo para detección de duplicados (misma forma 2D que photos)
  const [fileSignatures, setFileSignatures] = useState<string[][]>([]);
  const [duplicateModal, setDuplicateModal] = useState<{
    file: File;
    previewUrl: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);
  const getFileKey = (file: File) => `${file.name}|${file.size}|${file.lastModified}`;

  const isSquare = sizeStr.includes('Cuadrado');
  const isHorizontal = sizeStr.includes('Horizontal');
  const isVertical = sizeStr.includes('Vertical');
  const allowedPhotosPerPage = isSquare ? [1, 2, 3, 4, 9] : [1, 2, 3, 4, 6];

  const getNextAllowed = (count: number) => {
    for (const opt of allowedPhotosPerPage) {
      if (opt >= count) return opt;
    }
    return allowedPhotosPerPage[allowedPhotosPerPage.length - 1]; 
  };

  const getGridLayout = (count: number, layout?: 'row' | 'column' | 'grid') => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) {
      if (layout === 'column') return 'grid-cols-1 grid-rows-2';
      return 'grid-cols-2';
    }
    if (count === 3) {
      if (isHorizontal) return 'grid-cols-3 grid-rows-1';
      if (isVertical) return 'grid-cols-1 grid-rows-3';
      return 'grid-cols-3';
    }
    if (count === 4) return 'grid-cols-2 grid-rows-2';
    if (count === 6) {
      if (isHorizontal) return 'grid-cols-3 grid-rows-2';
      if (isVertical) return 'grid-cols-2 grid-rows-3';
      return 'grid-cols-3 grid-rows-2';
    }
    if (count === 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-2 grid-rows-2';
  };

  const getMaxPages = (photoCount: number) => {
    const baseMax = Math.max(40, photoCount);
    return Math.min(250, baseMax % 2 === 0 ? baseMax : baseMax + 1);
  };

  useEffect(() => {
    if (uploadedPhotos.length > 0) {
      const maxP = getMaxPages(uploadedPhotos.length);
      if (typeof numPages === 'number') {
        let newNum = numPages;
        if (newNum < 40) newNum = 40;
        if (newNum > maxP) newNum = maxP;
        if (newNum % 2 !== 0) newNum = Math.min(newNum + 1, maxP);
        setNumPages(newNum);
      }
    }
  }, [uploadedPhotos.length]);

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

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Capturar archivos antes de que React limpie el evento sintético
    const filesArray = Array.from(files);

    // Limpiar el input y mostrar spinner antes de diferir
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsValidating(true);

    // Diferir el procesamiento para que iOS cierre el picker nativo de inmediato.
    // Dentro del timeout, procesamos SECUENCIALMENTE (una imagen a la vez) y cedemos
    // el event loop entre cada imagen para evitar bloquear el hilo principal.
    setTimeout(async () => {
      const results: Array<{file: File, url: string, isLowRes: boolean, width: number, height: number}> = [];

      for (const file of filesArray) {
        const result = await checkImageDimensions(file);
        results.push(result);
        // Ceder el event loop entre cada imagen para mantener la UI fluida
        await new Promise<void>(r => setTimeout(r, 0));
      }

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
        processUpload(valid);
      }
    }, 0);
  };

  const handleLowResDecision = (keep: boolean) => {
    // LÓGICA PARA SUBIDA DE UNA SOLA FOTO DESDE EL EDITOR
    if (uploadMode === 'specific') {
      if (keep && lowResImages[0] && targetSlotInfo) {
        processSpecificUpload(targetSlotInfo.pageIndex, lowResImages[0].file, targetSlotInfo.photoIndex);
      }
      setLowResImages([]);
      setCurrentLowResIndex(0);
      setUploadMode(null);
      setTargetSlotInfo(null);
      return;
    }

    // LÓGICA PARA SUBIDA POR LOTES DESDE EL INICIO
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
      setUploadMode(null);
      processUpload(newApproved);
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
        setUploadMode(null);
        processUpload(newApproved);
      }
    }
  };

  const processUpload = (finalFiles: File[]) => {
    if (finalFiles.length === 0) return;

    // Colectar todas las firmas existentes en el álbum (flat)
    const existingKeys = new Set(
      fileSignatures.flat().filter(Boolean)
    );

    const duplicates: File[] = [];
    const unique: File[] = [];
    for (const file of finalFiles) {
      if (existingKeys.has(getFileKey(file))) duplicates.push(file);
      else unique.push(file);
    }

    const doUpload = (files: File[]) => {
      if (files.length === 0) return;
      const newFilesData = files.map((file) => ({
        id: Math.random().toString(36).substring(2, 11),
        url: URL.createObjectURL(file),
        metadata: { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified }
      }));
      // Registrar URL→clave para que handleFinalizeSetup pueda construir fileSignatures
      newFilesData.forEach(f => {
        pendingFileKeysRef.current.set(f.url, `${f.metadata.name}|${f.metadata.size}|${f.metadata.lastModified}`);
      });
      setPendingFilesData(prev => [...prev, ...newFilesData]);
      setUploadedPhotos(prev => [...prev, ...newFilesData.map(f => f.url)]);
    };

    if (duplicates.length > 0) {
      const _dupPreviewUrl = URL.createObjectURL(duplicates[0]);
      setDuplicateModal({
        file: duplicates[0],
        previewUrl: _dupPreviewUrl,
        onConfirm: () => {
          URL.revokeObjectURL(_dupPreviewUrl);
          setDuplicateModal(null);
          doUpload([...unique, ...duplicates]);
        },
        onCancel: () => {
          URL.revokeObjectURL(_dupPreviewUrl);
          setDuplicateModal(null);
          doUpload(unique);
        },
      });
    } else {
      doUpload(unique);
    }
  };

  // NUEVA FUNCIÓN INTERCEPTORA PARA SUBIR UNA SOLA FOTO
  const handleSpecificFileSelection = async (pageIndex: number, file: File, targetPhotoIndex?: number) => {
    setUploadMode('specific');
    setTargetSlotInfo({ pageIndex, photoIndex: targetPhotoIndex });
    setIsValidating(true);
    
    const result = await checkImageDimensions(file);

    if (result.isLowRes) {
      setLowResImages([result]);
      setCurrentLowResIndex(0);
      setApplyToAllLowRes(false);
      setIsValidating(false);
    } else {
      setIsValidating(false);
      processSpecificUpload(pageIndex, file, targetPhotoIndex);
      setUploadMode(null);
      setTargetSlotInfo(null);
    }
  };

  const processSpecificUpload = (pageIndex: number, file: File, targetPhotoIndex?: number) => {
    const key = getFileKey(file);
    const existingKeys = new Set(fileSignatures.flat().filter(Boolean));

    const doUpload = () => {
      const newPhotos = [...photos];
      const pagePhotos = [...newPhotos[pageIndex]];
      const maxAllowed = allowedPhotosPerPage[allowedPhotosPerPage.length - 1];
      let slotIndex: number;

      if (targetPhotoIndex !== undefined && targetPhotoIndex >= 0) {
        while (pagePhotos.length <= targetPhotoIndex) pagePhotos.push('');
        pagePhotos[targetPhotoIndex] = URL.createObjectURL(file);
        slotIndex = targetPhotoIndex;
      } else {
        const firstEmpty = pagePhotos.findIndex(p => !p || p.trim() === '');
        if (firstEmpty !== -1) {
          pagePhotos[firstEmpty] = URL.createObjectURL(file);
          slotIndex = firstEmpty;
        } else {
          if (pagePhotos.length >= maxAllowed) {
            alert(`Has alcanzado el límite máximo de ${maxAllowed} fotos para esta página en este formato.`);
            return;
          }
          pagePhotos.push(URL.createObjectURL(file));
          slotIndex = pagePhotos.length - 1;
        }
      }

      newPhotos[pageIndex] = pagePhotos;

      // Actualizar firmas
      const newSigs = [...fileSignatures];
      while (newSigs.length <= pageIndex) newSigs.push([]);
      const pageSigs = [...(newSigs[pageIndex] || [])];
      while (pageSigs.length <= slotIndex) pageSigs.push('');
      pageSigs[slotIndex] = key;
      newSigs[pageIndex] = pageSigs;
      setFileSignatures(newSigs);

      const currentVariant = pageLayoutVariants[pageIndex] || getNextAllowed(pagePhotos.length);
      const neededVariant = getNextAllowed(pagePhotos.length);
      if (currentVariant < neededVariant) {
        onPageLayoutVariantsChange({ ...pageLayoutVariants, [pageIndex]: neededVariant });
      }
      onPhotosChange(newPhotos);
    };

    if (existingKeys.has(key)) {
      const _slotPreviewUrl = URL.createObjectURL(file);
      setDuplicateModal({
        file,
        previewUrl: _slotPreviewUrl,
        onConfirm: () => { URL.revokeObjectURL(_slotPreviewUrl); setDuplicateModal(null); doUpload(); },
        onCancel: () => { URL.revokeObjectURL(_slotPreviewUrl); setDuplicateModal(null); setTargetSlotInfo(null); },
      });
    } else {
      doUpload();
    }
  };

  const runAISortingAndDistribute = async () => {
    setIsSortingWithAI(true);

    setTimeout(async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'; 
        const aiResponse = await fetch(`${backendUrl}/ai/sort-photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photos_data: pendingFilesData.map(f => ({ id: f.id, ...f.metadata })),
            page_count: typeof numPages === 'number' ? numPages : 40,
            layout_preferences: { isSquare, isHorizontal, isVertical }
          })
        });

        if (!aiResponse.ok) throw new Error('Error IA');
        const responseData = await aiResponse.json();

        let finalUrls: string[] = [];
        if (responseData && responseData.success && Array.isArray(responseData.Albums)) {
          const orderedIdsFromAI: string[] = [];
          responseData.Albums.forEach((album: any) => {
            if (album.photo_ids && Array.isArray(album.photo_ids)) orderedIdsFromAI.push(...album.photo_ids);
          });
          
          finalUrls = orderedIdsFromAI.map((id: string) => {
            const matchedFile = pendingFilesData.find(f => f.id === id);
            return matchedFile ? matchedFile.url : '';
          }).filter(Boolean);

          const missingUrls = pendingFilesData.filter(f => !orderedIdsFromAI.includes(f.id)).map(f => f.url);
          finalUrls = [...finalUrls, ...missingUrls];
        } else {
          finalUrls = pendingFilesData.map(f => f.url);
        }

        handleFinalizeSetup(finalUrls);
      } catch (error) {
        console.error("Error al procesar archivos con IA:", error);
        handleFinalizeSetup(pendingFilesData.map(f => f.url));
      } finally {
        setIsSortingWithAI(false);
      }
    }, 100); 
  };

  const handleFinalizeSetup = (sortedPhotos: string[]) => {
    const maxP = getMaxPages(sortedPhotos.length);
    let safeVal = typeof numPages === 'number' ? numPages : 40;
    
    safeVal = Math.min(Math.max(safeVal, 40), maxP);
    if (safeVal % 2 !== 0) safeVal = Math.min(safeVal + 1, maxP);
    setNumPages(safeVal);

    const totalPages = safeVal;
    
    let pageCapacities = new Array(totalPages).fill(1);
    let remainingPhotos = Math.max(0, sortedPhotos.length - totalPages);
    let allowPageZero = totalPages <= 1;
    const maxAllowed = allowedPhotosPerPage[allowedPhotosPerPage.length - 1];

    while (remainingPhotos > 0) {
      let availablePages = [];
      for (let i = (allowPageZero ? 0 : 1); i < totalPages; i++) {
        if (pageCapacities[i] < maxAllowed) {
          availablePages.push(i);
        }
      }

      if (availablePages.length === 0) {
        if (!allowPageZero && pageCapacities[0] < maxAllowed) {
          allowPageZero = true; 
          continue;
        } else {
          pageCapacities[totalPages - 1] += remainingPhotos;
          remainingPhotos = 0;
          break;
        }
      }

      const minCap = Math.min(...availablePages.map(p => pageCapacities[p]));
      const candidatePages = availablePages.filter(p => pageCapacities[p] === minCap);

      let incrementsCount = Math.min(remainingPhotos, candidatePages.length);
      let spacing = candidatePages.length / incrementsCount;

      for (let i = 0; i < incrementsCount; i++) {
        let pageIdx = candidatePages[Math.floor(i * spacing)];
        pageCapacities[pageIdx] += 1;
        remainingPhotos -= 1;
      }
    }

    const photosToDistribute = [...sortedPhotos];
    const newPhotos: string[][] = Array.from({ length: totalPages }, () => []);
    
    for (let i = 0; i < totalPages; i++) {
      let cap = pageCapacities[i];
      for (let j = 0; j < cap; j++) {
        if (photosToDistribute.length > 0) {
          newPhotos[i].push(photosToDistribute.shift()!);
        }
      }
    }
    
    while (photosToDistribute.length > 0) {
       newPhotos[totalPages - 1].push(photosToDistribute.shift()!);
    }

    // Construir fileSignatures[][] desde el mapa URL→clave registrado en processUpload
    const newSigs: string[][] = newPhotos.map(page =>
      page.map(url => pendingFileKeysRef.current.get(url) ?? '')
    );
    setFileSignatures(newSigs);
    pendingFileKeysRef.current.clear(); // consumido, limpiar para el siguiente lote

    onPhotosChange(newPhotos);
    setStep('editor');
  };

  const handleAddPage = (index: number) => {
    if (photos.length >= 249) {
      alert('Límite máximo de 250 páginas alcanzado.');
      return;
    }
    const newPhotos = [...photos];
    newPhotos.splice(index + 1, 0, [], []);
    onPhotosChange(newPhotos);
    setNumPages(newPhotos.length);
  };

  const handleDeletePage = (index: number) => {
    if (photos.length <= 40) {
      alert(t('organizer.minPagesReached') || 'Minimum of 40 pages required.');
      return;
    }
    const newPhotos = [...photos];
    if (newPhotos.length > 41) {
      newPhotos.splice(index, 2);
    } else {
      newPhotos.splice(index, 1);
    }
    onPhotosChange(newPhotos);
    setNumPages(newPhotos.length);
    setEditingPageIndex(null);
  };

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === photos.length - 1) return;
    const newPhotos = [...photos];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newPhotos[index], newPhotos[targetIndex]] = [newPhotos[targetIndex], newPhotos[index]];
    onPhotosChange(newPhotos);
    setEditingPageIndex(targetIndex);
  };

  const handleRemovePhotoFromPage = (pageIndex: number, photoIndex: number) => {
    const newPhotos = [...photos];
    const pagePhotos = [...newPhotos[pageIndex]];
    pagePhotos[photoIndex] = '';

    while (pagePhotos.length > 0 && (!pagePhotos[pagePhotos.length - 1] || pagePhotos[pagePhotos.length - 1].trim() === '')) {
      pagePhotos.pop();
    }

    newPhotos[pageIndex] = pagePhotos;
    onPhotosChange(newPhotos);

    // Limpiar la firma del slot eliminado para permitir re-subida sin falso positivo
    const newSigs = [...fileSignatures];
    if (newSigs[pageIndex]) {
      const pageSigs = [...newSigs[pageIndex]];
      pageSigs[photoIndex] = '';
      newSigs[pageIndex] = pageSigs;
      setFileSignatures(newSigs);
    }
  };

  const handleMovePhotoWithinPage = (pageIndex: number, photoIndex: number, direction: 'left' | 'right') => {
    if (direction === 'left' && photoIndex === 0) return;
    const currentVariant = pageLayoutVariants[pageIndex] || getNextAllowed(photos[pageIndex].length);
    if (direction === 'right' && photoIndex >= currentVariant - 1) return;

    const newPhotos = [...photos];
    const pagePhotos = [...newPhotos[pageIndex]];
    const targetIndex = direction === 'left' ? photoIndex - 1 : photoIndex + 1;
    
    while (pagePhotos.length <= Math.max(photoIndex, targetIndex)) {
      pagePhotos.push('');
    }
    
    [pagePhotos[photoIndex], pagePhotos[targetIndex]] = [pagePhotos[targetIndex], pagePhotos[photoIndex]];
    
    while (pagePhotos.length > 0 && (!pagePhotos[pagePhotos.length - 1] || pagePhotos[pagePhotos.length - 1].trim() === '')) {
      pagePhotos.pop();
    }
    newPhotos[pageIndex] = pagePhotos;
    onPhotosChange(newPhotos);

    const currentCrop = photoCrops[`${pageIndex}-${photoIndex}`];
    const targetCrop = photoCrops[`${pageIndex}-${targetIndex}`];
    const newCrops = { ...photoCrops };
    if (currentCrop) newCrops[`${pageIndex}-${targetIndex}`] = currentCrop;
    else delete newCrops[`${pageIndex}-${targetIndex}`];
    if (targetCrop) newCrops[`${pageIndex}-${photoIndex}`] = targetCrop;
    else delete newCrops[`${pageIndex}-${photoIndex}`];
    onPhotoCropsChange(newCrops);

    const currentText = textBoxSlots[pageIndex]?.[photoIndex];
    const targetText = textBoxSlots[pageIndex]?.[targetIndex];
    const newTexts = { ...textBoxSlots };
    if (!newTexts[pageIndex]) newTexts[pageIndex] = {};
    
    if (currentText) newTexts[pageIndex][targetIndex] = currentText;
    else delete newTexts[pageIndex][targetIndex];
    
    if (targetText) newTexts[pageIndex][photoIndex] = targetText;
    else delete newTexts[pageIndex][photoIndex];
    
    if (Object.keys(newTexts[pageIndex]).length === 0) delete newTexts[pageIndex];
    onTextBoxSlotsChange(newTexts);
  };

  const handleAddTextBox = (pageIndex: number, photoIndex: number) => {
    const newSlots = { ...textBoxSlots };
    if (!newSlots[pageIndex]) newSlots[pageIndex] = {};
    newSlots[pageIndex][photoIndex] = { text: '', fontSize: 24, fontFamily: 'Arial', color: '#000000' };
    onTextBoxSlotsChange(newSlots);
    setEditingTextSlot({ pageIndex, photoIndex });
  };

  const handleRemoveTextBox = (pageIndex: number, photoIndex: number) => {
    const newSlots = { ...textBoxSlots };
    if (newSlots[pageIndex]) {
      delete newSlots[pageIndex][photoIndex];
      if (Object.keys(newSlots[pageIndex]).length === 0) delete newSlots[pageIndex];
    }
    onTextBoxSlotsChange(newSlots);
  };

  const updateTextBox = (pageIndex: number, photoIndex: number, updates: any) => {
    const newSlots = { ...textBoxSlots };
    if (newSlots[pageIndex] && newSlots[pageIndex][photoIndex]) {
      newSlots[pageIndex][photoIndex] = { ...newSlots[pageIndex][photoIndex], ...updates };
      onTextBoxSlotsChange(newSlots);
    }
  };

  const isLastPageWithContent = (pageIdx: number, currentPhotos: string[][]) => {
    for (let i = pageIdx + 1; i < currentPhotos.length; i++) {
        if (currentPhotos[i].some(p => p && p.trim() !== '')) return false;
    }
    return true;
  };
  
  const applyRippleShift = (startIndex: number, newVariant: number) => {
    let newPhotos = [...photos.map(p => [...p])];
    let newCrops = { ...photoCrops };
    let newTexts = { ...textBoxSlots };
    let newVariants = { ...pageLayoutVariants, [startIndex]: newVariant };

    let currentOverflow = newPhotos[startIndex].splice(newVariant);

    let movingData = currentOverflow.map((_, idx) => {
        let oldIdx = newVariant + idx;
        let crop = newCrops[`${startIndex}-${oldIdx}`];
        let text = newTexts[startIndex]?.[oldIdx];
        delete newCrops[`${startIndex}-${oldIdx}`];
        if (newTexts[startIndex]) delete newTexts[startIndex][oldIdx];
        return { crop, text };
    });

    let p = startIndex + 1;
    while(currentOverflow.length > 0) {
        if (p >= newPhotos.length) {
            if (newPhotos.length >= 250) {
                alert("Límite máximo de 250 páginas alcanzado. Algunas fotos no se pudieron acomodar.");
                currentOverflow = [];
                break;
            }
            newPhotos.push([], []); 
            setNumPages(newPhotos.length);
        }

        let insertCount = currentOverflow.length;
        let existingLength = newPhotos[p].length;

        let lastWithContent = isLastPageWithContent(p, newPhotos);
        let capacity = newVariants[p] || getNextAllowed(existingLength);
        
        if (existingLength === 0 || lastWithContent) {
            capacity = getNextAllowed(existingLength + insertCount);
        }

        for (let i = existingLength - 1; i >= 0; i--) {
            if (newCrops[`${p}-${i}`]) {
                newCrops[`${p}-${i + insertCount}`] = newCrops[`${p}-${i}`];
                delete newCrops[`${p}-${i}`];
            }
            if (newTexts[p]?.[i]) {
                if (!newTexts[p]) newTexts[p] = {};
                newTexts[p][i + insertCount] = newTexts[p][i];
                delete newTexts[p][i];
            }
        }

        newPhotos[p].unshift(...currentOverflow);

        movingData.forEach((data, idx) => {
            if (data.crop) newCrops[`${p}-${idx}`] = data.crop;
            if (data.text) {
                if (!newTexts[p]) newTexts[p] = {};
                newTexts[p][idx] = data.text;
            }
        });

        if (newPhotos[p].length > capacity) {
            currentOverflow = newPhotos[p].splice(capacity);
            movingData = currentOverflow.map((_, idx) => {
                let oldIdx = capacity + idx;
                let crop = newCrops[`${p}-${oldIdx}`];
                let text = newTexts[p]?.[oldIdx];
                delete newCrops[`${p}-${oldIdx}`];
                if (newTexts[p]) delete newTexts[p][oldIdx];
                return { crop, text };
            });
            newVariants[p] = capacity;
        } else {
            currentOverflow = [];
            newVariants[p] = getNextAllowed(newPhotos[p].length);
        }
        p++;
    }

    onPhotosChange(newPhotos);
    onPhotoCropsChange(newCrops);
    onTextBoxSlotsChange(newTexts);
    onPageLayoutVariantsChange(newVariants);
  };

  const applyPullShift = (startIndex: number, newVariant: number) => {
    let newPhotos = [...photos.map(p => [...p])];
    let newCrops = { ...photoCrops };
    let newTexts = { ...textBoxSlots };
    let newVariants = { ...pageLayoutVariants, [startIndex]: newVariant };

    let gap = newVariant - newPhotos[startIndex].length;
    let p = startIndex;

    while (gap > 0 && p < newPhotos.length - 1) {
        let nextPage = p + 1;
        let pullCount = Math.min(gap, newPhotos[nextPage].length);
        if (pullCount === 0) break; 

        let pulledPhotos = newPhotos[nextPage].splice(0, pullCount);
        let currentLen = newPhotos[p].length;
        newPhotos[p].push(...pulledPhotos);

        for (let i = 0; i < pullCount; i++) {
            if (newCrops[`${nextPage}-${i}`]) {
                newCrops[`${p}-${currentLen + i}`] = newCrops[`${nextPage}-${i}`];
                delete newCrops[`${nextPage}-${i}`];
            }
            if (newTexts[nextPage]?.[i]) {
                if (!newTexts[p]) newTexts[p] = {};
                newTexts[p][currentLen + i] = newTexts[nextPage][i];
                delete newTexts[nextPage][i];
            }
        }

        let nextLenAfterPull = newPhotos[nextPage].length;
        for (let i = 0; i < nextLenAfterPull; i++) {
            let oldIdx = i + pullCount;
            if (newCrops[`${nextPage}-${oldIdx}`]) {
                newCrops[`${nextPage}-${i}`] = newCrops[`${nextPage}-${oldIdx}`];
                delete newCrops[`${nextPage}-${oldIdx}`];
            }
            if (newTexts[nextPage]?.[oldIdx]) {
                if (!newTexts[nextPage]) newTexts[nextPage] = {};
                newTexts[nextPage][i] = newTexts[nextPage][oldIdx];
                delete newTexts[nextPage][oldIdx];
            }
        }
        
        newVariants[nextPage] = getNextAllowed(newPhotos[nextPage].length);
        gap = pullCount; 
        p++;
    }

    onPhotosChange(newPhotos);
    onPhotoCropsChange(newCrops);
    onTextBoxSlotsChange(newTexts);
    onPageLayoutVariantsChange(newVariants);
  };

  const applyIncreaseVariantOnly = (pageIndex: number, newVariant: number) => {
    let newVariants = { ...pageLayoutVariants, [pageIndex]: newVariant };
    onPageLayoutVariantsChange(newVariants);
  };

  const applyIncreaseNextPageVariant = (pageIndex: number, newVariant: number) => {
    let newPhotos = [...photos.map(p => [...p])];
    let newCrops = { ...photoCrops };
    let newTexts = { ...textBoxSlots };
    let newVariants = { ...pageLayoutVariants, [pageIndex]: newVariant };

    let overflow = newPhotos[pageIndex].splice(newVariant);
    let nextPage = pageIndex + 1;

    if (nextPage >= newPhotos.length) {
        if (newPhotos.length >= 250) {
            alert("Límite máximo de 250 páginas alcanzado.");
            return;
        }
        newPhotos.push([], []);
        setNumPages(newPhotos.length);
    }

    let insertCount = overflow.length;
    let existingLength = newPhotos[nextPage].length;

    for (let i = existingLength - 1; i >= 0; i--) {
        if (newCrops[`${nextPage}-${i}`]) {
            newCrops[`${nextPage}-${i + insertCount}`] = newCrops[`${nextPage}-${i}`];
            delete newCrops[`${nextPage}-${i}`];
        }
        if (newTexts[nextPage]?.[i]) {
            if (!newTexts[nextPage]) newTexts[nextPage] = {};
            newTexts[nextPage][i + insertCount] = newTexts[nextPage][i];
            delete newTexts[nextPage][i];
        }
    }

    newPhotos[nextPage].unshift(...overflow);

    overflow.forEach((_, idx) => {
        let oldIdx = newVariant + idx;
        if (newCrops[`${pageIndex}-${oldIdx}`]) {
            newCrops[`${nextPage}-${idx}`] = newCrops[`${pageIndex}-${oldIdx}`];
            delete newCrops[`${pageIndex}-${oldIdx}`];
        }
        if (newTexts[pageIndex]?.[oldIdx]) {
            if (!newTexts[nextPage]) newTexts[nextPage] = {};
            newTexts[nextPage][idx] = newTexts[pageIndex][oldIdx];
            delete newTexts[pageIndex][oldIdx];
        }
    });

    newVariants[nextPage] = getNextAllowed(newPhotos[nextPage].length);

    onPhotosChange(newPhotos);
    onPhotoCropsChange(newCrops);
    onTextBoxSlotsChange(newTexts);
    onPageLayoutVariantsChange(newVariants);
  };

  const applyDeleteOverflow = (pageIndex: number, newVariant: number) => {
    let newPhotos = [...photos.map(p => [...p])];
    let newCrops = { ...photoCrops };
    let newTexts = { ...textBoxSlots };
    let newVariants = { ...pageLayoutVariants, [pageIndex]: newVariant };

    let overflow = newPhotos[pageIndex].splice(newVariant);
    
    overflow.forEach((_, idx) => {
        let oldIdx = newVariant + idx;
        delete newCrops[`${pageIndex}-${oldIdx}`];
        if (newTexts[pageIndex]) delete newTexts[pageIndex][oldIdx];
    });

    onPhotosChange(newPhotos);
    onPhotoCropsChange(newCrops);
    onTextBoxSlotsChange(newTexts);
    onPageLayoutVariantsChange(newVariants);
  };

  const applyMoveToSpecificPage = (pageIndex: number, newVariant: number, targetPage: number) => {
    let newPhotos = [...photos.map(p => [...p])];
    let newCrops = { ...photoCrops };
    let newTexts = { ...textBoxSlots };
    let newVariants = { ...pageLayoutVariants, [pageIndex]: newVariant };

    let overflow = newPhotos[pageIndex].splice(newVariant);
    let targetLen = newPhotos[targetPage].length;

    newPhotos[targetPage].push(...overflow);

    overflow.forEach((_, idx) => {
        let oldIdx = newVariant + idx;
        if (newCrops[`${pageIndex}-${oldIdx}`]) {
            newCrops[`${targetPage}-${targetLen + idx}`] = newCrops[`${pageIndex}-${oldIdx}`];
            delete newCrops[`${pageIndex}-${oldIdx}`];
        }
        if (newTexts[pageIndex]?.[oldIdx]) {
            if (!newTexts[targetPage]) newTexts[targetPage] = {};
            newTexts[targetPage][targetLen + idx] = newTexts[pageIndex][oldIdx];
            delete newTexts[pageIndex][oldIdx];
        }
    });

    newVariants[targetPage] = getNextAllowed(newPhotos[targetPage].length);

    onPhotosChange(newPhotos);
    onPhotoCropsChange(newCrops);
    onTextBoxSlotsChange(newTexts);
    onPageLayoutVariantsChange(newVariants);
  };

  const handleVariantSelect = (opt: number) => {
    if (advancedSettingsModal === null) return;
    const pageIndex = advancedSettingsModal;
    const currentLen = photos[pageIndex].length;

    if (opt < currentLen) {
        const maxForNext = allowedPhotosPerPage[allowedPhotosPerPage.length - 1];
        const nextPageLen = photos[pageIndex + 1]?.length || 0;
        const overflowCount = currentLen - opt;
        
        const isNextPageFull = (nextPageLen + overflowCount > maxForNext);

        if (isNextPageFull && pageIndex < photos.length - 1) {
            applyRippleShift(pageIndex, opt);
        } else {
            setSelectedTargetPage(pageIndex + 1 < photos.length ? pageIndex + 1 : 0);
            setLayoutChangeModal({ type: 'decrease', pageIndex, newVariant: opt, overflowCount });
        }
    } else if (opt > currentLen) {
        let totalAhead = 0;
        for(let i = pageIndex + 1; i < photos.length; i++) totalAhead += photos[i].length;

        if (totalAhead > 0) {
            setLayoutChangeModal({ type: 'increase', pageIndex, newVariant: opt, overflowCount: 0 });
        } else {
            applyIncreaseVariantOnly(pageIndex, opt);
        }
    } else {
        applyIncreaseVariantOnly(pageIndex, opt);
    }
  };

  // ==========================================================================
  // LÓGICA DE DETECCIÓN Y ELIMINACIÓN DE PÁGINAS VACÍAS
  // ==========================================================================
  const handleComplete = () => {
    const emptyPageIndices = safePhotos.reduce((acc, pagePhotos, index) => {
      // Verificamos si al menos una foto existe y no es un string vacío
      const hasPhotos = pagePhotos.some(p => p && p.trim() !== '');
      const hasText = textBoxSlots[index] && Object.keys(textBoxSlots[index]).length > 0;
      if (!hasPhotos && !hasText) acc.push(index);
      return acc;
    }, [] as number[]);

    if (emptyPageIndices.length > 0) {
      setEmptyPagesModalData({
        indices: emptyPageIndices,
        isOdd: emptyPageIndices.length % 2 !== 0,
        totalCurrent: safePhotos.length
      });
      return;
    }
    if (onComplete) onComplete();
  };

  const executeDeleteEmptyPages = (strategy: 'even' | 'delete-companion' | 'keep-one-blank') => {
    if (!emptyPagesModalData) return;
    let indicesToDelete = [...emptyPagesModalData.indices];

    if (strategy === 'delete-companion') {
       const blocks = new Map<number, number[]>();
       indicesToDelete.forEach(idx => {
          const block = Math.floor(idx / 2);
          if (!blocks.has(block)) blocks.set(block, []);
          blocks.get(block)!.push(idx);
       });
       
       let found = false;
       for (const [block, pages] of blocks.entries()) {
          if (pages.length === 1) {
             const companion = pages[0] % 2 === 0 ? pages[0] + 1 : pages[0] - 1;
             if (companion < photos.length) {
               indicesToDelete.push(companion);
               found = true;
               break;
             }
          }
       }
       if (!found) {
          const lastEmpty = indicesToDelete[indicesToDelete.length - 1];
          indicesToDelete.push(lastEmpty - 1);
       }
    } else if (strategy === 'keep-one-blank') {
       indicesToDelete.pop(); 
    }

    if (photos.length - indicesToDelete.length < 40) {
       alert("No se puede completar la acción porque el álbum quedaría con menos de 40 páginas.");
       return;
    }

    indicesToDelete.sort((a, b) => b - a);

    const mappedPhotos: string[][] = [];
    const mappedLayouts: Record<number, any> = {};
    const mappedVariants: Record<number, number> = {};
    const mappedCrops: Record<string, any> = {};
    const mappedTexts: Record<number, any> = {};

    let newIdx = 0;
    for (let oldIdx = 0; oldIdx < photos.length; oldIdx++) {
       if (indicesToDelete.includes(oldIdx)) continue;
       
       mappedPhotos.push(photos[oldIdx]);
       if (pageLayouts[oldIdx]) mappedLayouts[newIdx] = pageLayouts[oldIdx];
       if (pageLayoutVariants[oldIdx]) mappedVariants[newIdx] = pageLayoutVariants[oldIdx];
       if (textBoxSlots[oldIdx]) mappedTexts[newIdx] = textBoxSlots[oldIdx];

       Object.keys(photoCrops).forEach(key => {
          if (key.startsWith(`${oldIdx}-`)) {
             const pIdx = key.split('-')[1];
             mappedCrops[`${newIdx}-${pIdx}`] = photoCrops[key];
          }
       });
       newIdx++;
    }

    onPhotosChange(mappedPhotos);
    onPageLayoutsChange(mappedLayouts);
    onPageLayoutVariantsChange(mappedVariants);
    onTextBoxSlotsChange(mappedTexts);
    onPhotoCropsChange(mappedCrops);
    setNumPages(mappedPhotos.length);
    setEmptyPagesModalData(null);
  };

  const currentEditingText = editingTextSlot ? textBoxSlots[editingTextSlot.pageIndex]?.[editingTextSlot.photoIndex] : null;

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
            La foto <strong className="text-gray-800">"{duplicateModal.file.name}"</strong> ya fue añadida anteriormente al álbum.
          </p>
          <div className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden mb-6">
            <img
              src={duplicateModal.previewUrl}
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

          {remainingCount > 1 && uploadMode !== 'specific' && (
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

  const renderAdvancedSettingsModal = () => {
    if (advancedSettingsModal === null) return null;
    const pageIndex = advancedSettingsModal;
    if (!photos || !photos[pageIndex]) return null;

    const pagePhotos = photos[pageIndex];
    const currentVariant = pageLayoutVariants[pageIndex] || getNextAllowed(pagePhotos.length);
    const currentLayout = pageLayouts[pageIndex] || 'grid';
    
    const slots = Array.from({ length: currentVariant }, (_, i) => pagePhotos[i] || null);

    return (
      <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full p-4 sm:p-6 max-h-[95vh] overflow-y-auto animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-4 sm:mb-6 border-b border-gray-100 pb-3 sm:pb-4">
            <h3 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Settings className="w-5 h-5 sm:w-6 sm:h-6"/> Ajustes de la Página {pageIndex + 1}</h3>
            <button onClick={() => { setAdvancedSettingsModal(null); setEditingPageIndex(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 sm:w-6 sm:h-6"/>
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
            <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 border border-gray-200 flex flex-col items-center justify-center shadow-inner">
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" /> Previsualización Interactiva
              </p>
              
              <div className="bg-white rounded-none shadow-md border-2 border-black ring-4 ring-black/5 overflow-hidden w-full max-w-sm transition-all" style={{ aspectRatio: isHorizontal ? '4/3' : isVertical ? '3/4' : '1/1' }}>
                <div className={`grid gap-2 p-3 sm:p-4 h-full ${getGridLayout(currentVariant, currentLayout)}`}>
                  {slots.map((photo, photoIndex) => {
                    const textBox = textBoxSlots[pageIndex]?.[photoIndex];
                    const crop = photoCrops[`${pageIndex}-${photoIndex}`] || { x: 50, y: 50, zoom: 1 };
                    const isHalfHeightLayout = (currentVariant === 2 || currentVariant === 3) && currentLayout !== 'column';
                    
                    return (
                      <AlbumEditorPhotoSlot
                        key={photoIndex} photo={photo} textBox={textBox} crop={crop}
                        isHalfHeightLayout={isHalfHeightLayout} pageIndex={pageIndex} photoIndex={photoIndex}
                        editingPageIndex={pageIndex}
                        handleMovePhotoWithinPage={handleMovePhotoWithinPage}
                        handleRemovePhotoFromPage={handleRemovePhotoFromPage}
                        setEditingTextSlot={setEditingTextSlot}
                        handleRemoveTextBox={handleRemoveTextBox}
                        handleAddPhotoToPage={handleSpecificFileSelection}
                        handleAddTextBox={handleAddTextBox}
                        onOpenCropModal={(pIdx, idx, aspect) => setCropModalData({ pageIndex: pIdx, photoIndex: idx, aspectRatio: aspect })}
                        t={t}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4 flex flex-col justify-center">
              <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-sm">
                <h4 className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Diseño y Distribución</h4>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Elementos en página</label>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {allowedPhotosPerPage.map(opt => (
                        <button key={opt} onClick={() => handleVariantSelect(opt)} className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border-2 text-xs font-bold transition-all ${currentVariant === opt ? 'border-black bg-black text-white shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-black'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>

                  {currentVariant === 2 && (
                    <div className="pt-2 border-t border-gray-50">
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Orientación del Layout</label>
                      <div className="flex gap-1.5 sm:gap-2">
                        <button onClick={() => onPageLayoutsChange({ ...pageLayouts, [pageIndex]: 'row' })} className={`flex-1 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${currentLayout !== 'column' ? 'border-black bg-black text-white shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-black'}`}>En Fila</button>
                        <button onClick={() => onPageLayoutsChange({ ...pageLayouts, [pageIndex]: 'column' })} className={`flex-1 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${currentLayout === 'column' ? 'border-black bg-black text-white shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-black'}`}>En Columna</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-100 shadow-sm">
                <h4 className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Acciones de Página</h4>
                <div className="flex flex-wrap gap-2">
                  <div className="flex bg-gray-50 rounded-lg border border-gray-200 p-0.5">
                    <button onClick={() => { handleMovePage(pageIndex, 'up'); setAdvancedSettingsModal(pageIndex - 1); }} disabled={pageIndex === 0} className="p-1.5 hover:bg-white rounded-md transition-all disabled:opacity-30"><ChevronUp className="w-4 h-4"/></button>
                    <div className="w-px h-4 bg-gray-200 my-auto" />
                    <button onClick={() => { handleMovePage(pageIndex, 'down'); setAdvancedSettingsModal(pageIndex + 1); }} disabled={pageIndex === safePhotos.length - 1} className="p-1.5 hover:bg-white rounded-md transition-all disabled:opacity-30"><ChevronDown className="w-4 h-4"/></button>
                  </div>
                  
                  <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => { const file = e.target.files?.[0]; if (file) handleSpecificFileSelection(pageIndex, file); }; input.click(); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition-all text-xs"><Plus className="w-3.5 h-3.5"/> Foto</button>
                  <button onClick={() => { handleDeletePage(pageIndex); setAdvancedSettingsModal(null); }} className="p-1.5 rounded-lg border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 transition-all"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
              
              <div className="pt-2 flex justify-end w-full">
                <button onClick={() => { setAdvancedSettingsModal(null); setEditingPageIndex(null); }} className="px-6 py-2.5 sm:py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors w-full shadow-md text-sm">Guardar y Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (step === 'upload') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 pt-4 pb-12">
        {renderDuplicateModal()}
        {renderLowResModal()}
        
        <div className="text-center mb-8">
          <h2 className="text-3xl mb-2">{t('organizer.uploadTitle')}</h2>
          <p className="text-gray-600">{t('organizer.uploadDesc')}</p>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-lg p-12">
          {isValidating ? (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-16 h-16 text-gray-400 animate-spin" />
              <p className="text-xl font-bold">Verificando calidad de imágenes...</p>
              <p className="text-sm text-gray-500">Asegurando la mejor resolución para tu impresión</p>
              <p className="text-xs md:text-sm text-amber-600 font-bold mt-2 bg-amber-50 px-3 py-1.5 rounded-full animate-pulse border border-amber-200">
                ⚠️ Por favor, no cierres ni recargues esta pestaña
              </p>
            </div>
          ) : (
            <>
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-4 group">
                <img src={jiffy2Img} alt="Jiffy Upload" className="w-35 h-35 mb-2 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="text-center">
                  <p className="text-sm text-gray-500">Selecciona mínimo 40 fotos</p>
                </div>
              </button>
              <div className="flex items-start gap-2.5 mt-4 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
                <span className="text-amber-500 text-lg shrink-0 leading-tight">ℹ️</span>
                <p className="text-xs text-amber-900 leading-snug">
                  <span className="font-bold">Usuarios iOS:</span> al aceptar la selección de fotos, la galería puede tardar unos segundos en cerrarse. Es normal y no afecta a tus imágenes.
                </p>
              </div>
            </>
          )}
          <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelection} className="hidden" disabled={isValidating} />
          
          <div className="mt-8 flex flex-col gap-4">
            {uploadedPhotos.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium">{uploadedPhotos.length} {t('organizer.photosSelected')}</span>
                <button onClick={() => { setUploadedPhotos([]); setPendingFilesData([]); }} className="text-red-500 hover:text-red-700 font-medium">{t('organizer.clearAll')}</button>
              </div>
            )}
            <button disabled={uploadedPhotos.length < 40 || isValidating} onClick={() => setStep('pages')} className={`w-full py-4 rounded-lg text-lg font-medium transition-all shadow-md ${uploadedPhotos.length >= 40 && !isValidating ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {uploadedPhotos.length < 40 ? `${t('organizer.minPhotosWarning', { count: uploadedPhotos.length })}` : t('organizer.continueToPages')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'pages') {
    const maxP = getMaxPages(uploadedPhotos.length);
    return (
      <div className="w-full max-w-4xl mx-auto px-4 pt-4 pb-12">
        {renderDuplicateModal()}
        {renderLowResModal()}
        
        <div className="text-center mb-8"><h2 className="text-3xl mb-2">{t('organizer.howManyPages')}</h2><p className="text-gray-600">{t('organizer.distributeDesc')}</p></div>
        <div className="bg-white border-2 border-gray-300 rounded-lg p-12 space-y-8">
          {isSortingWithAI ? (
            <JiffyLoader t={t} />
          ) : (
            <>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xl font-medium">{t('organizer.numPages')}</label>
                  <input 
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*" 
                    min={40} 
                    max={maxP} 
                    step={2} 
                    value={numPages} 
                    onChange={(e) => setNumPages(e.target.value === '' ? '' : parseInt(e.target.value, 10))} 
                    onBlur={() => {
                      let val = typeof numPages === 'number' ? numPages : 40;
                      val = Math.min(Math.max(val, 40), maxP);
                      if (val % 2 !== 0) val = Math.min(val + 1, maxP);
                      setNumPages(val);
                    }} 
                    className="w-24 text-2xl font-bold border-2 border-gray-300 rounded px-2 focus:border-black outline-none text-right" 
                  />
                </div>
                <input 
                  type="range" 
                  min={40} 
                  max={maxP} 
                  step={2} 
                  value={numPages === '' ? 40 : numPages} 
                  onChange={(e) => setNumPages(parseInt(e.target.value, 10))} 
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black" 
                />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep('upload')} className="flex-1 py-4 border-2 border-gray-300 rounded-lg hover:border-black transition-all text-lg">{t('step.back')}</button>
                <button onClick={runAISortingAndDistribute} className="flex-[2] py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-all text-lg px-12">{t('organizer.createAlbum')}</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Comprobaciones para saber qué opciones mostrar en el modal de vacías
  const canDeleteEven = emptyPagesModalData && !emptyPagesModalData.isOdd && (emptyPagesModalData.totalCurrent - emptyPagesModalData.indices.length >= 40);
  const canKeepOneBlank = emptyPagesModalData && emptyPagesModalData.isOdd && (emptyPagesModalData.totalCurrent - (emptyPagesModalData.indices.length - 1) >= 40);
  const canDeleteCompanion = emptyPagesModalData && emptyPagesModalData.isOdd && (emptyPagesModalData.totalCurrent - (emptyPagesModalData.indices.length + 1) >= 40);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-4 pb-12">
      
      {/* CAPA DE CARGA PARA SUBIDA DE 1 FOTO ESPECÍFICA */}
      {isValidating && step === 'editor' && (
        <div className="fixed inset-0 z-[150] bg-white/50 backdrop-blur-sm flex flex-col items-center justify-center">
           <Loader2 className="w-16 h-16 text-gray-900 animate-spin mb-4" />
           <p className="text-xl font-bold">Verificando calidad de la imagen...</p>
        </div>
      )}

      {renderDuplicateModal()}
      {renderLowResModal()}
      {renderAdvancedSettingsModal()}

      {/* MODAL INTELIGENTE DE PÁGINAS VACÍAS */}
      {emptyPagesModalData && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Páginas Vacías Detectadas</h3>
            </div>
            
            <p className="text-gray-600 text-sm mb-6">
              Tienes <strong>{emptyPagesModalData.indices.length} página(s) vacía(s)</strong> en tu diseño (Págs: {emptyPagesModalData.indices.map(i => i+1).join(', ')}). ¿Qué deseas hacer antes de enviar a imprimir?
            </p>

            <div className="space-y-3">
              <button 
                onClick={() => { setEmptyPagesModalData(null); if(onComplete) onComplete(); }} 
                className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-black font-medium transition-all text-sm"
              >
                Continuar y dejarlas en blanco (Hoja blanca)
              </button>

              {/* Si al borrar cualquier cosa bajamos de 40, bloqueamos la eliminación */}
              {(!canDeleteEven && !canKeepOneBlank && !canDeleteCompanion) ? (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-100">
                  No puedes eliminar páginas porque el álbum debe mantener un mínimo de 40 páginas.
                </div>
              ) : (
                <>
                  {!emptyPagesModalData.isOdd ? (
                    <button 
                      onClick={() => executeDeleteEmptyPages('even')}
                      className="w-full text-left px-4 py-3 rounded-xl border-2 border-red-100 hover:border-red-500 hover:bg-red-50 font-medium transition-all text-sm text-red-600"
                    >
                      Eliminar las {emptyPagesModalData.indices.length} páginas vacías
                    </button>
                  ) : (
                    <div className="space-y-3 border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-500 font-bold uppercase">Opciones de Eliminación (Cantidad Impar)</p>
                      <p className="text-[11px] text-gray-400 leading-tight">Los álbumes requieren páginas en pares. Elige cómo ajustar:</p>
                      
                      {canKeepOneBlank && (
                        <button 
                          onClick={() => executeDeleteEmptyPages('keep-one-blank')}
                          className="w-full text-left px-4 py-3 rounded-xl border-2 border-red-100 hover:border-red-500 hover:bg-red-50 font-medium transition-all text-sm text-red-600"
                        >
                          Eliminar {emptyPagesModalData.indices.length - 1} y dejar 1 en blanco al final
                        </button>
                      )}
                      
                      {canDeleteCompanion && (
                        <button 
                          onClick={() => executeDeleteEmptyPages('delete-companion')}
                          className="w-full text-left px-4 py-3 rounded-xl border-2 border-red-100 hover:border-red-500 hover:bg-red-50 font-medium transition-all text-sm text-red-600"
                        >
                          Eliminar {emptyPagesModalData.indices.length + 1} (Incluye borrar 1 pág. compañera con fotos)
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end">
               <button onClick={() => setEmptyPagesModalData(null)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-black">Volver a editar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFLICTOS DE LAYOUT */}
      {layoutChangeModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {layoutChangeModal.type === 'decrease' ? 'Ajuste de Espacio' : 'Espacio Disponible'}
                </h3>
              </div>
            </div>

            {layoutChangeModal.type === 'decrease' ? (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Al reducir el diseño, te quedan <span className="font-bold text-black">{layoutChangeModal.overflowCount} foto(s)</span> por fuera. ¿Qué deseas hacer con ellas?
                </p>
                <div className="space-y-3">
                  <button onClick={() => { applyRippleShift(layoutChangeModal.pageIndex, layoutChangeModal.newVariant); setLayoutChangeModal(null); }} className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-black font-medium transition-all text-sm">
                    Desplazar todas las fotos en cascada (Recomendado)
                  </button>
                  {layoutChangeModal.pageIndex < photos.length - 1 && (
                    <button onClick={() => { applyIncreaseNextPageVariant(layoutChangeModal.pageIndex, layoutChangeModal.newVariant); setLayoutChangeModal(null); }} className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-black font-medium transition-all text-sm">
                      Aumentar el layout de la pág. siguiente en {layoutChangeModal.overflowCount}
                    </button>
                  )}
                  <button onClick={() => { applyDeleteOverflow(layoutChangeModal.pageIndex, layoutChangeModal.newVariant); setLayoutChangeModal(null); }} className="w-full text-left px-4 py-3 rounded-xl border-2 border-red-100 hover:border-red-500 hover:bg-red-50 font-medium transition-all text-sm text-red-600">
                    Eliminar la(s) foto(s) sobrante(s)
                  </button>
                  
                  <div className="pt-2 flex items-center gap-2">
                    <select value={selectedTargetPage} onChange={(e) => setSelectedTargetPage(Number(e.target.value))} className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-black outline-none text-sm">
                      {photos.map((_, i) => (
                         <option key={i} value={i}>Página {i + 1}</option>
                      ))}
                    </select>
                    <button onClick={() => { applyMoveToSpecificPage(layoutChangeModal.pageIndex, layoutChangeModal.newVariant, selectedTargetPage); setLayoutChangeModal(null); }} className="px-4 py-2 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800">
                      Enviar a pág
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-gray-600 text-sm">
                  Has aumentado el diseño y ahora tienes más espacio. ¿Deseas reajustar trayendo fotos de las páginas siguientes para llenar el vacío?
                </p>
                <div className="space-y-3">
                  <button onClick={() => { applyPullShift(layoutChangeModal.pageIndex, layoutChangeModal.newVariant); setLayoutChangeModal(null); }} className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-black font-medium transition-all text-sm">
                    Sí, reajustar fotos (Traer siguientes)
                  </button>
                  <button onClick={() => { applyIncreaseVariantOnly(layoutChangeModal.pageIndex, layoutChangeModal.newVariant); setLayoutChangeModal(null); }} className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-black font-medium transition-all text-sm">
                    No, dejar los espacios vacíos
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
               <button onClick={() => setLayoutChangeModal(null)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-black">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8 sticky top-20 bg-white/95 backdrop-blur-sm z-40 py-2 sm:py-4 border-b -mx-4 px-4 sm:mx-0 sm:px-0">
        <div><h2 className="text-xl sm:text-2xl font-bold">{album.name} Editor</h2><p className="text-sm text-gray-500">{safePhotos.length} {t('organizer.pages')} • {safePhotos.flat().length} {t('step.photos')}</p></div>
        <button onClick={handleComplete} className="px-6 sm:px-8 py-2 sm:py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg font-medium text-sm sm:text-base">{t('organizer.complete')}</button>
      </div>

      <div className="grid grid-cols-2 gap-x-2 sm:gap-x-3 md:gap-x-4 gap-y-12 sm:gap-y-16">
        
        {/* CUADRO 1: Interior de la Portada Principal */}
        <div className="relative group flex flex-col">
          <div className="flex items-center justify-between mb-4 h-10 md:h-12">
            <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Interior Portada</span>
          </div>
          <div 
            className="bg-gray-100 rounded-none shadow-inner border-2 border-gray-200 transition-all overflow-hidden flex items-center justify-center mt-auto"
            style={{ aspectRatio: isHorizontal ? '4/3' : isVertical ? '3/4' : '1/1' }}
          >
            <div className="text-gray-300 flex flex-col items-center gap-2 opacity-60">
              <Layers className="w-10 h-10 md:w-12 md:h-12" />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Reverso</span>
            </div>
          </div>
        </div>

        {/* CUADROS INTERMEDIOS: Páginas reales del usuario */}
        {safePhotos.map((pagePhotos, pageIndex) => (
          <div key={pageIndex} className="relative group flex flex-col">
            <div className="flex items-center justify-between mb-4 h-10 md:h-12">
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Página {pageIndex + 1}</span>
              <div className="flex gap-2">
                {editingPageIndex === pageIndex && (<button onClick={() => setAdvancedSettingsModal(pageIndex)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 bg-white text-black border-gray-200 hover:border-black transition-all"><Settings className="w-4 h-4"/><span className="text-xs font-bold uppercase hidden sm:inline">{t('organizer.pageSettings') || 'Ajustes'}</span></button>)}
                <button onClick={() => { if (editingPageIndex === pageIndex) setEditingPageIndex(null); else { setEditingPageIndex(pageIndex); setAdvancedSettingsModal(pageIndex); } }} className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full border-2 transition-all ${editingPageIndex === pageIndex ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200 hover:border-black'}`}>{editingPageIndex === pageIndex ? <Check className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />}<span className="text-xs md:text-sm font-bold uppercase tracking-tight">{editingPageIndex === pageIndex ? <span className="hidden lg:inline">{t('organizer.finishEditing') || 'Listo'}</span> : <span className="hidden lg:inline">{t('organizer.enableEditing') || 'Editar'}</span>}{editingPageIndex === pageIndex ? <span className="lg:hidden">LISTO</span> : <span className="lg:hidden">EDITAR</span>}</span></button>
              </div>
            </div>

            <div className={`bg-white rounded-none shadow-sm border-2 transition-all overflow-hidden mt-auto ${editingPageIndex === pageIndex ? 'border-black ring-4 ring-black/5' : 'border-gray-100'}`} style={{ aspectRatio: isHorizontal ? '4/3' : isVertical ? '3/4' : '1/1' }}>
              {(() => {
                const currentVariant = pageLayoutVariants[pageIndex] || getNextAllowed(pagePhotos.length);
                const slots = Array.from({ length: currentVariant }, (_, i) => pagePhotos[i] || null);
                
                return (
                  <div className={`grid gap-2 p-4 h-full ${getGridLayout(currentVariant, pageLayouts[pageIndex])}`}>
                    {slots.map((photo, photoIndex) => {
                      const textBox = textBoxSlots[pageIndex]?.[photoIndex];
                      const crop = photoCrops[`${pageIndex}-${photoIndex}`] || { x: 50, y: 50, zoom: 1 };
                      const isHalfHeightLayout = (currentVariant === 2 || currentVariant === 3) && pageLayouts[pageIndex] !== 'column';
                      
                      return (
                        <AlbumEditorPhotoSlot
                          key={photoIndex} photo={photo} textBox={textBox} crop={crop}
                          isHalfHeightLayout={isHalfHeightLayout} pageIndex={pageIndex} photoIndex={photoIndex}
                          editingPageIndex={editingPageIndex}
                          handleMovePhotoWithinPage={handleMovePhotoWithinPage} handleRemovePhotoFromPage={handleRemovePhotoFromPage} setEditingTextSlot={setEditingTextSlot} handleRemoveTextBox={handleRemoveTextBox} handleAddPhotoToPage={handleSpecificFileSelection} handleAddTextBox={handleAddTextBox}
                          onOpenCropModal={(pIdx, idx, aspect) => setCropModalData({ pageIndex: pIdx, photoIndex: idx, aspectRatio: aspect })}
                          t={t}
                        />
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        ))}

        {/* PÁGINA EN BLANCO */}
        {safePhotos.length % 2 !== 0 && (
          <div className="relative group flex flex-col">
            <div className="flex items-center justify-between mb-4 h-10 md:h-12">
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Página en Blanco</span>
            </div>
            <div 
              className="bg-white rounded-none shadow-sm border-2 border-gray-100 transition-all overflow-hidden flex items-center justify-center mt-auto"
              style={{ aspectRatio: isHorizontal ? '4/3' : isVertical ? '3/4' : '1/1' }}
            >
              <span className="text-gray-300 text-[10px] md:text-xs font-bold uppercase tracking-widest">En Blanco</span>
            </div>
          </div>
        )}

        {/* CUADRO FINAL: Interior de la Contraportada */}
        <div className="relative group flex flex-col">
          <div className="flex items-center justify-between mb-4 h-10 md:h-12">
            <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Interior Contraportada</span>
          </div>
          <div 
            className="bg-gray-100 rounded-none shadow-inner border-2 border-gray-200 transition-all overflow-hidden flex items-center justify-center mt-auto"
            style={{ aspectRatio: isHorizontal ? '4/3' : isVertical ? '3/4' : '1/1' }}
          >
            <div className="text-gray-300 flex flex-col items-center gap-2 opacity-60">
              <Layers className="w-10 h-10 md:w-12 md:h-12" />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Reverso Final</span>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-20 text-center pb-20"><button onClick={() => handleAddPage(safePhotos.length - 1)} className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl hover:border-black hover:bg-gray-50 transition-all text-gray-500 hover:text-black"><Layers className="w-6 h-6" /><span className="text-lg font-medium">{t('organizer.addPageEnd') || 'Añadir páginas'} (+2)</span></button></div>

      {cropModalData !== null && (
        <CropModal
          isOpen={true}
          onClose={() => setCropModalData(null)}
          imageSrc={photos[cropModalData.pageIndex]?.[cropModalData.photoIndex] || ''}
          currentCrop={photoCrops[`${cropModalData.pageIndex}-${cropModalData.photoIndex}`]}
          aspectRatio={cropModalData.aspectRatio}
          title={`Ajustar Foto de Página`}
          onSave={(newCrop) => {
            onPhotoCropsChange({
              ...photoCrops,
              [`${cropModalData.pageIndex}-${cropModalData.photoIndex}`]: newCrop
            });
          }}
        />
      )}

      {editingTextSlot && currentEditingText && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2"><Type className="w-5 h-5" /><h4 className="text-xl font-bold">{t('organizer.editText')}</h4></div>
              <button onClick={() => setEditingTextSlot(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{t('organizer.content')}</label>
                {/* Contenedor configurado para Container Queries en el área de edición */}
                <div 
                  className="w-full border-2 border-gray-100 rounded-xl focus-within:border-black bg-white flex items-center justify-center h-[200px]"
                  style={{ containerType: 'inline-size' }}
                >
                  <textarea 
                    value={currentEditingText.text} 
                    onChange={(e) => updateTextBox(editingTextSlot.pageIndex, editingTextSlot.photoIndex, { text: e.target.value })} 
                    placeholder="Escribe tu texto aquí..." 
                    className="bg-transparent resize-none outline-none p-0 m-0 border-none" 
                    style={{
                      width: '90%', 
                      height: '90%',
                      fontSize: `${currentEditingText.fontSize * 0.25}cqi`, 
                      fontFamily: currentEditingText.fontFamily,
                      color: currentEditingText.color,
                      textAlign: 'center',
                      lineHeight: '1.3'
                    }}
                    autoFocus 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block items-center gap-2"><ALargeSmall className="w-4 h-4" /> {t('organizer.size')}</label><select value={currentEditingText.fontSize} onChange={(e) => updateTextBox(editingTextSlot.pageIndex, editingTextSlot.photoIndex, { fontSize: parseInt(e.target.value) })} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black bg-white">{[12, 16, 20, 24, 32, 40, 48, 64].map(size => <option key={size} value={size}>{size}px</option>)}</select></div>
                <div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{t('organizer.font')}</label><select value={currentEditingText.fontFamily} onChange={(e) => updateTextBox(editingTextSlot.pageIndex, editingTextSlot.photoIndex, { fontFamily: e.target.value })} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black bg-white"><option value="Arial">Sans Serif</option><option value="Georgia">Serif</option><option value="Courier New">Monospace</option><option value="'Playfair Display', serif">Elegant</option><option value="'Dancing Script', cursive">Handwritten</option></select></div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{t('organizer.color')}</label>
                <div className="flex gap-2">
                  {['#000000', '#4B5563', '#9CA3AF', '#EF4444', '#3B82F6', '#10B981', '#F59E0B'].map(color => (
                    <button key={color} onClick={() => updateTextBox(editingTextSlot.pageIndex, editingTextSlot.photoIndex, { color })} className={`w-8 h-8 rounded-full border-2 transition-transform ${currentEditingText.color === color ? 'scale-125 border-black' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <button onClick={() => setEditingTextSlot(null)} className="w-full py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-bold text-lg shadow-lg shadow-black/10">{t('organizer.saveChanges')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}