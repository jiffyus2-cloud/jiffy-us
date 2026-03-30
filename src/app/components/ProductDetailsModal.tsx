import { X, BookImage, Calendar, Coffee, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ProductType } from './ProductSelection';
import { useState, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getColombianHolidays, isHoliday } from '../utils/holidays';

// --- IMPORTACIÓN DE IMÁGENES LOCALES PARA ESTILOS DE ÁLBUM ---
import tela1 from '../../assets/TELA.jpg';
import tela2 from '../../assets/TELA2.jpg';
import tela3 from '../../assets/TELA3.jpg';

import papel1 from '../../assets/PC100039 - Editado.jpg';
import papel2 from '../../assets/PC100043 - Editado.jpg';
import papel3 from '../../assets/PC100092 - Editado.jpg';

// --- IMPORTACIÓN DINÁMICA DE LA CARPETA DE CLIENTES (Magia de Vite) ---
// Esto leerá automáticamente todas las imágenes de la carpeta sin tener que importarlas una por una
const clientImagesGlob = import.meta.glob('../../assets/Clientes/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', { eager: true });
const allClientImages = Object.values(clientImagesGlob).map((module: any) => module.default);

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productType: ProductType;
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
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="group border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={images[currentIndex]}
          alt={style.name}
          className="w-full h-full object-cover transition-transform duration-500"
        />
        
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 hover:bg-white text-black rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 hover:bg-white text-black rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_: any, idx: number) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all shadow-sm ${idx === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="p-4 bg-white flex-1">
        <h4 className="font-bold text-gray-900 mb-1">{style.name}</h4>
        <p className="text-xs text-gray-500 leading-relaxed">{style.description}</p>
      </div>
    </div>
  );
};

export default function ProductDetailsModal({ isOpen, onClose, productType }: ProductDetailsModalProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Seleccionador aleatorio de imágenes de clientes
  // Se vuelve a calcular cada vez que se abre el modal
  const randomClientImages = useMemo(() => {
    if (!isOpen || allClientImages.length === 0) return [];
    // Hacemos una copia y la mezclamos aleatoriamente
    const shuffled = [...allClientImages].sort(() => 0.5 - Math.random());
    // Tomamos exactamente 6 imágenes (o menos si no hay suficientes)
    return shuffled.slice(0, 6);
  }, [isOpen]);

  const handleMakeYourOwn = () => {
    onClose();
    navigate('/create', { state: { startProduct: productType } });
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
        return {
          title: t('product.album'),
          icon: <BookImage className="w-12 h-12" />,
          description: 'Dale vida a tus recuerdos en un álbum hecho con amor, cuidado y materiales de la mejor calidad.',
          styles: [
            { 
              name: 'Tela', 
              description: 'Acabado premium con textura de lino',
              images: [tela1, tela2, tela3]
            },
            { 
              name: 'Papel', 
              description: 'Portada personalizada con tu foto favorita',
              images: [papel1, papel2, papel3]
            }
          ],
          specifications: [
            { label: 'Tipos de carátula', value: 'Tela, Papel' },
            { label: 'Tamaños', value: '20x20 Cuadrado, 30x30 Cuadrado, 21x28 Vertical, 28x21 Horizontal' },
            { label: 'Cantidad de páginas', value: 'Mínimo 40, máximo 250 (incrementos de 2)' },
            { label: 'Tipo de papel', value: 'Opalina Mate' }
          ],
          galleryTitle: 'Clientes Felices',
          gallerySubtitle: 'Historias reales, recuerdos que hoy se pueden volver a sentir',
          // Usamos el arreglo dinámico, y si está vacío usamos un fallback
          gallery: randomClientImages.length > 0 ? randomClientImages : [tela1, papel1]
        };
      case 'calendar':
        return {
          title: t('product.calendar'),
          icon: <Calendar className="w-12 h-12" />,
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
          icon: <Coffee className="w-12 h-12" />,
          description: t('product.mugDesc'),
          styles: [
            { 
              name: 'Clásica', 
              description: 'Taza de cerámica tradicional',
              image: 'https://images.unsplash.com/photo-1601746905447-a5d058ee7c7f?w=800'
            },
            { 
              name: 'Premium', 
              description: 'Porcelana de alta calidad',
              image: 'https://images.unsplash.com/photo-1539042357369-956fb344118f?w=800'
            }
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
          icon: <ImageIcon className="w-12 h-12" />,
          description: t('product.photoPackDesc'),
          styles: [
            { 
              name: 'Impresiones Estándar', 
              description: 'Fotos clásicas en varios tamaños',
              image: 'https://images.unsplash.com/photo-1541517155340-0220c1d1a8a3?w=800'
            }
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
        return {
          title: '',
          icon: null,
          description: '',
          styles: [],
          specifications: [],
          galleryTitle: undefined,
          gallerySubtitle: undefined,
          gallery: []
        };
    }
  };

  if (!isOpen) return null;

  const productData = getProductData();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-100 p-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-black text-white rounded-2xl shadow-lg">
              {productData.icon}
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight">{productData.title}</h2>
              <p className="text-gray-500 font-medium">{productData.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
          >
            <X className="w-6 h-6 text-gray-400 group-hover:text-black" />
          </button>
        </div>

        <div className="p-8 space-y-12">
          {/* Available Styles */}
          {productType === 'calendar' ? (
            CalendarPreview
          ) : (
            <div>
              <h3 className="text-2xl font-bold mb-6">{t('details.availableStyles')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {productData.styles.map((style, index) => (
                  <StyleCarouselCard key={index} style={style} />
                ))}
              </div>
            </div>
          )}

          {/* Specifications */}
          <div>
            <h3 className="text-2xl font-bold mb-6">{t('details.specifications')}</h3>
            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {productData.specifications.map((spec, index) => (
                  <div key={index} className="flex flex-col">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{spec.label}</span>
                    <span className="font-bold text-gray-900">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gallery */}
          <div>
            <h3 className="text-2xl font-bold mb-2">
              {productData.galleryTitle || t('details.customerExamples')}
            </h3>
            <p className="text-gray-500 font-medium mb-6">
              {productData.gallerySubtitle || t('details.customerExamplesDesc')}
            </p>
            {/* Si tiene exactamente 6 imágenes, lo acomodamos en 3 columnas; si no, en 4 */}
            <div className={`grid grid-cols-2 ${productData.gallery.length === 6 ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-4`}>
              {productData.gallery.map((image, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer group"
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

          {/* CTA Button */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-6 pb-2 border-t border-gray-100 z-10">
            <button
              onClick={handleMakeYourOwn}
              className="w-full py-5 bg-black text-white rounded-2xl hover:bg-gray-800 transition-all text-xl font-bold shadow-xl hover:shadow-black/20 active:scale-[0.98]"
            >
              {t('details.makeYourOwn')}
            </button>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-300"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
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