import { useState, useRef, useEffect } from 'react';
import { 
  Upload, X, ChevronUp, ChevronDown, Plus, Trash2, 
  Image as ImageIcon, Grid3x3, Edit3, Move, Check, 
  ArrowLeft, ArrowRight, Layers, Type, ALargeSmall
} from 'lucide-react';
import { Album } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import type { CustomizationOptions } from './AlbumCustomization';
import ImageCropper from './ImageCropper';

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

export default function PhotoOrganizer({ 
  album, 
  customization, 
  photos, 
  onPhotosChange, 
  photoCrops,
  onPhotoCropsChange,
  textBoxSlots,
  onTextBoxSlotsChange,
  pageLayouts,
  onPageLayoutsChange,
  pageLayoutVariants,
  onPageLayoutVariantsChange,
  onComplete 
}: PhotoOrganizerProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>(photos.length > 0 ? 'editor' : 'upload');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [numPages, setNumPages] = useState(customization.pages || 40);
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null);
  const [editingTextSlot, setEditingTextSlot] = useState<{ pageIndex: number, photoIndex: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);

  const isSquare = customization.size.includes('Cuadrado');
  const isHorizontal = customization.size.includes('Horizontal');
  const isVertical = customization.size.includes('Vertical');
  const allowedPhotosPerPage = isSquare ? [1, 2, 3, 4, 9] : [1, 2, 3, 4, 6];

  const getClosestAllowed = (count: number) => {
    return allowedPhotosPerPage.find(opt => opt >= count) || allowedPhotosPerPage[allowedPhotosPerPage.length - 1];
  };

  const getGridLayout = (count: number, layout?: 'row' | 'column') => {
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

  // Update numPages when uploadedPhotos changes to ensure it's within bounds
  useEffect(() => {
    if (uploadedPhotos.length > 0) {
      const minPages = 40;
      const maxPages = uploadedPhotos.length;
      if (numPages < minPages) setNumPages(minPages);
      if (numPages > maxPages) setNumPages(maxPages);
    }
  }, [uploadedPhotos.length]);

  // 1. Initial Batch Upload
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
            setUploadedPhotos(prev => [...prev, ...loadedPhotos]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 2. Distribute photos into pages
  const handleFinalizeSetup = () => {
    const totalPages = Math.max(40, numPages);
    const photosToDistribute = [...uploadedPhotos];
    const newPhotos: string[][] = Array.from({ length: totalPages }, () => []);
    
    // First round: ensure every page has at least one photo
    for (let i = 0; i < totalPages; i++) {
      if (photosToDistribute.length > 0) {
        newPhotos[i].push(photosToDistribute.shift()!);
      }
    }

    // Subsequent rounds: distribute remaining photos respecting allowed counts
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
          consecutiveFullPages = 0; // Reset as we successfully added to a page
        } else {
          consecutiveFullPages++;
        }
      } else {
        consecutiveFullPages++;
      }
      
      pageIndex = (pageIndex + 1) % totalPages;
    }

    onPhotosChange(newPhotos);
    setStep('editor');
  };

  // Editor Actions
  const handleAddPage = (index: number) => {
    if (photos.length >= uploadedPhotos.length && uploadedPhotos.length > 0) {
      alert(t('organizer.maxPagesReached') || 'You cannot have more pages than total photos.');
      // Remove alert for now to allow adding empty pages if user wants
    }
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
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        const newPhotos = [...photos];
        newPhotos[pageIndex] = [...newPhotos[pageIndex], result];
        onPhotosChange(newPhotos);
      }
    };
    reader.readAsDataURL(file);
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

    // Also move crops
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
    newSlots[pageIndex][photoIndex] = {
      text: '',
      fontSize: 24,
      fontFamily: 'Arial',
      color: '#000000'
    };
    onTextBoxSlotsChange(newSlots);
    setEditingTextSlot({ pageIndex, photoIndex });
  };

  const handleRemoveTextBox = (pageIndex: number, photoIndex: number) => {
    const newSlots = { ...textBoxSlots };
    if (newSlots[pageIndex]) {
      delete newSlots[pageIndex][photoIndex];
      if (Object.keys(newSlots[pageIndex]).length === 0) {
        delete newSlots[pageIndex];
      }
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

  const handleCropChange = (pageIndex: number, photoIndex: number, crop: { x: number, y: number, zoom: number }) => {
    onPhotoCropsChange({
      ...photoCrops,
      [`${pageIndex}-${photoIndex}`]: crop
    });
  };

  const currentEditingText = editingTextSlot ? textBoxSlots[editingTextSlot.pageIndex]?.[editingTextSlot.photoIndex] : null;

  // STEP: UPLOAD
  if (step === 'upload') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-lg mb-4">
            <Upload className="w-10 h-10" />
          </div>
          <h2 className="text-3xl mb-2">{t('organizer.uploadTitle') || 'Upload Your Photos'}</h2>
          <p className="text-gray-600">
            {t('organizer.uploadDesc') || 'Select the photos you want to include in your album. We suggest at least 40 photos for a great experience.'}
          </p>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-lg p-12">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-4"
          >
            <ImageIcon className="w-16 h-16 text-gray-400" />
            <div className="text-center">
              <p className="text-xl mb-2">{t('organizer.clickToSelect') || 'Click to select photos'}</p>
              <p className="text-sm text-gray-500">{t('organizer.selectMultiple') || 'You can select multiple files at once'}</p>
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
            {uploadedPhotos.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium">{uploadedPhotos.length} photos selected</span>
                <button onClick={() => setUploadedPhotos([])} className="text-red-500 hover:text-red-700">Clear all</button>
              </div>
            )}

            <button
              disabled={uploadedPhotos.length < 40}
              onClick={() => setStep('pages')}
              className={`w-full py-4 rounded-lg text-lg font-medium transition-all ${
                uploadedPhotos.length >= 40
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {uploadedPhotos.length < 40 
                ? `Upload at least 40 photos (${uploadedPhotos.length}/40)`
                : t('organizer.continueToPages') || 'Continue to Page Selection'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP: PAGES
  if (step === 'pages') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-lg mb-4">
            <Grid3x3 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl mb-2">{t('organizer.howManyPages') || 'How many pages?'}</h2>
          <p className="text-gray-600">
            {t('organizer.distributeDesc') || 'Choose how many pages you want for your album. Your photos will be automatically distributed.'}
          </p>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-lg p-12 space-y-8">
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="text-xl font-medium">{t('organizer.numPages') || 'Number of Pages'}</label>
              <input
                type="number"
                min={40}
                max={Math.max(uploadedPhotos.length, 40)}
                value={numPages}
                onChange={(e) => setNumPages(Math.min(Math.max(parseInt(e.target.value) || 40, 40), uploadedPhotos.length))}
                className="w-24 text-2xl font-bold border-2 border-gray-300 rounded px-2 focus:border-black outline-none text-right"
              />
            </div>
            <input
              type="range"
              min={40}
              max={Math.max(uploadedPhotos.length, 40)}
              value={numPages}
              onChange={(e) => setNumPages(parseInt(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep('upload')}
              className="flex-1 py-4 border-2 border-gray-300 rounded-lg hover:border-black transition-all text-lg"
            >
              {t('step.back') || 'Back'}
            </button>
            <button
              onClick={handleFinalizeSetup}
              className="flex-[2] py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-all text-lg px-12"
            >
              {t('organizer.createAlbum') || 'Create Album'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleComplete = () => {
    // Validar que todas las páginas tengan al menos una imagen o un cuadro de texto
    const emptyPageIndices = photos.reduce((acc, pagePhotos, index) => {
      const hasPhotos = pagePhotos.length > 0;
      const hasText = textBoxSlots[index] && Object.keys(textBoxSlots[index]).length > 0;
      
      if (!hasPhotos && !hasText) {
        acc.push(index + 1);
      }
      return acc;
    }, [] as number[]);

    if (emptyPageIndices.length > 0) {
      alert(
        `Tu álbum contiene páginas vacías (Página ${emptyPageIndices.join(', ')}). \n\nPor favor, añade al menos una foto o un texto a cada página antes de continuar al checkout.`
      );
      return;
    }

    if (onComplete) {
      onComplete();
    }
  };

  // STEP: EDITOR (Vertical List)
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8 sticky top-24 bg-white/95 backdrop-blur-sm z-40 py-4 border-b">
        <div>
          <h2 className="text-2xl font-bold">{album.name} Editor</h2>
          <p className="text-gray-500">{photos.length} pages • {photos.flat().length} photos</p>
        </div>
        <button
          onClick={handleComplete}
          className="px-8 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg font-medium"
        >
          {t('organizer.complete') || 'Continue to Checkout'}
        </button>
      </div>

      <div className="space-y-12">
        {photos.map((pagePhotos, pageIndex) => (
          <div key={pageIndex} className="relative group">
            {/* Page Header / Number */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">
                Page {pageIndex + 1}
              </span>
              <button
                onClick={() => setEditingPageIndex(editingPageIndex === pageIndex ? null : pageIndex)}
                className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full border-2 transition-all ${
                  editingPageIndex === pageIndex
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-200 hover:border-black'
                }`}
              >
                {editingPageIndex === pageIndex ? <Check className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                <span className="text-xs md:text-sm font-bold uppercase tracking-tight">
                  {editingPageIndex === pageIndex ? (
                    <span className="hidden sm:inline">Finalizar Edición</span>
                  ) : (
                    <span className="hidden sm:inline">Habilitar Edición</span>
                  )}
                  {editingPageIndex === pageIndex ? (
                    <span className="sm:hidden">LISTO</span>
                  ) : (
                    <span className="sm:hidden">EDITAR</span>
                  )}
                </span>
              </button>
            </div>

            {/* Page Content */}
            <div 
              className={`bg-white rounded-xl shadow-sm border-2 transition-all overflow-hidden ${
                editingPageIndex === pageIndex ? 'border-black ring-4 ring-black/5' : 'border-gray-100'
              }`}
              style={{ aspectRatio: isHorizontal ? '4/3' : isVertical ? '3/4' : '1/1' }}
            >
              {(() => {
                const currentPhotosPerPage = pageLayoutVariants[pageIndex] || getClosestAllowed(pagePhotos.length);
                const slots = Array.from({ length: currentPhotosPerPage }, (_, i) => pagePhotos[i] || null);
                
                return (
                  <div className={`grid gap-2 p-4 h-full ${getGridLayout(currentPhotosPerPage, pageLayouts[pageIndex])}`}>
                    {slots.map((photo, photoIndex) => {
                      const textBox = textBoxSlots[pageIndex]?.[photoIndex];
                      const crop = photoCrops[`${pageIndex}-${photoIndex}`] || { x: 50, y: 50, zoom: 1 };
                      
                      return (
                        <div key={photoIndex} className="relative group/photo overflow-hidden rounded-lg bg-gray-100 flex items-center justify-center border border-gray-100">
                          {photo ? (
                            <>
                              <ImageCropper 
                                src={photo} 
                                defaultPosition={crop}
                                defaultZoom={crop.zoom}
                                onCropChange={(newCrop) => handleCropChange(pageIndex, photoIndex, newCrop)}
                                isEditable={editingPageIndex === pageIndex}
                              />
                              {/* Photo Actions (when editing page) */}
                              {editingPageIndex === pageIndex && (
                                <div className="absolute top-2 right-2 flex gap-1 transition-opacity z-10">
                                  <button 
                                    onClick={() => handleMovePhotoWithinPage(pageIndex, photoIndex, 'left')}
                                    className="p-1.5 bg-white/90 rounded-full hover:bg-white text-black shadow-sm"
                                    title="Move left"
                                  >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleRemovePhotoFromPage(pageIndex, photoIndex)}
                                    className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                                    title="Delete photo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleMovePhotoWithinPage(pageIndex, photoIndex, 'right')}
                                    className="p-1.5 bg-white/90 rounded-full hover:bg-white text-black shadow-sm"
                                    title="Move right"
                                  >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </>
                          ) : textBox ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-white relative">
                              <div 
                                style={{
                                  fontSize: `${textBox.fontSize}px`,
                                  fontFamily: textBox.fontFamily,
                                  color: textBox.color,
                                  textAlign: 'center',
                                  wordBreak: 'break-word'
                                }}
                                className="w-full"
                              >
                                {textBox.text || t('organizer.addText') + '...'}
                              </div>
                              {editingPageIndex === pageIndex && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center gap-2 opacity-0 group-hover/photo:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => setEditingTextSlot({ pageIndex, photoIndex })}
                                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                                    title={t('organizer.editText') || "Edit Text"}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleRemoveTextBox(pageIndex, photoIndex)}
                                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                                    title={t('organizer.removeText') || "Remove Text Box"}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            editingPageIndex === pageIndex && (
                              <div className="flex flex-col gap-3">
                                <button
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e: any) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleAddPhotoToPage(pageIndex, file);
                                    };
                                    input.click();
                                  }}
                                  className="flex flex-col items-center gap-1 text-gray-400 hover:text-black transition-colors"
                                >
                                  <div className="p-2 rounded-full bg-gray-200 group-hover:bg-gray-300">
                                    <ImageIcon className="w-6 h-6" />
                                  </div>
                                  <span className="text-[10px] font-bold uppercase">{t('organizer.addPhoto')}</span>
                                </button>
                                <div className="h-px bg-gray-200 w-12 mx-auto" />
                                <button
                                  onClick={() => handleAddTextBox(pageIndex, photoIndex)}
                                  className="flex flex-col items-center gap-1 text-gray-400 hover:text-black transition-colors"
                                >
                                  <div className="p-2 rounded-full bg-gray-200 group-hover:bg-gray-300">
                                    <Type className="w-6 h-6" />
                                  </div>
                                  <span className="text-[10px] font-bold uppercase">{t('organizer.addText')}</span>
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Page Actions (when editing page) */}
            {editingPageIndex === pageIndex && (
              <div className="absolute -right-2 sm:right-2 xl:-right-24 top-1/2 -translate-y-1/2 flex flex-col gap-1 md:gap-2 p-1 md:p-2 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 animate-in slide-in-from-right-4 w-14 md:w-20">
                <button
                  onClick={() => handleMovePage(pageIndex, 'up')}
                  disabled={pageIndex === 0}
                  className="p-2 md:p-3 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                  title="Move Page Up"
                >
                  <ChevronUp className="w-5 h-5 md:w-6 md:h-6 mx-auto" />
                </button>
                <button
                  onClick={() => handleMovePage(pageIndex, 'down')}
                  disabled={pageIndex === photos.length - 1}
                  className="p-2 md:p-3 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                  title="Move Page Down"
                >
                  <ChevronDown className="w-5 h-5 md:w-6 md:h-6 mx-auto" />
                </button>
                <div className="h-px bg-gray-100 my-1" />
                
                {/* Photos Per Page Selection */}
                <div className="flex flex-col gap-1 px-1">
                  <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase text-center mb-0.5 md:mb-1 leading-tight">Fotos Pág</span>
                  <div className="grid grid-cols-2 gap-1">
                    {allowedPhotosPerPage.map(opt => (
                      <button
                        key={opt}
                        onClick={() => onPageLayoutVariantsChange({ ...pageLayoutVariants, [pageIndex]: opt })}
                        className={`p-1 md:p-1.5 rounded text-[9px] md:text-[10px] font-bold ${
                          (pageLayoutVariants[pageIndex] || getClosestAllowed(pagePhotos.length)) === opt 
                            ? 'bg-black text-white' 
                            : 'bg-gray-50 hover:bg-gray-200'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout Selection (Enabled only when 2 photos) */}
                {(pageLayoutVariants[pageIndex] || getClosestAllowed(pagePhotos.length)) === 2 && (
                  <>
                    <div className="h-px bg-gray-100 my-1" />
                    <div className="flex flex-col gap-1 px-1">
                      <span className="text-[8px] md:text-[10px] font-bold text-gray-400 uppercase text-center mb-0.5 md:mb-1">Layout</span>
                      <button
                        onClick={() => onPageLayoutsChange({ ...pageLayouts, [pageIndex]: 'row' })}
                        className={`p-1 md:p-2 rounded text-[9px] md:text-[10px] font-medium ${pageLayouts[pageIndex] === 'row' || !pageLayouts[pageIndex] ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                      >
                        Fila
                      </button>
                      <button
                        onClick={() => onPageLayoutsChange({ ...pageLayouts, [pageIndex]: 'column' })}
                        className={`p-1 md:p-2 rounded text-[9px] md:text-[10px] font-medium ${pageLayouts[pageIndex] === 'column' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                      >
                        Col
                      </button>
                    </div>
                  </>
                )}

                <div className="h-px bg-gray-100 my-1" />
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) handleAddPhotoToPage(pageIndex, file);
                    };
                    input.click();
                  }}
                  className="p-2 md:p-3 hover:bg-blue-50 text-blue-600 rounded-lg"
                  title={t('organizer.addPhoto')}
                >
                  <ImageIcon className="w-5 h-5 md:w-6 md:h-6 mx-auto" />
                </button>
                <button
                  onClick={() => handleDeletePage(pageIndex)}
                  className="p-2 md:p-3 hover:bg-red-50 text-red-600 rounded-lg"
                  title="Delete Page"
                >
                  <Trash2 className="w-5 h-5 md:w-6 md:h-6 mx-auto" />
                </button>
              </div>
            )}

            {/* Add Page Button (Between Pages) */}
            <div className="flex justify-center my-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleAddPage(pageIndex)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-black hover:text-white rounded-full text-sm font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                Insert Page After
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 text-center pb-20">
        <button
          onClick={() => handleAddPage(photos.length - 1)}
          className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl hover:border-black hover:bg-gray-50 transition-all text-gray-500 hover:text-black"
        >
          <Layers className="w-6 h-6" />
          <span className="text-lg font-medium">Add New Page to the End</span>
        </button>
      </div>

      {/* Text Editor Modal */}
      {editingTextSlot && currentEditingText && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                <h4 className="text-xl font-bold">{t('organizer.editText') || 'Edit Text Box'}</h4>
              </div>
              <button
                onClick={() => setEditingTextSlot(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Text Content */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{t('organizer.content') || 'Content'}</label>
                <textarea
                  value={currentEditingText.text}
                  onChange={(e) => updateTextBox(editingTextSlot.pageIndex, editingTextSlot.photoIndex, { text: e.target.value })}
                  placeholder="Type your message here..."
                  className="w-full p-4 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black min-h-[120px] resize-none text-lg"
                  autoFocus
                />
              </div>

              {/* Typography Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block flex items-center gap-2">
                    <ALargeSmall className="w-4 h-4" /> {t('organizer.size') || 'Size'}
                  </label>
                  <select
                    value={currentEditingText.fontSize}
                    onChange={(e) => updateTextBox(editingTextSlot.pageIndex, editingTextSlot.photoIndex, { fontSize: parseInt(e.target.value) })}
                    className="w-full p-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black bg-white"
                  >
                    {[12, 16, 20, 24, 32, 40, 48, 64].map(size => (
                      <option key={size} value={size}>{size}px</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{t('organizer.font') || 'Font'}</label>
                  <select
                    value={currentEditingText.fontFamily}
                    onChange={(e) => updateTextBox(editingTextSlot.pageIndex, editingTextSlot.photoIndex, { fontFamily: e.target.value })}
                    className="w-full p-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black bg-white"
                  >
                    <option value="Arial">Sans Serif</option>
                    <option value="Georgia">Serif</option>
                    <option value="Courier New">Monospace</option>
                    <option value="'Playfair Display', serif">Elegant</option>
                    <option value="'Dancing Script', cursive">Handwritten</option>
                  </select>
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{t('organizer.color') || 'Color'}</label>
                <div className="flex gap-2">
                  {['#000000', '#4B5563', '#9CA3AF', '#EF4444', '#3B82F6', '#10B981', '#F59E0B'].map(color => (
                    <button
                      key={color}
                      onClick={() => updateTextBox(editingTextSlot.pageIndex, editingTextSlot.photoIndex, { color })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${currentEditingText.color === color ? 'scale-125 border-black' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={() => setEditingTextSlot(null)}
                className="w-full py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-bold text-lg shadow-lg shadow-black/10"
              >
                {t('organizer.saveChanges') || 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
