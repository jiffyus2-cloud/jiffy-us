import { Coffee } from 'lucide-react';
import { MugProduct } from '../types/products';
import { useLanguage } from '../context/LanguageContext';

export interface MugCustomizationOptions {
  // Las opciones se movieron a nivel individual en cada taza
}

interface MugCustomizationProps {
  product: MugProduct;
  onCustomizationComplete: (options: MugCustomizationOptions) => void;
}

export default function MugCustomization({ product, onCustomizationComplete }: MugCustomizationProps) {
  const { t } = useLanguage();

  const handleContinue = () => {
    onCustomizationComplete({});
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-16 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white p-10 md:p-16 rounded-3xl shadow-sm border border-gray-100 space-y-6">
        <div className="mx-auto w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <Coffee className="w-12 h-12 text-gray-900" />
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Diseña tus Tazas</h2>
        <p className="text-gray-500 max-w-lg mx-auto text-lg leading-relaxed">
          En el siguiente paso podrás subir tus fotos, añadir textos personalizados y seleccionar el estilo visual de forma <strong>independiente para cada taza</strong> que desees crear.
        </p>
        <div className="pt-8 max-w-sm mx-auto">
          <button
            onClick={handleContinue}
            className="w-full py-4 px-8 bg-black text-white rounded-2xl hover:bg-gray-800 transition-all text-lg font-bold shadow-xl shadow-black/10 hover:-translate-y-0.5"
          >
            {t('album.continue') || 'Comenzar a Diseñar'}
          </button>
        </div>
      </div>
    </div>
  );
}