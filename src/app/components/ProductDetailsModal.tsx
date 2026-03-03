import { X, BookImage, Calendar, Coffee, Check } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ProductType } from './ProductSelection';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productType: ProductType;
}

export default function ProductDetailsModal({ isOpen, onClose, productType }: ProductDetailsModalProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMakeYourOwn = () => {
    // Navigate to creator and start at style selection for this product
    navigate('/create', { state: { startProduct: productType } });
  };

  // Product-specific data
  const getProductData = () => {
    switch (productType) {
      case 'album':
        return {
          title: t('product.album'),
          icon: <BookImage className="w-12 h-12" />,
          description: t('product.albumDesc'),
          styles: [
            { 
              name: 'Classic Album', 
              description: 'Traditional binding with elegant cover',
              image: 'https://images.unsplash.com/photo-1646645766793-25e5ffa020e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljJTIwcGhvdG8lMjBhbGJ1bSUyMGVsZWdhbnQlMjBiaW5kaW5nfGVufDF8fHx8MTc3MTYxODA1NXww&ixlib=rb-4.1.0&q=80&w=1080'
            },
            { 
              name: 'Modern Layflat', 
              description: 'Seamless panoramic spreads',
              image: 'https://images.unsplash.com/photo-1754373480634-6f36092b751f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBsYXlmbGF0JTIwcGhvdG8lMjBhbGJ1bSUyMHBhbm9yYW1pY3xlbnwxfHx8fDE3NzE2MTgwNTV8MA&ixlib=rb-4.1.0&q=80&w=1080'
            },
            { 
              name: 'Luxury Leather', 
              description: 'Premium leather-bound edition',
              image: 'https://images.unsplash.com/photo-1745305899771-efa66647787d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBsZWF0aGVyJTIwcGhvdG8lMjBhbGJ1bSUyMHByZW1pdW18ZW58MXx8fHwxNzcxNjE4MDU1fDA&ixlib=rb-4.1.0&q=80&w=1080'
            },
            { 
              name: 'Minimalist Album', 
              description: 'Clean, contemporary design',
              image: 'https://images.unsplash.com/photo-1757573778876-9a35ba82c19e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwcGhvdG8lMjBhbGJ1bSUyMGNvbnRlbXBvcmFyeSUyMGRlc2lnbnxlbnwxfHx8fDE3NzE2MTgwNTZ8MA&ixlib=rb-4.1.0&q=80&w=1080'
            }
          ],
          specifications: [
            { label: 'Cover Options', value: 'Linen, Leather, Wood' },
            { label: 'Size Options', value: '8x8", 10x10", 12x12"' },
            { label: 'Page Count', value: 'Up to 40 pages' },
            { label: 'Paper Types', value: 'Glossy, Matte, Premium' }
          ],
          gallery: [
            'https://images.unsplash.com/photo-1627353802168-e8e8a81e51f6?w=800',
            'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
            'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800',
            'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'
          ]
        };
      case 'calendar':
        return {
          title: t('product.calendar'),
          icon: <Calendar className="w-12 h-12" />,
          description: t('product.calendarDesc'),
          styles: [
            { 
              name: 'Wall Calendar', 
              description: 'Large format for wall display',
              image: 'https://images.unsplash.com/photo-1742144897660-872dfc637217?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YWxsJTIwY2FsZW5kYXIlMjBsYXJnZSUyMGZvcm1hdCUyMGRpc3BsYXl8ZW58MXx8fHwxNzcxNjE4MDU2fDA&ixlib=rb-4.1.0&q=80&w=1080'
            },
            { 
              name: 'Desk Calendar', 
              description: 'Compact design for your desk',
              image: 'https://images.unsplash.com/photo-1722506724411-9d3ea21702c9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXNrJTIwY2FsZW5kYXIlMjBvZmZpY2UlMjB3b3Jrc3BhY2V8ZW58MXx8fHwxNzcxNjE4MDYyfDA&ixlib=rb-4.1.0&q=80&w=1080'
            },
            { 
              name: 'Poster Calendar', 
              description: 'Extra large with photo focus',
              image: 'https://images.unsplash.com/photo-1763356844645-34a2be49d754?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3N0ZXIlMjBjYWxlbmRhciUyMGxhcmdlJTIwcGhvdG98ZW58MXx8fHwxNzcxNjE4MDU3fDA&ixlib=rb-4.1.0&q=80&w=1080'
            },
            { 
              name: 'Spiral Calendar', 
              description: 'Easy-flip spiral binding',
              image: 'https://images.unsplash.com/photo-1686563636216-02d5c3674816?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGlyYWwlMjBjYWxlbmRhciUyMGZsaXAlMjBiaW5kaW5nfGVufDF8fHx8MTc3MTYxODA1N3ww&ixlib=rb-4.1.0&q=80&w=1080'
            }
          ],
          specifications: [
            { label: 'Format', value: '12 months with custom photos' },
            { label: 'Size Options', value: '11x8.5", 12x12", 18x24"' },
            { label: 'Starting Month', value: 'Any month you choose' },
            { label: 'Finish', value: 'Glossy or Matte' }
          ],
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
              name: 'Classic Mug', 
              description: 'Traditional ceramic coffee mug',
              image: 'https://images.unsplash.com/photo-1601746905447-a5d058ee7c7f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMGNlcmFtaWMlMjBjb2ZmZWUlMjBtdWclMjBjbGFzc2ljfGVufDF8fHx8MTc3MTYxODA1N3ww&ixlib=rb-4.1.0&q=80&w=1080'
            },
            { 
              name: 'Travel Mug', 
              description: 'Insulated for on-the-go',
              image: 'https://images.unsplash.com/photo-1768726455302-d70cf11865e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmF2ZWwlMjBtdWclMjBpbnN1bGF0ZWQlMjBzdGFpbmxlc3MlMjBzdGVlbHxlbnwxfHx8fDE3NzE2MTgwNTd8MA&ixlib=rb-4.1.0&q=80&w=1080'
            },
            { 
              name: 'Thermos Bottle', 
              description: 'Keeps drinks hot or cold',
              image: 'https://images.unsplash.com/photo-1592999641298-434e28c11d14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGVybW9zJTIwYm90dGxlJTIwd2F0ZXIlMjBpbnN1bGF0ZWR8ZW58MXx8fHwxNzcxNjE4MDU4fDA&ixlib=rb-4.1.0&q=80&w=1080'
            },
            { 
              name: 'Color Handle Mug', 
              description: 'Accent color handles',
              image: 'https://images.unsplash.com/photo-1704663198277-f3671defb217?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xvcmZ1bCUyMGhhbmRsZSUyMGNvZmZlZSUyMG11ZyUyMGNlcmFtaWN8ZW58MXx8fHwxNzcxNjE4MDU5fDA&ixlib=rb-4.1.0&q=80&w=1080'
            }
          ],
          specifications: [
            { label: 'Materials', value: 'Ceramic, Stainless Steel' },
            { label: 'Capacity', value: '11oz, 15oz, 20oz' },
            { label: 'Color Options', value: 'White, Black, Red, Blue' },
            { label: 'Features', value: 'Dishwasher safe, Microwave safe' }
          ],
          gallery: [
            'https://images.unsplash.com/photo-1539042357369-956fb344118f?w=800',
            'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800',
            'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800',
            'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=800'
          ]
        };
    }
  };

  const productData = getProductData();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-black text-white rounded-xl">
              {productData.icon}
            </div>
            <div>
              <h2 className="text-3xl">{productData.title}</h2>
              <p className="text-gray-600">{productData.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Available Styles */}
          <div>
            <h3 className="text-2xl mb-4">{t('details.availableStyles')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {productData.styles.map((style, index) => (
                <div
                  key={index}
                  className="border-2 border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Image */}
                  <div className="aspect-video overflow-hidden bg-gray-100">
                    <img
                      src={style.image}
                      alt={style.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Content */}
                  <div className="p-3">
                    <h4 className="text-sm font-medium mb-1">{style.name}</h4>
                    <p className="text-xs text-gray-600">{style.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Specifications */}
          <div>
            <h3 className="text-2xl mb-4">{t('details.specifications')}</h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {productData.specifications.map((spec, index) => (
                  <div key={index} className="flex flex-col">
                    <span className="text-sm text-gray-600 mb-1">{spec.label}</span>
                    <span className="font-medium">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gallery - Customer Examples */}
          <div>
            <h3 className="text-2xl mb-4">{t('details.customerExamples')}</h3>
            <p className="text-gray-600 mb-4">
              {t('details.customerExamplesDesc')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {productData.gallery.map((image, index) => (
                <div
                  key={index}
                  className="aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image}
                    alt={`Customer example ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="sticky bottom-0 bg-white pt-6 pb-2 border-t border-gray-200">
            <button
              onClick={handleMakeYourOwn}
              className="w-full py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg font-medium"
            >
              {t('details.makeYourOwn')} {productData.title}
            </button>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-8 h-8 text-white" />
          </button>
          <div 
            className="max-w-6xl max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Enlarged view"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}