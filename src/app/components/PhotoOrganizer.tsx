import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { 
  Upload, X, ChevronUp, ChevronDown, Plus, Trash2, Loader2,
  Image as ImageIcon, Grid3x3, Edit3, Check, 
  ArrowLeft, ArrowRight, Layers, Type, ALargeSmall, Sparkles, Settings, Crop as CropIcon
} from 'lucide-react';
import { Album } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import type { CustomizationOptions } from './AlbumCustomization';
import ImageCropper from './ImageCropper';
import CropModal from './CropModal';

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
  handleAddPhotoToPage: (pageIndex: number, file: File) => void;
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
    <div className={`relative group/photo overflow-hidden rounded-[2%] bg-white flex items-center justify-center`}>
      {photo ? (
        <div ref={containerRef} className={isHalfHeightLayout ? "w-full h-[65%] relative my-auto" : "w-full h-full relative"}>
            <ImageCropper 
              src={photo} 
              position={crop || { x: 50, y: 50, zoom: 1 }}
            />
            {editingPageIndex === pageIndex && (
              <div className="absolute top-2 right-2 flex gap-1 transition-opacity z-10">
                <button onClick={() => handleMovePhotoWithinPage(pageIndex, photoIndex, 'left')} className="p-1.5 bg-white/90 rounded-full hover:bg-white text-black shadow-sm" title="Mover Izquierda"><ArrowLeft className="w-3.5 h-3.5" /></button>
                <button 
                   onClick={() => {
                      const aspect = containerRef.current ? containerRef.current.offsetWidth / containerRef.current.offsetHeight : 1;
                      onOpenCropModal(pageIndex, photoIndex, aspect);
                   }} 
                   className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-sm" 
                   title="Ajustar Recorte"
                >
                   <CropIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleRemovePhotoFromPage(pageIndex, photoIndex)} className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleMovePhotoWithinPage(pageIndex, photoIndex, 'right')} className="p-1.5 bg-white/90 rounded-full hover:bg-white text-black shadow-sm" title="Mover Derecha"><ArrowRight className="w-3.5 h-3.5" /></button>
              </div>
            )}
        </div>
      ) : textBox ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-white relative">
          <div style={{ fontSize: `${textBox.fontSize}px`, fontFamily: textBox.fontFamily, color: textBox.color, textAlign: 'center', wordBreak: 'break-word' }} className="w-full">
            {textBox.text || t('organizer.addText') + '...'}
          </div>
          {editingPageIndex === pageIndex && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center gap-2 opacity-0 group-hover/photo:opacity-100 transition-opacity">
              <button onClick={() => setEditingTextSlot({ pageIndex, photoIndex })} className="p-2 bg-white rounded-full hover:bg-gray-100"><Edit3 className="w-4 h-4" /></button>
              <button onClick={() => handleRemoveTextBox(pageIndex, photoIndex)} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      ) : (
        editingPageIndex === pageIndex && (
          <div className="flex flex-col gap-3">
            <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => { const file = e.target.files?.[0]; if (file) handleAddPhotoToPage(pageIndex, file); }; input.click(); }} className="flex flex-col items-center gap-1 text-gray-400 hover:text-black transition-colors">
              <div className="p-2 rounded-full bg-gray-200 group-hover:bg-gray-300"><ImageIcon className="w-6 h-6" /></div>
              <span className="text-[10px] font-bold uppercase">{t('organizer.addPhoto')}</span>
            </button>
            <div className="h-px bg-gray-200 w-12 mx-auto" />
            <button onClick={() => handleAddTextBox(pageIndex, photoIndex)} className="flex flex-col items-center gap-1 text-gray-400 hover:text-black transition-colors">
              <div className="p-2 rounded-full bg-gray-200 group-hover:bg-gray-300"><Type className="w-6 h-6" /></div>
              <span className="text-[10px] font-bold uppercase">{t('organizer.addText')}</span>
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
  const [numPages, setNumPages] = useState<number | string>(40);
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null);
  
  const [advancedSettingsModal, setAdvancedSettingsModal] = useState<number | null>(null);
  const [cropModalData, setCropModalData] = useState<{ pageIndex: number, photoIndex: number, aspectRatio: number } | null>(null);
  const [isSortingWithAI, setIsSortingWithAI] = useState(false);
  const [editingTextSlot, setEditingTextSlot] = useState<{ pageIndex: number, photoIndex: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSquare = sizeStr.includes('Cuadrado');
  const isHorizontal = sizeStr.includes('Horizontal');
  const isVertical = sizeStr.includes('Vertical');
  const allowedPhotosPerPage = isSquare ? [1, 2, 3, 4, 9] : [1, 2, 3, 4, 6];

  const getClosestAllowed = (count: number) => {
    return allowedPhotosPerPage.find(opt => opt >= count) || allowedPhotosPerPage[allowedPhotosPerPage.length - 1];
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

  useEffect(() => {
    if (uploadedPhotos.length > 0) {
      const minPages = 40;
      const maxPages = uploadedPhotos.length;
      if (typeof numPages === 'number') {
        if (numPages < minPages) setNumPages(minPages);
        if (numPages > maxPages) setNumPages(maxPages);
      }
    }
  }, [uploadedPhotos.length]);

  const handleBatchUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsSortingWithAI(true); 
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const filesArray = Array.from(files);
    try {
      const filesWithData = filesArray.map((file, index) => ({
        id: index.toString(), url: URL.createObjectURL(file),
        metadata: { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified }
      }));

      let finalUrls: string[] = [];
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'; 
        const aiResponse = await fetch(`${backendUrl}/ai/sort-photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photos_data: filesWithData.map(f => ({ id: f.id, ...f.metadata })),
            page_count: typeof numPages === 'number' ? numPages : 40,
            layout_preferences: { isSquare, isHorizontal, isVertical }
          })
        });

        if (!aiResponse.ok) throw new Error('Error IA');
        const responseData = await aiResponse.json();

        if (responseData && responseData.success && Array.isArray(responseData.Albums)) {
          const orderedIdsFromAI: string[] = [];
          responseData.Albums.forEach((album: any) => {
            if (album.photo_ids && Array.isArray(album.photo_ids)) orderedIdsFromAI.push(...album.photo_ids);
          });
          finalUrls = orderedIdsFromAI.map((id: string) => {
            const matchedFile = filesWithData.find(f => f.id === id);
            return matchedFile ? matchedFile.url : '';
          }).filter(Boolean);
        } else {
          finalUrls = filesWithData.map(f => f.url);
        }
      } catch (aiError: any) {
        finalUrls = filesWithData.map(f => f.url);
      }

      setUploadedPhotos(prev => [...prev, ...finalUrls]);
    } catch (error) {
      console.error("Error al procesar archivos:", error);
    } finally {
      setIsSortingWithAI(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFinalizeSetup = () => {
    let safeVal = typeof numPages === 'number' ? numPages : 40;
    safeVal = Math.min(Math.max(safeVal, 40), uploadedPhotos.length);
    setNumPages(safeVal);

    const totalPages = safeVal;
    const photosToDistribute = [...uploadedPhotos];
    const newPhotos: string[][] = Array.from({ length: totalPages }, () => []);
    
    for (let i = 0; i < totalPages; i++) {
      if (photosToDistribute.length > 0) newPhotos[i].push(photosToDistribute.shift()!);
    }

    let pageIndex = 0;
    let consecutiveFullPages = 0;
    
    while (photosToDistribute.length > 0 && consecutiveFullPages < totalPages) {
      const currentPagePhotos = newPhotos[pageIndex];
      const currentCount = currentPagePhotos.length;
      const nextAllowed = allowedPhotosPerPage.find(opt => opt > currentCount);
      
      if (nextAllowed) {
        const canAdd = nextAllowed - currentCount;
        const toAdd = Math.min(canAdd, photosToDistribute.length);
        if (toAdd > 0) {
          currentPagePhotos.push(...photosToDistribute.splice(0, toAdd));
          consecutiveFullPages = 0;
        } else consecutiveFullPages++;
      } else consecutiveFullPages++;
      pageIndex = (pageIndex + 1) % totalPages;
    }
    onPhotosChange(newPhotos);
    setStep('editor');
  };

  const handleAddPage = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index + 1, 0, []);
    onPhotosChange(newPhotos);
  };

  const handleDeletePage = (index: number) => {
    if (photos.length <= 40) {
      alert(t('organizer.minPagesReached') || 'Minimum of 40 pages required.');
      return;
    }
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onPhotosChange(newPhotos);
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

  const handleAddPhotoToPage = (pageIndex: number, file: File) => {
    const newPhotos = [...photos];
    newPhotos[pageIndex] = [...newPhotos[pageIndex], URL.createObjectURL(file)];
    onPhotosChange(newPhotos);
  };

  const handleRemovePhotoFromPage = (pageIndex: number, photoIndex: number) => {
    const newPhotos = [...photos];
    newPhotos[pageIndex] = newPhotos[pageIndex].filter((_, i) => i !== photoIndex);
    onPhotosChange(newPhotos);
  };

  const handleMovePhotoWithinPage = (pageIndex: number, photoIndex: number, direction: 'left' | 'right') => {
    if (direction === 'left' && photoIndex === 0) return;
    if (direction === 'right' && photoIndex === photos[pageIndex].length - 1) return;
    const newPhotos = [...photos];
    const targetIndex = direction === 'left' ? photoIndex - 1 : photoIndex + 1;
    const pagePhotos = [...newPhotos[pageIndex]];
    [pagePhotos[photoIndex], pagePhotos[targetIndex]] = [pagePhotos[targetIndex], pagePhotos[photoIndex]];
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

  const currentEditingText = editingTextSlot ? textBoxSlots[editingTextSlot.pageIndex]?.[editingTextSlot.photoIndex] : null;

  const renderAdvancedSettingsModal = () => {
    if (advancedSettingsModal === null) return null;
    const pageIndex = advancedSettingsModal;
    if (!photos || !photos[pageIndex]) return null;

    const pagePhotos = photos[pageIndex];
    const currentVariant = pageLayoutVariants[pageIndex] || getClosestAllowed(pagePhotos.length);
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
                <Sparkles className="w-4 h-4 text-amber-500" /> Previsualización Interactiva
              </p>
              
              <div className="bg-white rounded-[3%] shadow-md border-2 border-black ring-4 ring-black/5 overflow-hidden w-full max-w-sm transition-all" style={{ aspectRatio: isHorizontal ? '4/3' : isVertical ? '3/4' : '1/1' }}>
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
                        handleAddPhotoToPage={handleAddPhotoToPage}
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
                        <button key={opt} onClick={() => onPageLayoutVariantsChange({ ...pageLayoutVariants, [pageIndex]: opt })} className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border-2 text-xs font-bold transition-all ${currentVariant === opt ? 'border-black bg-black text-white shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-black'}`}>{opt}</button>
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
                  
                  <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => { const file = e.target.files?.[0]; if (file) handleAddPhotoToPage(pageIndex, file); }; input.click(); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition-all text-xs"><Plus className="w-3.5 h-3.5"/> Foto</button>
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
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-lg mb-4"><Upload className="w-10 h-10" /></div>
          <h2 className="text-3xl mb-2">{t('organizer.uploadTitle')}</h2><p className="text-gray-600">{t('organizer.uploadDesc')}</p>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-lg p-12">
          {isSortingWithAI ? (
            <div className="w-full py-16 flex flex-col items-center justify-center gap-4 bg-purple-50 rounded-xl border border-purple-100">
              <Sparkles className="w-16 h-16 text-purple-600 animate-bounce" /><p className="text-xl font-bold text-purple-800">{t('organizer.aiSorting')}</p><p className="text-sm text-purple-600">{t('organizer.aiSortingDesc')}</p>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-4 group">
              <ImageIcon className="w-16 h-16 text-gray-400 group-hover:text-black transition-colors" />
              <div className="text-center"><p className="text-xl mb-2 font-medium">{t('organizer.clickToSelect')}</p><p className="text-sm text-gray-500 mb-4">{t('organizer.selectMultiple')}</p></div>
            </button>
          )}
          <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleBatchUpload} className="hidden" disabled={isSortingWithAI} />
          <div className="mt-8 flex flex-col gap-4">
            {uploadedPhotos.length > 0 && (<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"><span className="font-medium">{uploadedPhotos.length} {t('organizer.photosSelected')}</span><button onClick={() => setUploadedPhotos([])} className="text-red-500 hover:text-red-700 font-medium">{t('organizer.clearAll')}</button></div>)}
            <button disabled={uploadedPhotos.length < 40 || isSortingWithAI} onClick={() => setStep('pages')} className={`w-full py-4 rounded-lg text-lg font-medium transition-all shadow-md ${uploadedPhotos.length >= 40 && !isSortingWithAI ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {uploadedPhotos.length < 40 ? `${t('organizer.minPhotosWarning', { count: uploadedPhotos.length })}` : t('organizer.continueToPages')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'pages') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8"><div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-lg mb-4"><Grid3x3 className="w-10 h-10" /></div><h2 className="text-3xl mb-2">{t('organizer.howManyPages')}</h2><p className="text-gray-600">{t('organizer.distributeDesc')}</p></div>
        <div className="bg-white border-2 border-gray-300 rounded-lg p-12 space-y-8">
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="text-xl font-medium">{t('organizer.numPages')}</label>
              <input type="number" min={40} max={Math.max(uploadedPhotos.length, 40)} value={numPages} onChange={(e) => setNumPages(e.target.value === '' ? '' : parseInt(e.target.value, 10))} onBlur={() => setNumPages(Math.min(Math.max(typeof numPages === 'number' ? numPages : 40, 40), uploadedPhotos.length))} className="w-24 text-2xl font-bold border-2 border-gray-300 rounded px-2 focus:border-black outline-none text-right" />
            </div>
            <input type="range" min={40} max={Math.max(uploadedPhotos.length, 40)} value={numPages === '' ? 40 : numPages} onChange={(e) => setNumPages(parseInt(e.target.value, 10))} className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black" />
          </div>
          <div className="flex gap-4"><button onClick={() => setStep('upload')} className="flex-1 py-4 border-2 border-gray-300 rounded-lg hover:border-black transition-all text-lg">{t('step.back')}</button><button onClick={handleFinalizeSetup} className="flex-[2] py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-all text-lg px-12">{t('organizer.createAlbum')}</button></div>
        </div>
      </div>
    );
  }

  const handleComplete = () => {
    const emptyPageIndices = safePhotos.reduce((acc, pagePhotos, index) => {
      const hasPhotos = pagePhotos.length > 0;
      const hasText = textBoxSlots[index] && Object.keys(textBoxSlots[index]).length > 0;
      if (!hasPhotos && !hasText) acc.push(index + 1);
      return acc;
    }, [] as number[]);

    if (emptyPageIndices.length > 0) {
      alert(t('organizer.emptyPagesAlert', { pages: emptyPageIndices.join(', ') }));
      return;
    }
    if (onComplete) onComplete();
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12">
      {renderAdvancedSettingsModal()}

      <div className="flex items-center justify-between mb-8 sticky top-20 bg-white/95 backdrop-blur-sm z-40 py-2 sm:py-4 border-b -mx-4 px-4 sm:mx-0 sm:px-0">
        <div><h2 className="text-xl sm:text-2xl font-bold">{album.name} Editor</h2><p className="text-sm text-gray-500">{safePhotos.length} {t('organizer.pages')} • {safePhotos.flat().length} {t('step.photos')}</p></div>
        <button onClick={handleComplete} className="px-6 sm:px-8 py-2 sm:py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg font-medium text-sm sm:text-base">{t('organizer.complete')}</button>
      </div>

      <div className="grid grid-cols-2 gap-x-2 sm:gap-x-3 md:gap-x-4 gap-y-12 sm:gap-y-16">
        
        {/* CUADRO 1: Interior de la Portada Principal (Fija a la Izquierda) */}
        <div className="relative group flex flex-col">
          <div className="flex items-center justify-between mb-4 h-10 md:h-12">
            <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Interior Portada</span>
          </div>
          <div 
            className="bg-gray-100 rounded-[3%] shadow-inner border-2 border-gray-200 transition-all overflow-hidden flex items-center justify-center mt-auto"
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

            <div className={`bg-white rounded-[3%] shadow-sm border-2 transition-all overflow-hidden mt-auto ${editingPageIndex === pageIndex ? 'border-black ring-4 ring-black/5' : 'border-gray-100'}`} style={{ aspectRatio: isHorizontal ? '4/3' : isVertical ? '3/4' : '1/1' }}>
              {(() => {
                const currentPhotosPerPage = pageLayoutVariants[pageIndex] || getClosestAllowed(pagePhotos.length);
                const slots = Array.from({ length: currentPhotosPerPage }, (_, i) => pagePhotos[i] || null);
                
                return (
                  <div className={`grid gap-2 p-4 h-full ${getGridLayout(currentPhotosPerPage, pageLayouts[pageIndex])}`}>
                    {slots.map((photo, photoIndex) => {
                      const textBox = textBoxSlots[pageIndex]?.[photoIndex];
                      const crop = photoCrops[`${pageIndex}-${photoIndex}`] || { x: 50, y: 50, zoom: 1 };
                      const isHalfHeightLayout = (currentPhotosPerPage === 2 || currentPhotosPerPage === 3) && pageLayouts[pageIndex] !== 'column';
                      
                      return (
                        <AlbumEditorPhotoSlot
                          key={photoIndex} photo={photo} textBox={textBox} crop={crop}
                          isHalfHeightLayout={isHalfHeightLayout} pageIndex={pageIndex} photoIndex={photoIndex}
                          editingPageIndex={editingPageIndex}
                          handleMovePhotoWithinPage={handleMovePhotoWithinPage} handleRemovePhotoFromPage={handleRemovePhotoFromPage} setEditingTextSlot={setEditingTextSlot} handleRemoveTextBox={handleRemoveTextBox} handleAddPhotoToPage={handleAddPhotoToPage} handleAddTextBox={handleAddTextBox}
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

        {/* PÁGINA EN BLANCO (Se añade SOLO si el total de páginas del usuario es impar, empuja la contraportada a la derecha) */}
        {safePhotos.length % 2 !== 0 && (
          <div className="relative group flex flex-col">
            <div className="flex items-center justify-between mb-4 h-10 md:h-12">
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Página en Blanco</span>
            </div>
            <div 
              className="bg-white rounded-[3%] shadow-sm border-2 border-gray-100 transition-all overflow-hidden flex items-center justify-center mt-auto"
              style={{ aspectRatio: isHorizontal ? '4/3' : isVertical ? '3/4' : '1/1' }}
            >
              <span className="text-gray-300 text-[10px] md:text-xs font-bold uppercase tracking-widest">En Blanco</span>
            </div>
          </div>
        )}

        {/* CUADRO FINAL: Interior de la Contraportada (Siempre terminará a la Derecha) */}
        <div className="relative group flex flex-col">
          <div className="flex items-center justify-between mb-4 h-10 md:h-12">
            <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Interior Contraportada</span>
          </div>
          <div 
            className="bg-gray-100 rounded-[3%] shadow-inner border-2 border-gray-200 transition-all overflow-hidden flex items-center justify-center mt-auto"
            style={{ aspectRatio: isHorizontal ? '4/3' : isVertical ? '3/4' : '1/1' }}
          >
            <div className="text-gray-300 flex flex-col items-center gap-2 opacity-60">
              <Layers className="w-10 h-10 md:w-12 md:h-12" />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Reverso Final</span>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-20 text-center pb-20"><button onClick={() => handleAddPage(safePhotos.length - 1)} className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl hover:border-black hover:bg-gray-50 transition-all text-gray-500 hover:text-black"><Layers className="w-6 h-6" /><span className="text-lg font-medium">{t('organizer.addPageEnd')}</span></button></div>

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
              <div><label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{t('organizer.content')}</label><textarea value={currentEditingText.text} onChange={(e) => updateTextBox(editingTextSlot.pageIndex, editingTextSlot.photoIndex, { text: e.target.value })} placeholder="Type your message here..." className="w-full p-4 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black min-h-[120px] resize-none text-lg" autoFocus /></div>
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