import { useState } from 'react';
import { Upload, X, Settings, Image as ImageIcon } from 'lucide-react';
import { Album } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import CoverEditor from './CoverEditor';
import CoverPreview from './CoverPreview';

export interface CustomizationOptions {
  coverType: 'Tela' | 'Papel';
  size: 'Cuadrado 20x20 cm' | 'Cuadrado 30x30 cm' | 'Horizontal 21x28 cm' | 'Vertical 28x21 cm';
  coverColor: string;
  typographyColor: string;
  paperType: 'Mate' | 'Brillante';
  pages: number;
  coverContent: {
    coverImage: string;
    coverTitle: string;
    coverSubtitle: string;
    coverYear: string;
    selectedLayout: number;
    coverCrop?: { x: number; y: number; zoom: number };
  };
}

interface AlbumCustomizationProps {
  album: Album;
  onCustomizationComplete: (options: CustomizationOptions) => void;
}

export default function AlbumCustomization({ album, onCustomizationComplete }: AlbumCustomizationProps) {
  const { t } = useLanguage();
  const [coverType, setCoverType] = useState<'Tela' | 'Papel'>('Tela');
  const [size, setSize] = useState<CustomizationOptions['size']>('Cuadrado 20x20 cm');
  
  // Dynamic color options based on coverType
  const getCoverColors = () => {
    if (coverType === 'Tela') {
      return [
        { name: t('album.tela'), color: '#E8DCC4', isPhoto: true }, // Using Beige as placeholder for texture
        { name: t('album.color.white'), color: '#FFFFFF', isPhoto: false },
      ];
    } else {
      return [
        { name: t('album.color.whitePhoto'), color: '#F5F5F5', isPhoto: true }, // Slightly off-white for photo option
        { name: t('album.color.white'), color: '#FFFFFF', isPhoto: false },
      ];
    }
  };

  const getTypographyColors = () => {
    if (coverType === 'Tela') {
      return [
        { name: t('album.color.gold'), color: '#D4AF37' },
        { name: t('album.color.silver'), color: '#C0C0C0' },
        { name: t('album.color.black'), color: '#000000' },
      ];
    } else {
      return [
        { name: t('album.color.black'), color: '#000000' },
      ];
    }
  };

  const currentCoverColors = getCoverColors();
  const currentTypographyColors = getTypographyColors();

  const [coverColor, setCoverColor] = useState(currentCoverColors[0].color);
  const [typographyColor, setTypographyColor] = useState(currentTypographyColors[0].color);

  const handleCoverTypeChange = (type: 'Tela' | 'Papel') => {
    setCoverType(type);
    const newCoverColors = type === 'Tela' 
      ? [{ name: t('album.tela'), color: '#E8DCC4', isPhoto: true }, { name: t('album.color.white'), color: '#FFFFFF', isPhoto: false }]
      : [{ name: t('album.color.whitePhoto'), color: '#F5F5F5', isPhoto: true }, { name: t('album.color.white'), color: '#FFFFFF', isPhoto: false }];
    const newTypoColors = type === 'Tela'
      ? [{ name: t('album.color.gold'), color: '#D4AF37' }, { name: t('album.color.silver'), color: '#C0C0C0' }, { name: t('album.color.black'), color: '#000000' }]
      : [{ name: t('album.color.black'), color: '#000000' }];
    
    setCoverColor(newCoverColors[0].color);
    setTypographyColor(newTypoColors[0].color);
  };

  const [paperType, setPaperType] = useState<'Mate' | 'Brillante'>('Mate');
  const [pages, setPages] = useState(album.pages || 40);
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [coverContent, setCoverContent] = useState<CustomizationOptions['coverContent']>({
    coverTitle: t('album.defaultTitle'),
    coverSubtitle: t('album.defaultSubtitle'),
    coverYear: '2024',
    coverImage: '',
    selectedLayout: 1,
    coverCrop: { x: 50, y: 50, zoom: 1 }
  });

  const handleContinue = () => {
    onCustomizationComplete({
      coverType,
      size,
      coverColor,
      typographyColor,
      paperType,
      pages,
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

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
      {/* Album Cover Preview - Clickeable */}
      <div className="mb-12" style={{ color: 'rgba(10, 10, 10, 0.45)' }}>
        <h3 className="text-xl font-medium mb-4 text-center">{t('album.caratula')}</h3>
        <button
          onClick={() => setShowCoverEditor(true)}
          className="w-full relative bg-gray-50 rounded-lg p-4 md:p-12 flex items-center justify-center hover:bg-gray-100 transition-colors group overflow-hidden"
          style={{ color: 'rgba(10, 10, 10, 1)' }}
        >
          {/* Front Cover Preview */}
          <div className="w-full max-w-[400px]">
            <CoverPreview
              coverSize={mapSizeToCoverSize(size)}
              coverImage={coverContent.coverImage}
              coverTitle={coverContent.coverTitle}
              coverSubtitle={coverContent.coverSubtitle}
              coverYear={coverContent.coverYear}
              selectedLayout={coverContent.selectedLayout}
              coverCrop={coverContent.coverCrop}
            />
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <span className="font-medium">{t('album.clickToCustomize')}</span>
            </div>
          </div>
        </button>
      </div>

      <div className="space-y-10">
        {/* Tipo de Carátula */}
        <div>
          <h3 className="text-2xl mb-4">{t('album.coverType')}</h3>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              onClick={() => handleCoverTypeChange('Tela')}
              className={`py-6 text-xl rounded-lg border-4 transition-all ${
                coverType === 'Tela'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              {t('album.tela')}
            </button>
            <button
              onClick={() => handleCoverTypeChange('Papel')}
              className={`py-6 text-xl rounded-lg border-4 transition-all ${
                coverType === 'Papel'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              {t('album.papel')}
            </button>
          </div>
        </div>

        {/* Tamaño */}
        <div>
          <h3 className="text-2xl mb-4">{t('album.size')}</h3>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              onClick={() => setSize('Cuadrado 20x20 cm')}
              className={`py-6 rounded-lg border-4 transition-all ${
                size === 'Cuadrado 20x20 cm'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              {t('album.size.sq20')}
            </button>
            <button
              onClick={() => setSize('Cuadrado 30x30 cm')}
              className={`py-6 rounded-lg border-4 transition-all ${
                size === 'Cuadrado 30x30 cm'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              {t('album.size.sq30')}
            </button>
            <button
              onClick={() => setSize('Horizontal 21x28 cm')}
              className={`py-6 rounded-lg border-4 transition-all ${
                size === 'Horizontal 21x28 cm'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              {t('album.size.hor21')}
            </button>
            <button
              onClick={() => setSize('Vertical 28x21 cm')}
              className={`py-6 rounded-lg border-4 transition-all ${
                size === 'Vertical 28x21 cm'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              {t('album.size.ver28')}
            </button>
          </div>
        </div>

        {/* Color de Carátula */}
        <div>
          <h3 className="text-2xl mb-4">{t('album.coverColor')}</h3>
          <div className="flex flex-wrap gap-4">
            {currentCoverColors.map((colorOption: any) => (
              <div key={colorOption.color} className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setCoverColor(colorOption.color)}
                  className={`w-16 h-16 rounded-full border-4 transition-all flex items-center justify-center ${
                    coverColor === colorOption.color
                      ? 'border-black scale-110'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: colorOption.color }}
                >
                  {colorOption.isPhoto && (
                    <ImageIcon className="w-8 h-8 text-gray-500" />
                  )}
                </button>
                <span className="text-xs text-center max-w-[80px]">{colorOption.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Color de Tipografía */}
        <div>
          <h3 className="text-2xl mb-4">{t('album.typographyColor')}</h3>
          <div className="flex flex-wrap gap-4">
            {currentTypographyColors.map((colorOption) => (
              <div key={colorOption.color} className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setTypographyColor(colorOption.color)}
                  className={`w-16 h-16 rounded-full border-4 transition-all ${
                    typographyColor === colorOption.color
                      ? 'border-black scale-110'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: colorOption.color }}
                />
                <span className="text-xs text-center">{colorOption.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tipo de Papel */}
        <div>
          <h3 className="text-2xl mb-4">{t('album.paperType')}</h3>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              onClick={() => setPaperType('Mate')}
              className={`py-6 text-xl rounded-lg border-4 transition-all ${
                paperType === 'Mate'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              {t('album.mate')}
            </button>
            <button
              onClick={() => setPaperType('Brillante')}
              className={`py-6 text-xl rounded-lg border-4 transition-all ${
                paperType === 'Brillante'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              {t('album.brillante')}
            </button>
          </div>
        </div>

        {/* Número de Páginas */}
        <div>
          <h3 className="text-2xl mb-4">{t('album.numPages')}</h3>
          <div className="max-w-md space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-6 rounded-lg border-2 border-gray-100">
              <span className="text-xl font-medium">{t('album.pagesCount')}</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPages(Math.max(40, pages - 2))}
                  className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all text-xl font-bold"
                >
                  -
                </button>
                <span className="text-2xl font-bold w-12 text-center">{pages}</span>
                <button
                  onClick={() => setPages(Math.min(100, pages + 2))}
                  className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all text-xl font-bold"
                >
                  +
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 italic">
              {t('album.pagesLimitDesc') || 'Mínimo 40 páginas, máximo 100 páginas (incrementos de 2)'}
            </p>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="mt-12">
        <button
          onClick={handleContinue}
          className="w-full py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg"
        >
          {t('album.continue')}
        </button>
      </div>

      {/* Cover Editor Modal */}
      {showCoverEditor && (
        <CoverEditor
          coverSize={mapSizeToCoverSize(size)}
          onClose={() => setShowCoverEditor(false)}
          initialData={coverContent}
          onSave={(data) => {
            setCoverContent(data);
            setShowCoverEditor(false);
          }}
        />
      )}
    </div>
  );
}
