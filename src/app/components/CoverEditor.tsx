import React, { useState, useMemo } from 'react';
import { Upload, X, Check, Layout, Type, Image as ImageIcon, Palette, Crop as CropIcon } from 'lucide-react';
import CoverPreview from './CoverPreview';
import ImageCropper from './ImageCropper';
import CropModal from './CropModal';
import { useLanguage } from '../context/LanguageContext';

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
  const [coverTitle, setCoverTitle] = useState(initialData?.coverTitle || 'NUESTRA HISTORIA');
  const [coverSubtitle, setCoverSubtitle] = useState(initialData?.coverSubtitle || 'Un viaje inolvidable');
  const [coverYear, setCoverYear] = useState(initialData?.coverYear || '2024');
  
  const [spineText, setSpineText] = useState(initialData?.spineText !== undefined ? initialData.spineText : (initialData?.coverTitle || 'NUESTRA HISTORIA'));
  
  const [selectedLayout, setSelectedLayout] = useState(initialData?.selectedLayout || 1);
  const [coverCrop, setCoverCrop] = useState(initialData?.coverCrop || { x: 50, y: 50, zoom: 1, rotation: 0 });
  const [typographyColor, setTypographyColor] = useState(initialData?.typographyColor || '#000000');

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const isVertical = coverSize === '28x21';
  const isSquare = coverSize === '20x20' || coverSize === '30x30';
  const isHorizontal = coverSize === '21x28';

  const baseAspectRatio = isVertical ? 21/28 : isHorizontal ? 28/21 : 1;

  const currentImageAspectRatio = useMemo(() => {
    let wPercent = 0.80; 
    let hPercent = 0.80; 

    if (isVertical) {
      if (selectedLayout === 1) hPercent = 0.80 * 0.90;      
      else if (selectedLayout === 2) hPercent = 0.75 * 0.90; 
      else if (selectedLayout === 3) hPercent = 0.80;        
      else if (selectedLayout === 4) hPercent = 0.80;        
      else if (selectedLayout === 5) hPercent = 0.80;        
    } 
    else if (isHorizontal) {
      if (selectedLayout === 1) hPercent = 0.75 * 0.90;      
      else if (selectedLayout === 2) hPercent = 0.75 * 0.90; 
      else if (selectedLayout === 3) hPercent = 0.80;        
      else if (selectedLayout === 4) hPercent = 0.90;        
      else if (selectedLayout === 5) hPercent = 0.80;        
    } 
    else if (isSquare) {
      if (selectedLayout === 1) hPercent = 0.70 * 0.90;      
      else if (selectedLayout === 2) hPercent = 0.75 * 0.90; 
      else if (selectedLayout === 3) hPercent = 0.80;        
      else if (selectedLayout === 4) hPercent = 0.80;        
      else if (selectedLayout === 5) hPercent = 0.80;        
    }

    return baseAspectRatio * (wPercent / hPercent);
  }, [selectedLayout, isVertical, isHorizontal, isSquare, baseAspectRatio]);

  const numLayouts = isVertical ? 4 : 5;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(URL.createObjectURL(file));
      setCoverCrop({ x: 50, y: 50, zoom: 1, rotation: 0 }); 
    }
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

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col md:flex-row h-[100dvh] animate-in fade-in duration-300 overflow-hidden overscroll-none">
      
      {/* PANEL IZQUIERDO: PREVISUALIZACIÓN */}
      <div className="h-[35dvh] md:h-full md:flex-1 bg-[#F3F4F6] flex items-center justify-center p-2 md:p-16 relative order-1 md:order-2 border-b md:border-b-0 border-gray-200 shrink-0">
        <button onClick={onClose} className="hidden md:flex absolute top-10 right-10 p-3 bg-white rounded-full shadow-2xl hover:scale-110 transition-all z-20 group">
          <X size={24} className="group-hover:rotate-90 transition-transform" />
        </button>

        <div className="w-full h-full max-h-[90%] md:max-h-full flex items-center justify-center">
          <div className="w-full" style={{ maxWidth: isVertical ? '210px' : isHorizontal ? '300px' : '240px' }}>
            <div className="md:hidden">
              <CoverPreview
                coverSize={coverSize} coverImage={coverImage} coverTitle={coverTitle} coverSubtitle={coverSubtitle}
                coverYear={coverYear} spineText={spineText} selectedLayout={selectedLayout} coverCrop={coverCrop} typographyColor={typographyColor}
              />
            </div>
            <div className="hidden md:block w-full" style={{ maxWidth: isVertical ? '400px' : isHorizontal ? '580px' : '470px' }}>
              <CoverPreview
                coverSize={coverSize} coverImage={coverImage} coverTitle={coverTitle} coverSubtitle={coverSubtitle}
                coverYear={coverYear} spineText={spineText} selectedLayout={selectedLayout} coverCrop={coverCrop} typographyColor={typographyColor}
              />
            </div>
          </div>
        </div>

        <div className="hidden md:flex absolute right-10 bottom-10 bg-black/10 backdrop-blur-md px-5 py-2.5 rounded-full items-center gap-4">
          <div className="flex flex-col"><span className="text-[8px] font-black uppercase text-black/50 leading-none">Formato</span><span className="text-xs font-bold text-black">{coverSize} CM</span></div>
        </div>
      </div>

      {/* PANEL DERECHO: HERRAMIENTAS */}
      <div className="flex-1 w-full md:w-[400px] md:h-full border-r border-gray-200 flex flex-col bg-white shadow-xl z-10 order-2 md:order-1 overflow-hidden">
        <div className="p-3 md:p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg md:text-xl font-black tracking-tighter">EDITOR DE PORTADA</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors md:hidden"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6 space-y-6 md:space-y-8">
          
          <section>
            <div className="flex items-center gap-1.5 mb-3 text-gray-400">
              <Layout size={16} />
              <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest">Layout de Diseño</h3>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-2 gap-2">
              {Array.from({ length: numLayouts }, (_, i) => i + 1).map((layout) => (
                <button
                  key={layout}
                  onClick={() => setSelectedLayout(layout)}
                  className={`group relative py-2 md:py-3 px-1 rounded-lg md:rounded-xl text-xs font-bold transition-all border-2 ${selectedLayout === layout ? 'bg-black text-white border-black shadow-md scale-[1.02]' : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'}`}
                >
                  <span className="relative z-10">{layout === 1 ? 'DIS. 1' : `DIS. 0${layout}`}</span>
                  {selectedLayout === layout && <div className="absolute top-1 right-1"><Check size={10} className="text-white md:w-3 md:h-3" /></div>}
                </button>
              ))}
            </div>
          </section>

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

          <section className="space-y-4 md:space-y-5">
            <div className="flex items-center gap-1.5 mb-2 text-gray-400"><Type size={16} /><h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest">Contenido del Texto</h3></div>
            <div className="space-y-3 md:space-y-4">
              
              <div className="space-y-1 md:space-y-1.5">
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Título Principal</label>
                <input type="text" value={coverTitle} onChange={(e) => setCoverTitle(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-50 p-2.5 md:p-3.5 rounded-lg focus:bg-white focus:border-black outline-none transition-all font-bold text-[16px] md:text-base" placeholder="Título del álbum" />
              </div>

              <div className="space-y-1 md:space-y-1.5">
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Texto del Lomo</label>
                <input type="text" value={spineText} onChange={(e) => setSpineText(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-50 p-2.5 md:p-3.5 rounded-lg focus:bg-white focus:border-black outline-none transition-all font-medium text-[16px] md:text-sm" placeholder="Texto lateral (lomo)" />
              </div>

              {!( (isSquare || isHorizontal) && selectedLayout === 5 ) && (
                <div className="space-y-1 md:space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Subtítulo / Descripción</label>
                  <input type="text" value={coverSubtitle} onChange={(e) => setCoverSubtitle(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-50 p-2.5 md:p-3.5 rounded-lg focus:bg-white focus:border-black outline-none transition-all font-medium text-[16px] md:text-sm" placeholder="Subtítulo" />
                </div>
              )}

              {( (isSquare || isHorizontal) && selectedLayout === 5 ) && (
                <div className="space-y-1 md:space-y-1.5">
                  <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Año de Referencia</label>
                  <input type="text" value={coverYear} onChange={(e) => setCoverYear(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-50 p-2.5 md:p-3.5 rounded-lg focus:bg-white focus:border-black outline-none transition-all font-bold text-[16px] md:text-base" placeholder="2024" />
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
               {coverImage ? (
                  <div 
                    className="relative group rounded-xl md:rounded-2xl overflow-hidden shadow-md w-full max-w-[200px] md:max-w-none mx-auto border border-gray-100" 
                    style={{ aspectRatio: currentImageAspectRatio }}
                  >
                    <ImageCropper 
                      src={coverImage} 
                      position={coverCrop} 
                    />
                    <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-10 flex gap-2">
                      <button onClick={() => setIsCropModalOpen(true)} className="bg-white/90 text-black p-1.5 md:p-2 rounded-full hover:scale-110 transition-transform shadow-lg hover:bg-white" title="Ajustar Recorte"><CropIcon size={14} className="md:w-4 md:h-4" /></button>
                      <button onClick={() => { setCoverImage(''); setCoverCrop({x: 50, y: 50, zoom: 1, rotation: 0}); }} className="bg-white/90 text-black p-1.5 md:p-2 rounded-full hover:scale-110 transition-transform shadow-lg hover:bg-white" title="Quitar Foto"><X size={14} className="md:w-4 md:h-4" /></button>
                    </div>
                  </div>
               ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 md:h-32 border-2 border-dashed border-gray-200 rounded-xl md:rounded-2xl cursor-pointer hover:border-black hover:bg-gray-50 transition-all group">
                    <div className="p-2 md:p-3 bg-gray-50 rounded-full group-hover:bg-white transition-colors"><Upload className="text-gray-400 group-hover:text-black transition-colors w-5 h-5 md:w-6 md:h-6" /></div>
                    <span className="mt-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">Subir Foto</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
               )}
            </section>
          )}
        </div>

        <div className="p-3 md:p-6 border-t border-gray-100 bg-gray-50/50 flex gap-2 shrink-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <button onClick={onClose} className="flex-1 py-2.5 md:py-3.5 bg-white text-black border-2 border-black font-black uppercase tracking-tighter md:tracking-widest rounded-lg md:rounded-xl hover:bg-gray-50 transition-all text-[10px] sm:text-xs">Cerrar</button>
          <button onClick={() => onSave({ coverImage, coverTitle, coverSubtitle, coverYear, spineText, selectedLayout, coverCrop, typographyColor })} className="flex-[2] py-2.5 md:py-3.5 bg-black text-white font-black uppercase tracking-tighter md:tracking-widest rounded-lg md:rounded-xl flex items-center justify-center gap-1.5 md:gap-2 hover:bg-zinc-800 transition-all shadow-lg active:scale-[0.98] text-[10px] sm:text-xs"><Check size={14} className="md:w-4 md:h-4" /> Guardar Cambios</button>
        </div>
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