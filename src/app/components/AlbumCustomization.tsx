import { useState } from 'react';
import { Upload, X, Settings, Image as ImageIcon } from 'lucide-react';
import { Album } from '../types/products';
import { useLanguage } from '../context/LanguageContext';

export interface CustomizationOptions {
  coverType: 'Tela' | 'Papel';
  size: 'Cuadrado 20x20 cm' | 'Cuadrado 30x30 cm' | 'Horizontal 21x28 cm' | 'Vertical 28x21 cm';
  coverColor: string;
  typographyColor: string;
  paperType: 'Mate' | 'Brillante';
  pages: number;
  coverContent?: {
    title: string;
    subtitle: string;
    spineText: string;
    coverPhoto: string;
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
  const [pages, setPages] = useState(20);
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [coverContent, setCoverContent] = useState({
    title: t('album.defaultTitle'),
    subtitle: t('album.defaultSubtitle'),
    spineText: t('album.defaultSpine'),
    coverPhoto: '',
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

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
      {/* Album Cover Preview - Clickeable */}
      <div className="mb-12" style={{ color: 'rgba(10, 10, 10, 0.45)' }}>
        <h3 className="text-xl font-medium mb-4 text-center">{t('album.caratula')}</h3>
        <button
          onClick={() => setShowCoverEditor(true)}
          className="w-full relative bg-gray-50 rounded-lg p-12 flex items-center justify-center hover:bg-gray-100 transition-colors group"
          style={{ color: 'rgba(10, 10, 10, 1)' }}
        >
          {/* Front Cover Preview - Same as modal */}
          <div 
            className="w-80 aspect-[3/4] rounded-lg shadow-2xl overflow-hidden relative border border-gray-200"
            style={{ backgroundColor: coverColor }}
          >
            {/* Cover Photo */}
            {coverContent.coverPhoto && (
              <div className="absolute inset-0">
                <img
                  src={coverContent.coverPhoto}
                  alt="Cover"
                  className="w-full h-full object-cover opacity-60"
                />
              </div>
            )}
            
            {/* Text Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              {coverContent.title && (
                <h2 
                  className="text-4xl font-bold mb-3 drop-shadow-lg"
                  style={{ 
                    color: typographyColor,
                    textShadow: coverColor === '#000000' && typographyColor === '#000000' 
                      ? '0 0 10px rgba(255,255,255,0.5)' 
                      : '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {coverContent.title}
                </h2>
              )}
              {coverContent.subtitle && (
                <p 
                  className="text-xl drop-shadow-lg"
                  style={{ 
                    color: typographyColor,
                    textShadow: coverColor === '#000000' && typographyColor === '#000000' 
                      ? '0 0 10px rgba(255,255,255,0.5)' 
                      : '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {coverContent.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-transparent group-hover:bg-black group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <span className="font-medium">{t('album.clickToCustomize')}</span>
            </div>
          </div>
        </button>
        
        <div className="flex justify-center gap-2 mt-6">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((dot, index) => (
            <div
              key={dot}
              className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-black' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      </div>

      {/* NEW Badge */}
      <div className="relative mb-12">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-300" />
        <div className="relative flex justify-center">
          <div className="bg-white px-4">
            <div className="w-16 h-16 rounded-full border-4 border-black bg-white flex items-center justify-center">
              <span className="text-sm">{t('common.new')}</span>
            </div>
          </div>
        </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="min-h-screen flex items-start md:items-center justify-center p-4 py-8">
            <div className="bg-white rounded-lg p-6 md:p-8 max-w-6xl w-full shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-medium">{t('album.customizeCoverContent')}</h3>
                <button
                  onClick={() => setShowCoverEditor(false)}
                  className="text-gray-500 hover:text-black transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form Section */}
                <div className="space-y-6">
                  <h4 className="text-lg font-medium mb-4">{t('album.coverDetails')}</h4>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('album.title')}</label>
                    <input
                      type="text"
                      value={coverContent.title}
                      onChange={(e) => setCoverContent({ ...coverContent, title: e.target.value })}
                      placeholder={t('album.titlePlaceholder')}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    />
                  </div>

                  {/* Subtitle */}
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('album.subtitle')}</label>
                    <input
                      type="text"
                      value={coverContent.subtitle}
                      onChange={(e) => setCoverContent({ ...coverContent, subtitle: e.target.value })}
                      placeholder={t('album.subtitlePlaceholder')}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    />
                  </div>

                  {/* Spine Text */}
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('album.spineText')}</label>
                    <input
                      type="text"
                      value={coverContent.spineText}
                      onChange={(e) => setCoverContent({ ...coverContent, spineText: e.target.value })}
                      placeholder={t('album.spinePlaceholder')}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('album.spineNote')}</p>
                  </div>

                  {/* Cover Photo */}
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('album.coverPhoto')}</label>
                    {coverContent.coverPhoto ? (
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={coverContent.coverPhoto}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => setCoverContent({ ...coverContent, coverPhoto: '' })}
                          className="absolute top-2 right-2 bg-black text-white rounded-full p-2 hover:bg-gray-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e: any) => {
                            const file = e.target?.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const result = event.target?.result as string;
                                if (result) {
                                  setCoverContent({ ...coverContent, coverPhoto: result });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          };
                          input.click();
                        }}
                        className="w-full aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                      >
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-600">{t('album.uploadCoverPhoto')}</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setShowCoverEditor(false)}
                    className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    {t('album.applyChanges')}
                  </button>
                </div>

                {/* Preview Section */}
                <div className="space-y-6">
                  <h4 className="text-lg font-medium mb-4">{t('album.livePreview')}</h4>
                  
                  {/* Front Cover Preview */}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t('album.frontCover')}</p>
                    <div 
                      className="aspect-[3/4] rounded-lg shadow-xl overflow-hidden relative border border-gray-200"
                      style={{ backgroundColor: coverColor }}
                    >
                      {/* Cover Photo */}
                      {coverContent.coverPhoto && (
                        <div className="absolute inset-0">
                          <img
                            src={coverContent.coverPhoto}
                            alt="Cover"
                            className="w-full h-full object-cover opacity-60"
                          />
                        </div>
                      )}
                      
                      {/* Text Content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                        {coverContent.title && (
                          <h2 
                            className="text-3xl font-bold mb-2 drop-shadow-lg"
                            style={{ 
                              color: typographyColor,
                              textShadow: coverColor === '#000000' && typographyColor === '#000000' 
                                ? '0 0 10px rgba(255,255,255,0.5)' 
                                : '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            {coverContent.title}
                          </h2>
                        )}
                        {coverContent.subtitle && (
                          <p 
                            className="text-lg drop-shadow-lg"
                            style={{ 
                              color: typographyColor,
                              textShadow: coverColor === '#000000' && typographyColor === '#000000' 
                                ? '0 0 10px rgba(255,255,255,0.5)' 
                                : '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            {coverContent.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Spine Preview */}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t('album.spine')}</p>
                    <div 
                      className="h-20 rounded-lg shadow-lg flex items-center justify-center px-4 border border-gray-200"
                      style={{ backgroundColor: coverColor }}
                    >
                      <p 
                        className="text-sm font-medium"
                        style={{ 
                          color: typographyColor,
                          textShadow: coverColor === '#000000' && typographyColor === '#000000' 
                            ? '0 0 10px rgba(255,255,255,0.5)' 
                            : 'none'
                        }}
                      >
                        {coverContent.spineText || 'Spine Text'}
                      </p>
                    </div>
                  </div>

                  {/* 3D View Hint */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">{t('album.previewNote')}:</span> {t('album.previewNoteText')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}