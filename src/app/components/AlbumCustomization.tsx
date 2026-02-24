import { useState } from 'react';
import { Upload, X, Settings } from 'lucide-react';
import type { Album } from './AlbumSelection';

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

const coverColors = [
  { name: 'Beige', color: '#E8DCC4' },
  { name: 'Gray', color: '#9B9B9B' },
  { name: 'Black', color: '#000000' },
  { name: 'White', color: '#FFFFFF' },
];

const typographyColors = [
  { name: 'Black', color: '#000000' },
  { name: 'White', color: '#FFFFFF' },
  { name: 'Gold', color: '#D4AF37' },
  { name: 'Silver', color: '#C0C0C0' },
  { name: 'Navy', color: '#1A1A3E' },
];

export default function AlbumCustomization({ album, onCustomizationComplete }: AlbumCustomizationProps) {
  const [coverType, setCoverType] = useState<'Tela' | 'Papel'>('Tela');
  const [size, setSize] = useState<CustomizationOptions['size']>('Cuadrado 20x20 cm');
  const [coverColor, setCoverColor] = useState(coverColors[0].color);
  const [typographyColor, setTypographyColor] = useState(typographyColors[0].color);
  const [paperType, setPaperType] = useState<'Mate' | 'Brillante'>('Mate');
  const [pages, setPages] = useState(20);
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [coverContent, setCoverContent] = useState({
    title: 'My Photo Album',
    subtitle: '2024',
    spineText: 'Memories',
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
      <div className="mb-12">
        <h3 className="text-xl font-medium mb-4 text-center">Carátula</h3>
        <button
          onClick={() => setShowCoverEditor(true)}
          className="w-full relative bg-gray-50 rounded-lg p-12 flex items-center justify-center hover:bg-gray-100 transition-colors group"
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
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <span className="font-medium">Click to customize cover</span>
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
              <span className="text-sm">NEW</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* Tipo de Carátula */}
        <div>
          <h3 className="text-2xl mb-4">Tipo de Carátula</h3>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              onClick={() => setCoverType('Tela')}
              className={`py-6 text-xl rounded-lg border-4 transition-all ${
                coverType === 'Tela'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              Tela
            </button>
            <button
              onClick={() => setCoverType('Papel')}
              className={`py-6 text-xl rounded-lg border-4 transition-all ${
                coverType === 'Papel'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              Papel
            </button>
          </div>
        </div>

        {/* Tamaño */}
        <div>
          <h3 className="text-2xl mb-4">Tamaño</h3>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              onClick={() => setSize('Cuadrado 20x20 cm')}
              className={`py-6 rounded-lg border-4 transition-all ${
                size === 'Cuadrado 20x20 cm'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              Cuadrado 20x20 cm
            </button>
            <button
              onClick={() => setSize('Cuadrado 30x30 cm')}
              className={`py-6 rounded-lg border-4 transition-all ${
                size === 'Cuadrado 30x30 cm'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              Cuadrado 30x30 cm
            </button>
            <button
              onClick={() => setSize('Horizontal 21x28 cm')}
              className={`py-6 rounded-lg border-4 transition-all ${
                size === 'Horizontal 21x28 cm'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              Horizontal 21x28 cm
            </button>
            <button
              onClick={() => setSize('Vertical 28x21 cm')}
              className={`py-6 rounded-lg border-4 transition-all ${
                size === 'Vertical 28x21 cm'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              Vertical 28x21 cm
            </button>
          </div>
        </div>

        {/* Color de Carátula */}
        <div>
          <h3 className="text-2xl mb-4">Color de Carátula</h3>
          <div className="flex gap-4">
            {coverColors.map((colorOption) => (
              <button
                key={colorOption.color}
                onClick={() => setCoverColor(colorOption.color)}
                className={`w-16 h-16 rounded-full border-4 transition-all ${
                  coverColor === colorOption.color
                    ? 'border-black scale-110'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: colorOption.color }}
                title={colorOption.name}
              />
            ))}
          </div>
        </div>

        {/* Color de Tipografía */}
        <div>
          <h3 className="text-2xl mb-4">Color de Tipografía</h3>
          <div className="flex gap-4">
            {typographyColors.map((colorOption) => (
              <button
                key={colorOption.color}
                onClick={() => setTypographyColor(colorOption.color)}
                className={`w-16 h-16 rounded-full border-4 transition-all ${
                  typographyColor === colorOption.color
                    ? 'border-black scale-110'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: colorOption.color }}
                title={colorOption.name}
              />
            ))}
          </div>
        </div>

        {/* Tipo de Papel */}
        <div>
          <h3 className="text-2xl mb-4">Tipo de Papel</h3>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              onClick={() => setPaperType('Mate')}
              className={`py-6 text-xl rounded-lg border-4 transition-all ${
                paperType === 'Mate'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              Mate
            </button>
            <button
              onClick={() => setPaperType('Brillante')}
              className={`py-6 text-xl rounded-lg border-4 transition-all ${
                paperType === 'Brillante'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black'
              }`}
            >
              Brillante
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
          Continuar
        </button>
      </div>

      {/* Cover Editor Modal */}
      {showCoverEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="min-h-screen flex items-start md:items-center justify-center p-4 py-8">
            <div className="bg-white rounded-lg p-6 md:p-8 max-w-6xl w-full shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-medium">Customize Cover Content</h3>
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
                  <h4 className="text-lg font-medium mb-4">Cover Details</h4>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <input
                      type="text"
                      value={coverContent.title}
                      onChange={(e) => setCoverContent({ ...coverContent, title: e.target.value })}
                      placeholder="Enter album title..."
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    />
                  </div>

                  {/* Subtitle */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Subtitle</label>
                    <input
                      type="text"
                      value={coverContent.subtitle}
                      onChange={(e) => setCoverContent({ ...coverContent, subtitle: e.target.value })}
                      placeholder="Enter subtitle (e.g., year, location)..."
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    />
                  </div>

                  {/* Spine Text */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Spine Text</label>
                    <input
                      type="text"
                      value={coverContent.spineText}
                      onChange={(e) => setCoverContent({ ...coverContent, spineText: e.target.value })}
                      placeholder="Text for the spine..."
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    />
                    <p className="text-xs text-gray-500 mt-1">This text will appear on the spine of the album</p>
                  </div>

                  {/* Cover Photo */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Cover Photo</label>
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
                        <span className="text-sm text-gray-600">Upload Cover Photo</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setShowCoverEditor(false)}
                    className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Apply Changes
                  </button>
                </div>

                {/* Preview Section */}
                <div className="space-y-6">
                  <h4 className="text-lg font-medium mb-4">Live Preview</h4>
                  
                  {/* Front Cover Preview */}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Front Cover</p>
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
                    <p className="text-sm text-gray-600 mb-2">Spine</p>
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
                      <span className="font-medium">Preview Note:</span> This is a simplified preview. 
                      The final album will have a professional finish matching your selected cover type ({coverType}).
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

export type { CustomizationOptions };