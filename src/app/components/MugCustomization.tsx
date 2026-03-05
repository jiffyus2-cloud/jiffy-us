import { useState } from 'react';
import { Type, Image as ImageIcon } from 'lucide-react';
import { MugProduct } from '../types/products';

export interface MugCustomizationOptions {
  size: string;
  capacity: string;
  material: string;
  textImageRelation: 'separate' | 'text-cutout';
}

interface MugCustomizationProps {
  product: MugProduct;
  onCustomizationComplete: (options: MugCustomizationOptions) => void;
}

export default function MugCustomization({ product, onCustomizationComplete }: MugCustomizationProps) {
  const [size, setSize] = useState('standard');
  const [capacity, setCapacity] = useState('350ml');
  const [material, setMaterial] = useState('ceramic');
  const [textImageRelation, setTextImageRelation] = useState<'separate' | 'text-cutout'>('separate');

  const sizes = [
    { id: 'standard', name: 'Standard', description: '11 oz / 325ml' },
    { id: 'large', name: 'Large', description: '15 oz / 450ml' },
  ];

  const capacities = ['300ml', '350ml', '450ml'];

  const materials = [
    { id: 'ceramic', name: 'Ceramic', price: 0, description: 'Classic and microwave safe' },
    { id: 'porcelain', name: 'Porcelain', price: 3, description: 'Premium quality and elegant' },
    { id: 'stainless-steel', name: 'Stainless Steel', price: 4, description: 'Durable and travel-friendly' },
  ];

  const calculatePrice = () => {
    const materialPrice = materials.find(m => m.id === material)?.price || 0;
    return product.basePrice + materialPrice;
  };

  const handleContinue = () => {
    onCustomizationComplete({
      size,
      capacity,
      material,
      textImageRelation,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h2 className="text-3xl mb-2">Customize Your {product.name}</h2>
        <p className="text-gray-600">
          Adjust options to your preferences
        </p>
      </div>

      <div className="space-y-8">
        {/* Size Selection */}
        <div>
          <h3 className="text-xl mb-4">Size</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Capacity Selection */}
        <div>
          <h3 className="text-xl mb-4">Capacity</h3>
          <select
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg focus:outline-none focus:border-black"
          >
            {capacities.map((cap) => (
              <option key={cap} value={cap}>
                {cap}
              </option>
            ))}
          </select>
        </div>

        {/* Material Selection */}
        <div>
          <h3 className="text-xl mb-4">Material</h3>
          <div className="space-y-3">
            {materials.map((mat) => (
              <button
                key={mat.id}
                onClick={() => setMaterial(mat.id)}
                className={`w-full p-6 rounded-lg border-2 transition-all text-left ${
                  material === mat.id
                    ? 'border-black bg-gray-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-lg">{mat.name}</div>
                  {mat.price > 0 && (
                    <span className="text-sm text-gray-600">+${mat.price.toFixed(2)}</span>
                  )}
                </div>
                <div className="text-sm text-gray-600">{mat.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Text Image Relation Selection */}
        <div>
          <h3 className="text-xl mb-4">Text and Image Relation</h3>
          <p className="text-sm text-gray-600 mb-4">
            Choose how text and images will be displayed on your mug
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Separate Option */}
            <button
              onClick={() => setTextImageRelation('separate')}
              className={`p-6 rounded-lg border-2 transition-all text-left ${
                textImageRelation === 'separate'
                  ? 'border-black bg-gray-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                  textImageRelation === 'separate' ? 'bg-black text-white' : 'bg-gray-100'
                }`}>
                  <div className="flex gap-1">
                    <ImageIcon className="w-4 h-4" />
                    <Type className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-lg font-medium">Separate</div>
              </div>
              <div className="text-sm text-gray-600">
                Text and image are displayed separately. Image as background with text overlay.
              </div>
              
              {/* Visual Example */}
              <div className="mt-4 p-3 bg-white rounded border border-gray-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 opacity-50"></div>
                <div className="relative text-center">
                  <div className="text-xs font-bold text-gray-800">Your Text</div>
                </div>
              </div>
            </button>

            {/* Text Cutout Option */}
            <button
              onClick={() => setTextImageRelation('text-cutout')}
              className={`p-6 rounded-lg border-2 transition-all text-left ${
                textImageRelation === 'text-cutout'
                  ? 'border-black bg-gray-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                  textImageRelation === 'text-cutout' ? 'bg-black text-white' : 'bg-gray-100'
                }`}>
                  <Type className="w-6 h-6" />
                </div>
                <div className="text-lg font-medium">Text Cutout</div>
              </div>
              <div className="text-sm text-gray-600">
                Large text with image visible through the letters. Bold typography effect.
              </div>
              
              {/* Visual Example */}
              <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                <div className="text-center">
                  <div className="text-2xl font-black bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    TEXT
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Preview Summary */}
        <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
          <h4 className="text-lg mb-4">Customization Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Product:</span>
              <span>{product.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Size:</span>
              <span>{sizes.find(s => s.id === size)?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Capacity:</span>
              <span>{capacity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Material:</span>
              <span>{materials.find(m => m.id === material)?.name}</span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
              <span className="text-gray-600">Price per unit:</span>
              <span className="text-lg">${calculatePrice().toFixed(2)}</span>
            </div>
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