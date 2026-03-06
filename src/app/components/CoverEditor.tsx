import React, { useState, useMemo } from 'react';
import { Upload, X, Check, Layout, Type, Image as ImageIcon } from 'lucide-react';
import CoverPreview from './CoverPreview';

interface CoverEditorProps {
  coverSize: '20x20' | '30x30' | '21x28' | '28x21';
  onClose: () => void;
  onSave: (data: {
    coverImage: string;
    coverTitle: string;
    coverSubtitle: string;
    coverYear: string;
    selectedLayout: number;
  }) => void;
  initialData?: {
    coverImage: string;
    coverTitle: string;
    coverSubtitle: string;
    coverYear: string;
    selectedLayout: number;
  };
}

const CoverEditor: React.FC<CoverEditorProps> = ({ 
  coverSize, 
  onClose, 
  onSave,
  initialData 
}) => {
  // Estados Locales
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || '');
  const [coverTitle, setCoverTitle] = useState(initialData?.coverTitle || 'NUESTRA HISTORIA');
  const [coverSubtitle, setCoverSubtitle] = useState(initialData?.coverSubtitle || 'Un viaje inolvidable');
  const [coverYear, setCoverYear] = useState(initialData?.coverYear || '2024');
  const [selectedLayout, setSelectedLayout] = useState(initialData?.selectedLayout || 1);

  // Derivados de Formato
  const isVertical = coverSize === '28x21';
  const isSquare = coverSize === '20x20' || coverSize === '30x30';
  const isHorizontal = coverSize === '21x28';

  // Regla: Aspect-ratio dinámico
  const aspectRatio = useMemo(() => {
    if (isVertical) return '21 / 28';
    if (isHorizontal) return '28 / 21';
    return '1 / 1'; // Cuadrado
  }, [isVertical, isHorizontal]);

  // Regla: Cantidad de layouts según formato
  const numLayouts = isVertical ? 4 : 5;

  // Manejo de Imagen
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col md:flex-row h-screen animate-in fade-in duration-300 overflow-hidden">
      {/* Area de Previsualización (Main Canvas) - Arriba en móvil */}
      <div className="h-[40vh] md:h-full md:flex-1 bg-[#F3F4F6] flex items-center justify-center p-4 md:p-16 relative order-1 md:order-2 border-b md:border-b-0 border-gray-200">
        <button 
          onClick={onClose} 
          className="hidden md:flex absolute top-10 right-10 p-4 bg-white rounded-full shadow-2xl hover:scale-110 transition-all z-20 group"
        >
          <X size={28} className="group-hover:rotate-90 transition-transform" />
        </button>

        {/* Contenedor del Álbum */}
        <div 
          className="w-full max-w-[300px] md:max-w-[650px]"
          style={{ 
            maxWidth: isVertical ? '250px' : isHorizontal ? '350px' : '300px'
          }}
        >
          <div className="md:hidden">
            {/* Escala reducida para móvil si es necesario, o simplemente confiar en el responsive de CoverPreview */}
          </div>
          <CoverPreview
            coverSize={coverSize}
            coverImage={coverImage}
            coverTitle={coverTitle}
            coverSubtitle={coverSubtitle}
            coverYear={coverYear}
            selectedLayout={selectedLayout}
          />
        </div>

        {/* Etiqueta de Formato Técnico - Simplificada en móvil */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:bottom-10 md:left-auto md:right-10 md:translate-x-0 bg-white/80 md:bg-black/10 backdrop-blur-md px-4 py-2 md:px-6 md:py-3 rounded-full flex items-center gap-2 md:gap-4 shadow-sm md:shadow-none">
          <div className="flex flex-col">
            <span className="text-[7px] md:text-[8px] font-black uppercase text-black/40 leading-none">Formato</span>
            <span className="text-[10px] md:text-xs font-bold text-black">{coverSize} CM</span>
          </div>
          <div className="w-px h-4 md:h-6 bg-black/10" />
          <div className="flex flex-col">
            <span className="text-[7px] md:text-[8px] font-black uppercase text-black/40 leading-none">Ratio</span>
            <span className="text-[10px] md:text-xs font-bold text-black">{aspectRatio}</span>
          </div>
        </div>
      </div>

      {/* Menu de Personalización - Abajo en móvil */}
      <div className="flex-1 md:w-[400px] md:h-full border-r border-gray-200 flex flex-col bg-white shadow-xl z-10 order-2 md:order-1 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-black tracking-tighter">EDITOR DE PORTADA</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors md:hidden">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 md:space-y-10">
          {/* Selector de Layouts */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-gray-400">
              <Layout size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest">Layout de Diseño</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: numLayouts }, (_, i) => i + 1).map((layout) => (
                <button
                  key={layout}
                  onClick={() => setSelectedLayout(layout)}
                  className={`group relative py-4 px-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    selectedLayout === layout 
                      ? 'bg-black text-white border-black shadow-lg scale-[1.02]' 
                      : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'
                  }`}
                >
                  <span className="relative z-10">DISEÑO 0{layout}</span>
                  {selectedLayout === layout && (
                    <div className="absolute top-1 right-1">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Inputs de Texto Dinámicos */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-4 text-gray-400">
              <Type size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest">Contenido del Texto</h3>
            </div>

            <div className="space-y-5">
              {/* Título: Siempre visible */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Título Principal</label>
                <input
                  type="text"
                  value={coverTitle}
                  onChange={(e) => setCoverTitle(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-50 p-4 rounded-xl focus:bg-white focus:border-black outline-none transition-all font-bold text-lg"
                  placeholder="Título del álbum"
                />
              </div>

              {/* Subtítulo: Oculto en Square L5 y Horizontal L5 */}
              {!( (isSquare || isHorizontal) && selectedLayout === 5 ) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Subtítulo / Descripción</label>
                  <input
                    type="text"
                    value={coverSubtitle}
                    onChange={(e) => setCoverSubtitle(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-50 p-4 rounded-xl focus:bg-white focus:border-black outline-none transition-all font-medium"
                    placeholder="Subtítulo"
                  />
                </div>
              )}

              {/* Año: Solo visible en Square L5 y Horizontal L5 */}
              {( (isSquare || isHorizontal) && selectedLayout === 5 ) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Año de Referencia</label>
                  <input
                    type="text"
                    value={coverYear}
                    onChange={(e) => setCoverYear(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-50 p-4 rounded-xl focus:bg-white focus:border-black outline-none transition-all font-bold text-lg"
                    placeholder="2024"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Carga de Imagen */}
          <section>
             <div className="flex items-center gap-2 mb-4 text-gray-400">
              <ImageIcon size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest">Imagen de Portada</h3>
            </div>
             {coverImage ? (
                <div className="relative group rounded-2xl overflow-hidden shadow-md">
                  <img src={coverImage} alt="Cover preview" className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => setCoverImage('')}
                      className="bg-white text-black p-3 rounded-full hover:scale-110 transition-transform shadow-xl"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
             ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-black hover:bg-gray-50 transition-all group">
                  <div className="p-4 bg-gray-50 rounded-full group-hover:bg-white transition-colors">
                    <Upload className="text-gray-400 group-hover:text-black transition-colors" size={32} />
                  </div>
                  <span className="mt-4 text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors">Subir Foto</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
             )}
          </section>
        </div>

        {/* Footer de Acciones */}
        <div className="p-8 border-t border-gray-100 bg-gray-50/50 space-y-4">
          <button 
            onClick={() => onSave({ coverImage, coverTitle, coverSubtitle, coverYear, selectedLayout })}
            className="w-full py-5 bg-black text-white font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl active:scale-[0.98]"
          >
            <Check size={20} /> Guardar Cambios
          </button>
          <button 
            onClick={onClose}
            className="w-full py-4 bg-white text-black border-2 border-black font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
          >
            Cerrar Editor
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoverEditor;
