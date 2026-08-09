import { useState, useEffect, useRef } from 'react';
import { Upload, X, Settings, Image as ImageIcon, AlertCircle, Layout, Check } from 'lucide-react';
import { Album } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import CoverEditor from './CoverEditor';
import CoverPreview from './CoverPreview';
import { getCoverTextLimits } from '../utils/coverTextLimits';

// Importación de la imagen blanca local
import justWhiteImg from '../../assets/justwhite.png';

export interface CustomizationOptions {
  coverType: 'Tela' | 'Papel';
  size: 'Cuadrado 20x20 cm' | 'Cuadrado 30x30 cm' | 'Horizontal 21x28 cm' | 'Vertical 28x21 cm';
  coverColor: string;
  typographyColor: string;
  paperType: 'Mate' | 'Brillante';
  coverContent: {
    coverImage: string;
    coverTitle: string;
    coverSubtitle: string;
    coverYear: string;
    spineText?: string;
    selectedLayout: number;
    typographyColor: string;
    coverCrop?: { x: number; y: number; zoom: number };
  };
}

interface AlbumCustomizationProps {
  album: Album;
  onCustomizationComplete: (options: CustomizationOptions) => void;
  initialData?: CustomizationOptions | null;
}

export default function AlbumCustomization({ album, onCustomizationComplete, initialData }: AlbumCustomizationProps) {
  const { t } = useLanguage();

  const [coverType, setCoverType] = useState<'Tela' | 'Papel'>(initialData?.coverType || 'Papel');
  const [size, setSize] = useState<CustomizationOptions['size']>(initialData?.size || 'Cuadrado 20x20 cm');
  const [coverColor, setCoverColor] = useState(
    initialData?.coverColor || (initialData?.coverType === 'Tela' ? '#E8DCC4' : '#F5F5F5')
  );

  const [isCoverEdited, setIsCoverEdited] = useState(!!(initialData?.coverContent?.coverTitle));
  const [paperType] = useState<'Mate' | 'Brillante'>('Mate');

  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewFadingOut, setPreviewFadingOut] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPreview = (img: string) => {
    previewTimer.current = setTimeout(() => setPreviewImage(img), 200);
  };

  const cancelPreview = () => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
    if (previewImage) {
      setPreviewFadingOut(true);
      fadeOutTimer.current = setTimeout(() => {
        setPreviewImage(null);
        setPreviewFadingOut(false);
      }, 500);
    }
  };

  const [coverContent, setCoverContent] = useState<CustomizationOptions['coverContent']>(
    initialData?.coverContent || {
      coverTitle: '',
      coverSubtitle: '',
      coverYear: '',
      spineText: '',
      coverImage: '',
      selectedLayout: 1,
      typographyColor: '#000000',
      coverCrop: { x: 50, y: 50, zoom: 1 }
    }
  );

  const handleCoverTypeChange = (type: 'Tela' | 'Papel') => {
    setCoverType(type);
    
    // Si es Tela, usa su color característico. Si es Papel, siempre usa el Blanco para Fotos.
    const newColor = type === 'Tela' ? '#E8DCC4' : '#F5F5F5';
    setCoverColor(newColor);
    
    const isNoPhoto = type === 'Tela';
    
    setCoverContent(prev => ({
      ...prev,
      typographyColor: type === 'Papel' ? '#000000' : '#D4AF37',
      coverImage: isNoPhoto ? justWhiteImg : ''
    }));
  };

  const handleContinue = () => {
    if (!isCoverEdited || coverTextOverflows) return;
    onCustomizationComplete({
      coverType,
      size,
      coverColor,
      typographyColor: coverContent.typographyColor,
      paperType,
      coverContent,
    });
  };

  const mapSizeToCoverSize = (size: string): '20x20' | '30x30' | '21x28' | '28x21' => {
    if (size.includes('20x20')) return '20x20';
    if (size.includes('30x30')) return '30x30';
    if (size.includes('21x28')) return '21x28';
    if (size.includes('28x21')) return '28x21';
    return '20x20';
  };

  const currentCoverSize = mapSizeToCoverSize(size);

  // Determinamos el número de layouts disponibles dependiendo del material y orientación
  const numLayouts = coverType === 'Tela' ? 3 : (currentCoverSize === '28x21' ? 4 : 5);

  // Layouts full-bleed sin texto (mismo criterio que CoverEditor): cuadrado L5 y horizontal Papel L5
  const isSquareLayout5 = (currentCoverSize === '20x20' || currentCoverSize === '30x30') && coverContent.selectedLayout === 5;
  const isHorizontalPapelLayout5 = currentCoverSize === '21x28' && coverContent.selectedLayout === 5 && coverType === 'Papel';
  const subtitleFieldVisible = !isSquareLayout5 && !isHorizontalPapelLayout5 && !(currentCoverSize === '28x21' && coverContent.selectedLayout === 1);
  const SAMPLE_SUBTITLE = 'Nuestros mejores momentos juntos';
  const displaySubtitle = coverContent.coverSubtitle || (subtitleFieldVisible ? SAMPLE_SUBTITLE : '');
  const subtitleIsPlaceholder = subtitleFieldVisible && !coverContent.coverSubtitle;

  // Aquí se puede cambiar layout, tamaño y tipo de tapa sobre una portada YA
  // guardada, sin reabrir el editor — así que una portada que era válida puede
  // dejar de serlo. Sin este chequeo pasaría desbordada al pedido.
  const savedLimits = getCoverTextLimits(currentCoverSize, coverType, coverContent.selectedLayout);
  const coverTextOverflows =
    (savedLimits.title !== null && coverContent.coverTitle.trim().length > savedLimits.title) ||
    (savedLimits.subtitle !== null && coverContent.coverSubtitle.trim().length > savedLimits.subtitle) ||
    (coverType === 'Papel' && (coverContent.spineText ?? '').trim().length > savedLimits.spine);

  // Si el usuario cambia de material o tamaño y el layout seleccionado ya no existe, lo regresamos al 1
  useEffect(() => {
    if (coverContent.selectedLayout > numLayouts) {
      setCoverContent(prev => ({ ...prev, selectedLayout: 1 }));
    }
  }, [numLayouts, coverContent.selectedLayout]);

  const hidePhoto = coverType === 'Tela';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pt-3 pb-6">

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 space-y-4">
        <div className="border-b border-gray-100 pb-3 mb-3">
          <h2 className="text-xl font-bold text-gray-900">Configuración Básica del Álbum</h2>
          <p className="text-sm text-gray-500">Ajusta los materiales y dimensiones antes de diseñar la portada.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('album.coverType')}</h3>
            <div className="flex gap-3">
              <button
                onClick={() => handleCoverTypeChange('Papel')}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                  coverType === 'Papel'
                    ? 'bg-black text-white border-black shadow-md'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-black'
                }`}
              >
                {t('album.papel') || 'Papel'}
              </button>
              <button
                onClick={() => handleCoverTypeChange('Tela')}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${
                  coverType === 'Tela'
                    ? 'bg-black text-white border-black shadow-md'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-black'
                }`}
              >
                {t('album.tela') || 'Tela'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('album.size')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'Cuadrado 20x20 cm' as const, label: '20x20 cm', img: '/size-20x20.jpeg' },
                { value: 'Cuadrado 30x30 cm' as const, label: '30x30 cm', img: '/size-30x30.jpeg' },
                { value: 'Horizontal 21x28 cm' as const, label: '21x28 cm (H)', img: '/size-horizontal.jpeg' },
                { value: 'Vertical 28x21 cm' as const, label: '28x21 cm (V)', img: '/size-vertical.jpeg' },
              ].map(({ value, label, img }) => (
                <button
                  key={value}
                  onClick={() => setSize(value)}
                  onMouseDown={() => startPreview(img)}
                  onMouseUp={cancelPreview}
                  onMouseLeave={cancelPreview}
                  onTouchStart={() => startPreview(img)}
                  onTouchEnd={cancelPreview}
                  className={`h-20 rounded-xl border-2 text-xs font-bold transition-all flex items-center overflow-hidden ${
                    size === value
                      ? 'bg-black text-white border-black shadow-md'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-black'
                  }`}
                >
                  <span className="flex-1 px-2">{label}</span>
                  <img src={img} alt={label} className="h-full aspect-square object-cover" />
                </button>
              ))}
            </div>

            {previewImage && (
              <div
                className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
                style={{ animation: `${previewFadingOut ? 'fadeOut' : 'fadeIn'} 500ms ease forwards` }}
                onMouseUp={cancelPreview}
                onTouchEnd={cancelPreview}
              >
                <style>{`
                  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                  @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
                `}</style>
                <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-center mb-3">
          <h3 className="text-2xl font-bold text-gray-900">Personaliza tu Portada</h3>
          <p className="text-sm text-gray-500 mt-1">
            Elige el diseño que más te guste y luego haz clic en la portada para añadir tus textos y fotos.
          </p>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-center gap-2 mb-3 text-gray-400">
            <Layout className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Diseños Disponibles</h3>
          </div>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            {Array.from({ length: numLayouts }, (_, i) => i + 1).map((layout) => (
              <button
                key={layout}
                onClick={() => setCoverContent(prev => ({ ...prev, selectedLayout: layout }))}
                className={`relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl text-sm md:text-base font-bold transition-all border-2 ${
                  coverContent.selectedLayout === layout 
                    ? 'bg-black text-white border-black shadow-md scale-105' 
                    : 'bg-white text-gray-500 border-gray-200 hover:border-black hover:text-black'
                }`}
              >
                {layout}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowCoverEditor(true)}
          className={`w-full relative rounded-2xl p-4 md:p-8 flex items-center justify-center transition-all group overflow-hidden border-2 ${
            !isCoverEdited ? 'bg-amber-50 border-dashed border-amber-300 hover:bg-amber-100 hover:border-amber-400' : 'bg-gray-50 border-solid border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="w-full max-w-[400px] shadow-2xl rounded-sm transition-transform duration-300 group-hover:scale-[1.02]">
            <CoverPreview
              coverSize={currentCoverSize}
              coverType={coverType}
              coverImage={coverContent.coverImage}
              coverTitle={coverContent.coverTitle || 'NUESTRA HISTORIA'}
              coverSubtitle={displaySubtitle}
              coverYear={coverContent.coverYear || new Date().getFullYear().toString()}
              spineText={coverContent.spineText || coverContent.coverTitle || 'NUESTRA HISTORIA'}
              selectedLayout={coverContent.selectedLayout}
              coverCrop={coverContent.coverCrop}
              typographyColor={coverContent.typographyColor}
              subtitlePlaceholder={subtitleIsPlaceholder}
            />
          </div>

          <div className="absolute inset-0 bg-transparent group-hover:bg-black/5 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm">
                {!isCoverEdited ? 'Haz clic para añadir foto y texto' : 'Modificar portada'}
              </span>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-4">
        <button
          onClick={handleContinue}
          disabled={!isCoverEdited || coverTextOverflows}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-md flex items-center justify-center gap-2 ${
            isCoverEdited && !coverTextOverflows
              ? 'bg-black text-white hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {(!isCoverEdited || coverTextOverflows) && <AlertCircle className="w-5 h-5" />}
          {!isCoverEdited
            ? 'Diseña tu portada para continuar'
            : coverTextOverflows
            ? 'Tus textos no caben en este diseño — edita la portada'
            : t('album.continue') || 'Continuar al organizador de fotos'}
        </button>
      </div>

      {showCoverEditor && (
        <CoverEditor
          coverSize={currentCoverSize}
          coverType={coverType}
          hidePhoto={hidePhoto}
          onClose={() => setShowCoverEditor(false)}
          initialData={coverContent}
          onSave={(data) => {
            setCoverContent(data);
            setIsCoverEdited(true); 
            setShowCoverEditor(false);
          }}
        />
      )}
    </div>
  );
}