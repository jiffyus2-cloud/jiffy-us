import React from 'react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { X, Trash2, BookMarked, Calendar, Coffee, Image as ImageIcon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface SavedDraft {
  id: string;
  updatedAt: string;
  product?: { name?: string; type?: string; id?: string };
  productType?: string;
  coverData?: { title?: string; image?: string };
  photos?: string[];
  pages?: Array<{ images?: string[] }>;
  items?: Array<{ photo?: string; photos?: string[] }>;
}

interface DraftPromptModalProps {
  isOpen: boolean;
  drafts: SavedDraft[];
  onContinue: (draft: SavedDraft) => void;
  onStartNew: () => void;
  onDeleteDraft: (draftId: string) => void;
}

function getDraftPreviewImage(draft: SavedDraft): string | null {
  const productString = String(
    draft.product?.type || draft.product?.id || draft.product?.name || draft.productType || ''
  ).toLowerCase();

  if (productString.includes('calendar') || productString.includes('calendario')) {
    if (draft.pages?.[0]?.images?.[0]) return draft.pages[0].images[0];
    if (Array.isArray(draft.photos) && draft.photos.length > 0) {
      const first = draft.photos[0];
      return typeof first === 'string' ? first : null;
    }
  } else if (productString.includes('mug') || productString.includes('taza')) {
    return draft.items?.[0]?.photo || draft.items?.[0]?.photos?.[0] || null;
  } else {
    if (draft.coverData?.image) return draft.coverData.image;
    if (Array.isArray(draft.photos) && draft.photos.length > 0) {
      const first = draft.photos[0];
      return typeof first === 'string' ? first : (first as any)?.[0] || null;
    }
  }
  return null;
}

function getDraftProductIcon(draft: SavedDraft) {
  const productString = String(
    draft.product?.type || draft.product?.id || draft.product?.name || draft.productType || ''
  ).toLowerCase();
  if (productString.includes('calendar') || productString.includes('calendario')) return Calendar;
  if (productString.includes('mug') || productString.includes('taza')) return Coffee;
  return ImageIcon;
}

const DraftPromptModal: React.FC<DraftPromptModalProps> = ({
  isOpen,
  drafts,
  onContinue,
  onStartNew,
  onDeleteDraft,
}) => {
  const { t, language } = useLanguage();
  const dateLocale = language === 'es' ? es : enUS;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-2.5 rounded-full">
              <BookMarked className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('draft.modalTitle')}</h2>
              <p className="text-sm text-gray-500">{t('draft.modalSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onStartNew}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Draft list */}
        <div className="px-6 pb-2 space-y-3 max-h-72 overflow-y-auto">
          {drafts.map((draft) => {
            const imageUrl = getDraftPreviewImage(draft);
            const ProductIcon = getDraftProductIcon(draft);
            const productName = draft.coverData?.title || draft.product?.name || '';
            const updatedDate = draft.updatedAt
              ? format(new Date(draft.updatedAt), 'PP', { locale: dateLocale })
              : '';

            return (
              <div
                key={draft.id}
                className="flex items-center gap-4 p-3 border border-gray-100 rounded-2xl hover:border-gray-200 hover:bg-gray-50 transition-all"
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                  {imageUrl ? (
                    <img src={imageUrl} alt={productName} className="w-full h-full object-cover" />
                  ) : (
                    <ProductIcon className="w-6 h-6 text-gray-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {productName || draft.product?.name || 'Borrador'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('draft.savedOn').replace('{date}', updatedDate)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onDeleteDraft(draft.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title={t('draft.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onContinue(draft)}
                    className="px-4 py-1.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    {t('draft.modalContinue')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4">
          <button
            onClick={onStartNew}
            className="w-full py-3 px-4 border-2 border-gray-200 hover:border-gray-400 text-gray-700 hover:text-black rounded-xl text-sm font-semibold transition-all"
          >
            {t('draft.modalStartNew')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DraftPromptModal;
