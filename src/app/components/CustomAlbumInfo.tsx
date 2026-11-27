import { useState } from 'react';
import { MessageCircle, Images, Palette, Eye, Truck, Loader2, ArrowLeft } from 'lucide-react';
import { DESIGN } from '../../styles/design-system';
import { useStoreConfig } from '../context/StoreConfigContext';
import { useLanguage } from '../context/LanguageContext';
import { RichText } from './ui/RichText';

export type CustomAlbumSize = 'customAlbum20x20' | 'customAlbum30x30' | 'customAlbumRect';

interface CustomAlbumInfoProps {
  onConfirm: (size: CustomAlbumSize) => void | Promise<void>;
  onBack: () => void;
  isSubmitting?: boolean;
}

// El título y la descripción de cada paso son editables en "Textos de la Tienda" (customAlbum.stepN.title / .desc).
const PROCESS_STEP_ICONS = [
  MessageCircle,
  Images,
  Palette,
  Eye,
  Truck,
];

const SIZE_OPTIONS: { key: CustomAlbumSize; label: string }[] = [
  { key: 'customAlbum20x20', label: '20x20 cm' },
  { key: 'customAlbum30x30', label: '30x30 cm' },
  { key: 'customAlbumRect', label: 'Rectangular' },
];

// Tramos de la curaduría de fotos (servicio opcional). Rango y precio de cada
// tramo son editables en "Textos de la Tienda" (customAlbum.curationTierN / ...Price).
// Claves escritas completas para que el test de "Textos de la Tienda" las encuentre.
const CURATION_TIERS = [
  { range: 'customAlbum.curationTier1', price: 'customAlbum.curationTier1Price' },
  { range: 'customAlbum.curationTier2', price: 'customAlbum.curationTier2Price' },
  { range: 'customAlbum.curationTier3', price: 'customAlbum.curationTier3Price' },
  { range: 'customAlbum.curationTier4', price: 'customAlbum.curationTier4Price' },
];

export default function CustomAlbumInfo({ onConfirm, onBack, isSubmitting }: CustomAlbumInfoProps) {
  const { prices } = useStoreConfig();
  const { t } = useLanguage();
  const [selectedSize, setSelectedSize] = useState<CustomAlbumSize>('customAlbum20x20');

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-16">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-black mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('step.back')}
      </button>

      <div className="text-center mb-12">
        <h2 className="text-4xl mb-4 font-medium">{t('customAlbum.title')}</h2>
        <p className={DESIGN.text.body}>
          {t('customAlbum.intro')}
        </p>
      </div>

      <div className="space-y-6 mb-12">
        {PROCESS_STEP_ICONS.map((Icon, i) => {
          return (
            <div key={i} className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium mb-1">{i + 1}. {t(`customAlbum.step${i + 1}.title`)}</h3>
                <p className="text-sm text-gray-600">{t(`customAlbum.step${i + 1}.desc`)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className={DESIGN.text.h4}>{t('customAlbum.sizeTitle')}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {t('customAlbum.sizeDesc')}
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

      <div className="border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className={DESIGN.text.h4}>{t('customAlbum.extrasTitle')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('customAlbum.extrasIntro')}</p>

        <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-100">
          <span className="font-medium">{t('customAlbum.designService')}</span>
          <span className="text-sm whitespace-nowrap">{t('customAlbum.designPrice')} COP</span>
        </div>

        <div className="pt-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium">{t('customAlbum.curationService')}</span>
            <span className="text-xs font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {t('customAlbum.optional')}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-3">{t('customAlbum.curationDesc')}</p>
          <ul className="divide-y divide-gray-100 rounded-md border border-gray-100">
            {CURATION_TIERS.map((tier) => (
              <li key={tier.range} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
                <span className="text-gray-700">{t(tier.range)}</span>
                <span className="whitespace-nowrap">{t(tier.price)} COP</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-gray-600 mt-3">
            <RichText text={t('customAlbum.curationOptionalNote')} />
          </p>
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
              {t('customAlbum.submitting')}
            </>
          ) : (
            t('customAlbum.submit')
          )}
        </button>
      </div>
    </div>
  );
}
