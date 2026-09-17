import { useSystemImage } from '../context/SystemImagesContext';
import { DESIGN } from '../../styles/design-system';
import { useLanguage } from '../context/LanguageContext';

export type ProductType = 'album' | 'calendar' | 'custom-album';

interface ProductSelectionProps {
  onSelectProduct: (product: ProductType) => void;
}

export default function ProductSelection({ onSelectProduct }: ProductSelectionProps) {
  const { t } = useLanguage();

  // Sustituibles desde el panel de administración; por defecto, los assets originales.
  const albumImage = useSystemImage('creator.product.album');
  const calendarImage = useSystemImage('creator.product.calendar');

  // Ancho equivalente a las columnas de la grilla previa (gap-8 = 2rem):
  // 2 por fila en md, 4 por fila en lg. flex-wrap + justify-center centra la última fila.
  const CARD_WIDTH = 'w-full md:w-[calc(50%_-_1rem)] lg:w-[calc(25%_-_1.5rem)]';

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl mb-4 font-medium">{t('product.title')}</h2>
        <p className={DESIGN.text.body}>
          {t('product.subtitle')}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto">
        {/* Photo Album Option */}
        <button
          onClick={() => onSelectProduct('album')}
          className={`${CARD_WIDTH} ${DESIGN.card.border} ${DESIGN.card.unselected} hover:border-black transition-all group`}
        >
          {/* Album Image */}
          <div className="w-full aspect-square overflow-hidden">
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
          className={`${CARD_WIDTH} ${DESIGN.card.border} ${DESIGN.card.unselected} hover:border-black transition-all group`}
        >
          {/* Calendar Image */}
          <div className="w-full aspect-square overflow-hidden">
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

        {/* Custom Album Option */}
        <button
          onClick={() => onSelectProduct('custom-album')}
          className={`${CARD_WIDTH} ${DESIGN.card.border} ${DESIGN.card.unselected} hover:border-black transition-all group`}
        >
          <div className="w-full aspect-square overflow-hidden">
            <img
              src={albumImage}
              alt="Custom Album"
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          <div className="p-6">
            <h3 className={DESIGN.text.h4}>Álbum Personalizado</h3>
            <p className="text-sm mb-4 text-gray-600">
              Una curadora selecciona tus mejores fotos y diseña cada página por ti, de principio a fin.
            </p>
          </div>
        </button>

      </div>
    </div>
  );
}