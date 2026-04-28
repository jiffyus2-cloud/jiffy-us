import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { X, Package, Calendar as CalendarIcon, MapPin, CreditCard, BookOpen, Layers, CheckCircle2, Clock, Coffee, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import CoverPreview from './CoverPreview';
import ImageCropper from './ImageCropper';
import { getColombianHolidays, isHoliday } from '../utils/holidays';

// Importación de la imagen blanca local
import justWhiteImg from '../../assets/justwhite.png';

// --- START: Refactored Interfaces and Helpers ---
interface Order {
  id: string;
  createdAt: string;
  status: string;
  total: number;
  shippingAddress?: any;
  billingAddress?: any;
  coverData?: any;
  product?: any;
  customization?: any;
  pages?: any[];
  pageLayouts?: any;
  pageLayoutVariants?: any;
  textBoxSlots?: any;
  photoCrops?: any;
  photos?: string[] | string[][];
  items?: any[];
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  hideAddressInfo?: boolean; 
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// --- Album Viewer ---
const getClosestAllowed = (count: number, size: string) => {
  const isSquare = size?.includes('Cuadrado');
  const allowedPhotosPerPage = isSquare ? [1, 2, 3, 4, 9] : [1, 2, 3, 4, 6];
  return allowedPhotosPerPage.find(opt => opt >= count) || allowedPhotosPerPage[allowedPhotosPerPage.length - 1];
};

const getGridLayout = (count: number, layout: any, size: string) => {
  const isHorizontal = size?.includes('Horizontal');
  const isVertical = size?.includes('Vertical');
  if (count === 1) return 'grid-cols-1';
  if (count === 2) {
    if (layout === 'column') return 'grid-cols-1 grid-rows-2';
    return 'grid-cols-2';
  }
  if (count === 3) {
    if (isHorizontal) return 'grid-cols-3 grid-rows-1';
    if (isVertical) return 'grid-cols-1 grid-rows-3';
    return 'grid-cols-3';
  }
  if (count === 4) return 'grid-cols-2 grid-rows-2';
  if (count === 6) {
    if (isHorizontal) return 'grid-cols-3 grid-rows-2';
    if (isVertical) return 'grid-cols-2 grid-rows-3';
    return 'grid-cols-3 grid-rows-2';
  }
  if (count === 9) return 'grid-cols-3 grid-rows-3';
  return 'grid-cols-2 grid-rows-2';
};

const mapSizeToCoverSize = (size: string): '20x20' | '30x30' | '21x28' | '28x21' => {
  if (!size) return '20x20';
  if (size.includes('20x20')) return '20x20';
  if (size.includes('30x30')) return '30x30';
  if (size.includes('21x28')) return '21x28';
  if (size.includes('28x21')) return '28x21';
  return '20x20';
};

const AlbumPagePhoto: React.FC<{
  photo: string | null;
  textBox: any;
  crop: { x: number; y: number; zoom: number } | undefined;
  isHalfHeightLayout: boolean;
  photoIndex: number;
}> = ({ photo, textBox, crop, isHalfHeightLayout, photoIndex }) => {
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (photo) {
      const img = new Image();
      img.onload = () => setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = photo;
    } else {
      setImageDimensions(null);
    }
  }, [photo]);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(() => {
      setContainerDimensions({ width: element.offsetWidth, height: element.offsetHeight });
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  let calculatedCrop = crop;
  if (isHalfHeightLayout && imageDimensions && containerDimensions && imageDimensions.width >= imageDimensions.height && (!crop || crop.zoom === 1)) {
    const { width: imageW, height: imageH } = imageDimensions;
    const { width: containerW, height: containerH } = containerDimensions;

    if (imageH > 0 && containerH > 0 && imageW > 0 && containerW > 0) {
      const imageAspectRatio = imageW / imageH;
      const containerAspectRatio = containerW / containerH;
      
      if (imageAspectRatio > containerAspectRatio) {
        const newZoom = imageAspectRatio / containerAspectRatio;
        if (newZoom > 1.01) { 
          calculatedCrop = { x: crop?.x ?? 50, y: crop?.y ?? 50, zoom: newZoom };
        }
      }
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-[2%] bg-white flex items-center justify-center`}>
      {photo ? (
        <div ref={containerRef} className={isHalfHeightLayout ? "w-full h-[65%] relative my-auto" : "w-full h-full relative"}>
          <ImageCropper src={photo} position={calculatedCrop || {x: 50, y: 50, zoom: 1}} alt={`Foto ${photoIndex + 1}`} />
        </div>
      ) : textBox ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-white" style={{ containerType: 'inline-size' }}>
          <div
            style={{ 
              width: '90%', 
              fontSize: `${textBox.fontSize * 0.25}cqi`,
              fontFamily: textBox.fontFamily, 
              color: textBox.color, 
              textAlign: 'center',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.3'
            }}
          >
            {textBox.text}
          </div>
        </div>
      ) : (
        <div className="text-gray-300"><BookOpen className="w-8 h-8 opacity-20" /></div>
      )}
    </div>
  );
};

const AlbumViewer: React.FC<{ order: Order }> = ({ order }) => {
  const size = order.customization?.size || '';
  const isHorizontal = size.includes('Horizontal');
  const isVertical = size.includes('Vertical');

  const coverImageFixed = order.coverData?.image && typeof order.coverData.image === 'string' && order.coverData.image.includes('justwhite') 
    ? justWhiteImg 
    : (order.coverData?.image || '');

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-gray-900 font-bold border-b pb-4">
        <Layers className="w-5 h-5 text-primary" />
        <h4>Diseño del Álbum</h4>
      </div>

      <div className="max-w-md mx-auto">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">Portada</p>
        <CoverPreview
          coverSize={mapSizeToCoverSize(order.customization?.size)}
          coverType={order.customization?.coverType || order.customization?.material || 'Papel'} 
          coverImage={coverImageFixed}
          coverTitle={order.coverData?.title || ''}
          coverSubtitle={order.coverData?.subtitle || ''}
          coverYear={order.coverData?.year || ''}
          spineText={order.coverData?.spineText || order.customization?.coverContent?.spineText || order.coverData?.title || ''}
          selectedLayout={order.coverData?.layout || 1}
          coverCrop={order.coverData?.crop}
          typographyColor={order.customization?.coverContent?.typographyColor || order.customization?.typographyColor || '#000000'}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-2 sm:gap-x-3 md:gap-x-4 gap-y-12 sm:gap-y-16 mt-12">
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Interior Portada</p>
          <div
            className="bg-gray-100 rounded-[3%] shadow-inner border-2 border-gray-200 overflow-hidden mx-auto w-full flex items-center justify-center"
            style={{ aspectRatio: isHorizontal ? '28/21' : isVertical ? '21/28' : '1/1' }}
          >
            <div className="text-gray-300 flex flex-col items-center gap-2 opacity-60">
              <Layers className="w-10 h-10 md:w-12 md:h-12" />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Reverso</span>
            </div>
          </div>
        </div>

        {order.pages?.map((pageObj, pageIndex) => {
          const imagesArray = Array.isArray(pageObj) ? pageObj : (pageObj?.images || []);
          const variantFromPage = !Array.isArray(pageObj) ? pageObj?.variant : undefined;
          const layoutFromPage = !Array.isArray(pageObj) ? pageObj?.layout : undefined;
          
          const currentPhotosPerPage = variantFromPage || order.pageLayoutVariants?.[pageIndex] || getClosestAllowed(imagesArray.length, size);
          const layout = layoutFromPage || order.pageLayouts?.[pageIndex];
          const slots = Array.from({ length: currentPhotosPerPage }, (_, i) => imagesArray[i] || null);

          return (
            <div key={pageIndex} className="space-y-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Página {pageIndex + 1}</p>
              <div
                className="bg-white rounded-[3%] shadow-lg border border-gray-100 overflow-hidden mx-auto w-full"
                style={{ aspectRatio: isHorizontal ? '28/21' : isVertical ? '21/28' : '1/1' }}
              >
                <div className={`grid gap-2 p-4 h-full ${getGridLayout(currentPhotosPerPage, layout, size)}`}>
                  {slots.map((photo, photoIndex) => {
                    const textsFromPage = !Array.isArray(pageObj) ? pageObj?.texts : undefined;
                    const textBox = textsFromPage?.[photoIndex] || order.textBoxSlots?.[pageIndex]?.[photoIndex];
                    const crop = (pageObj as any)?.crops?.[photoIndex] || order.photoCrops?.[`${pageIndex}-${photoIndex}`];
                    const isHalfHeightLayout = (currentPhotosPerPage === 2 || currentPhotosPerPage === 3) && layout !== 'column';

                    return (
                      <AlbumPagePhoto
                        key={photoIndex}
                        photo={photo}
                        textBox={textBox}
                        crop={crop}
                        isHalfHeightLayout={isHalfHeightLayout}
                        photoIndex={photoIndex}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {order.pages && order.pages.length % 2 !== 0 && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Página en Blanco</p>
            <div
              className="bg-white rounded-[3%] shadow-sm border-2 border-gray-100 overflow-hidden mx-auto w-full flex items-center justify-center"
              style={{ aspectRatio: isHorizontal ? '28/21' : isVertical ? '21/28' : '1/1' }}
            >
              <span className="text-gray-300 text-[10px] md:text-xs font-bold uppercase tracking-widest">En Blanco</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Interior Contraportada</p>
          <div
            className="bg-gray-100 rounded-[3%] shadow-inner border-2 border-gray-200 overflow-hidden mx-auto w-full flex items-center justify-center"
            style={{ aspectRatio: isHorizontal ? '28/21' : isVertical ? '21/28' : '1/1' }}
          >
            <div className="text-gray-300 flex flex-col items-center gap-2 opacity-60">
              <Layers className="w-10 h-10 md:w-12 md:h-12" />
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Reverso Final</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const MugViewer: React.FC<{ order: Order }> = ({ order }) => (
  <div className="space-y-6">
    <div className="flex items-center gap-2 text-gray-900 font-bold border-b pb-4">
      <Coffee className="w-5 h-5 text-primary" />
      <h4>Diseños de Tazas</h4>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
      {order.items?.map((item, index) => {
        const photo = item.photo || item.photos?.[0];
        const crop = item.crop || item.photoCrops?.[0];
        return (<div key={item.id || index} className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Taza #{index + 1}</p>
          <div className="aspect-square bg-gray-100 rounded-[3%] shadow-inner border-4 border-white overflow-hidden relative group">
            {photo ? (
              <div className="absolute inset-0 w-full h-full">
                <ImageCropper src={photo} position={crop || {x: 50, y: 50, zoom: 1}} alt={`Taza ${index + 1}`} />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <Package className="w-16 h-16 opacity-20" />
              </div>
            )}
            {item.text && (
              <div
                className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none z-10"
                style={{
                  fontSize: `${item.fontSize}px`,
                  fontFamily: item.fontFamily,
                  color: photo ? 'white' : 'black',
                  textShadow: photo ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {item.text}
              </div>
            )}
          </div>
        </div>)
      })}
    </div>
  </div>
);

const CalendarViewer: React.FC<{ order: Order }> = ({ order }) => {
  const year = order.customization?.year || new Date().getFullYear();
  const orientation = order.customization?.orientation || 'vertical';
  const type = order.customization?.type || 'desk';
  const imagesPerMonth = order.customization?.imagesPerMonth || 1;
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
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-gray-900 font-bold border-b pb-4">
        <CalendarIcon className="w-5 h-5 text-primary" />
        <h4>Meses del Calendario ({year})</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {MONTHS_ES.map((month, index) => (
          <div key={index} className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">{month} {year}</p>
            
            <div
              className="bg-white rounded-[3%] shadow-sm border-2 border-gray-100 overflow-hidden mx-auto w-full max-w-md"
              style={{
                aspectRatio: orientation === 'horizontal' ? '28/21' : '21/28'
              }}
            >
              <div className={`flex h-full ${orientation === 'horizontal' ? 'flex-row' : 'flex-col'}`}>
                {/* Photo Section */}
                <div className={`bg-gray-50 relative ${orientation === 'horizontal' ? 'w-1/2 border-r border-gray-100' : 'h-1/2 border-b border-gray-100'}`}>
                  {(() => {
                    let photosForMonth: string[] = [];
                    
                    const pageData = order.pages?.[index];
                    if (pageData && Array.isArray(pageData.images)) {
                      photosForMonth = pageData.images;
                    } else if (pageData && pageData.image) {
                      photosForMonth = [pageData.image];
                    }
                    
                    const photoData = order.photos?.[index];
                    if (photosForMonth.length === 0 && photoData) {
                      if (Array.isArray(photoData)) {
                        photosForMonth = photoData as string[];
                      } else if (typeof photoData === 'string') {
                        photosForMonth = [photoData as string];
                      }
                    }

                    if (photosForMonth.length > 0 && photosForMonth[0]) {
                      if (type === 'wall' && imagesPerMonth === 4) {
                        return (
                          <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full p-1">
                            {Array.from({ length: 4 }).map((_, photoIdx) => {
                              const photo = photosForMonth[photoIdx];
                              const crop = order.photoCrops?.[`${index}-${photoIdx}`];
                              return (
                                <div key={photoIdx} className="relative bg-gray-200 rounded-sm overflow-hidden">
                                  {photo ? (
                                    <ImageCropper src={photo} position={crop || {x: 50, y: 50, zoom: 1}} alt={`Foto ${photoIdx + 1} para ${month}`} />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                      <ImageIcon className="w-8 h-8 opacity-20" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      } else {
                        const photo = photosForMonth[0];
                        const crop = order.photoCrops?.[index] || order.photoCrops?.[`${index}-0`];
                        return (
                          <div className="w-full h-full absolute inset-0">
                             <ImageCropper src={photo} position={crop || {x: 50, y: 50, zoom: 1}} alt={`Foto para ${month}`} />
                          </div>
                        );
                      }
                    }
                    
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-gray-300 bg-gray-50">
                        <ImageIcon className="w-12 h-12" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sin Imagen</span>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Calendar Grid Section */}
                <div className={`p-4 sm:p-6 flex flex-col justify-center bg-gray-50/50 ${orientation === 'horizontal' ? 'w-1/2' : 'flex-1'}`}>
                  <div className="text-center mb-2">
                    <span className="text-lg font-bold text-gray-900">{month} {year}</span>
                  </div>
                  <TooltipProvider>
                    <div className="flex-1 grid grid-cols-7 gap-1 min-h-0">
                      {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
                        <div key={i} className="text-center text-[10px] font-bold text-gray-400">{day}</div>
                      ))}
                      {generateCalendarGrid(year, index).map((day, i) => {
                        if (!day) return <div key={i} className="h-full min-h-[24px] sm:min-h-[30px]" />;
                        const date = new Date(year, index, day);
                        const holiday = isHoliday(date, holidays);
                        const content = (
                          <div
                            className={`h-full min-h-[24px] sm:min-h-[30px] flex items-center justify-center text-[10px] sm:text-xs rounded ${
                              holiday ? 'bg-red-50 text-red-600 font-bold border border-red-100' : 'bg-white border border-gray-100 text-gray-700'
                            }`}
                          >
                            {day}
                          </div>
                        );
                        return holiday ? (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild className="h-full w-full">{content}</TooltipTrigger>
                            <TooltipContent><p>{holiday.name}</p></TooltipContent>
                          </Tooltip>
                        ) : <div key={i} className="h-full w-full">{content}</div>;
                      })}
                    </div>
                  </TooltipProvider>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main Modal Component ---
const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, onClose, order, hideAddressInfo = false }) => {
  if (!isOpen || !order) return null;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
    } catch (e) {
      return 'Fecha no disponible';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'mock_paid':
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none px-3 py-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Pagado / En Producción
          </Badge>
        );
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none px-3 py-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {status}
          </Badge>
        );
    }
  };

  const productString = String(order.product?.type || order.product?.id || order.product?.name || (order as any).productType || '').toLowerCase();
  const isCalendar = productString.includes('calendar') || productString.includes('calendario') || order.customization?.year !== undefined;
  const isMug = productString.includes('mug') || productString.includes('taza');
  const isAlbum = productString.includes('album') || productString.includes('photobook');

  // --- LÓGICA DE EXTRACCIÓN DE IMAGEN PRINCIPAL (Para miniatura) ---
  let displayImage = order.coverData?.image;
  let ProductIcon = isCalendar ? CalendarIcon : isMug ? Coffee : BookOpen;

  if (isCalendar) {
    const januaryPage = order.pages?.[0];
    if (januaryPage) {
      if (Array.isArray(januaryPage.images) && januaryPage.images.length > 0) {
        displayImage = januaryPage.images[0];
      } else if (januaryPage.image) {
        displayImage = januaryPage.image;
      }
    }
    if (!displayImage && order.photos && order.photos.length > 0) {
      const firstPhoto = order.photos[0];
      if (Array.isArray(firstPhoto) && firstPhoto.length > 0) {
        displayImage = firstPhoto[0];
      } else if (typeof firstPhoto === 'string') {
        displayImage = firstPhoto as string;
      }
    }
  } else if (isMug) {
    if (order.items && order.items.length > 0) {
      displayImage = order.items[0].photo || order.items[0].photos?.[0];
    }
  } else if (isAlbum) {
    // Si es Tela, buscar la primera foto interna para mostrarla
    const isTela = order.customization?.coverType === 'Tela' || order.customization?.material === 'Tela';
    if (isTela || !displayImage || (typeof displayImage === 'string' && displayImage.includes('justwhite'))) {
      let firstInnerPhoto = null;
      if (order.pages && order.pages.length > 0) {
        for (const page of order.pages) {
          const imgs = Array.isArray(page) ? page : page.images;
          if (imgs && imgs.length > 0) {
            const validImg = imgs.find((img: any) => typeof img === 'string' && img.trim() !== '');
            if (validImg) {
              firstInnerPhoto = validImg;
              break;
            }
          }
        }
      }
      if (!firstInnerPhoto && order.photos && order.photos.length > 0) {
        for (const page of order.photos) {
          if (Array.isArray(page)) {
            const validImg = page.find((img: any) => typeof img === 'string' && img.trim() !== '');
            if (validImg) {
              firstInnerPhoto = validImg;
              break;
            }
          } else if (typeof page === 'string' && page.trim() !== '') {
            firstInnerPhoto = page;
            break;
          }
        }
      }
      if (firstInnerPhoto) {
        displayImage = firstInnerPhoto;
      }
    }
  }

  if (!displayImage) {
    displayImage = order.product?.image;
  }

  if (displayImage && typeof displayImage === 'string' && displayImage.includes('justwhite')) {
    displayImage = justWhiteImg;
  }

  const titleText = (isCalendar && !order.coverData?.title) 
    ? `Calendario ${order.customization?.year || ''}` 
    : (order.coverData?.title || order.product?.name || 'Pedido Personalizado');

  let formatText = 'N/A';
  if (isCalendar) {
    formatText = order.customization?.type === 'wall' ? 'De Pared' : order.customization?.type === 'desk' ? 'De Escritorio' : (order.customization?.orientation || 'Escritorio');
  } else if (isAlbum) {
    formatText = order.customization?.size || 'N/A';
  } else {
    formatText = order.customization?.size || order.customization?.format || 'Standard';
  }

  let extraText = 'N/A';
  if (isCalendar) {
    extraText = order.customization?.year ? `Año ${order.customization.year}` : 'N/A';
  } else {
    extraText = order.customization?.paper || order.customization?.material || 'N/A';
  }

  let elementsText = 'N/A';
  if (isCalendar) {
    elementsText = '12 Meses';
  } else if (isAlbum) {
    elementsText = order.pages ? `${order.pages.length} Páginas` : 'N/A';
  } else if (isMug) {
    elementsText = order.items ? `${order.items.length} Tazas` : 'N/A';
  } else if (order.photos?.length) {
    elementsText = `${order.photos.length} Fotos`;
  }

  const renderPagesPreview = () => {
    if (isAlbum) return <AlbumViewer order={order} />;
    if (isMug) return <MugViewer order={order} />;
    if (isCalendar) return <CalendarViewer order={order} />;
    if (order.pages && Array.isArray(order.pages)) return <AlbumViewer order={order} />;
    if (order.items && Array.isArray(order.items)) return <MugViewer order={order} />;

    return (
      <div className="text-center py-10 text-gray-500">
        <p>No hay una vista previa disponible para este tipo de producto.</p>
        <p className="text-xs mt-2 opacity-50">Tipo detectado: {productString || 'Desconocido'}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-gray-50/30 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-900 text-white rounded-[3%] shadow-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">Detalles del Pedido</h2>
                {getStatusBadge(order.status)}
              </div>
              {isAlbum && order.coverData?.title && (
                <p className="text-sm text-gray-500 mt-0.5 font-medium">{order.coverData.title}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="aspect-square rounded-[3%] overflow-hidden shadow-inner bg-white border border-gray-100 p-2">
                {displayImage && displayImage !== justWhiteImg ? (
                  <img src={displayImage} alt="Producto" className="w-full h-full object-cover rounded-[2%]" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ProductIcon className="w-16 h-16" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 leading-tight">
                  {titleText}
                </h3>
                {order.coverData?.subtitle && !isCalendar && (
                  <p className="text-lg text-gray-600 mt-1">{order.coverData.subtitle}</p>
                )}
                <div className="flex items-center text-gray-500 mt-3 text-sm font-medium">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Realizado el {formatDate(order.createdAt)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Configuración</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-medium">Formato:</span>
                      <span className="font-bold text-gray-900">{formatText}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-medium">Extra:</span>
                      <span className="font-bold text-gray-900">{extraText}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Contenido</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-medium">Elementos:</span>
                      <span className="font-bold text-gray-900 capitalize">
                        {elementsText}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-medium">Tipo:</span>
                      <span className="font-bold text-gray-900 capitalize">{order.product?.type || 'Producto'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!hideAddressInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-bold">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h4>Dirección de Envío</h4>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-1 text-sm text-gray-700">
                  <p className="font-bold text-gray-900 text-base mb-1">{order.shippingAddress?.name}</p>
                  <p className="font-medium text-gray-600">{order.shippingAddress?.address}</p>
                  <p className="font-medium text-gray-600">{order.shippingAddress?.city}, {order.shippingAddress?.zipCode}</p>
                  <div className="pt-2 mt-2 border-t border-gray-50">
                    <p className="text-gray-400 font-medium italic">{order.shippingAddress?.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-bold">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h4>Datos de Facturación</h4>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-1 text-sm text-gray-700">
                  <p className="font-bold text-gray-900 text-base mb-1">{order.billingAddress?.name}</p>
                  <p className="font-medium text-gray-600">{order.billingAddress?.address}</p>
                  <p className="font-medium text-gray-600">{order.billingAddress?.city}, {order.billingAddress?.zipCode}</p>
                  <div className="pt-2 mt-2 border-t border-gray-50">
                    <p className="text-gray-400 font-medium italic">{order.billingAddress?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-8 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            {renderPagesPreview()}
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-xl active:scale-95"
          >
            Cerrar Visor
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;