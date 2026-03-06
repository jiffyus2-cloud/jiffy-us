import { useState } from 'react';
import { Type, Image as ImageIcon } from 'lucide-react';
import { MugProduct } from '../types/products';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();
  const [size, setSize] = useState('standard');
  const [capacity, setCapacity] = useState('350ml');
  const [material, setMaterial] = useState('ceramic');
  const [textImageRelation, setTextImageRelation] = useState<'separate' | 'text-cutout'>('separate');

  const sizes = [
    { id: 'standard', name: t('mug.size.standard') || 'Standard', description: '11 oz / 325ml' },
    { id: 'large', name: t('mug.size.large') || 'Large', description: '15 oz / 450ml' },
  ];

  const capacities = ['300ml', '350ml', '450ml'];

  const materials = [
    { id: 'ceramic', name: t('mug.material.ceramic') || 'Ceramic', price: 0, description: t('mug.material.ceramicDesc') || 'Classic and microwave safe' },
    { id: 'porcelain', name: t('mug.material.porcelain') || 'Porcelain', price: 3, description: t('mug.material.porcelainDesc') || 'Premium quality and elegant' },
    { id: 'stainless-steel', name: t('mug.material.steel') || 'Stainless Steel', price: 4, description: t('mug.material.steelDesc') || 'Durable and travel-friendly' },
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
      {/* Mug Preview */}
      <div className="mb-12">
        <h3 className="text-xl font-medium mb-4 text-center text-gray-400">{t('calendar.preview') || 'Vista Previa'}</h3>
        <div className="w-full max-w-[400px] mx-auto relative bg-gray-50 rounded-lg p-8 flex items-center justify-center border-2 border-gray-100 shadow-sm">
           <div className="relative w-48 h-56">
              {/* Mug shape */}
              <div className={`absolute inset-0 rounded-b-[2rem] shadow-xl border-4 border-gray-200 ${material === 'stainless-steel' ? 'bg-gradient-to-br from-gray-300 to-gray-400' : 'bg-white'}`} style={{
                clipPath: 'polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)'
              }}>
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                   <ImageIcon className="w-16 h-16" />
                </div>
              </div>
              {/* Mug handle */}
              <div className={`absolute -right-8 top-12 w-12 h-24 border-8 rounded-r-full ${material === 'stainless-steel' ? 'border-gray-400' : 'border-gray-100'}`} />
           </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* Size Selection */}
        <div>
          <h3 className="text-2xl mb-4">{t('album.size')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            {sizes.map((sizeOption) => (
              <button
                key={sizeOption.id}
                onClick={() => setSize(sizeOption.id)}
                className={`py-6 px-6 rounded-lg border-4 transition-all text-left ${
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

        {/* Capacity Selection */}
        <div>
          <h3 className="text-2xl mb-4">{t('mug.capacity') || 'Capacidad'}</h3>
          <div className="flex flex-wrap gap-3">
            {capacities.map((cap) => (
              <button
                key={cap}
                onClick={() => setCapacity(cap)}
                className={`py-4 px-8 rounded-lg border-4 transition-all font-bold ${
                  capacity === cap
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-gray-50'
                }`}
              >
                {cap}
              </button>
            ))}
          </div>
        </div>

        {/* Material Selection */}
        <div>
          <h3 className="text-2xl mb-4">{t('mug.material') || 'Material'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {materials.map((mat) => (
              <button
                key={mat.id}
                onClick={() => setMaterial(mat.id)}
                className={`py-6 px-4 rounded-lg border-4 transition-all text-center ${
                  material === mat.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black hover:bg-gray-50'
                }`}
              >
                <div className="text-lg font-bold mb-1">{mat.name}</div>
                {mat.price > 0 && (
                  <div className={`text-sm mb-2 ${material === mat.id ? 'text-gray-300' : 'text-gray-500'}`}>+${mat.price.toFixed(2)}</div>
                )}
                <div className={`text-xs ${material === mat.id ? 'text-gray-400' : 'text-gray-500'}`}>{mat.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Text Image Relation Selection */}
        <div>
          <h3 className="text-2xl mb-4">{t('mug.style') || 'Estilo de Diseño'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
            {/* Separate Option */}
            <button
              onClick={() => setTextImageRelation('separate')}
              className={`p-6 rounded-lg border-4 transition-all text-left ${
                textImageRelation === 'separate'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-lg ${textImageRelation === 'separate' ? 'bg-white text-black' : 'bg-black text-white'}`}>
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-xl font-bold">{t('mug.style.separate') || 'Imagen y Texto'}</div>
              </div>
              <p className={`text-sm ${textImageRelation === 'separate' ? 'text-gray-300' : 'text-gray-600'}`}>
                {t('mug.style.separateDesc') || 'La imagen y el texto se muestran por separado en la taza.'}
              </p>
            </button>

            {/* Text Cutout Option */}
            <button
              onClick={() => setTextImageRelation('text-cutout')}
              className={`p-6 rounded-lg border-4 transition-all text-left ${
                textImageRelation === 'text-cutout'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-black hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-lg ${textImageRelation === 'text-cutout' ? 'bg-white text-black' : 'bg-black text-white'}`}>
                  <Type className="w-6 h-6" />
                </div>
                <div className="text-xl font-bold">{t('mug.style.cutout') || 'Texto con Foto'}</div>
              </div>
              <p className={`text-sm ${textImageRelation === 'text-cutout' ? 'text-gray-300' : 'text-gray-600'}`}>
                {t('mug.style.cutoutDesc') || 'Tu foto aparece dentro de las letras de un texto grande.'}
              </p>
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