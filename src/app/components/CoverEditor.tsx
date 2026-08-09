import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Upload, X, Check, Layout, Type, Image as ImageIcon, Palette, Crop as CropIcon, AlertCircle, Loader2 } from 'lucide-react';
import CoverPreview from './CoverPreview';
import ImageCropper from './ImageCropper';
import CropModal from './CropModal';
import { useLanguage } from '../context/LanguageContext';
import { convertFileIfHeic } from '../utils/imageUtils';
import { getCoverTextLimits } from '../utils/coverTextLimits';

interface CoverEditorProps {
  coverSize: '20x20' | '30x30' | '21x28' | '28x21';
  coverType: 'Tela' | 'Papel';
  hidePhoto?: boolean;
  onClose: () => void;
  onSave: (data: {
    coverImage: string;
    coverTitle: string;
    coverSubtitle: string;
    coverYear: string;
    spineText: string;
    selectedLayout: number;
    typographyColor: string;
    coverCrop: { x: number; y: number; zoom: number; rotation?: number };
  }) => void;
  initialData?: {
    coverImage: string;
    coverTitle: string;
    coverSubtitle: string;
    coverYear: string;
    spineText?: string;
    selectedLayout: number;
    typographyColor?: string;
    coverCrop?: { x: number; y: number; zoom: number; rotation?: number };
  };
}

const CoverEditor: React.FC<CoverEditorProps> = ({
  coverSize,
  coverType,
  hidePhoto = false,
  onClose,
  onSave,
  initialData
}) => {
  const { t } = useLanguage();

  const [coverImage, setCoverImage] = useState(initialData?.coverImage || '');
  const [coverTitle, setCoverTitle] = useState(initialData?.coverTitle || '');
  const [coverSubtitle, setCoverSubtitle] = useState(initialData?.coverSubtitle || '');
  const [coverYear] = useState(initialData?.coverYear || '');
  const [spineText, setSpineText] = useState(initialData?.spineText || '');

  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, []);
  
  const [selectedLayout, setSelectedLayout] = useState(initialData?.selectedLayout || 1);
  const [coverCrop, setCoverCrop] = useState(initialData?.coverCrop || { x: 50, y: 50, zoom: 1, rotation: 0 });
  const [typographyColor, setTypographyColor] = useState(initialData?.typographyColor || '#000000');

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const [isValidating, setIsValidating] = useState(false);
  const [coverImageLowResInfo, setCoverImageLowResInfo] = useState<{width: number, height: number} | null>(null);
  const [showLowResWarning, setShowLowResWarning] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVertical = coverSize === '28x21';
  const isSquare = coverSize === '20x20' || coverSize === '30x30';
  const isHorizontal = coverSize === '21x28';

  const baseAspectRatio = isVertical ? 21/28 : isHorizontal ? 28/21 : 1;

  // Lógica de validación: El lomo NO es obligatorio en Tela
  const isSquareLayout5 = isSquare && selectedLayout === 5;
  const isLayout5 = isHorizontal && selectedLayout === 5 && coverType === 'Papel';
  const requiresPhoto = coverType === 'Papel' && !hidePhoto;

  // Cuántos caracteres caben en una sola línea con este layout y tamaño.
  // `null` significa que el layout no renderiza ese campo.
  const textLimits = useMemo(
    () => getCoverTextLimits(coverSize, coverType, selectedLayout),
    [coverSize, coverType, selectedLayout]
  );

  // Se mide el ESTADO, no displaySubtitle: el subtítulo de muestra es un
  // placeholder que nunca se guarda y no debe bloquear nada.
  const titleOverLimit = textLimits.title !== null && coverTitle.trim().length > textLimits.title;
  const subtitleOverLimit = textLimits.subtitle !== null && coverSubtitle.trim().length > textLimits.subtitle;
  const spineOverLimit = coverType === 'Papel' && spineText.trim().length > textLimits.spine;
  const hasTextOverflow = titleOverLimit || subtitleOverLimit || spineOverLimit;

  const isFormValid = ((isSquareLayout5 || isLayout5) ? true : coverTitle.trim() !== '') &&
                      (coverType === 'Papel' ? spineText.trim() !== '' : true) &&
                      (requiresPhoto ? coverImage !== '' : true) &&
                      !hasTextOverflow;

  const SAMPLE_SUBTITLE = 'Nuestros mejores momentos juntos';
  const subtitleFieldVisible = !isSquareLayout5 && !isLayout5 && !(isVertical && selectedLayout === 1);
  const subtitleIsPlaceholder = subtitleFieldVisible && !coverSubtitle;

  const displayTitle = coverTitle || 'NUESTRA HISTORIA';
  const displaySubtitle = coverSubtitle || (subtitleFieldVisible ? SAMPLE_SUBTITLE : '');
  const displayYear = coverYear || new Date().getFullYear().toString();
  const displaySpine = spineText || displayTitle;

  const currentImageAspectRatio = useMemo(() => {
    let wPercent = 0.80; 
    let hPercent = 0.80; 

    if (coverType === 'Papel' && selectedLayout === 5) {
      wPercent = 1.0;
      hPercent = 1.0;
    } else if (coverType === 'Papel') {
      if (isVertical) {
        if (selectedLayout === 1) hPercent = 0.80 * 0.90;      
        else if (selectedLayout === 2) hPercent = 0.75 * 0.90; 
        else if (selectedLayout === 3) hPercent = 0.80;        
        else if (selectedLayout === 4) hPercent = 0.80;        
      } 
      else if (isHorizontal) {
        if (selectedLayout === 1) hPercent = 0.75 * 0.90;      
        else if (selectedLayout === 2) hPercent = 0.75 * 0.90; 
        else if (selectedLayout === 3) hPercent = 0.80;        
        else if (selectedLayout === 4) hPercent = 0.90;        
      } 
      else if (isSquare) {
        if (selectedLayout === 1) hPercent = 0.70 * 0.90;      
        else if (selectedLayout === 2) hPercent = 0.75 * 0.90; 
        else if (selectedLayout === 3) hPercent = 0.80;        
        else if (selectedLayout === 4) hPercent = 0.80;        
      }
    }

    return baseAspectRatio * (wPercent / hPercent);
  }, [selectedLayout, isVertical, isHorizontal, isSquare, baseAspectRatio, coverType]);

  const numLayouts = coverType === 'Tela' ? 3 : (isVertical ? 4 : 5);

  useEffect(() => {
    if (selectedLayout > numLayouts) {
      setSelectedLayout(1);
    }
  }, [numLayouts, selectedLayout]);

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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    file = await convertFileIfHeic(file);
    setIsValidating(true);
    const result = await checkImageDimensions(file);
    setIsValidating(false);
    processCoverUpload(file);
    if (result.isLowRes) {
      setCoverImageLowResInfo({ width: result.width, height: result.height });
    } else {
      setCoverImageLowResInfo(null);
    }
  };

  const processCoverUpload = (file: File) => {
    setCoverImage(URL.createObjectURL(file));
    setCoverCrop({ x: 50, y: 50, zoom: 1, rotation: 0 });
  };

  const getTypographyColors = () => {
    if (coverType === 'Tela') {
      return [
        { name: t('album.color.gold') || 'Dorado', color: '#D4AF37' },
        { name: t('album.color.silver') || 'Plateado', color: '#C0C0C0' },
        { name: t('album.color.black') || 'Negro', color: '#000000' },
      ];
    } else {
      return [
        { name: t('album.color.black') || 'Negro', color: '#000000' },
      ];
    }
  };

  const currentTypographyColors = getTypographyColors();

  const inputClass = (over: boolean, base: string) =>
    `${base} border-2 ${over
      ? 'bg-red-50 border-red-400 focus:border-red-500 text-red-700'
      : 'bg-gray-50 border-gray-50 focus:bg-white focus:border-black'}`;

  const CharCount = ({ used, max }: { used: number; max: number }) => (
    <span className={`text-[9px] md:text-[10px] font-black tabular-nums ${used > max ? 'text-red-500' : 'text-gray-300'}`}>
      {used}/{max}
    </span>
  );

  const OverflowMsg = ({ used, max }: { used: number; max: number }) => (
    <p className="flex items-start gap-1 text-[10px] font-medium text-red-500 ml-1">
      <AlertCircle size={12} className="shrink-0 mt-px" />
      <span>Este texto no cabe en una sola línea en este diseño. Quita {used - max} caracter{used - max === 1 ? '' : 'es'}.</span>
    </p>
  );

  const ActionButtons = () => (
    <div className="w-full space-y-2">
      {hasTextOverflow && (
        <p className="text-[10px] font-bold text-red-500 text-center">
          Ajusta los textos marcados en rojo para poder guardar.
        </p>
      )}
      <button
        onClick={() => onSave({ coverImage, coverTitle, coverSubtitle, coverYear, spineText, selectedLayout, coverCrop, typographyColor })}
        disabled={!isFormValid || isValidating}
        className={`w-full py-4 font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all text-sm ${
          isFormValid && !isValidating
            ? 'bg-black text-white hover:bg-zinc-800 shadow-xl active:scale-[0.98]'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
        }`}
      >
        <Check size={18} /> Guardar
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden overscroll-none">
      <style>{`
        @media (max-width: 768px) {
          #oneclic-badge, [id*="1clic"], iframe[src*="1clic"] {
            bottom: 110px !important;
          }
        }
      `}</style>

      {showLowResWarning && coverImageLowResInfo && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Baja Resolución Detectada</h3>
            <p className="text-sm text-gray-500 mb-6">
              Esta imagen mide <strong>{coverImageLowResInfo.width}x{coverImageLowResInfo.height}px</strong> (menor a 1080p). Al imprimirse en la portada podría verse pixelada o borrosa.
            </p>
            <div className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden mb-6 flex items-center justify-center">
              <img src={coverImage} className="w-full h-full object-contain" alt="Low res preview" />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setCoverImage(''); setCoverCrop({x:50,y:50,zoom:1,rotation:0}); setCoverImageLowResInfo(null); setShowLowResWarning(false); }}
                className="flex-1 py-3 bg-white border-2 border-gray-200 text-red-500 font-bold rounded-xl hover:bg-red-50 hover:border-red-200 transition-all"
              >
                Descartar
              </button>
              <button
                onClick={() => { setCoverImageLowResInfo(null); setShowLowResWarning(false); }}
                className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-md"
              >
                Usar de todos modos
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden p-3 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-20">
        <h2 className="text-lg font-black tracking-tighter">DISEÑA TU PORTADA</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden overscroll-contain min-h-0">
        <div className="relative w-full h-[30vh] shrink-0 md:h-full md:flex-1 bg-[#F3F4F6] flex items-center justify-center p-2 md:p-16 order-1 md:order-2 border-b md:border-b-0 border-gray-200 min-h-0">
          <div className="w-full h-full max-h-[90%] md:max-h-full flex items-center justify-center">
            <div
              className={`w-full relative group ${!hidePhoto ? 'cursor-pointer' : ''}`}
              style={{ maxWidth: isVertical ? '210px' : isHorizontal ? '300px' : '240px' }}
              onClick={() => { if (!hidePhoto) fileInputRef.current?.click(); }}
            >
              <div className="md:hidden">
                <CoverPreview
                  coverSize={coverSize} coverType={coverType} coverImage={coverImage} coverTitle={displayTitle} coverSubtitle={displaySubtitle}
                  coverYear={displayYear} spineText={displaySpine} selectedLayout={selectedLayout} coverCrop={coverCrop} typographyColor={typographyColor}
                  subtitlePlaceholder={subtitleIsPlaceholder}
                />
              </div>
              <div className="hidden md:block w-full" style={{ maxWidth: isVertical ? '400px' : isHorizontal ? '580px' : '470px' }}>
                <CoverPreview
                  coverSize={coverSize} coverType={coverType} coverImage={coverImage} coverTitle={displayTitle} coverSubtitle={displaySubtitle}
                  coverYear={displayYear} spineText={displaySpine} selectedLayout={selectedLayout} coverCrop={coverCrop} typographyColor={typographyColor}
                  subtitlePlaceholder={subtitleIsPlaceholder}
                />
              </div>
              {!hidePhoto && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none rounded-sm">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3 shadow-md">
                    <Upload className="w-6 h-6 text-black" />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="hidden md:flex absolute right-10 bottom-10 bg-black/10 backdrop-blur-md px-5 py-2.5 rounded-full items-center gap-4">
            <div className="flex flex-col"><span className="text-[8px] font-black uppercase text-black/50 leading-none">Formato</span><span className="text-xs font-bold text-black">{coverSize} CM</span></div>
          </div>
        </div>

        <div className="w-full md:w-[400px] flex flex-col bg-white md:shadow-xl z-10 order-2 md:order-1 md:h-full flex-1 md:flex-none min-h-0">
          <div className="hidden md:flex p-6 border-b border-gray-100 items-center justify-between shrink-0">
            <h2 className="text-xl font-black tracking-tighter">DISEÑA TU PORTADA</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-6 md:space-y-8 min-h-0" style={{ touchAction: 'pan-y' }}>
            
            <section>
              <div className="flex items-center gap-1.5 mb-3 text-gray-400">
                <Layout size={16} />
                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest">Layout de Diseño</h3>
              </div>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {Array.from({ length: numLayouts }, (_, i) => i + 1).map((layout) => (
                  <button
                    key={layout}
                    onClick={() => setSelectedLayout(layout)}
                    className={`relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg md:rounded-xl text-sm md:text-base font-bold transition-all border-2 ${selectedLayout === layout ? 'bg-black text-white border-black shadow-md scale-105' : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'}`}
                  >
                    {layout}
                  </button>
                ))}
              </div>
            </section>

            {coverType === 'Tela' && (
            <section>
              <div className="flex items-center gap-1.5 mb-3 text-gray-400"><Palette size={16} /><h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest">Color de Tipografía</h3></div>
              <div className="flex flex-wrap gap-3 md:gap-4">
                {currentTypographyColors.map((colorOption) => (
                  <div key={colorOption.color} className="flex flex-col items-center gap-1">
                    <button onClick={() => setTypographyColor(colorOption.color)} className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 transition-all ${typographyColor === colorOption.color ? 'border-black ring-2 ring-offset-2 ring-black scale-105' : 'border-gray-200 hover:border-gray-400'}`} style={{ backgroundColor: colorOption.color }} />
                    <span className="text-[9px] md:text-[10px] font-medium text-center">{colorOption.name}</span>
                  </div>
                ))}
              </div>
            </section>
            )}

            <section className="space-y-4 md:space-y-5">
              <div className="flex items-center gap-1.5 mb-2 text-gray-400"><Type size={16} /><h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest">Contenido del Texto</h3></div>
              <div className="space-y-3 md:space-y-4">

                {/* `textLimits.title !== null` equivale a !isSquareLayout5 && !isLayout5,
                    pero con una sola fuente de verdad: la tabla de coverTextLimits. */}
                {textLimits.title !== null && (
                  <div className="space-y-1 md:space-y-1.5">
                    <div className="flex items-baseline justify-between ml-1 mr-1">
                      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">Título Principal *</label>
                      <CharCount used={coverTitle.length} max={textLimits.title} />
                    </div>
                    <input
                      type="text"
                      value={coverTitle}
                      onChange={(e) => setCoverTitle(e.target.value)}
                      maxLength={textLimits.title}
                      aria-invalid={titleOverLimit}
                      className={inputClass(titleOverLimit, 'w-full p-2.5 md:p-3.5 rounded-lg outline-none transition-all font-bold text-[16px] md:text-base')}
                      placeholder="Título de tu álbum"
                    />
                    {titleOverLimit && <OverflowMsg used={coverTitle.length} max={textLimits.title} />}
                  </div>
                )}

                {/* SOLO SE MUESTRA EL LOMO SI ES DE PAPEL */}
                {coverType === 'Papel' && (
                  <div className="space-y-1 md:space-y-1.5">
                    <div className="flex items-baseline justify-between ml-1 mr-1">
                      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">Texto del Lomo *</label>
                      <CharCount used={spineText.length} max={textLimits.spine} />
                    </div>
                    <input
                      type="text"
                      value={spineText}
                      onChange={(e) => setSpineText(e.target.value)}
                      maxLength={textLimits.spine}
                      aria-invalid={spineOverLimit}
                      className={inputClass(spineOverLimit, 'w-full p-2.5 md:p-3.5 rounded-lg outline-none transition-all font-medium text-[16px] md:text-sm')}
                      placeholder="Texto visible en el lomo"
                    />
                    {spineOverLimit && <OverflowMsg used={spineText.length} max={textLimits.spine} />}
                  </div>
                )}

                {textLimits.subtitle !== null && (
                  <div className="space-y-1 md:space-y-1.5">
                    <div className="flex items-baseline justify-between ml-1 mr-1">
                      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">Subtítulo / Descripción</label>
                      <CharCount used={coverSubtitle.length} max={textLimits.subtitle} />
                    </div>
                    <input
                      type="text"
                      value={coverSubtitle}
                      onChange={(e) => setCoverSubtitle(e.target.value)}
                      maxLength={textLimits.subtitle}
                      aria-invalid={subtitleOverLimit}
                      className={inputClass(subtitleOverLimit, 'w-full p-2.5 md:p-3.5 rounded-lg outline-none transition-all font-medium text-[16px] md:text-sm')}
                      placeholder={SAMPLE_SUBTITLE}
                    />
                    {subtitleOverLimit && <OverflowMsg used={coverSubtitle.length} max={textLimits.subtitle} />}
                  </div>
                )}
              </div>
            </section>

            {!hidePhoto && (
              <section className="pb-4">
                 <div className="flex items-center gap-1.5 mb-3 text-gray-400">
                  <ImageIcon size={16} />
                  <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest">Imagen de Portada</h3>
                </div>
                 {isValidating ? (
                    <div className="flex flex-col items-center justify-center w-full h-24 md:h-32 border-2 border-dashed border-gray-200 rounded-xl md:rounded-2xl bg-gray-50">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400 mb-2" />
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400">Verificando...</span>
                    </div>
                 ) : coverImage ? (
                    <div 
                      className="relative group rounded-xl md:rounded-2xl overflow-hidden shadow-md w-full max-w-[200px] md:max-w-none mx-auto border border-gray-100" 
                      style={{ aspectRatio: currentImageAspectRatio }}
                    >
                      <ImageCropper 
                        src={coverImage} 
                        position={coverCrop} 
                      />
                      <div className="absolute top-2 right-2 md:top-2 md:right-2 z-10 flex gap-2.5 md:gap-2">
                        {coverImageLowResInfo && (
                          <button
                            onClick={() => setShowLowResWarning(true)}
                            className="w-7 h-7 md:w-6 md:h-6 rounded-full bg-purple-200 text-purple-600 flex items-center justify-center text-sm md:text-xs font-bold shadow-md hover:bg-purple-300 transition-colors"
                            title="Advertencia de resolución"
                          >
                            !
                          </button>
                        )}
                        <button onClick={() => setIsCropModalOpen(true)} className="bg-white/95 text-black p-2 md:p-2 rounded-full hover:scale-110 transition-transform shadow-lg hover:bg-white" title="Ajustar Recorte">
                          <CropIcon className="w-6 h-6 md:w-4 md:h-4" />
                        </button>
                        <button onClick={() => { setCoverImage(''); setCoverCrop({x: 50, y: 50, zoom: 1, rotation: 0}); setCoverImageLowResInfo(null); }} className="bg-white/95 text-black p-2 md:p-2 rounded-full hover:scale-110 transition-transform shadow-lg hover:bg-white" title="Quitar Foto">
                          <X className="w-6 h-6 md:w-4 md:h-4" />
                        </button>
                      </div>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center justify-center w-full h-24 md:h-32 border-2 border-dashed border-gray-200 rounded-xl md:rounded-2xl cursor-pointer hover:border-black hover:bg-gray-50 transition-all group" onClick={() => fileInputRef.current?.click()}>
                      <div className="p-2 md:p-3 bg-gray-50 rounded-full group-hover:bg-white transition-colors"><Upload className="text-gray-400 group-hover:text-black transition-colors w-5 h-5 md:w-6 md:h-6" /></div>
                      <span className="mt-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">Subir Foto</span>
                    </div>
                 )}
                 <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={isValidating} />
              </section>
            )}
          </div>

          <div className="hidden md:flex p-6 border-t border-gray-100 bg-gray-50/50 gap-2 shrink-0">
            <ActionButtons />
          </div>
        </div>

      </div>

      <div className="md:hidden p-4 border-t border-gray-100 bg-gray-50/50 flex gap-2 shrink-0 z-20" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <ActionButtons />
      </div>

      {isCropModalOpen && (
        <CropModal 
          isOpen={true} 
          onClose={() => setIsCropModalOpen(false)} 
          imageSrc={coverImage} 
          currentCrop={coverCrop} 
          aspectRatio={currentImageAspectRatio} 
          title="Ajustar Foto del Diseño" 
          onSave={setCoverCrop} 
        />
      )}
    </div>
  );
};

export default CoverEditor;