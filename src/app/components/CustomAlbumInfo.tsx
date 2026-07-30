import { useState } from 'react';
import { MessageCircle, Images, Palette, Eye, Truck, Loader2, ArrowLeft } from 'lucide-react';
import { DESIGN } from '../../styles/design-system';
import { useStoreConfig } from '../context/StoreConfigContext';

export type CustomAlbumSize = 'customAlbum20x20' | 'customAlbum30x30' | 'customAlbumRect';

interface CustomAlbumInfoProps {
  onConfirm: (size: CustomAlbumSize) => void | Promise<void>;
  onBack: () => void;
  isSubmitting?: boolean;
}

const PROCESS_STEPS = [
  {
    icon: MessageCircle,
    title: 'Contacta a una curadora',
    desc: 'Al confirmar, te redirigimos a WhatsApp para hablar directamente con una de nuestras curadoras.',
  },
  {
    icon: Images,
    title: 'Comparte tus fotos',
    desc: 'Le envías todas las fotos que quieras incluir en tu álbum.',
  },
  {
    icon: Palette,
    title: 'Selección y diseño',
    desc: 'La curadora escoge las mejores fotos y crea la disposición de cada página por ti.',
  },
  {
    icon: Eye,
    title: 'Revisión del borrador',
    desc: 'Te mostramos el diseño final antes de imprimir, para que apruebes cualquier ajuste.',
  },
  {
    icon: Truck,
    title: 'Impresión y envío',
    desc: 'Una vez aprobado, enviamos tu álbum a producción y lo despachamos a tu dirección.',
  },
];

const SIZE_OPTIONS: { key: CustomAlbumSize; label: string }[] = [
  { key: 'customAlbum20x20', label: '20x20 cm' },
  { key: 'customAlbum30x30', label: '30x30 cm' },
  { key: 'customAlbumRect', label: 'Rectangular' },
];

export default function CustomAlbumInfo({ onConfirm, onBack, isSubmitting }: CustomAlbumInfoProps) {
  const { prices } = useStoreConfig();
  const [selectedSize, setSelectedSize] = useState<CustomAlbumSize>('customAlbum20x20');

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-16">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-black mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </button>

      <div className="text-center mb-12">
        <h2 className="text-4xl mb-4 font-medium">Álbum Personalizado</h2>
        <p className={DESIGN.text.body}>
          Un curador te acompaña de principio a fin: tú solo compartes tus fotos, nosotros hacemos el resto.
        </p>
      </div>

      <div className="space-y-6 mb-12">
        {PROCESS_STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium mb-1">{i + 1}. {step.title}</h3>
                <p className="text-sm text-gray-600">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className={DESIGN.text.h4}>Elige un tamaño de referencia</h3>
        <p className="text-sm text-gray-500 mb-4">
          Precios estimados — la curadora confirmará el valor final según la cantidad de fotos y páginas de tu álbum.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSelectedSize(opt.key)}
              className={`${DESIGN.card.border} p-4 text-center transition-all ${
                selectedSize === opt.key ? DESIGN.card.selected : DESIGN.card.unselected
              }`}
            >
              <div className="font-medium mb-1">{opt.label}</div>
              <div className="text-sm">
                ${prices[opt.key].toLocaleString('es-CO')} COP
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => onConfirm(selectedSize)}
          disabled={isSubmitting}
          className={`${DESIGN.button.base} ${DESIGN.button.primary} flex items-center gap-2`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creando tu solicitud...
            </>
          ) : (
            'Quiero mi Álbum Personalizado'
          )}
        </button>
      </div>
    </div>
  );
}
