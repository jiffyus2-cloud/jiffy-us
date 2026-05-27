import { X, BookImage, Calendar, Coffee, Image as ImageIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ProductType } from './ProductSelection';
import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getColombianHolidays, isHoliday } from '../utils/holidays';

// --- IMPORTACIÓN DINÁMICA DE CARPETAS (Magia de Vite) ---
const clientImagesGlob = import.meta.glob('../../assets/Clientes/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', { eager: true });
const allClientImages = Object.values(clientImagesGlob).map((module: any) => module.default);

const papelImagesGlob = import.meta.glob('../../assets/Papel/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', { eager: true });
const allPapelImages = Object.values(papelImagesGlob).map((module: any) => module.default);

const telaImagesGlob = import.meta.glob('../../assets/Tela/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', { eager: true });
const allTelaImages = Object.values(telaImagesGlob).map((module: any) => module.default);

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productType: ProductType;
  onConfirm?: () => void;
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// --- MINI COMPONENTE PARA EL CARRUSEL DE ESTILOS ---
const StyleCarouselCard = ({ style }: { style: any }) => {
  const images = style.images || (style.image ? [style.image] : []);
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (images.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (images.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="group border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="relative aspect-square overflow-hidden bg-gray-50 flex items-center justify-center">
        {images.length > 0 ? (
          <img
            src={images[currentIndex]}
            alt={style.name}
            className="w-full h-full object-cover transition-transform duration-500"
          />
        ) : (
          <div className="text-gray-400 flex flex-col items-center">
            <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-medium">Sin imágenes</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 px-2 py-2 md:px-3 md:py-3 bg-gradient-to-t from-black/60 to-transparent">
          <h4 className="font-semibold text-lg md:text-xl text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{style.name}</h4>
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 md:p-1.5 bg-white/90 md:bg-white/80 hover:bg-white text-black rounded-full shadow-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 md:w-5 md:h-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 md:p-1.5 bg-white/90 md:bg-white/80 hover:bg-white text-black rounded-full shadow-lg opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10 active:scale-95"
            >
              <ChevronRight className="w-5 h-5 md:w-5 md:h-5" />
            </button>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_: any, idx: number) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all shadow-sm ${idx === currentIndex ? 'w-5 md:w-4 bg-white' : 'w-2 md:w-1.5 bg-white/70'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default function ProductDetailsModal({ isOpen, onClose, productType, onConfirm }: ProductDetailsModalProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  const randomClientImages = useMemo(() => {
    if (!isOpen || allClientImages.length === 0) return [];
    const shuffled = [...allClientImages].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 6);
  }, [isOpen]);

  const handleMakeYourOwn = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onClose();
      navigate('/create', { state: { startProduct: productType } });
    }
  };

  const CalendarPreview = useMemo(() => {
    const year = 2026; 
    const holidays = getColombianHolidays(year);

    const generateCalendarGrid = (year: number, monthIndex: number) => {
        const date = new Date(year, monthIndex, 1);
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const firstDayOfWeek = date.getDay();
        const days = [];
        for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
        for (let day = 1; day <= daysInMonth; day++) days.push(day);
        return days;
    };

    return (
        <div className="animate-in fade-in duration-500">
            <h3 className="text-2xl font-bold mb-6">{t('calendar.preview')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {MONTHS_ES.slice(0, 3).map((month, index) => (
                    <div key={index} className="space-y-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">{month} {year}</p>
                        <div
                            className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mx-auto"
                            style={{ aspectRatio: '21/28' }}
                        >
                            <div className="flex h-full flex-col">
                                <div className="bg-gray-100 relative h-1/2 border-b border-gray-200 flex items-center justify-center">
                                    <ImageIcon className="w-12 h-12 text-gray-300" />
                                </div>
                                <div className="p-4 flex flex-col justify-center bg-white flex-1">
                                    <div className="text-center mb-2">
                                        <span className="text-sm font-bold text-gray-900">{month}</span>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
                                            <div key={i} className="text-center text-[8px] font-bold text-gray-400">{day}</div>
                                        ))}
                                        {generateCalendarGrid(year, index).map((day, i) => {
                                            if (!day) return <div key={i} className="aspect-square" />;
                                            const date = new Date(year, index, day);
                                            const holiday = isHoliday(date, holidays);
                                            return (
                                                <div
                                                    key={i}
                                                    className={`aspect-square flex items-center justify-center text-[9px] rounded ${holiday ? 'bg-red-50 text-red-600 font-bold' : 'bg-gray-50 text-gray-700'}`}
                                                >
                                                    {day}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  }, [t]);

  const getProductData = () => {
    switch (productType) {
      case 'album':
        const fallbackGallery = [allTelaImages[0], allPapelImages[0]].filter(Boolean);
        
        return {
          title: t('product.album'),
          description: 'Dale vida a tus recuerdos en un álbum hecho con amor, cuidado y materiales de la mejor calidad.',
          styles: [
            { name: 'Carátula Pasta Dura con foto', description: 'Portada de pasta dura personalizada con tu foto favorita. Páginas interiores en papel opalina.', images: allPapelImages },
            { name: 'Carátula Pasta Dura en Tela (solo texto)', description: 'Acabado premium con textura de lino. Páginas interiores en papel opalina.', images: allTelaImages }
          ],
          specifications: [
            { label: 'Tipos de carátula', value: 'Pasta Dura en Tela o Papel' },
            { label: 'Tamaños', value: '20x20: Cuadrado - 30x30: Cuadrado - 21x28: Vertical - 28x21: Horizontal' },
            { label: 'Cantidad de páginas', value: 'Mínimo 40, máximo 250 (incrementos de 2)' },
            { label: 'Tipo de papel', value: 'Opalina Mate' }
          ],
          galleryTitle: 'Clientes Felices',
          gallerySubtitle: 'Historias reales, recuerdos que hoy se pueden volver a sentir',
          gallery: randomClientImages.length > 0 ? randomClientImages : fallbackGallery
        };
      case 'calendar':
        return {
          title: t('product.calendar'),
          description: t('product.calendarDesc'),
          styles: [],
          specifications: [
            { label: 'Formato', value: '12 meses con tus fotos' },
            { label: 'Tipo', value: 'Escritorio o Pared (30x44 cm)' },
            { label: 'Diseño', value: '1 o 4 fotos por mes' },
            { label: 'Papel', value: 'Opalina premium' }
          ],
          galleryTitle: undefined,
          gallerySubtitle: undefined,
          gallery: [
            'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=800',
            'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800',
            'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800',
            'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800'
          ]
        };
      case 'mug':
        return {
          title: t('product.mug'),
          description: t('product.mugDesc'),
          styles: [
            { name: 'Clásica', description: 'Taza de cerámica tradicional', image: 'https://images.unsplash.com/photo-1601746905447-a5d058ee7c7f?w=800' },
            { name: 'Premium', description: 'Porcelana de alta calidad', image: 'https://images.unsplash.com/photo-1539042357369-956fb344118f?w=800' }
          ],
          specifications: [
            { label: 'Materiales', value: 'Cerámica, Porcelana, Acero Inoxidable' },
            { label: 'Capacidad', value: '11oz, 15oz' },
            { label: 'Estilo', value: 'Imagen y Texto o Texto con Foto' },
            { label: 'Uso', value: 'Apto para microondas y lavavajillas' }
          ],
          galleryTitle: undefined,
          gallerySubtitle: undefined,
          gallery: [
            'https://images.unsplash.com/photo-1539042357369-956fb344118f?w=800',
            'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800',
            'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800',
            'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=800'
          ]
        };
      case 'photo-pack':
        return {
          title: t('product.photoPack'),
          description: t('product.photoPackDesc'),
          styles: [
            { name: 'Impresiones Estándar', description: 'Fotos clásicas en varios tamaños', image: 'https://images.unsplash.com/photo-1541517155340-0220c1d1a8a3?w=800' }
          ],
          specifications: [
            { label: 'Tamaños', value: 'Estándar, Grandes, Retratos' },
            { label: 'Papel', value: 'Papel Fotográfico Premium' },
            { label: 'Acabado', value: 'Mate o Brillante' },
            { label: 'Empaque', value: 'Incluye caja de regalo' }
          ],
          galleryTitle: undefined,
          gallerySubtitle: undefined,
          gallery: [
            'https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=800',
            'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800'
          ]
        };
      default:
        return { title: '', description: '', styles: [], specifications: [], galleryTitle: undefined, gallerySubtitle: undefined, gallery: [] };
    }
  };

  if (!isOpen) return null;

  const productData = getProductData();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm overscroll-none" onClick={onClose}>
      <div 
        className="bg-white w-full h-[100dvh] md:h-auto md:max-h-[90dvh] md:rounded-3xl shadow-2xl max-w-5xl flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera Fija */}
        <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 p-4 md:p-6 relative shrink-0 z-20">
          <div className="pr-12 md:pr-16">
            <h2 className="text-xl md:text-3xl font-black tracking-tight">{productData.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 hover:bg-gray-100 rounded-full transition-colors group"
          >
            <X className="w-5 h-5 md:w-6 text-gray-400 group-hover:text-black" />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-8 space-y-8 md:space-y-12">
          {/* Estilos Disponibles */}
          {productType === 'calendar' ? (
            CalendarPreview
          ) : (
            <div>
              <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">{t('details.availableStyles')}</h3>
              <div className="grid grid-cols-1 gap-3 md:gap-6">
                {productData.styles.map((style, index) => (
                  <StyleCarouselCard key={index} style={style} />
                ))}
              </div>
            </div>
          )}

          {/* Especificaciones */}
          <div>
            <button
              onClick={() => setIsSpecsOpen(p => !p)}
              className="flex w-full items-center justify-between text-left"
            >
              <h3 className="text-xl md:text-2xl font-bold">{t('details.specifications')}</h3>
              <ChevronDown className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${isSpecsOpen ? 'rotate-180' : ''}`} />
            </button>
            {isSpecsOpen && (
              <div className="mt-4 md:mt-6 bg-gray-50 rounded-2xl md:rounded-3xl p-6 md:p-8 border border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                  {productData.specifications.map((spec, index) => (
                    <div key={index} className="flex flex-col">
                      <span className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2">{spec.label}</span>
                      <span className="text-sm md:text-base font-bold text-gray-900">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Galería de Ejemplos */}
          <div>
            <h3 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">
              {productData.galleryTitle || t('details.customerExamples')}
            </h3>
            <p className="text-xs md:text-sm text-gray-500 font-medium mb-4 md:mb-6">
              {productData.gallerySubtitle || t('details.customerExamplesDesc')}
            </p>
            <div className={`grid grid-cols-2 ${productData.gallery.length === 6 ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-2 md:gap-4`}>
              {productData.gallery.map((image, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-xl md:rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer group"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image}
                    alt={`Example ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Botón CTA Fijado Abajo */}
        <div className="bg-white/95 backdrop-blur-md p-4 md:p-6 border-t border-gray-100 shrink-0 z-20 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:pb-6">
          <button
            onClick={handleMakeYourOwn}
            className="w-full py-4 md:py-5 bg-black text-white rounded-xl md:rounded-2xl hover:bg-gray-800 transition-all text-lg md:text-xl font-bold shadow-xl hover:shadow-black/20 active:scale-[0.98]"
          >
            {t('details.makeYourOwn')}
          </button>
        </div>
      </div>

      {/* Lightbox para Imágenes */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-300 overscroll-none"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
          <div 
            className="max-w-5xl max-h-[85vh] w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Enlarged view"
              className="w-full h-full object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
            />
          </div>
        </div>
      )}
    </div>
  );
}