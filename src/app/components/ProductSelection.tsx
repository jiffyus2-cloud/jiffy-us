import albumImage from '../../assets/Album2.jpeg';
import calendarImage from '../../assets/ec28dc812bed68927d47becc060a8091e563d836.png';
import mugImage from '../../assets/eb118a5bec949d55aceb42319ab38162a57c22ff.png';
import { DESIGN } from '../../styles/design-system';
import { useLanguage } from '../context/LanguageContext';

export type ProductType = 'album' | 'calendar' | 'mug' | 'photo-pack';

interface ProductSelectionProps {
  onSelectProduct: (product: ProductType) => void;
}

export default function ProductSelection({ onSelectProduct }: ProductSelectionProps) {
  const { t } = useLanguage();

  // Lectura de variables de entorno para mostrar/ocultar productos
  const showMugs = import.meta.env.VITE_SHOW_MUGS === 'true';
  const showPhotoPacks = import.meta.env.VITE_SHOW_PHOTO_PACKS === 'true';

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl mb-4 font-medium">{t('product.title')}</h2>
        <p className={DESIGN.text.body}>
          {t('product.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
        {/* Photo Album Option */}
        <button
          onClick={() => onSelectProduct('album')}
          className={`${DESIGN.card.border} ${DESIGN.card.unselected} hover:border-black transition-all group`}
        >
          {/* Album Image */}
          <div className="w-full h-48 overflow-hidden">
            <img 
              src={albumImage} 
              alt="Photo Albums" 
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          <div className="p-6">
            <h3 className={DESIGN.text.h4}>{t('product.album')}</h3>
            <p className="text-sm mb-4 text-gray-600">
              Cada recuerdo es único y merece ser contado. Álbumes con páginas en papel opalina para tus momentos más importantes.
            </p>
          </div>
        </button>

        {/* Photo Calendar Option */}
        <button
          onClick={() => onSelectProduct('calendar')}
          className={`${DESIGN.card.border} ${DESIGN.card.unselected} hover:border-black transition-all group`}
        >
          {/* Calendar Image */}
          <div className="w-full h-48 overflow-hidden">
            <img 
              src={calendarImage} 
              alt="Photo Calendars" 
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          <div className="p-6">
            <h3 className={DESIGN.text.h4}>{t('product.calendar')}</h3>
            <p className="text-sm mb-4 text-gray-600">
              Tus días merecen la mejor sonrisa. Calendarios personalizados para recibir el día con la mejor actitud.
            </p>
          </div>
        </button>

        {/* Mug Option */}
        {showMugs && (
          <button
            onClick={() => onSelectProduct('mug')}
            className={`${DESIGN.card.border} ${DESIGN.card.unselected} hover:border-black transition-all group`}
          >
            {/* Mug Image */}
            <div className="w-full h-48 overflow-hidden">
              <img 
                src={mugImage} 
                alt="Photo Mugs" 
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            <div className="p-6">
              <h3 className={DESIGN.text.h4}>{t('product.mug')}</h3>
              <p className="text-sm mb-4 text-gray-600">
                {t('product.mugDesc')}
              </p>
            </div>
          </button>
        )}

        {/* Photo Pack Option */}
        {showPhotoPacks && (
          <button
            onClick={() => onSelectProduct('photo-pack')}
            className={`${DESIGN.card.border} ${DESIGN.card.unselected} hover:border-black transition-all group`}
          >
            {/* Photo Pack Image */}
            <div className="w-full h-48 overflow-hidden bg-gray-100 flex items-center justify-center">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 bg-white border border-gray-200 rotate-3 shadow-sm flex items-center justify-center overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1541517155340-0220c1d1a8a3?w=200&h=200&fit=crop" alt="photo" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-white border border-gray-200 -rotate-3 shadow-sm flex items-center justify-center overflow-hidden translate-x-2 translate-y-2">
                  <img src="https://images.unsplash.com/photo-1554080353-a576cf803bda?w=200&h=200&fit=crop" alt="photo" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>

            <div className="p-6">
              <h3 className={DESIGN.text.h4}>{t('product.photoPack')}</h3>
              <p className="text-sm mb-4 text-gray-600">
                {t('product.photoPackDesc')}
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}