import { Check } from 'lucide-react';

export interface MugProduct {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  image: string;
  type: 'mug' | 'thermos';
}

interface MugStyleSelectionProps {
  selectedMug: MugProduct | null;
  onSelectMug: (mug: MugProduct) => void;
}

export default function MugStyleSelection({ selectedMug, onSelectMug }: MugStyleSelectionProps) {
  const products: MugProduct[] = [
    {
      id: 'classic-mug',
      name: 'Classic Mug',
      description: 'Perfect for your morning coffee',
      basePrice: 12.99,
      image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&h=800&fit=crop',
      type: 'mug',
    },
    {
      id: 'travel-mug',
      name: 'Travel Mug',
      description: 'Take your drink on the go',
      basePrice: 18.99,
      image: 'https://images.unsplash.com/photo-1534056136526-c7a4466b2c8e?w=800&h=800&fit=crop',
      type: 'mug',
    },
    {
      id: 'thermos-bottle',
      name: 'Thermos Bottle',
      description: 'Keeps drinks hot or cold for hours',
      basePrice: 24.99,
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&h=800&fit=crop',
      type: 'thermos',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h2 className="text-3xl mb-2">Choose Your Product Style</h2>
        <p className="text-gray-600">
          Select between mugs or thermos bottles
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelectMug(product)}
            className={`group relative rounded-lg overflow-hidden border-4 transition-all hover:shadow-xl ${
              selectedMug?.id === product.id
                ? 'border-black shadow-xl'
                : 'border-transparent hover:border-gray-300'
            }`}
          >
            {/* Selected indicator */}
            {selectedMug?.id === product.id && (
              <div className="absolute top-4 right-4 z-10 bg-black text-white rounded-full p-2">
                <Check className="w-5 h-5" />
              </div>
            )}

            {/* Image */}
            <div className="aspect-square overflow-hidden">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Info */}
            <div className="p-6 bg-white text-left">
              <h3 className="text-xl mb-2">{product.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{product.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">Starting at</span>
                <span className="text-2xl">${product.basePrice.toFixed(2)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
