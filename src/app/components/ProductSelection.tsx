import albumImage from '../../assets/c5681b257e0dede5d7d87776730ada678398ff51.png';
import calendarImage from '../../assets/ec28dc812bed68927d47becc060a8091e563d836.png';
import mugImage from '../../assets/eb118a5bec949d55aceb42319ab38162a57c22ff.png';
import { DESIGN } from '../../styles/design-system';
import { useLanguage } from '../context/LanguageContext';

export type ProductType = 'album' | 'calendar' | 'mug';

interface ProductSelectionProps {
  selectedProduct: ProductType | null;
  onSelectProduct: (product: ProductType) => void;
  onContinue?: () => void;
}

export default function ProductSelection({ selectedProduct, onSelectProduct, onContinue }: ProductSelectionProps) {
  const { t } = useLanguage();

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl mb-4 font-medium">{t('product.title')}</h2>
        <p className={DESIGN.text.body}>
          {t('product.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Photo Album Option */}
        <button
          onClick={() => onSelectProduct('album')}
          className={`${DESIGN.card.border} ${
            selectedProduct === 'album' ? DESIGN.card.selected : DESIGN.card.unselected
          }`}
        >
          {/* Album Image */}
          <div className="w-full h-64 overflow-hidden">
            <img 
              src={albumImage} 
              alt="Photo Albums" 
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="p-8">
            <h3 className={DESIGN.text.h4}>{t('product.album')}</h3>
            <p className={`text-base mb-6 ${
              selectedProduct === 'album' ? 'text-gray-200' : 'text-gray-600'
            }`}>
              {t('product.albumDesc')}
            </p>
            
            {/* ... features list - ideally also translated but keeping it simple for now */}
          </div>

          {selectedProduct === 'album' && (
            <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-black rounded-full" />
            </div>
          )}
        </button>

        {/* Photo Calendar Option */}
        <button
          onClick={() => onSelectProduct('calendar')}
          className={`${DESIGN.card.border} ${
            selectedProduct === 'calendar' ? DESIGN.card.selected : DESIGN.card.unselected
          }`}
        >
          {/* Calendar Image */}
          <div className="w-full h-64 overflow-hidden">
            <img 
              src={calendarImage} 
              alt="Photo Calendars" 
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="p-8">
            <h3 className={DESIGN.text.h4}>{t('product.calendar')}</h3>
            <p className={`text-base mb-6 ${
              selectedProduct === 'calendar' ? 'text-gray-200' : 'text-gray-600'
            }`}>
              {t('product.calendarDesc')}
            </p>
            
            {/* ... */}
          </div>

          {selectedProduct === 'calendar' && (
            <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-black rounded-full" />
            </div>
          )}
        </button>

        {/* Mug Option */}
        <button
          onClick={() => onSelectProduct('mug')}
          className={`${DESIGN.card.border} ${
            selectedProduct === 'mug' ? DESIGN.card.selected : DESIGN.card.unselected
          }`}
        >
          {/* Mug Image */}
          <div className="w-full h-64 overflow-hidden">
            <img 
              src={mugImage} 
              alt="Photo Mugs" 
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="p-8">
            <h3 className={DESIGN.text.h4}>{t('product.mug')}</h3>
            <p className={`text-base mb-6 ${
              selectedProduct === 'mug' ? 'text-gray-200' : 'text-gray-600'
            }`}>
              {t('product.mugDesc')}
            </p>
            
            {/* ... */}
          </div>

          {selectedProduct === 'mug' && (
            <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-black rounded-full" />
            </div>
          )}
        </button>
      </div>

      {/* Continue Button */}
      <div className="max-w-6xl mx-auto mt-12">
        <button
          onClick={onContinue}
          disabled={!selectedProduct}
          className={`${DESIGN.button.base} ${DESIGN.button.primary} w-full text-lg disabled:bg-gray-300 disabled:cursor-not-allowed`}
        >
          {t('product.continue')}
        </button>
      </div>
    </div>
  );
}