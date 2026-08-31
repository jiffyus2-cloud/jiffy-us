import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { convertFileIfHeic } from '../utils/imageUtils';
import {
  fromPropsToAlbumState,
  fromAlbumStateToProps,
  swapPhotosOnPage as albumSwapPhotosOnPage,
  swapPages as albumSwapPages,
  movePageToIndex as albumMovePageToIndex,
  insertBlankPages as albumInsertBlankPages,
  movePhotoToPage as albumMovePhotoToPage,
  rippleShift as albumRippleShift,
  pullShift as albumPullShift,
  deleteOverflow as albumDeleteOverflow,
  moveOverflowToPage as albumMoveOverflowToPage,
  deletePages as albumDeletePages,
  compactPage as albumCompactPage,
  occupiedSlotCount,
  analyzeConfigChange,
  migrateAlbumToConfig,
  type AlbumState,
  type AlbumConfig,
  type AlbumOpResult,
  type AlbumWarning,
} from '../utils/albumStateUtils';
import {
  FONT_SIZES,
  getMaxCharsForFontSize,
  getEffectiveFontSize,
  MAX_SHRINK_CHARS,
  type TextOverflowMode,
} from '../utils/textOverflowUtils';
import {
  Upload, X, ChevronUp, ChevronDown, Plus, Trash2,
  Image as ImageIcon, Grid3x3, Edit3, HelpCircle,
  Layers, Type, ALargeSmall, Settings, Pencil, Crop as CropIcon,
  AlertCircle, Loader2, AlignLeft, AlignCenter, AlignRight, AlignJustify
} from 'lucide-react';
import {
  getAllowedPhotosPerPage,
  getPageSlots,
  hasOrientationChoice,
} from '../utils/pageLayouts';
import { Album } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import { useStoreConfig } from '../context/StoreConfigContext';
import { useAuth } from '../../hooks/useAuth';
import type { CustomizationOptions } from './AlbumCustomization';
import ImageCropper from './ImageCropper';
import CropModal from './CropModal';
import { Switch } from './ui/switch';
import { PageRangeSlider } from './ui/page-range-slider';

// --- NUEVA IMAGEN DE JIFFY ---
import jiffy2Img from '../../assets/Jiffy2.png';
import iosAnimVideo from '../../assets/Anim_IOS.mp4';

// ============================================================================
// COMPONENTE DE CARGA PERSONALIZADO (JiffyLoader)
// ============================================================================
interface JiffyLoaderProps {
  t?: (key: string) => string;
  photoCount?: number;
}

const getEstimatedTime = (count: number): string => {
  const seconds = Math.round(count * 1);
  if (seconds < 60) return `~${seconds} segundos`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `~${mins} min ${secs} seg` : `~${mins} min`;
};

const JiffyLoader: React.FC<JiffyLoaderProps> = ({ t, photoCount }) => {
  const estimated = photoCount ? getEstimatedTime(photoCount) : null;
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

      <div className="text-center animate-pulse px-6 py-3 bg-white rounded-lg border border-gray-200 shadow-sm mx-4">
        <p className="text-xl font-bold text-gray-900">
          {t ? t('organizer.aiSorting') : 'Organizando con 1Clic.ai'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {t ? t('organizer.aiSortingDesc') : 'Preparando tu diseño...'}
        </p>
      </div>

      {estimated && (
        <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 border border-amber-200 rounded-lg mx-4 text-sm text-amber-800">
          <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Tiempo estimado: <strong>{estimated}</strong></span>
        </div>
      )}

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
  pagesLocked?: boolean;
  initialFileSignatures?: string[][];
  isSaving?: boolean;
  /** URLs cuya subida a Storage falló: se marcan como rotas para que el usuario las reemplace. */
  failedUploadUrls?: string[];
}

type Step = 'upload' | 'pages' | 'editor';

/** Tope duro de páginas de un álbum. */
const ALBUM_MAX_PAGES = 250;

const AlbumEditorPhotoSlot: React.FC<{
  photo: string | null;
  textBox: any;
  crop: { x: number; y: number; zoom: number };
  pageIndex: number;
  photoIndex: number;
  photoCount: number;
  editingPageIndex: number | null;
  isDragging: boolean;
  isDragTarget: boolean;
  onDragStart: (pageIndex: number, photoIndex: number, e: React.PointerEvent) => void;
  handleRemovePhotoFromPage: (pageIndex: number, photoIndex: number) => void;
  setEditingTextSlot: (slot: { pageIndex: number, photoIndex: number } | null) => void;
  handleRemoveTextBox: (pageIndex: number, photoIndex: number) => void;
  handleAddPhotoToPage: (pageIndex: number, file: File, targetPhotoIndex?: number) => void;
  handleAddTextBox: (pageIndex: number, photoIndex: number) => void;
  onOpenCropModal: (pageIndex: number, photoIndex: number, aspect: number) => void;
  onPhotoError?: (url: string) => void;
  onPhotoRetry?: (url: string, pageIndex: number, photoIndex: number) => void;
  t: (key: string) => string;
}> = ({
  photo, textBox, crop, pageIndex, photoIndex, photoCount, editingPageIndex,
  isDragging, isDragTarget, onDragStart,
  handleRemovePhotoFromPage, setEditingTextSlot,
  handleRemoveTextBox, handleAddPhotoToPage, handleAddTextBox, onOpenCropModal,
  onPhotoError, onPhotoRetry, t
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isCompact = photoCount >= 6;
  const isEditing = editingPageIndex === pageIndex;

  return (
    <div
      data-photo-slot
      data-page-index={pageIndex}
      data-photo-index={photoIndex}
      className={`relative group/photo rounded-none bg-white flex items-center justify-center transition-opacity h-full ${isEditing ? 'z-10' : ''} ${isDragging ? 'opacity-40 ring-2 ring-dashed ring-gray-400' : ''} ${isDragTarget ? 'ring-2 ring-black' : ''}`}
    >
      {photo ? (
        <>
          {/* Contenido de la foto — drag directo sobre la imagen */}
          <div
            ref={containerRef}
            className={`w-full h-full relative ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onPointerDown={isEditing ? e => onDragStart(pageIndex, photoIndex, e) : undefined}
            style={isEditing ? { touchAction: 'none', userSelect: 'none' } : undefined}
          >
            <ImageCropper
              src={photo}
              position={crop || { x: 50, y: 50, zoom: 1 }}
              onError={onPhotoError}
              onRetry={onPhotoRetry ? (url) => onPhotoRetry(url, pageIndex, photoIndex) : undefined}
            />
          </div>

          {/* Botones de edición */}
          {isEditing && (
            <div className={`absolute z-20 pointer-events-none ${
              isCompact
                ? 'top-1 right-1 flex flex-col items-end gap-1'
                : 'bottom-1 sm:top-1 sm:bottom-auto left-0 right-0 sm:left-auto sm:right-1 flex flex-wrap justify-center sm:justify-end items-center sm:items-start gap-1.5 sm:gap-1 px-1 sm:px-0'
            }`}>
              {/* Botones de acción */}
              <div className={`flex pointer-events-auto shrink-0 ${isCompact ? 'flex-col gap-1' : 'gap-1'}`}>
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
        </>
      ) : textBox ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-white relative" style={{ containerType: 'inline-size' }}>
          <div
            onPointerDown={isEditing ? e => onDragStart(pageIndex, photoIndex, e) : undefined}
            style={{
              width: '90%',
              fontSize: `${getEffectiveFontSize(textBox.fontSize || 24, (textBox.text || '').length, textBox.overflowMode || 'limit') * 0.25}cqi`,
              fontFamily: textBox.fontFamily,
              color: textBox.color,
              textAlign: textBox.textAlign || 'center',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.3',
              ...(isEditing ? { touchAction: 'none', userSelect: 'none', cursor: 'grab' } : {})
            }}
          >
            {textBox.text || t('organizer.addText') + '...'}
          </div>
          {isEditing && (
            <div className="absolute z-20 pointer-events-none bottom-1 sm:top-1 sm:bottom-auto left-0 right-0 sm:left-auto sm:right-1 flex flex-wrap justify-center sm:justify-end items-center sm:items-start gap-1.5 sm:gap-1 px-1 sm:px-0">
              {/* Grupo de acciones */}
              <div className="flex gap-1 pointer-events-auto shrink-0">
                <button onClick={() => setEditingTextSlot({ pageIndex, photoIndex })} className="p-2 sm:p-1.5 bg-white text-black hover:bg-gray-100 shadow-md rounded-full" title="Editar Texto"><Edit3 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
                <button onClick={() => handleRemoveTextBox(pageIndex, photoIndex)} className="p-2 sm:p-1.5 bg-red-500 text-white hover:bg-red-600 shadow-md rounded-full" title="Eliminar"><Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /></button>
              </div>
            </div>
          )}
        </div>
      ) : (
        isEditing && (
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
  onPageLayoutsChange, pageLayoutVariants = {}, onPageLayoutVariantsChange, onComplete, pagesLocked = false,
  initialFileSignatures, isSaving = false, failedUploadUrls,
}: PhotoOrganizerProps) {
  const { t } = useLanguage();
  const storeConfig = useStoreConfig();
  const { user } = useAuth();

  const safePhotos = photos || [];
  const sizeStr = customization?.size || 'Cuadrado 20x20 cm';

  const extraPagePrice = sizeStr.includes('30x30')
    ? storeConfig.prices.albumExtra30x30
    : sizeStr.includes('21x28') || sizeStr.includes('28x21')
    ? storeConfig.prices.albumExtraRect
    : storeConfig.prices.albumExtra20x20;
  
  const [step, setStep] = useState<Step>(safePhotos.length > 0 ? 'editor' : 'upload');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [pendingFilesData, setPendingFilesData] = useState<{id: string, url: string, metadata: any}[]>([]);
  const [numPages, setNumPages] = useState<number | string>(40);
  // Cuántas de esas páginas son en blanco pedidas a propósito (siempre par).
  // Permiten superar el máximo que justifican las fotos, hasta ALBUM_MAX_PAGES.
  const [blankPages, setBlankPages] = useState(0);
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

  const [deletePageConfirm, setDeletePageConfirm] = useState<{ pageIndex: number; photoCount: number; companionIndex: number | null; companionPhotoCount: number } | null>(null);

  // Confirmación de borrado de un slot (foto o caja de texto). Mismo patrón que
  // deletePageConfirm: el handler abre el modal, el execute* hace la mutación.
  const [deleteSlotConfirm, setDeleteSlotConfirm] = useState<
    | { kind: 'photo'; pageIndex: number; photoIndex: number; url: string }
    | { kind: 'text'; pageIndex: number; photoIndex: number; text: string }
    | null
  >(null);

  // NUEVO ESTADO PARA EL MODAL DE PÁGINAS VACÍAS
  const [emptyPagesModalData, setEmptyPagesModalData] = useState<{
    indices: number[];
    isOdd: boolean;
    totalCurrent: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const retryInputRef = useRef<HTMLInputElement>(null);
  const retryTargetRef = useRef<{ pageIndex: number; photoIndex: number } | null>(null);
  const [brokenPhotoUrls, setBrokenPhotoUrls] = useState<Set<string>>(new Set());
  const [showBrokenBanner, setShowBrokenBanner] = useState(false);
  // Mapa URL → clave de archivo, para trasladar firmas desde processUpload hasta handleFinalizeSetup
  const pendingFileKeysRef = useRef<Map<string, string>>(new Map());
  // Mapa clave de archivo → info de baja resolución, para aplicarla cuando se crea la URL definitiva
  const pendingLowResRef = useRef<Map<string, {width: number, height: number}>>(new Map());
  // Para detectar cancelación del picker de iOS vía recuperación de foco
  const pickerFocusHandlerRef = useRef<(() => void) | null>(null);
  const pickerFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isValidating, setIsValidating] = useState(false);
  const [lowResInfo, setLowResInfo] = useState<Record<string, {width: number, height: number}>>({});
  const [selectedLowResWarning, setSelectedLowResWarning] = useState<{url: string, pageIndex: number, photoIndex: number, width: number, height: number} | null>(null);

  const [showPickerWarning, setShowPickerWarning] = useState(false);
  const [pickerWarningAccepted, setPickerWarningAccepted] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<{ done: number; total: number } | null>(null);
  const [isTransferringFiles, setIsTransferringFiles] = useState(false);

  // Debug mode: activar con 5 taps en el área inferior de la pantalla de subida,
  // o con ?debug=1 en la URL. Se guarda en localStorage para sobrevivir recargas y PWA.
  const [debugMode, setDebugMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      new URLSearchParams(window.location.search).get('debug') === '1' ||
      localStorage.getItem('debugMode') === '1'
    );
  });
  const [debugTapCount, setDebugTapCount] = useState(0);
  const debugTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debugFileReport, setDebugFileReport] = useState<{
    total: number;
    heicCount: number;
    jpegCount: number;
    otherCount: number;
    convertedCount: number;
    files: Array<{ name: string; originalType: string; size: number; wasHeic: boolean; wasConverted: boolean }>;
  } | null>(null);

  const handleDebugTap = () => {
    if (debugTapTimerRef.current) clearTimeout(debugTapTimerRef.current);
    setDebugTapCount(prev => {
      const next = prev + 1;
      if (next >= 5) {
        const newMode = !debugMode;
        if (newMode) { localStorage.setItem('debugMode', '1'); }
        else { localStorage.removeItem('debugMode'); }
        setDebugMode(newMode);
        if (!newMode) setDebugFileReport(null);
        return 0;
      }
      debugTapTimerRef.current = setTimeout(() => setDebugTapCount(0), 3000);
      return next;
    });
  };

  const dragStateRef = useRef<{ pageIndex: number; fromIndex: number; toIndex: number | null; overSendZone: boolean } | null>(null);
  const [dragVisual, setDragVisual] = useState<{ pageIndex: number; fromIndex: number; toIndex: number | null; overSendZone: boolean } | null>(null);
  const [sendPhotoPicker, setSendPhotoPicker] = useState<{ pageIndex: number; photoIndex: number } | null>(null);
  const sendPhotoPickerScrollRef = useRef<HTMLDivElement>(null);
  const sendPhotoPickerItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [reorderSelectedPage, setReorderSelectedPage] = useState<number | null>(null);
  const [reorderTargetPage, setReorderTargetPage] = useState<number | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Firmas de archivo para detección de duplicados (misma forma 2D que photos)
  const [fileSignatures, setFileSignatures] = useState<string[][]>(() => initialFileSignatures ?? []);
  const [duplicateModal, setDuplicateModal] = useState<{
    file: File;
    previewUrl: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);
  const getFileKey = (file: File) => `${file.name}|${file.size}|${file.lastModified}`;
  /**
   * Claves ya subidas en esta sesión. `fileSignatures` no se rellena hasta
   * handleFinalizeSetup, así que sin esto los duplicados entre lotes distintos
   * de una misma selección pasaban desapercibidos.
   */
  const sessionKeysRef = useRef<Set<string>>(new Set());
  /** Archivos que no se pudieron procesar; se muestran al usuario en vez de descartarse en silencio. */
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);
  /** Avisos devueltos por las operaciones de albumStateUtils (antes eran alert() bloqueantes). */
  const [albumWarning, setAlbumWarning] = useState<string | null>(null);
  const [sizeMigrationModal, setSizeMigrationModal] = useState<{
    pagesAffected: number[];
    photosAtRisk: number;
    estimatedNewPages: number;
  } | null>(null);

  // Fotos cuya subida a Storage falló: se pintan como rotas y el usuario puede reemplazarlas.
  useEffect(() => {
    if (!failedUploadUrls || failedUploadUrls.length === 0) return;
    setBrokenPhotoUrls(prev => {
      const next = new Set(prev);
      failedUploadUrls.forEach(url => next.add(url));
      return next;
    });
    setShowBrokenBanner(true);
  }, [failedUploadUrls]);

  const handlePhotoError = useCallback((url: string) => {
    setBrokenPhotoUrls(prev => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
    setShowBrokenBanner(true);
  }, []);

  const handlePhotoRetry = useCallback((url: string, pageIndex: number, photoIndex: number) => {
    retryTargetRef.current = { pageIndex, photoIndex };
    retryInputRef.current?.click();
  }, []);

  const handleRetryFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    event.target.value = '';

    const target = retryTargetRef.current;
    if (target) {
      retryTargetRef.current = null;
      await handleSpecificFileSelection(target.pageIndex, files[0], target.photoIndex);
    } else {
      // Retry masivo: reemplazar todos los slots rotos en orden
      const brokenSlots: { pageIndex: number; photoIndex: number; url: string }[] = [];
      photos.forEach((pagePhotos, pi) => {
        pagePhotos.forEach((url, fi) => {
          if (url && brokenPhotoUrls.has(url)) brokenSlots.push({ pageIndex: pi, photoIndex: fi, url });
        });
      });
      const filesToUse = Array.from(files);
      for (let i = 0; i < Math.min(filesToUse.length, brokenSlots.length); i++) {
        await handleSpecificFileSelection(brokenSlots[i].pageIndex, filesToUse[i], brokenSlots[i].photoIndex);
      }
    }
    setBrokenPhotoUrls(new Set());
    setShowBrokenBanner(false);
  };

  const isSquare = sizeStr.includes('Cuadrado');
  const isHorizontal = sizeStr.includes('Horizontal');
  const isVertical = sizeStr.includes('Vertical');
  const allowedPhotosPerPage = getAllowedPhotosPerPage(sizeStr);

  const getNextAllowed = (count: number) => {
    for (const opt of allowedPhotosPerPage) {
      if (opt >= count) return opt;
    }
    return allowedPhotosPerPage[allowedPhotosPerPage.length - 1];
  };

  /**
   * Cuántos slots pintar en una página. Nunca menos que el número de fotos que
   * realmente tiene: antes se pintaban exactamente `variant` slots, así que una
   * variante desactualizada (p. ej. al cambiar el tamaño del álbum de Cuadrado,
   * que admite 9, a Horizontal, que admite 6) hacía DESAPARECER de la vista las
   * fotos en los índices sobrantes, sin ningún aviso.
   */
  const getRenderSlotCount = (pageIndex: number, pagePhotos: string[]) =>
    Math.max(
      pageLayoutVariants[pageIndex] ?? 0,
      getNextAllowed(pagePhotos.length),
      pagePhotos.length
    );

  // Máximo de páginas que justifican las fotos subidas (mínimo 1 foto por página).
  // Es el tope de la barra del selector, dinámico según cuántas fotos haya.
  const getMaxPhotoPages = (photoCount: number) => {
    const baseMax = Math.max(40, photoCount);
    return Math.min(ALBUM_MAX_PAGES, baseMax % 2 === 0 ? baseMax : baseMax + 1);
  };

  // Tope duro del álbum. Se puede superar el máximo anterior sumando páginas en
  // blanco a propósito (control aparte en el paso 'pages'): quedan sin fotos y
  // se avisan antes de imprimir (handleComplete). Es el mismo límite que aplica
  // handleAddPage en el editor.
  const getMaxPages = (_photoCount: number) => ALBUM_MAX_PAGES;

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

  // Al abrir el selector de página destino, centra el scroll en la página de origen
  // para que el usuario no tenga que buscarla manualmente si está lejos del inicio.
  useEffect(() => {
    if (!sendPhotoPicker) return;
    const container = sendPhotoPickerScrollRef.current;
    const item = sendPhotoPickerItemRefs.current[sendPhotoPicker.pageIndex];
    if (container && item) {
      const containerHeight = container.clientHeight;
      const itemTop = item.offsetTop;
      const itemHeight = item.offsetHeight;
      const scrollPosition = itemTop - (containerHeight / 2) + (itemHeight / 2);
      container.scrollTo({ top: Math.max(0, scrollPosition), behavior: 'auto' });
    }
  }, [sendPhotoPicker]);

  const checkImageDimensions = (file: File): Promise<{file: File, url: string, isLowRes: boolean, width: number, height: number}> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const minDim = Math.min(img.width, img.height);
        URL.revokeObjectURL(url);
        resolve({ file, url: '', isLowRes: minDim < 1080, width: img.width, height: img.height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ file, url: '', isLowRes: false, width: 0, height: 0 });
      };
      img.src = url;
    });
  };


  const checkDimensionsInBackground = async (files: File[]) => {
    const BATCH_SIZE = 5;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(checkImageDimensions));
      results.filter(r => r.isLowRes).forEach(r => {
        pendingLowResRef.current.set(getFileKey(r.file), { width: r.width, height: r.height });
      });
      await new Promise<void>(r => setTimeout(r, 100));
    }
  };

  const cleanupPickerFocusListener = () => {
    if (pickerFocusHandlerRef.current) {
      window.removeEventListener('focus', pickerFocusHandlerRef.current);
      pickerFocusHandlerRef.current = null;
    }
    if (pickerFocusTimerRef.current) {
      clearTimeout(pickerFocusTimerRef.current);
      pickerFocusTimerRef.current = null;
    }
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Ocultar overlay de "transferring" en cuanto iOS nos entrega los archivos
    cleanupPickerFocusListener();
    setIsTransferringFiles(false);

    const files = event.target.files;
    if (!files || files.length === 0) return;
    const filesArray = Array.from(files);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Mostrar progreso SIEMPRE, para todo tipo de archivo.
    // Esto previene el congelamiento al procesar las fotos en lotes de 5
    // en lugar de crear todos los ObjectURLs y renderizar todas las imágenes a la vez.
    setConversionProgress({ done: 0, total: filesArray.length });

    const BATCH_SIZE = 5;
    const allProcessed: File[] = [];
    const debugFiles: Array<{ name: string; originalType: string; size: number; wasHeic: boolean; wasConverted: boolean }> = [];

    (async () => {
      for (let i = 0; i < filesArray.length; i += BATCH_SIZE) {
        const batch = filesArray.slice(i, i + BATCH_SIZE);

        // Convertir HEIC si iOS lo entregó sin convertir (edge case en algunos dispositivos)
        const processedBatch = await Promise.all(batch.map(convertFileIfHeic));
        allProcessed.push(...processedBatch);

        // Capturar info de debug por lote (solo cuando debugMode está activo)
        if (debugMode) {
          processedBatch.forEach((processed, idx) => {
            const original = batch[idx];
            const isHeic = /\.(heic|heif)$/i.test(original.name) ||
                           original.type.includes('heic') || original.type.includes('heif');
            debugFiles.push({
              name: original.name,
              originalType: original.type || '(vacío)',
              size: original.size,
              wasHeic: isHeic,
              wasConverted: processed !== original, // distinta referencia → canvas lo convirtió
            });
          });
        }

        // Subir este lote: crea ObjectURLs y añade al estado → React renderiza solo 5 imágenes.
        // El await es imprescindible: si este lote abre el modal de duplicados, el
        // siguiente no debe pisarlo (ver askDuplicateDecision).
        await processUpload(processedBatch);

        setConversionProgress({ done: Math.min(i + BATCH_SIZE, filesArray.length), total: filesArray.length });
        // Ceder control al navegador para renderizar el lote y liberar memoria (GC de iOS)
        await new Promise<void>(r => setTimeout(r, 80));
      }

      setConversionProgress(null);
      checkDimensionsInBackground(allProcessed);

      // Publicar reporte de debug
      if (debugMode && debugFiles.length > 0) {
        const heicCount = debugFiles.filter(f => f.wasHeic).length;
        const convertedCount = debugFiles.filter(f => f.wasConverted).length;
        const jpegCount = debugFiles.filter(f =>
          f.originalType.includes('jpeg') || f.originalType.includes('jpg')
        ).length;
        setDebugFileReport({
          total: debugFiles.length,
          heicCount,
          jpegCount,
          otherCount: debugFiles.length - heicCount - jpegCount,
          convertedCount,
          files: debugFiles,
        });
        console.group('%c[DEBUG iOS HEIC]', 'color: #facc15; font-weight: bold; font-size: 14px');
        console.log(`Total: ${debugFiles.length} | HEIC: ${heicCount} | JPEG: ${jpegCount} | Otros: ${debugFiles.length - heicCount - jpegCount} | Convertidos por app: ${convertedCount}`);
        console.log(heicCount > 0 ? '✅ Fix v4 FUNCIONÓ — iOS entregó HEIC directamente' : '❌ Fix v4 sin efecto — iOS convirtió todo a JPEG antes de entregar');
        console.table(debugFiles);
        console.groupEnd();
      }
    })();
  };


  /**
   * Muestra el modal de duplicados y espera la decisión del usuario.
   *
   * Antes la subida real vivía dentro de los callbacks de `setDuplicateModal`, y
   * como los lotes de 5 archivos no esperaban ninguna respuesta, un segundo lote
   * con duplicados reemplazaba el objeto del modal y se perdían los callbacks del
   * lote anterior: todas sus fotos (también las NO duplicadas) desaparecían sin
   * ningún aviso.
   */
  const askDuplicateDecision = (file: File): Promise<'use' | 'skip'> =>
    new Promise(resolve => {
      let previewUrl = '';
      try {
        previewUrl = URL.createObjectURL(file);
      } catch {
        resolve('use');
        return;
      }
      const finish = (decision: 'use' | 'skip') => {
        URL.revokeObjectURL(previewUrl);
        setDuplicateModal(null);
        resolve(decision);
      };
      setDuplicateModal({
        file,
        previewUrl,
        onConfirm: () => finish('use'),
        onCancel: () => finish('skip'),
      });
    });

  const processUpload = async (finalFiles: File[]) => {
    if (finalFiles.length === 0) return;

    // Firmas ya presentes en el álbum + las subidas en esta misma sesión
    // (fileSignatures no se rellena hasta handleFinalizeSetup).
    const existingKeys = new Set([
      ...fileSignatures.flat().filter(Boolean),
      ...sessionKeysRef.current,
    ]);

    const duplicates: File[] = [];
    const unique: File[] = [];
    for (const file of finalFiles) {
      if (existingKeys.has(getFileKey(file))) duplicates.push(file);
      else unique.push(file);
    }

    const doUpload = (files: File[]) => {
      if (files.length === 0) return;
      const newFilesData: { id: string; url: string; metadata: { name: string; size: number; type: string; lastModified: number } }[] = [];
      const skipped: string[] = [];
      for (const file of files) {
        let url: string;
        try {
          url = URL.createObjectURL(file);
          if (!url) { skipped.push(file.name); continue; }
        } catch {
          skipped.push(file.name);
          continue;
        }
        sessionKeysRef.current.add(getFileKey(file));
        newFilesData.push({
          id: Math.random().toString(36).substring(2, 11),
          url,
          metadata: { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified }
        });
      }
      if (skipped.length > 0) setSkippedFiles(prev => [...prev, ...skipped]);
      if (newFilesData.length === 0) return;
      // Registrar URL→clave para que handleFinalizeSetup pueda construir fileSignatures
      newFilesData.forEach(f => {
        pendingFileKeysRef.current.set(f.url, `${f.metadata.name}|${f.metadata.size}|${f.metadata.lastModified}`);
      });
      // Transferir info de baja resolución (clave→info) a la URL nueva definitiva
      const newLowResInfo: Record<string, {width: number, height: number}> = {};
      files.forEach((file, i) => {
        const fk = getFileKey(file);
        if (pendingLowResRef.current.has(fk)) {
          newLowResInfo[newFilesData[i].url] = pendingLowResRef.current.get(fk)!;
          pendingLowResRef.current.delete(fk);
        }
      });
      if (Object.keys(newLowResInfo).length > 0) {
        setLowResInfo(prev => ({ ...prev, ...newLowResInfo }));
      }
      setPendingFilesData(prev => [...prev, ...newFilesData]);
      setUploadedPhotos(prev => [...prev, ...newFilesData.map(f => f.url)]);
    };

    if (duplicates.length > 0) {
      const decision = await askDuplicateDecision(duplicates[0]);
      doUpload(decision === 'use' ? [...unique, ...duplicates] : unique);
    } else {
      doUpload(unique);
    }
  };

  const handleSpecificFileSelection = async (pageIndex: number, file: File, targetPhotoIndex?: number) => {
    setIsValidating(true);
    const result = await checkImageDimensions(file);
    if (result.isLowRes) {
      pendingLowResRef.current.set(getFileKey(file), { width: result.width, height: result.height });
    }
    setIsValidating(false);
    await processSpecificUpload(pageIndex, file, targetPhotoIndex);
  };

  const processSpecificUpload = async (pageIndex: number, file: File, targetPhotoIndex?: number) => {
    const key = getFileKey(file);
    const existingKeys = new Set([
      ...fileSignatures.flat().filter(Boolean),
      ...sessionKeysRef.current,
    ]);

    const doUpload = () => {
      const newPhotos = [...photos];
      const pagePhotos = [...newPhotos[pageIndex]];
      const maxAllowed = allowedPhotosPerPage[allowedPhotosPerPage.length - 1];
      let slotIndex: number;
      let newUrl: string;
      try {
        newUrl = URL.createObjectURL(file);
        if (!newUrl) { setSkippedFiles(prev => [...prev, file.name]); return; }
      } catch {
        setSkippedFiles(prev => [...prev, file.name]);
        return;
      }
      sessionKeysRef.current.add(key);

      if (targetPhotoIndex !== undefined && targetPhotoIndex >= 0) {
        while (pagePhotos.length <= targetPhotoIndex) pagePhotos.push('');
        pagePhotos[targetPhotoIndex] = newUrl;
        slotIndex = targetPhotoIndex;
      } else {
        const firstEmpty = pagePhotos.findIndex(p => !p || p.trim() === '');
        if (firstEmpty !== -1) {
          pagePhotos[firstEmpty] = newUrl;
          slotIndex = firstEmpty;
        } else {
          if (pagePhotos.length >= maxAllowed) {
            URL.revokeObjectURL(newUrl);
            alert(`Has alcanzado el límite máximo de ${maxAllowed} fotos para esta página en este formato.`);
            return;
          }
          pagePhotos.push(newUrl);
          slotIndex = pagePhotos.length - 1;
        }
      }

      // Aplicar info de baja resolución a la URL recién creada
      const lrKey = getFileKey(file);
      if (pendingLowResRef.current.has(lrKey)) {
        const info = pendingLowResRef.current.get(lrKey)!;
        pendingLowResRef.current.delete(lrKey);
        setLowResInfo(prev => ({ ...prev, [newUrl]: info }));
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

      // Limpiar URL rota reemplazada del set de errores
      const replacedUrl = photos[pageIndex]?.[slotIndex];
      if (replacedUrl) {
        setBrokenPhotoUrls(prev => {
          if (!prev.has(replacedUrl)) return prev;
          const next = new Set(prev);
          next.delete(replacedUrl);
          if (next.size === 0) setShowBrokenBanner(false);
          return next;
        });
      }

      onPhotosChange(newPhotos);
    };

    if (existingKeys.has(key)) {
      const decision = await askDuplicateDecision(file);
      if (decision === 'use') doUpload();
    } else {
      doUpload();
    }
  };

  const runAISortingAndDistribute = async () => {
    setIsSortingWithAI(true);

    setTimeout(async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
        const idToken = user ? await user.getIdToken() : null;
        const aiResponse = await fetch(`${backendUrl}/ai/sort-photos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify({
            photos_data: pendingFilesData.map(f => ({ id: f.id, ...f.metadata })),
            page_count: typeof numPages === 'number' ? numPages : 40,
            layout_preferences: { isSquare, isHorizontal, isVertical }
          })
        });

        if (!aiResponse.ok) {
          const errData = await aiResponse.json().catch(() => ({}));
          // Registrar el error real en consola para diagnóstico, sin exponerlo al usuario
          console.error('[IA] Error del servidor:', errData.message || `HTTP ${aiResponse.status}`);
          throw new Error('sort_failed');
        }
        const responseData = await aiResponse.json();

        let finalUrls: string[] = [];
        if (responseData && responseData.success && Array.isArray(responseData.Albums)) {
          const orderedIdsFromAI: string[] = [];
          responseData.Albums.forEach((album: any) => {
            if (album.photo_ids && Array.isArray(album.photo_ids)) orderedIdsFromAI.push(...album.photo_ids);
          });
          
          const urlById = new Map(pendingFilesData.map(f => [f.id, f.url]));
          finalUrls = orderedIdsFromAI.map((id: string) => urlById.get(id) ?? '').filter(Boolean);

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
    if (pagesLocked) return;
    if (photos.length >= 249) {
      alert('Límite máximo de 250 páginas alcanzado.');
      return;
    }
    // Routed through the AlbumState abstraction: each PageState carries its own
    // crops/texts keyed by local photoIndex, so splicing pages into the array
    // keeps them correctly associated automatically — no manual reindexing of
    // photoCrops/textBoxSlots keys required (unlike a raw photos.splice would).
    applyAlbumState(albumInsertBlankPages(currentAlbumState(), index, 2));
    setNumPages(photos.length + 2);
  };

  const handleDeletePage = (index: number) => {
    if (pagesLocked) return;
    if (photos.length <= 40) {
      alert(t('organizer.minPagesReached') || 'Minimum of 40 pages required.');
      return;
    }
    const photoCount = (photos[index] || []).filter(p => p && p.trim() !== '').length;
    const willDeleteCompanion = photos.length > 41;
    const companionIndex = willDeleteCompanion ? index + 1 : null;
    const companionPhotoCount = companionIndex !== null
      ? (photos[companionIndex] || []).filter(p => p && p.trim() !== '').length
      : 0;
    setDeletePageConfirm({ pageIndex: index, photoCount, companionIndex, companionPhotoCount });
  };

  const executeDeletePage = (index: number) => {
    // El usuario ya confirmó viendo el número de fotos de la página y de su compañera,
    // de ahí allowPhotoDeletion. El reindexado de crops/textos/layouts lo hace
    // deletePages de forma atómica (antes eran ~40 líneas manuales aquí).
    const deleteCount = photos.length > 41 ? 2 : 1;
    const indices = deleteCount === 2 ? [index, index + 1] : [index];
    const result = albumDeletePages(currentAlbumState(), indices, { allowPhotoDeletion: true });

    applyAlbumState(result.state);
    setNumPages(result.state.length);
    setEditingPageIndex(null);
    setAdvancedSettingsModal(null);
    setDeletePageConfirm(null);
  };

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;
    applyAlbumState(albumSwapPages(currentAlbumState(), index, targetIndex));
    setEditingPageIndex(targetIndex);
  };

  const handleMovePageToIndex = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    applyAlbumState(albumMovePageToIndex(currentAlbumState(), fromIndex, toIndex));
    setEditingPageIndex(toIndex);
  };

  const handleSwapTwoPages = (a: number, b: number) => {
    if (a === b) return;
    applyAlbumState(albumSwapPages(currentAlbumState(), a, b));
  };

  const exitReorderMode = () => {
    setReorderSelectedPage(null);
    setReorderTargetPage(null);
  };

  const handlePageLongPress = (pageIndex: number, e: React.PointerEvent) => {
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
      setReorderSelectedPage(pageIndex);
      setReorderTargetPage(null);
    }, 200);

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', cancel);
    document.addEventListener('pointercancel', cancel);
  };

  // Abre la confirmación. El borrado real vive en executeRemovePhotoFromPage.
  const handleRemovePhotoFromPage = (pageIndex: number, photoIndex: number) => {
    setDeleteSlotConfirm({
      kind: 'photo',
      pageIndex,
      photoIndex,
      url: photos[pageIndex]?.[photoIndex] || '',
    });
  };

  const executeRemovePhotoFromPage = (pageIndex: number, photoIndex: number) => {
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

    const newCropsRemove = { ...photoCrops };
    delete newCropsRemove[`${pageIndex}-${photoIndex}`];
    onPhotoCropsChange(newCropsRemove);

    const newTextsRemove = { ...textBoxSlots };
    if (newTextsRemove[pageIndex]) {
      const pageTexts = { ...newTextsRemove[pageIndex] };
      delete pageTexts[photoIndex];
      if (Object.keys(pageTexts).length === 0) delete newTextsRemove[pageIndex];
      else newTextsRemove[pageIndex] = pageTexts;
      onTextBoxSlotsChange(newTextsRemove);
    }

    setDeleteSlotConfirm(null);
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

  const handleSwapPhotosOnPage = (pageIndex: number, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    applyAlbumState(albumSwapPhotosOnPage(currentAlbumState(), pageIndex, fromIndex, toIndex));
  };

  // Moves a single photo (with its crop) to a different page, chosen via the
  // thumbnail picker opened after dropping on the "send to another page" zone.
  // Wrapped in try/catch: an uncaught exception here (e.g. stale indices if the
  // album changed between drag-start and picking a target) must never crash
  // the render tree and leave the whole editor unresponsive.
  const handleSendPhotoToPage = (pageIndex: number, photoIndex: number, targetPage: number) => {
    try {
      const result = albumMovePhotoToPage(currentAlbumState(), pageIndex, photoIndex, targetPage, albumConfig);
      if (!result.success) {
        alert(`No hay espacio disponible en la página ${targetPage + 1}.`);
        return;
      }
      applyAlbumState(result.state);
    } catch (err) {
      console.error('handleSendPhotoToPage failed:', err);
      alert('No se pudo enviar la foto a esa página. Intenta de nuevo.');
    } finally {
      setSendPhotoPicker(null);
    }
  };

  const handleDragStart = useCallback((pageIndex: number, photoIndex: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragStateRef.current = { pageIndex, fromIndex: photoIndex, toIndex: null, overSendZone: false };
    setDragVisual({ pageIndex, fromIndex: photoIndex, toIndex: null, overSendZone: false });

    const onMove = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const sendZone = el?.closest('[data-send-zone]');
      if (sendZone) {
        if (dragStateRef.current) { dragStateRef.current.toIndex = null; dragStateRef.current.overSendZone = true; }
        setDragVisual(prev => prev ? { ...prev, toIndex: null, overSendZone: true } : null);
        return;
      }
      const slot = el?.closest('[data-photo-slot]') as HTMLElement | null;
      if (slot) {
        const pIdx = parseInt(slot.dataset.pageIndex ?? '-1');
        const phIdx = parseInt(slot.dataset.photoIndex ?? '-1');
        if (pIdx === pageIndex && phIdx !== -1) {
          if (dragStateRef.current) { dragStateRef.current.toIndex = phIdx; dragStateRef.current.overSendZone = false; }
          setDragVisual(prev => prev ? { ...prev, toIndex: phIdx, overSendZone: false } : null);
        }
      } else if (dragStateRef.current?.overSendZone) {
        // Pointer left the send-zone without entering a slot — clear the flag.
        dragStateRef.current.overSendZone = false;
        setDragVisual(prev => prev ? { ...prev, overSendZone: false } : null);
      }
    };

    const onUp = () => {
      // The cleanup in `finally` must always run, even if the swap/send action
      // below throws — otherwise these document-level listeners leak forever
      // and silently swallow every future pointer interaction in the app
      // (this is what caused the freeze reported after the previous attempt).
      try {
        const state = dragStateRef.current;
        if (state?.overSendZone) {
          setSendPhotoPicker({ pageIndex: state.pageIndex, photoIndex: state.fromIndex });
        } else if (state && state.toIndex !== null && state.toIndex !== state.fromIndex) {
          handleSwapPhotosOnPage(state.pageIndex, state.fromIndex, state.toIndex);
        }
      } finally {
        dragStateRef.current = null;
        setDragVisual(null);
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, photoCrops, textBoxSlots]);

  const handleAddTextBox = (pageIndex: number, photoIndex: number) => {
    const newSlots = { ...textBoxSlots };
    if (!newSlots[pageIndex]) newSlots[pageIndex] = {};
    newSlots[pageIndex][photoIndex] = { text: '', fontSize: 24, fontFamily: 'Arial', color: '#000000', overflowMode: 'limit', textAlign: 'center' };
    onTextBoxSlotsChange(newSlots);
    setEditingTextSlot({ pageIndex, photoIndex });
  };

  const handleRemoveTextBox = (pageIndex: number, photoIndex: number) => {
    const text = textBoxSlots[pageIndex]?.[photoIndex]?.text || '';
    // Una caja recién creada y vacía no tiene nada que perder: se borra directo.
    if (!text.trim()) {
      executeRemoveTextBox(pageIndex, photoIndex);
      return;
    }
    setDeleteSlotConfirm({ kind: 'text', pageIndex, photoIndex, text });
  };

  const executeRemoveTextBox = (pageIndex: number, photoIndex: number) => {
    const newSlots = { ...textBoxSlots };
    if (newSlots[pageIndex]) {
      delete newSlots[pageIndex][photoIndex];
      if (Object.keys(newSlots[pageIndex]).length === 0) delete newSlots[pageIndex];
    }
    onTextBoxSlotsChange(newSlots);
    setDeleteSlotConfirm(null);
  };

  const updateTextBox = (pageIndex: number, photoIndex: number, updates: any) => {
    const newSlots = { ...textBoxSlots };
    if (newSlots[pageIndex] && newSlots[pageIndex][photoIndex]) {
      const merged = { ...newSlots[pageIndex][photoIndex], ...updates };
      // In 'limit' mode, text must never exceed what the current font size allows —
      // re-clamp on every change (font size bump, mode switch, etc), not just on typing.
      if ((merged.overflowMode || 'limit') === 'limit') {
        const maxChars = getMaxCharsForFontSize(merged.fontSize || 24);
        if (typeof merged.text === 'string' && merged.text.length > maxChars) {
          merged.text = merged.text.slice(0, maxChars);
        }
      }
      newSlots[pageIndex][photoIndex] = merged;
      onTextBoxSlotsChange(newSlots);
    }
  };

  // ── Unified album-state helpers ──────────────────────────────────────────────

  const albumConfig: AlbumConfig = { allowedPhotosPerPage, maxPages: 250 };

  // Espejo de las props leído por currentAlbumState(). Antes se leían las closures,
  // y un useCallback con deps incompletas (handleDragStart no incluía pageLayouts,
  // pageLayoutVariants ni fileSignatures) podía revertir la variante a un valor viejo
  // y más pequeño al soltar una foto.
  const propsRef = useRef({ photos, photoCrops, textBoxSlots, pageLayouts, pageLayoutVariants, fileSignatures });
  useEffect(() => {
    propsRef.current = { photos, photoCrops, textBoxSlots, pageLayouts, pageLayoutVariants, fileSignatures };
  });

  const currentAlbumState = (): AlbumState => {
    const p = propsRef.current;
    return fromPropsToAlbumState(
      p.photos, p.photoCrops, p.textBoxSlots, p.pageLayouts, p.pageLayoutVariants, p.fileSignatures
    );
  };

  /** Traduce los avisos de albumStateUtils a un mensaje para el banner. */
  const reportWarnings = (warnings: AlbumWarning[]) => {
    for (const w of warnings) {
      if (w.code === 'max_pages_reached') {
        setAlbumWarning(
          `No hay espacio para ${w.unplacedPhotos} foto(s): el álbum ya está en el máximo de ${albumConfig.maxPages} páginas. ` +
          `No se movió ninguna foto.`
        );
        return;
      }
      if (w.code === 'refused_photo_deletion') {
        setAlbumWarning(
          `No borramos la(s) página(s) ${w.pages.map(p => p + 1).join(', ')} porque tienen contenido.`
        );
        return;
      }
      if (w.code === 'photos_moved' && w.count > 0) {
        setAlbumWarning(`Movimos ${w.count} foto(s) a la página ${w.toPage + 1}.`);
        return;
      }
      if (w.code === 'photos_deleted' && w.count > 0) {
        setAlbumWarning(`Se eliminaron ${w.count} foto(s).`);
        return;
      }
    }
  };

  /** Aplica un AlbumOpResult: primero el estado, luego el aviso si lo hubo. */
  const applyOpResult = (result: AlbumOpResult) => {
    applyAlbumState(result.state);
    reportWarnings(result.warnings);
  };

  // Fires all 6 onChange callbacks in one React 18 auto-batched update so the
  // parent never reads a partially-updated state between callbacks.
  const applyAlbumState = useCallback((newState: AlbumState) => {
    const p = fromAlbumStateToProps(newState);
    onPhotosChange(p.photos);
    onPhotoCropsChange(p.photoCrops);
    onTextBoxSlotsChange(p.textBoxSlots);
    onPageLayoutsChange(p.pageLayouts);
    onPageLayoutVariantsChange(p.pageLayoutVariants);
    setFileSignatures(p.fileSignatures);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPhotosChange, onPhotoCropsChange, onTextBoxSlotsChange, onPageLayoutsChange, onPageLayoutVariantsChange]);

  // ── End unified helpers ──────────────────────────────────────────────────────

  // Al reducir el layout, la página origen se compacta ANTES de repartir el
  // excedente: así el `splice(newVariant)` de estas operaciones corta sobre un
  // array denso y mueve/borra las fotos reales del final, no las que quedaban
  // detrás de un hueco. Es composición pura (compactPage no muta), así que no
  // hay estado intermedio ni riesgo de leer un propsRef desactualizado cuando
  // la acción llega desde el modal en un click posterior.
  const compactedStateFor = (pageIndex: number): AlbumState =>
    albumCompactPage(currentAlbumState(), pageIndex);

  const applyRippleShift = (startIndex: number, newVariant: number) => {
    applyOpResult(albumRippleShift(compactedStateFor(startIndex), startIndex, newVariant, albumConfig, setNumPages));
  };

  const applyPullShift = (startIndex: number, newVariant: number) => {
    applyAlbumState(albumPullShift(currentAlbumState(), startIndex, newVariant, albumConfig));
  };

  const applyIncreaseVariantOnly = (pageIndex: number, newVariant: number) => {
    onPageLayoutVariantsChange({ ...pageLayoutVariants, [pageIndex]: newVariant });
  };

  // Cierra los huecos de la página y fija la nueva variante en una sola
  // actualización: el excedente cabía entero una vez reacomodado.
  const applyCompactAndSetVariant = (pageIndex: number, newVariant: number) => {
    const compacted = compactedStateFor(pageIndex);
    applyAlbumState(compacted.map((p, i) => (i === pageIndex ? { ...p, variant: newVariant } : p)));
  };

  // Treated as a bounded ripple: cascade stops naturally when no more overflow.
  const applyIncreaseNextPageVariant = (pageIndex: number, newVariant: number) => {
    applyOpResult(albumRippleShift(compactedStateFor(pageIndex), pageIndex, newVariant, albumConfig, setNumPages));
  };

  const applyDeleteOverflow = (pageIndex: number, newVariant: number) => {
    applyOpResult(albumDeleteOverflow(compactedStateFor(pageIndex), pageIndex, newVariant));
  };

  const applyMoveToSpecificPage = (pageIndex: number, newVariant: number, targetPage: number) => {
    applyOpResult(albumMoveOverflowToPage(compactedStateFor(pageIndex), pageIndex, newVariant, targetPage, albumConfig, setNumPages));
  };

  // ── Cambio de tamaño del álbum (B5) ──────────────────────────────────────────
  // Al pasar de Cuadrado (hasta 9 fotos/página) a Horizontal o Vertical (hasta 6),
  // las fotos sobrantes de cada página quedaban fuera del render sin aviso ninguno.
  // Ahora se detecta y se ofrece redistribuirlas.
  const prevMaxAllowedRef = useRef(allowedPhotosPerPage[allowedPhotosPerPage.length - 1]);
  useEffect(() => {
    const max = allowedPhotosPerPage[allowedPhotosPerPage.length - 1];
    if (max >= prevMaxAllowedRef.current) {
      prevMaxAllowedRef.current = max;
      return;
    }
    const impact = analyzeConfigChange(currentAlbumState(), albumConfig);
    if (impact.photosAtRisk > 0) {
      setSizeMigrationModal(impact);
    } else {
      prevMaxAllowedRef.current = max;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedPhotosPerPage.join(',')]);

  // ── Variantes guardadas que el formato ya no admite ──────────────────────────
  // Vertical no tiene layout de 4 fotos, pero álbumes creados antes (o pasados
  // desde Horizontal) pueden traer páginas con `variant: 4` guardado. El editor
  // ya las pinta con la variante siguiente vía getRenderSlotCount; si no se
  // guarda ese ajuste, el PDF de impresión sigue leyendo el 4 y sale una página
  // distinta a la que se aprobó. Aquí se normaliza el estado guardado.
  // Las variantes por encima del máximo del formato no se tocan aquí: de esas se
  // ocupa el modal de migración de arriba, que además reparte las fotos.
  useEffect(() => {
    const max = allowedPhotosPerPage[allowedPhotosPerPage.length - 1];
    const normalized: Record<number, number> = {};
    let changed = false;
    for (const [key, variant] of Object.entries(pageLayoutVariants)) {
      if (variant > max || allowedPhotosPerPage.includes(variant)) {
        normalized[Number(key)] = variant;
        continue;
      }
      normalized[Number(key)] = getNextAllowed(variant);
      changed = true;
    }
    if (changed) onPageLayoutVariantsChange(normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedPhotosPerPage.join(','), pageLayoutVariants]);

  const applySizeMigration = () => {
    const result = migrateAlbumToConfig(currentAlbumState(), albumConfig, setNumPages);
    if (result.warnings.some(w => w.code === 'max_pages_reached')) {
      reportWarnings(result.warnings);
      return;
    }
    applyAlbumState(result.state);
    prevMaxAllowedRef.current = allowedPhotosPerPage[allowedPhotosPerPage.length - 1];
    setSizeMigrationModal(null);
  };

  const handleVariantSelect = (opt: number) => {
    if (advancedSettingsModal === null) return;
    const pageIndex = advancedSettingsModal;
    const currentLen = photos[pageIndex].length;
    // Los huecos intermedios (un `''` de una foto borrada) no son excedente: al
    // reducir se cierran y la página se reacomoda. Por eso lo que manda aquí es
    // el número de slots OCUPADOS, no la longitud cruda del array.
    const occupied = occupiedSlotCount(currentAlbumState()[pageIndex]);

    if (opt > currentLen) {
        let totalAhead = 0;
        for(let i = pageIndex + 1; i < photos.length; i++) totalAhead += photos[i].length;

        if (totalAhead > 0) {
            setLayoutChangeModal({ type: 'increase', pageIndex, newVariant: opt, overflowCount: 0 });
        } else {
            applyIncreaseVariantOnly(pageIndex, opt);
        }
    } else if (opt >= occupied) {
        // Cabe todo una vez cerrados los huecos: no hay nada que repartir.
        applyCompactAndSetVariant(pageIndex, opt);
    } else {
        const maxForNext = allowedPhotosPerPage[allowedPhotosPerPage.length - 1];
        const nextPageLen = photos[pageIndex + 1]?.length || 0;
        const overflowCount = occupied - opt;

        const isNextPageFull = (nextPageLen + overflowCount > maxForNext);

        if (isNextPageFull && pageIndex < photos.length - 1) {
            applyRippleShift(pageIndex, opt);
        } else {
            setSelectedTargetPage(pageIndex + 1 < photos.length ? pageIndex + 1 : 0);
            setLayoutChangeModal({ type: 'decrease', pageIndex, newVariant: opt, overflowCount });
        }
    }
  };

  // ==========================================================================
  // LÓGICA DE DETECCIÓN Y ELIMINACIÓN DE PÁGINAS VACÍAS
  // ==========================================================================
  const handleComplete = () => {
    if (isSaving) return;
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

  /**
   * Con un número impar de páginas vacías hay que sacrificar una página más para
   * que el álbum mantenga un número par. `findCompanionPage` elige cuál, dando
   * prioridad absoluta a las páginas SIN contenido.
   *
   * Antes, la rama `delete-companion` empujaba directamente la página compañera
   * —que por construcción tiene fotos— y, si no encontraba ningún bloque suelto,
   * caía en `indicesToDelete.push(lastEmpty - 1)`: una página elegida a ciegas,
   * sin comprobar si estaba vacía y sin avisar. Ocurría en el último clic antes
   * del checkout.
   */
  const pageHasContent = (idx: number) => {
    const p = photos[idx] || [];
    return p.some(ph => ph && ph.trim() !== '') ||
           (textBoxSlots[idx] && Object.keys(textBoxSlots[idx]).length > 0);
  };

  const findCompanionPage = (emptyIndices: number[]): number | null => {
    const alreadySelected = new Set(emptyIndices);
    const blocks = new Map<number, number[]>();
    emptyIndices.forEach(idx => {
      const block = Math.floor(idx / 2);
      if (!blocks.has(block)) blocks.set(block, []);
      blocks.get(block)!.push(idx);
    });

    // 1º) Compañeras que también están vacías (borrado indoloro).
    for (const pages of blocks.values()) {
      if (pages.length !== 1) continue;
      const companion = pages[0] % 2 === 0 ? pages[0] + 1 : pages[0] - 1;
      if (companion >= 0 && companion < photos.length &&
          !alreadySelected.has(companion) && !pageHasContent(companion)) {
        return companion;
      }
    }
    // 2º) Compañera con contenido: válida, pero el botón lo dice explícitamente.
    for (const pages of blocks.values()) {
      if (pages.length !== 1) continue;
      const companion = pages[0] % 2 === 0 ? pages[0] + 1 : pages[0] - 1;
      if (companion >= 0 && companion < photos.length && !alreadySelected.has(companion)) {
        return companion;
      }
    }
    // Sin candidato: la opción se deshabilita en la UI (nada de elegir a ciegas).
    return null;
  };

  const executeDeleteEmptyPages = (strategy: 'even' | 'delete-companion' | 'keep-one-blank') => {
    if (!emptyPagesModalData) return;
    let indicesToDelete = [...emptyPagesModalData.indices];
    let allowPhotoDeletion = false;

    if (strategy === 'delete-companion') {
      const companion = findCompanionPage(indicesToDelete);
      if (companion === null) {
        setAlbumWarning('No encontramos una página compañera que se pueda eliminar.');
        return;
      }
      indicesToDelete.push(companion);
      // El usuario aceptó explícitamente en el botón que esa página tiene contenido.
      allowPhotoDeletion = pageHasContent(companion);
    } else if (strategy === 'keep-one-blank') {
      indicesToDelete.pop();
    }

    if (photos.length - indicesToDelete.length < 40) {
      setAlbumWarning('No se puede completar la acción porque el álbum quedaría con menos de 40 páginas.');
      return;
    }

    const result = albumDeletePages(currentAlbumState(), indicesToDelete, { allowPhotoDeletion });
    if (result.warnings.some(w => w.code === 'refused_photo_deletion')) {
      reportWarnings(result.warnings);
      return;
    }

    applyAlbumState(result.state);
    setNumPages(result.state.length);
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

  const renderLowResWarningModal = () => {
    if (!selectedLowResWarning) return null;
    const { url, pageIndex, photoIndex, width, height } = selectedLowResWarning;
    return (
      <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in zoom-in-95 duration-200 text-center">
          <div className="w-16 h-16 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Baja Resolución Detectada</h3>
          <p className="text-sm text-gray-500 mb-6">
            Esta imagen mide <strong>{width}x{height}px</strong> (menor a 1080p). Al imprimirla podría verse pixelada o borrosa.
          </p>
          <div className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden mb-6 flex items-center justify-center">
            <img src={url} className="w-full h-full object-contain" alt="Low res preview" />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                // Directo al execute*: el usuario ya está confirmando aquí, un
                // segundo modal encima sobraría.
                executeRemovePhotoFromPage(pageIndex, photoIndex);
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

  const renderAdvancedSettingsModal = () => {
    if (advancedSettingsModal === null) return null;
    const pageIndex = advancedSettingsModal;
    if (!photos || !photos[pageIndex]) return null;

    const pagePhotos = photos[pageIndex];
    const currentVariant = getRenderSlotCount(pageIndex, pagePhotos);
    const currentLayout = pageLayouts[pageIndex] || 'grid';
    const currentSlotRects = getPageSlots(currentVariant, currentLayout, sizeStr);

    const slots = Array.from({ length: currentVariant }, (_, i) => pagePhotos[i] || null);

    return (
      <>
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
              
              <div className="bg-white rounded-none shadow-md border-2 border-black ring-4 ring-black/5 overflow-hidden w-full max-w-sm transition-all flex flex-col items-center justify-center" style={{ aspectRatio: isHorizontal ? '4/3' : isVertical ? '3/4' : '1/1' }}>
                <div className="relative w-full h-full">
                  {slots.map((photo, photoIndex) => {
                    const textBox = textBoxSlots[pageIndex]?.[photoIndex];
                    const crop = photoCrops[`${pageIndex}-${photoIndex}`] || { x: 50, y: 50, zoom: 1 };
                    const rect = currentSlotRects[photoIndex];
                    if (!rect) return null;

                    return (
                      <div
                        key={photoIndex}
                        className="absolute"
                        style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` }}
                      >
                      <AlbumEditorPhotoSlot
                        photo={photo} textBox={textBox} crop={crop}
                        pageIndex={pageIndex} photoIndex={photoIndex}
                        photoCount={currentVariant}
                        editingPageIndex={pageIndex}
                        isDragging={dragVisual?.pageIndex === pageIndex && dragVisual?.fromIndex === photoIndex}
                        isDragTarget={dragVisual?.pageIndex === pageIndex && dragVisual?.toIndex === photoIndex && dragVisual?.fromIndex !== photoIndex}
                        onDragStart={handleDragStart}
                        handleRemovePhotoFromPage={handleRemovePhotoFromPage}
                        setEditingTextSlot={setEditingTextSlot}
                        handleRemoveTextBox={handleRemoveTextBox}
                        handleAddPhotoToPage={handleSpecificFileSelection}
                        handleAddTextBox={handleAddTextBox}
                        onOpenCropModal={(pIdx, idx, aspect) => setCropModalData({ pageIndex: pIdx, photoIndex: idx, aspectRatio: aspect })}
                        onPhotoError={handlePhotoError}
                        onPhotoRetry={handlePhotoRetry}
                        t={t}
                      />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Zona de suelta: arrastra una foto aquí para enviarla a otra página */}
              <div
                data-send-zone="true"
                className={`mt-4 w-full max-w-sm flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed text-xs sm:text-sm font-bold uppercase tracking-wide transition-all ${
                  dragVisual?.pageIndex === pageIndex && dragVisual?.overSendZone
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                <ImageIcon className="w-4 h-4 shrink-0 pointer-events-none" />
                <span className="pointer-events-none">Arrastra una foto aquí para enviarla a otra página</span>
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

                  {/* Solo donde el pliego define de verdad dos disposiciones: las
                      páginas de 2 fotos en cuadrado y en horizontal. No hay ningún
                      layout de 3 apiladas, ni de 2 lado a lado en vertical. */}
                  {hasOrientationChoice(currentVariant, sizeStr) && (
                    <div className="pt-2 border-t border-gray-50">
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">Orientación del Layout</label>
                      <div className="flex gap-1.5 sm:gap-2">
                        <button onClick={() => onPageLayoutsChange({ ...pageLayouts, [pageIndex]: 'row' })} className={`flex-1 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${currentLayout !== 'column' ? 'border-black bg-black text-white shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-black'}`}>Vertical</button>
                        <button onClick={() => onPageLayoutsChange({ ...pageLayouts, [pageIndex]: 'column' })} className={`flex-1 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${currentLayout === 'column' ? 'border-black bg-black text-white shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-black'}`}>Horizontal</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end w-full">
                <button onClick={() => { setAdvancedSettingsModal(null); setEditingPageIndex(null); }} className="px-6 py-2.5 sm:py-3 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors w-full shadow-md text-sm">Guardar y Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {sendPhotoPicker && sendPhotoPicker.pageIndex === pageIndex && (() => {
        // Agrupa las páginas exactamente como el grid principal: la página 1 va
        // sola, y de ahí en adelante van de a pares (2-3, 4-5, 6-7...), para que
        // el usuario reconozca de inmediato la misma disposición que ve al editar.
        const groups: number[][] = [];
        if (safePhotos.length > 0) groups.push([0]);
        for (let i = 1; i < safePhotos.length; i += 2) {
          groups.push(i + 1 < safePhotos.length ? [i, i + 1] : [i]);
        }
        sendPhotoPickerItemRefs.current = [];

        const renderPageOption = (idx: number) => {
          const pgPhotos = safePhotos[idx] || [];
          const isSource = idx === sendPhotoPicker.pageIndex;
          const variant = pageLayoutVariants[idx] || getNextAllowed(pgPhotos.length);
          const layout = pageLayouts[idx] || 'grid';
          const slots = Array.from({ length: variant }, (_, i) => !!(pgPhotos[i] && pgPhotos[i].trim() !== ''));
          const slotRects = getPageSlots(variant, layout, sizeStr);

          return (
            <button
              key={idx}
              disabled={isSource}
              onClick={() => handleSendPhotoToPage(sendPhotoPicker.pageIndex, sendPhotoPicker.photoIndex, idx)}
              className={`relative flex flex-col items-center gap-1 group ${isSource ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <div
                className={`w-full rounded-lg border-2 overflow-hidden bg-gray-50 transition-all ${isSource ? 'border-gray-200' : 'border-gray-200 group-hover:border-black'}`}
                style={{ aspectRatio: isHorizontal ? '4/3' : isVertical ? '3/4' : '1/1' }}
              >
                <div className="relative w-full h-full">
                  {slots.map((hasPhoto, slotIdx) => {
                    const rect = slotRects[slotIdx];
                    if (!rect) return null;
                    return (
                      <div
                        key={slotIdx}
                        className={`absolute rounded-sm ${hasPhoto ? 'bg-gray-300' : 'border border-dashed border-gray-200'}`}
                        style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` }}
                      />
                    );
                  })}
                </div>
              </div>
              <span className={`text-[10px] font-bold ${isSource ? 'text-gray-300' : 'text-gray-500 group-hover:text-black'}`}>Pág. {idx + 1}</span>
            </button>
          );
        };

        return (
          <div className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <h3 className="text-lg sm:text-xl font-bold">Enviar foto a la página...</h3>
                <button onClick={() => setSendPhotoPicker(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5"/>
                </button>
              </div>
              <div ref={sendPhotoPickerScrollRef} className="overflow-y-auto flex flex-col gap-3">
                {groups.map((group, groupIdx) => (
                  <div key={groupIdx} className={`flex gap-3 ${group.length === 1 ? '' : 'p-2 rounded-xl bg-gray-50 border border-gray-100'}`}>
                    {group.map(idx => (
                      <div key={idx} ref={(el) => { sendPhotoPickerItemRefs.current[idx] = el; }} className="w-20 sm:w-24 shrink-0">
                        {renderPageOption(idx)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
      </>
    );
  };

  if (step === 'upload') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 pt-4 pb-12">
        {renderDuplicateModal()}
        {renderLowResWarningModal()}

        {/* MODAL AVISO ANTES DE ABRIR CARRETE */}
        {showPickerWarning && (
          <div className="fixed inset-0 z-[250] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4">
              <h3 className="text-xl font-bold text-center">Antes de subir tus fotos</h3>

              {/* Video explicativo iOS */}
              <div className="rounded-xl overflow-hidden border border-amber-300">
                <video
                  src={iosAnimVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="w-full block"
                />
              </div>

              <p className="text-gray-600 text-sm text-center">
                El carrete se cerrará solo cuando iOS termine y la app continuará automáticamente.
              </p>

              <label className="flex items-start gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  className="mt-0.5 w-5 h-5 accent-black cursor-pointer shrink-0"
                  checked={pickerWarningAccepted}
                  onChange={e => setPickerWarningAccepted(e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-800">
                  Entendido — esperaré sin cerrar la app hasta que el carrete se cierre solo.
                </span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowPickerWarning(false); setPickerWarningAccepted(false); }}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-medium"
                >
                  Cancelar
                </button>
                <button
                  disabled={!pickerWarningAccepted}
                  onClick={() => {
                    setShowPickerWarning(false);
                    setPickerWarningAccepted(false);
                    // Activar pantalla de espera ANTES de abrir el picker.
                    // Así cuando iOS termina su procesamiento interno y el picker se cierra,
                    // el usuario ya ve el spinner animado (no una pantalla congelada).
                    setIsTransferringFiles(true);

                    // Detectar si el usuario cancela el picker sin seleccionar fotos.
                    // Cuando el picker se cierra (sea por selección o por cancelación),
                    // la ventana recupera el foco. Si 1s después isTransferringFiles sigue
                    // activo, ningún archivo fue entregado → resetear la pantalla de carga.
                    const handleFocus = () => {
                      pickerFocusTimerRef.current = setTimeout(() => {
                        setIsTransferringFiles(false);
                        pickerFocusHandlerRef.current = null;
                        pickerFocusTimerRef.current = null;
                      }, 1000);
                    };
                    pickerFocusHandlerRef.current = handleFocus;
                    window.addEventListener('focus', handleFocus, { once: true });

                    fileInputRef.current?.click();
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
                    pickerWarningAccepted ? 'bg-black hover:bg-gray-800' : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Seleccionar fotos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PANTALLA DE ESPERA MIENTRAS iOS TRANSFIERE LAS FOTOS */}
        {/* Se muestra desde que el usuario pulsa confirmar hasta que JS recibe los archivos */}
        {isTransferringFiles && (
          <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center gap-6 p-8">
            <Loader2 className="w-16 h-16 text-black animate-spin" />
            <div className="text-center">
              <p className="text-2xl font-bold">Cargando fotos del carrete...</p>
              <p className="text-gray-500 mt-2">Esto puede tardar unos segundos</p>
            </div>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              Por favor espera sin cerrar la app
            </p>
            <button
              onClick={() => {
                cleanupPickerFocusListener();
                setIsTransferringFiles(false);
              }}
              className="mt-2 px-6 py-2 border border-gray-300 rounded-xl text-gray-500 text-sm"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* PANTALLA DE PROGRESO AL PROCESAR LAS FOTOS EN LOTES */}
        {conversionProgress && (
          <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center gap-6 p-8">
            <Loader2 className="w-16 h-16 text-black animate-spin" />
            <div className="text-center">
              <p className="text-2xl font-bold">Preparando tus fotos</p>
              <p className="text-gray-500 mt-2">
                Convirtiendo foto {conversionProgress.done} de {conversionProgress.total}
              </p>
            </div>
            <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
              <div
                className="bg-black h-2 rounded-full transition-all duration-300"
                style={{ width: `${(conversionProgress.done / conversionProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              Por favor espera sin cerrar la app
            </p>
          </div>
        )}

        {/* ── PANEL DE DEBUG (?debug=1) ── */}
        {debugMode && debugFileReport && (
          <div className="fixed inset-x-0 bottom-0 z-[300] bg-gray-900 text-white text-xs font-mono p-4 max-h-[60vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-yellow-400 font-bold text-sm">🔍 DEBUG iOS — Tipos entregados por el carrete</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { localStorage.removeItem('debugMode'); setDebugMode(false); setDebugFileReport(null); }}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  Desactivar
                </button>
                <button onClick={() => setDebugFileReport(null)} className="text-gray-400 hover:text-white text-lg leading-none px-1">✕</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className={`p-2 rounded ${debugFileReport.heicCount > 0 ? 'bg-green-800' : 'bg-red-800'}`}>
                <div className="text-lg font-bold">{debugFileReport.heicCount}</div>
                <div className="text-gray-300">HEIC/HEIF entregados</div>
                <div className="text-xs mt-0.5">{debugFileReport.heicCount > 0 ? '✅ iOS entregó HEIC directo' : '❌ iOS convirtió a JPEG'}</div>
              </div>
              <div className="p-2 rounded bg-gray-700">
                <div className="text-lg font-bold">{debugFileReport.jpegCount}</div>
                <div className="text-gray-300">JPEG entregados</div>
                <div className="text-xs mt-0.5">{debugFileReport.convertedCount} convertidos por la app</div>
              </div>
            </div>
            <div className={`p-2 rounded mb-3 text-sm font-bold ${debugFileReport.heicCount > 0 ? 'bg-green-700' : 'bg-red-700'}`}>
              {debugFileReport.heicCount > 0
                ? `✅ Fix v4 FUNCIONÓ — iOS entregó ${debugFileReport.heicCount} de ${debugFileReport.total} archivos en HEIC`
                : `❌ Fix v4 sin efecto — iOS convirtió ${debugFileReport.total} archivos a JPEG antes de entregar`}
            </div>
            <div className="space-y-0.5">
              <div className="flex gap-2 py-0.5 text-gray-500 border-b border-gray-600 mb-1">
                <span className="w-6">#</span>
                <span className="flex-1">Nombre</span>
                <span className="w-32 text-right">MIME type</span>
                <span className="w-16 text-right">Tamaño</span>
                <span className="w-8 text-center">Conv.</span>
              </div>
              {debugFileReport.files.slice(0, 30).map((f, i) => (
                <div key={i} className={`flex gap-2 py-0.5 border-b border-gray-800 ${f.wasHeic ? 'text-green-400' : 'text-gray-300'}`}>
                  <span className="w-6 text-gray-500">{i + 1}</span>
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="w-32 text-right">{f.originalType}</span>
                  <span className="w-16 text-right text-gray-500">{(f.size / 1024).toFixed(0)} KB</span>
                  <span className="w-8 text-center">{f.wasConverted ? '🔄' : '—'}</span>
                </div>
              ))}
              {debugFileReport.files.length > 30 && (
                <div className="text-gray-500 pt-1 text-center">… y {debugFileReport.files.length - 30} archivos más — ver consola del navegador</div>
              )}
            </div>
          </div>
        )}

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
              <button onClick={() => setShowPickerWarning(true)} className="w-full aspect-[3/4] px-6 border-2 border-dashed border-black rounded-lg hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-3 group animate-pulse-border">
                <img src={jiffy2Img} alt="Jiffy Upload" className="w-28 h-28 object-contain opacity-90 group-hover:opacity-100 transition-opacity" />
                <div className="text-center flex flex-col items-center gap-3 w-full">
                  <p className="text-sm text-gray-500">Según la cantidad de fotos seleccionadas, el tiempo de carga puede variar</p>
                  <span className="inline-flex items-center justify-center gap-2 bg-black text-white text-base font-semibold px-6 py-3 rounded-full shadow-lg group-hover:bg-gray-800 transition-colors w-full max-w-xs">
                    <Upload className="w-5 h-5 shrink-0" />
                    Toca aquí para seleccionar fotos
                  </span>
                </div>
              </button>
            </>
          )}
          <input ref={fileInputRef} type="file" multiple accept=".heic,.heif,.jpg,.jpeg,.png,.webp,.gif" onChange={handleFileSelection} className="hidden" disabled={isValidating || !!conversionProgress} />
          <input ref={retryInputRef} type="file" multiple accept="image/*" onChange={handleRetryFileSelection} className="hidden" />

          <div className="mt-8 flex flex-col gap-4">
            {uploadedPhotos.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium">{uploadedPhotos.length} {t('organizer.photosSelected')}</span>
                <button onClick={() => { setUploadedPhotos([]); setPendingFilesData([]); }} className="text-red-500 hover:text-red-700 font-medium">{t('organizer.clearAll')}</button>
              </div>
            )}
            <button disabled={uploadedPhotos.length < 40 || isValidating || !!conversionProgress} onClick={() => setStep('pages')} className={`w-full py-4 rounded-lg text-lg font-medium transition-all shadow-md ${uploadedPhotos.length >= 40 && !isValidating && !conversionProgress ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {uploadedPhotos.length < 40 ? `${t('organizer.minPhotosWarning', { count: uploadedPhotos.length })}` : t('organizer.continueToPages')}
            </button>
          </div>
        </div>

        {/* Zona de activación de debug — 5 taps activan/desactivan el modo debug */}
        <div
          className="w-full h-8 mt-1 flex items-center justify-center cursor-default select-none"
          onClick={handleDebugTap}
        >
          {debugTapCount >= 2 && debugTapCount < 5 && (
            <span className="text-xs text-gray-300">{5 - debugTapCount} taps más para debug</span>
          )}
          {debugMode && (
            <span className="text-xs text-yellow-500 font-mono">🔍 debug activo</span>
          )}
        </div>
      </div>
    );
  }

  if (step === 'pages') {
    const maxP = getMaxPages(uploadedPhotos.length);
    // El número de páginas siempre es par y está entre 40 y maxP.
    const clampPages = (v: number) => {
      let val = Math.min(Math.max(Number.isFinite(v) ? v : 40, 40), maxP);
      if (val % 2 !== 0) val = Math.min(val + 1, maxP);
      return val;
    };
    const currentPages = typeof numPages === 'number' ? numPages : 40;
    // Tope de la barra: lo que dan de sí las fotos subidas. Para pasar de ahí
    // hay que sumar páginas en blanco a propósito (control de más abajo).
    const maxPhotoP = getMaxPhotoPages(uploadedPhotos.length);
    // Las páginas en blanco no pueden dejar la barra por debajo del mínimo, y
    // tanto ellas como la barra son siempre pares (el total puede ser impar
    // mientras se teclea en el campo; el onBlur lo redondea).
    const toEven = (v: number) => v - (v % 2);
    const safeBlank = toEven(Math.min(blankPages, Math.max(0, currentPages - 40)));
    const sliderPages = toEven(Math.min(Math.max(currentPages - safeBlank, 40), maxPhotoP));
    const emptyPages = Math.max(0, currentPages - uploadedPhotos.length);

    // Añade o quita 2 páginas: primero se mueve la parte que cubren las fotos y,
    // cuando esa parte llega a su tope, se tocan las páginas en blanco.
    const stepPages = (delta: 2 | -2) => {
      const next = currentPages + delta;
      if (next < 40 || next > maxP) return;
      const canUsePhotoPages = delta > 0 ? sliderPages + delta <= maxPhotoP : sliderPages + delta >= 40;
      if (!canUsePhotoPages) setBlankPages(safeBlank + delta);
      else if (safeBlank !== blankPages) setBlankPages(safeBlank);
      setNumPages(next);
    };

    const stepBlankPages = (delta: 2 | -2) => {
      const nextBlank = safeBlank + delta;
      const next = currentPages + delta;
      if (nextBlank < 0 || next > maxP || next < 40) return;
      setBlankPages(nextBlank);
      setNumPages(next);
    };

    return (
      <div className="w-full max-w-4xl mx-auto px-4 pt-4 pb-12">
        {renderDuplicateModal()}
        {renderLowResWarningModal()}
        
        {!isSortingWithAI && (
          <div className="text-center mb-8"><h2 className="text-3xl mb-2">{t('organizer.howManyPages')}</h2><p className="text-gray-600">{t('organizer.distributeDesc')}</p></div>
        )}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-12 space-y-8">
          {isSortingWithAI ? (
            <JiffyLoader t={t} photoCount={uploadedPhotos.length} />
          ) : (
            <>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-xl font-medium">{t('organizer.numPages')}</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Quitar 2 páginas"
                      disabled={currentPages <= 40}
                      onClick={() => stepPages(-2)}
                      className="w-11 h-11 shrink-0 rounded-full border-2 border-gray-300 text-2xl font-bold leading-none flex items-center justify-center hover:border-black transition-colors disabled:opacity-30 disabled:hover:border-gray-300 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
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
                        // Lo que exceda del máximo que dan las fotos pasa a
                        // contar como páginas en blanco pedidas a propósito.
                        const val = clampPages(currentPages);
                        setNumPages(val);
                        setBlankPages(Math.min(Math.max(safeBlank, val - maxPhotoP), Math.max(0, val - 40)));
                      }}
                      className="w-24 text-2xl font-bold border-2 border-gray-300 rounded px-2 focus:border-black outline-none text-center"
                    />
                    <button
                      type="button"
                      aria-label="Añadir 2 páginas"
                      disabled={currentPages >= maxP}
                      onClick={() => stepPages(2)}
                      className="w-11 h-11 shrink-0 rounded-full border-2 border-gray-300 text-2xl font-bold leading-none flex items-center justify-center hover:border-black transition-colors disabled:opacity-30 disabled:hover:border-gray-300 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
                {maxPhotoP > 40 ? (
                  <>
                    <div className="flex justify-between text-xs text-gray-400 font-medium mb-1 px-0.5">
                      <span>Mín. 40</span>
                      <span>Máx. {maxPhotoP}</span>
                    </div>
                    <PageRangeSlider
                      min={40}
                      max={maxPhotoP}
                      step={2}
                      value={sliderPages}
                      onChange={(value) => setNumPages(value + safeBlank)}
                    />
                  </>
                ) : (
                  <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                    <svg className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Con <strong>40 fotos</strong> el mínimo es 1 foto por página, así que tus fotos dan para <strong>40 páginas</strong>. Si quieres más, añádelas en blanco aquí abajo.</span>
                  </div>
                )}

                {/* Páginas en blanco: la única forma de pasar del máximo que dan las fotos */}
                <div className="mt-4 flex items-center justify-between gap-4 border-2 border-gray-200 rounded-lg px-4 py-3">
                  <div>
                    <p className="font-medium">Páginas en blanco adicionales</p>
                    <p className="text-xs text-gray-500">
                      Súmalas si quieres más de las {maxPhotoP} páginas que dan tus {uploadedPhotos.length} fotos (hasta {maxP} en total).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      aria-label="Quitar 2 páginas en blanco"
                      disabled={safeBlank <= 0}
                      onClick={() => stepBlankPages(-2)}
                      className="w-11 h-11 shrink-0 rounded-full border-2 border-gray-300 text-2xl font-bold leading-none flex items-center justify-center hover:border-black transition-colors disabled:opacity-30 disabled:hover:border-gray-300 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-xl font-bold" aria-live="polite">{safeBlank}</span>
                    <button
                      type="button"
                      aria-label="Añadir 2 páginas en blanco"
                      disabled={currentPages >= maxP}
                      onClick={() => stepBlankPages(2)}
                      className="w-11 h-11 shrink-0 rounded-full border-2 border-gray-300 text-2xl font-bold leading-none flex items-center justify-center hover:border-black transition-colors disabled:opacity-30 disabled:hover:border-gray-300 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {emptyPages > 0 && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                      <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-700">
                        Has elegido {currentPages} páginas y tienes {uploadedPhotos.length} fotos:{' '}
                        <strong>{emptyPages} página(s) quedarán vacías</strong>. Podrás rellenarlas o eliminarlas en el editor.
                      </p>
                    </div>
                  )}
                  <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-purple-700">
                      Tu álbum incluye 40 páginas base.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 bg-fuchsia-50 border border-fuchsia-200 rounded-lg px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-fuchsia-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-fuchsia-700">
                      Cada página adicional cuesta ${extraPagePrice.toLocaleString('es-CO')} COP.
                    </p>
                  </div>
                </div>
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
  // La compañera se resuelve aquí para poder nombrarla en el botón. Si no hay
  // candidata, la opción no se ofrece (antes se elegía una página al azar).
  const companionCandidate = emptyPagesModalData && emptyPagesModalData.isOdd
    ? findCompanionPage(emptyPagesModalData.indices)
    : null;
  const companionPhotoCount = companionCandidate !== null
    ? (photos[companionCandidate] || []).filter(p => p && p.trim() !== '').length
    : 0;
  const canDeleteCompanion = emptyPagesModalData && emptyPagesModalData.isOdd
    && companionCandidate !== null
    && (emptyPagesModalData.totalCurrent - (emptyPagesModalData.indices.length + 1) >= 40);

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
      {renderLowResWarningModal()}
      {renderAdvancedSettingsModal()}

      {/* AVISOS DE OPERACIONES SOBRE EL ÁLBUM (antes eran alert() bloqueantes) */}
      {albumWarning && (
        <div className="fixed bottom-20 left-0 right-0 z-[125] flex justify-center px-4">
          <div className="bg-white border border-amber-300 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 max-w-md w-full">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-sm text-gray-700 flex-1">{albumWarning}</p>
            <button
              onClick={() => setAlbumWarning(null)}
              className="text-xs font-bold text-gray-500 hover:text-black shrink-0"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ARCHIVOS QUE NO SE PUDIERON PROCESAR (antes se descartaban en silencio) */}
      {skippedFiles.length > 0 && (
        <div className="fixed bottom-36 left-0 right-0 z-[125] flex justify-center px-4">
          <div className="bg-white border border-red-300 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 max-w-md w-full">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-sm text-gray-700 flex-1">
              No pudimos procesar {skippedFiles.length} archivo(s): {skippedFiles.slice(0, 3).join(', ')}
              {skippedFiles.length > 3 ? '…' : ''}
            </p>
            <button
              onClick={() => setSkippedFiles([])}
              className="text-xs font-bold text-gray-500 hover:text-black shrink-0"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* CAMBIO DE TAMAÑO DEL ÁLBUM: fotos que ya no cabrían por página */}
      {sizeMigrationModal && (
        <div className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">El formato cambió</h3>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              En <strong>{sizeStr}</strong> caben como máximo{' '}
              <strong>{allowedPhotosPerPage[allowedPhotosPerPage.length - 1]} fotos por página</strong>.
            </p>
            <p className="text-gray-600 text-sm mb-6">
              Tienes <strong>{sizeMigrationModal.photosAtRisk} foto(s)</strong> en{' '}
              {sizeMigrationModal.pagesAffected.length} página(s) que ya no caben. No se perderá ninguna:
              las moveremos a las páginas siguientes.
            </p>
            <div className="space-y-3">
              <button
                onClick={applySizeMigration}
                className="w-full px-4 py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-800 transition-all text-sm"
              >
                Redistribuir automáticamente
                {sizeMigrationModal.estimatedNewPages > 0
                  ? ` (+${sizeMigrationModal.estimatedNewPages} páginas)`
                  : ''}
              </button>
              <p className="text-[11px] text-gray-400 text-center leading-tight">
                Si prefieres conservar el diseño actual, vuelve atrás y elige de nuevo un tamaño cuadrado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BANNER: FOTOS QUE NO SE CARGARON CORRECTAMENTE */}
      {showBrokenBanner && brokenPhotoUrls.size > 0 && step === 'editor' && (
        <div className="fixed bottom-20 left-0 right-0 z-[120] flex justify-center px-4 pointer-events-none">
          <div className="bg-white border border-orange-300 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 max-w-sm w-full pointer-events-auto">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {brokenPhotoUrls.size === 1 ? '1 foto no se cargó' : `${brokenPhotoUrls.size} fotos no se cargaron`}
              </p>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">Los slots con ⚠️ necesitan reemplazarse</p>
            </div>
            <button
              onClick={() => {
                retryTargetRef.current = null;
                retryInputRef.current?.click();
              }}
              className="shrink-0 bg-orange-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:bg-orange-600"
            >
              Reintentar
            </button>
            <button onClick={() => setShowBrokenBanner(false)} className="shrink-0 text-gray-400 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
                onClick={() => { setEmptyPagesModalData(null); if(onComplete && !isSaving) onComplete(); }}
                disabled={isSaving}
                className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-black font-medium transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                          Eliminar {emptyPagesModalData.indices.length + 1}, incluida la página {companionCandidate! + 1}
                          {companionPhotoCount > 0
                            ? ` (¡tiene ${companionPhotoCount} foto${companionPhotoCount === 1 ? '' : 's'}!)`
                            : ' (está vacía)'}
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

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE PÁGINA */}
      {deletePageConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Eliminar página {deletePageConfirm.pageIndex + 1}</h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Página {deletePageConfirm.pageIndex + 1}</p>
                <p className="text-sm text-red-700">
                  {deletePageConfirm.photoCount > 0
                    ? <>Contiene <span className="font-bold">{deletePageConfirm.photoCount} foto{deletePageConfirm.photoCount !== 1 ? 's' : ''}</span> que se perderán permanentemente.</>
                    : 'Página vacía — sin fotos.'}
                </p>
              </div>

              {deletePageConfirm.companionIndex !== null && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-1">Página {deletePageConfirm.companionIndex + 1} (compañera)</p>
                  <p className="text-sm text-red-700">
                    Los álbumes requieren páginas en pares, por lo que esta página también será eliminada.{' '}
                    {deletePageConfirm.companionPhotoCount > 0
                      ? <><span className="font-bold">{deletePageConfirm.companionPhotoCount} foto{deletePageConfirm.companionPhotoCount !== 1 ? 's' : ''}</span> se perderán permanentemente.</>
                      : 'No tiene fotos.'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletePageConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:border-gray-400 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeDeletePage(deletePageConfirm.pageIndex)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all"
              >
                Eliminar página
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE FOTO / TEXTO */}
      {deleteSlotConfirm && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {deleteSlotConfirm.kind === 'photo' ? 'Eliminar foto' : 'Eliminar texto'}
                </h3>
                <p className="text-sm text-gray-500">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="mb-6">
              {deleteSlotConfirm.kind === 'photo' ? (
                <>
                  <p className="text-sm text-gray-500 mb-3">
                    Se quitará de la página {deleteSlotConfirm.pageIndex + 1}. Podrás volver a subirla después.
                  </p>
                  {deleteSlotConfirm.url && (
                    <div className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                      <img src={deleteSlotConfirm.url} className="w-full h-full object-contain" alt="Foto a eliminar" />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-3">
                    Se borrará este texto de la página {deleteSlotConfirm.pageIndex + 1}:
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-sm text-red-700 break-words">
                      «{deleteSlotConfirm.text.slice(0, 120)}{deleteSlotConfirm.text.length > 120 ? '…' : ''}»
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteSlotConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:border-gray-400 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const { kind, pageIndex, photoIndex } = deleteSlotConfirm;
                  if (kind === 'photo') executeRemovePhotoFromPage(pageIndex, photoIndex);
                  else executeRemoveTextBox(pageIndex, photoIndex);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all"
              >
                {deleteSlotConfirm.kind === 'photo' ? 'Eliminar foto' : 'Eliminar texto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AYUDA */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Cómo organizar tu álbum</h3>
              <button onClick={() => setShowHelpModal(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-sm text-gray-700">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 text-base">↕</div>
                <div>
                  <p className="font-bold text-black mb-1">Reordenar páginas</p>
                  <p>Mantén presionada una página <span className="font-semibold">1 segundo</span> hasta que vibre. La página queda seleccionada. Luego toca otra página y elige <span className="font-semibold">Intercambiar</span> (las dos páginas se cambian de lugar) o <span className="font-semibold">Insertar aquí</span> (la página se mueve a esa posición desplazando las demás).</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-black mb-1">Editar fotos de una página</p>
                  <p>Toca el botón <span className="font-semibold">Ajustes</span> de cualquier página para abrir el panel de edición: añade, elimina o recorta fotos, cambia el diseño y el número de imágenes por página.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 text-base">⇄</div>
                <div>
                  <p className="font-bold text-black mb-1">Mover fotos dentro de una página</p>
                  <p>Dentro del panel de ajustes, <span className="font-semibold">toca y arrastra</span> cualquier foto para cambiar su posición con otra dentro de la misma página.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="mt-6 w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
            >
              Entendido
            </button>
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
                  El nuevo diseño quedó con espacios en blanco. ¿Quieres que organicemos las fotos automáticamente para llenarlos?
                </p>
                <div className="space-y-3">
                  <button onClick={() => { applyPullShift(layoutChangeModal.pageIndex, layoutChangeModal.newVariant); setLayoutChangeModal(null); }} className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-black font-medium transition-all text-sm">
                    Sí, reorganizar fotos
                  </button>
                  <button onClick={() => { applyIncreaseVariantOnly(layoutChangeModal.pageIndex, layoutChangeModal.newVariant); setLayoutChangeModal(null); }} className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 hover:border-black font-medium transition-all text-sm">
                    No, dejar espacios vacíos
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

      <div className="relative flex flex-col mb-8 sticky top-20 bg-white/95 backdrop-blur-sm z-40 py-2 sm:py-4 border-b -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">{album.name} Editor</h2>
            <p className="text-sm text-gray-500">{safePhotos.length} {t('organizer.pages')} • {safePhotos.flat().length} {t('step.photos')}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Mantén presionada una página para reorganizarla</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelpModal(true)}
              className="p-2 rounded-full border-2 border-gray-200 hover:border-black text-gray-400 hover:text-black transition-all"
              title="Ayuda"
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Banner de modo reordenamiento — superpuesto (absolute) para no alterar la altura
            del header sticky; si empujara el layout, el scroll saltaría al activar el modo. */}
        {reorderSelectedPage !== null && (
          <div className="absolute left-4 right-4 sm:left-0 sm:right-0 top-full mt-2 flex items-center justify-between bg-black text-white rounded-lg px-3 py-2 text-xs font-bold shadow-inner z-50">
            <span>📌 Pág. {reorderSelectedPage + 1} seleccionada — toca otra página para moverla</span>
            <button onClick={exitReorderMode} className="ml-3 p-0.5 hover:bg-white/20 rounded-full transition-colors flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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
        {safePhotos.map((pagePhotos, pageIndex) => {
          const isReorderMode = reorderSelectedPage !== null;
          const isSelected = reorderSelectedPage === pageIndex;
          const isTarget = reorderTargetPage === pageIndex;
          // Página 1 (pageIndex 0) siempre se empareja con el cuadro "Reverso" en la
          // fila 1; de ahí en adelante las páginas van de a pares (2-3, 4-5, 6-7...).
          // El botón de insertar (col-span-2) solo puede caer justo después de
          // completar una fila/pareja, nunca en medio — por eso la condición es
          // pageIndex par (después de 1, 3, 5...) y no hay botón antes de Página 1.
          const isSpreadBoundary = pageIndex % 2 === 0 && pageIndex < safePhotos.length - 1;

          return (
            <Fragment key={pageIndex}>
            <div
              className={`relative flex flex-col transition-all duration-200 ${isReorderMode && !isSelected && !isTarget ? 'opacity-50' : ''}`}
            >
              {/* Capa de toque para seleccionar destino (modo reordenamiento, páginas no seleccionadas) */}
              {isReorderMode && !isSelected && reorderTargetPage === null && (
                <button
                  onClick={() => setReorderTargetPage(pageIndex)}
                  className="absolute inset-0 z-20 w-full h-full cursor-pointer rounded-sm"
                  aria-label={`Seleccionar página ${pageIndex + 1} como destino`}
                />
              )}

              {/* Header de la página */}
              <div className="flex items-center justify-between mb-4 h-10 md:h-12">
                <span className={`text-sm font-bold uppercase tracking-widest ${isSelected ? 'text-black' : 'text-gray-400'}`}>
                  Página {pageIndex + 1}
                  {isSelected && <span className="ml-2 text-xs normal-case font-normal text-gray-500">— mantén 1s para reordenar</span>}
                </span>
                {!isReorderMode ? (
                  <button
                    onClick={() => setAdvancedSettingsModal(pageIndex)}
                    className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full border-2 bg-white text-black border-gray-200 hover:border-black transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span className="text-xs md:text-sm font-bold uppercase tracking-tight hidden sm:inline">
                      {t('organizer.pageSettings') || 'Ajustes'}
                    </span>
                  </button>
                ) : isSelected ? (
                  <div className="flex items-center gap-1.5">
                    {!pagesLocked && (
                      <button
                        onClick={() => { exitReorderMode(); handleDeletePage(pageIndex); }}
                        className="p-1.5 rounded-full border-2 bg-red-600 text-white border-red-600 hover:bg-red-700 transition-colors"
                        title="Eliminar página"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={exitReorderMode}
                      className="p-1.5 rounded-full border-2 bg-black text-white border-black"
                      title="Cancelar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Thumbnail de la página con overlay de acciones */}
              <div className="relative mt-auto">
                <div
                  className={`bg-white rounded-none shadow-sm border-2 transition-all overflow-hidden flex flex-col items-center justify-center ${
                    isSelected
                      ? 'border-black ring-4 ring-black/15'
                      : isTarget
                      ? 'border-black ring-2 ring-black/30'
                      : 'border-gray-100'
                  }`}
                  style={{ aspectRatio: isHorizontal ? '4/3' : isVertical ? '3/4' : '1/1', userSelect: 'none' }}
                  onPointerDown={!isReorderMode ? e => handlePageLongPress(pageIndex, e) : undefined}
                >
                  {(() => {
                    const currentVariant = getRenderSlotCount(pageIndex, pagePhotos);
                    const slots = Array.from({ length: currentVariant }, (_, i) => pagePhotos[i] || null);
                    const slotRects = getPageSlots(currentVariant, pageLayouts[pageIndex], sizeStr);
                    return (
                      <div className="relative w-full h-full">
                        {slots.map((photo, photoIndex) => {
                          const textBox = textBoxSlots[pageIndex]?.[photoIndex];
                          const crop = photoCrops[`${pageIndex}-${photoIndex}`] || { x: 50, y: 50, zoom: 1 };
                          const rect = slotRects[photoIndex];
                          const isPhotoLowRes = photo && lowResInfo[photo];
                          if (!rect) return null;
                          return (
                            <div
                              key={photoIndex}
                              className="absolute"
                              style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%` }}
                            >
                              <AlbumEditorPhotoSlot
                                photo={photo} textBox={textBox} crop={crop}
                                pageIndex={pageIndex} photoIndex={photoIndex}
                                photoCount={currentVariant}
                                editingPageIndex={null}
                                isDragging={false}
                                isDragTarget={false}
                                onDragStart={handleDragStart}
                                handleRemovePhotoFromPage={handleRemovePhotoFromPage} setEditingTextSlot={setEditingTextSlot} handleRemoveTextBox={handleRemoveTextBox} handleAddPhotoToPage={handleSpecificFileSelection} handleAddTextBox={handleAddTextBox}
                                onOpenCropModal={(pIdx, idx, aspect) => setCropModalData({ pageIndex: pIdx, photoIndex: idx, aspectRatio: aspect })}
                                onPhotoError={handlePhotoError}
                                onPhotoRetry={handlePhotoRetry}
                                t={t}
                              />
                              {isPhotoLowRes && (
                                <button
                                  className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-purple-200 text-purple-600 flex items-center justify-center text-xs font-bold shadow-md hover:bg-purple-300 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLowResWarning({ url: photo!, pageIndex, photoIndex, ...lowResInfo[photo!] });
                                  }}
                                  title="Advertencia de resolución"
                                >
                                  !
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Overlay de acciones al seleccionar página destino */}
                {isTarget && reorderSelectedPage !== null && (
                  <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-2.5 z-10 p-3">
                    <button
                      onClick={() => { handleSwapTwoPages(reorderSelectedPage!, pageIndex); exitReorderMode(); }}
                      className="w-full py-3 bg-white text-black font-bold rounded-xl text-sm hover:bg-gray-100 transition-colors"
                    >
                      ↕ Intercambiar posiciones
                    </button>
                    <button
                      onClick={() => { handleMovePageToIndex(reorderSelectedPage!, pageIndex); exitReorderMode(); }}
                      className="w-full py-3 bg-transparent text-white font-bold rounded-xl text-sm border-2 border-white/70 hover:bg-white/10 transition-colors"
                    >
                      → Insertar en esta posición
                    </button>
                    <button
                      onClick={() => setReorderTargetPage(null)}
                      className="text-white/60 text-xs mt-1 hover:text-white/90 transition-colors"
                    >
                      ← Elegir otra página
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Insertar páginas en blanco entre este spread y el siguiente.
                Se mantiene montado (solo deshabilitado) durante el modo de
                reordenamiento para no encoger el grid y saltar el scroll. */}
            {isSpreadBoundary && !pagesLocked && (
              <button
                onClick={() => handleAddPage(pageIndex)}
                disabled={isReorderMode}
                className="col-span-2 flex items-center justify-center gap-2 py-3 text-gray-300 hover:text-black border-2 border-dashed border-transparent hover:border-gray-300 rounded-xl transition-all disabled:opacity-30 disabled:pointer-events-none"
                title="Insertar 2 páginas en blanco aquí"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Insertar páginas aquí</span>
              </button>
            )}
            </Fragment>
          );
        })}

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

      <div className="mt-12 flex justify-center">
        <button
          onClick={handleComplete}
          disabled={isSaving}
          className="px-8 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('organizer.complete')}
        </button>
      </div>

      <div className="mt-20 text-center pb-20">
        {pagesLocked ? (
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{t('creator.pagesLockedBanner')}</span>
          </div>
        ) : (
          <button onClick={() => handleAddPage(safePhotos.length - 1)} className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl hover:border-black hover:bg-gray-50 transition-all text-gray-500 hover:text-black"><Layers className="w-6 h-6" /><span className="text-lg font-medium">{t('organizer.addPageEnd') || 'Añadir páginas'} (+2)</span></button>
        )}
      </div>

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
                    maxLength={(currentEditingText.overflowMode || 'limit') === 'limit' ? getMaxCharsForFontSize(currentEditingText.fontSize) : MAX_SHRINK_CHARS}
                    className="bg-transparent resize-none outline-none p-0 m-0 border-none"
                    style={{
                      width: '90%',
                      height: '90%',
                      fontSize: `${getEffectiveFontSize(currentEditingText.fontSize || 24, (currentEditingText.text || '').length, currentEditingText.overflowMode || 'limit') * 0.25}cqi`,
                      fontFamily: currentEditingText.fontFamily,
                      color: currentEditingText.color,
                      textAlign: currentEditingText.textAlign || 'center',
                      lineHeight: '1.3'
                    }}
                    autoFocus
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block items-center gap-2"><ALargeSmall className="w-4 h-4" /> {t('organizer.size')}</label>
                  <select value={currentEditingText.fontSize} onChange={(e) => updateTextBox(editingTextSlot.pageIndex, editingTextSlot.photoIndex, { fontSize: parseInt(e.target.value) })} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black bg-white">{FONT_SIZES.map(size => <option key={size} value={size}>{size}px</option>)}</select>
                  {(currentEditingText.overflowMode || 'limit') === 'limit' && (
                    <p className="text-[10px] text-gray-400 mt-1">{t('organizer.maxCharsHint', { count: getMaxCharsForFontSize(currentEditingText.fontSize) })}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <span className="text-[11px] font-medium text-gray-500">{(currentEditingText.overflowMode || 'limit') === 'shrink' ? t('organizer.overflowShrink') : t('organizer.overflowLimit')}</span>
                    <Switch
                      checked={(currentEditingText.overflowMode || 'limit') === 'shrink'}
                      onCheckedChange={(checked: boolean) => updateTextBox(editingTextSlot.pageIndex, editingTextSlot.photoIndex, { overflowMode: (checked ? 'shrink' : 'limit') as TextOverflowMode })}
                      title={t('organizer.overflowMode')}
                    />
                  </div>
                </div>
                <div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{t('organizer.font')}</label><select value={currentEditingText.fontFamily} onChange={(e) => updateTextBox(editingTextSlot.pageIndex, editingTextSlot.photoIndex, { fontFamily: e.target.value })} className="w-full p-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black bg-white"><option value="Arial">Sans Serif</option><option value="Georgia">Serif</option><option value="Courier New">Monospace</option><option value="'Playfair Display', serif">Elegant</option><option value="'Dancing Script', cursive">Handwritten</option></select></div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{t('organizer.textAlign')}</label>
                <div className="flex gap-2">
                  {([
                    { value: 'left', Icon: AlignLeft },
                    { value: 'center', Icon: AlignCenter },
                    { value: 'right', Icon: AlignRight },
                    { value: 'justify', Icon: AlignJustify },
                  ] as const).map(({ value, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateTextBox(editingTextSlot.pageIndex, editingTextSlot.photoIndex, { textAlign: value })}
                      title={t(`organizer.align.${value}`)}
                      className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center transition-all ${(currentEditingText.textAlign || 'center') === value ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-400 hover:border-gray-300'}`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
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