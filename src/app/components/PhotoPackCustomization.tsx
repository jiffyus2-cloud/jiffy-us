import { useState } from 'react';
import { PhotoPack } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import { ImageIcon } from 'lucide-react';

export interface PhotoPackCustomizationOptions {
  size: string;
  paperType: string;
  finish: 'matte' | 'glossy';
}

interface PhotoPackCustomizationProps {
  photoPack: PhotoPack;
  onCustomizationComplete: (options: PhotoPackCustomizationOptions) => void;
}

export default function PhotoPackCustomization({ photoPack, onCustomizationComplete }: PhotoPackCustomizationProps) {
  const { t } = useLanguage();
  const [size, setSize] = useState('4x6');
  const [paperType] = useState('Premium');
  const [finish, setFinish] = useState<'matte' | 'glossy'>('matte');

  const sizes = [
    { id: '4x6', name: '4" x 6"', description: t('photopack.size.standard') || 'Standard print size' },
    { id: '5x7', name: '5" x 7"', description: t('photopack.size.medium') || 'Slightly larger' },
    { id: '8x10', name: '8" x 10"', description: t('photopack.size.large') || 'Portraits' },
  ];

  const handleContinue = () => {
    onCustomizationComplete({
      size,
      paperType,
      finish,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
       {/* Photo Pack Preview */}
       <div className="mb-12">
        <h3 className="text-xl font-medium mb-4 text-center text-gray-400">{t('calendar.preview') || 'Vista Previa'}</h3>
        <div className="w-full max-w-[400px] mx-auto relative bg-gray-50 rounded-lg p-12 flex items-center justify-center border-2 border-gray-100 shadow-sm">
           <div className="relative">
              <div className="w-32 h-44 bg-white shadow-lg rounded-sm border border-gray-100 transform -rotate-12 translate-x-4 flex items-center justify-center">
                 <ImageIcon className="w-8 h-8 text-gray-100" />
              </div>
              <div className="absolute inset-0 w-32 h-44 bg-white shadow-xl rounded-sm border border-gray-200 transform rotate-6 flex items-center justify-center">
                 <ImageIcon className="w-10 h-10 text-gray-200" />
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* Size Selection */}
        <div>
          <h3 className="text-2xl mb-4">{t('album.size')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sizes.map((sizeOption) => (
              <button
                key={sizeOption.id}
                onClick={() => setSize(sizeOption.id)}
                className={`py-6 rounded-lg border-4 transition-all ${
                  size === sizeOption.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-gray-50'
                }`}
              >
                <div className="text-xl font-bold">{sizeOption.name}</div>
                <div className={`text-sm ${size === sizeOption.id ? 'text-gray-300' : 'text-gray-500'}`}>{sizeOption.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Finish Selection */}
        <div>
          <h3 className="text-2xl mb-4">{t('photopack.finish') || 'Acabado'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <button
              onClick={() => setFinish('matte')}
              className={`py-6 px-6 rounded-lg border-4 transition-all text-left ${
                finish === 'matte'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black hover:bg-gray-50'
              }`}
            >
              <div className="text-xl font-bold">Matte</div>
              <div className={`text-sm ${finish === 'matte' ? 'text-gray-300' : 'text-gray-500'}`}>{t('photopack.finish.matteDesc') || 'Non-reflective, professional look'}</div>
            </button>
            <button
              onClick={() => setFinish('glossy')}
              className={`py-6 px-6 rounded-lg border-4 transition-all text-left ${
                finish === 'glossy'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black hover:bg-gray-50'
              }`}
            >
              <div className="text-xl font-bold">Glossy</div>
              <div className={`text-sm ${finish === 'glossy' ? 'text-gray-300' : 'text-gray-500'}`}>{t('photopack.finish.glossyDesc') || 'Shiny, vibrant colors'}</div>
            </button>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <div className="mt-12">
        <button
          onClick={handleContinue}
          className="w-full py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg font-bold"
        >
          {t('album.continue')}
        </button>
      </div>
    </div>
  );
}
