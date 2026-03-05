import { useState } from 'react';
import { PhotoPack } from '../types/products';

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
  const [size, setSize] = useState('4x6');
  const [paperType, setPaperType] = useState('Premium');
  const [finish, setFinish] = useState<'matte' | 'glossy'>('matte');

  const sizes = [
    { id: '4x6', name: '4" x 6"', description: 'Standard print size' },
    { id: '5x7', name: '5" x 7"', description: 'Slightly larger' },
    { id: '8x10', name: '8" x 10"', description: 'Portraits' },
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
      <div className="mb-8">
        <h2 className="text-3xl mb-2">Customize Your Prints</h2>
        <p className="text-gray-600">
          Select the size and finish for your photos
        </p>
      </div>

      <div className="space-y-8">
        {/* Size Selection */}
        <div>
          <h3 className="text-xl mb-4">Size</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sizes.map((sizeOption) => (
              <button
                key={sizeOption.id}
                onClick={() => setSize(sizeOption.id)}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  size === sizeOption.id
                    ? 'border-black bg-gray-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-lg mb-1">{sizeOption.name}</div>
                <div className="text-sm text-gray-600">{sizeOption.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Finish Selection */}
        <div>
          <h3 className="text-xl mb-4">Finish</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setFinish('matte')}
              className={`p-6 rounded-lg border-2 transition-all text-left ${
                finish === 'matte'
                  ? 'border-black bg-gray-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-lg mb-1">Matte</div>
              <div className="text-sm text-gray-600">Non-reflective, professional look</div>
            </button>
            <button
              onClick={() => setFinish('glossy')}
              className={`p-6 rounded-lg border-2 transition-all text-left ${
                finish === 'glossy'
                  ? 'border-black bg-gray-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-lg mb-1">Glossy</div>
              <div className="text-sm text-gray-600">Shiny, vibrant colors</div>
            </button>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="w-full py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg"
        >
          Continue to Add Photos
        </button>
      </div>
    </div>
  );
}
