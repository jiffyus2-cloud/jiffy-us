import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { X, Package, Calendar as CalendarIcon, MapPin, CreditCard, BookOpen, Layers, CheckCircle2, Clock, Coffee } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from './ui/badge';
import CoverPreview from './CoverPreview';
import { getColombianHolidays, isHoliday } from '../utils/holidays';

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
  photos?: string[];
  items?: any[];
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ReadOnlyImage = ({ src, crop, alt, className }: { src: string, crop?: { x: number, y: number, zoom: number }, alt?: string, className?: string }) => {
  const { x = 50, y = 50, zoom = 1 } = crop || {};
  return (
    <div className={`absolute inset-0 overflow-hidden bg-gray-100 ${className || ''}`}>
      <img
        src={src}
        alt={alt || "Preview"}
        className="w-full h-full object-cover pointer-events-none"
        style={{
          transform: `scale(${zoom}) translate(${(50 - x)}%, ${(50 - y)}%)`,
          transformOrigin: 'center center',
        }}
      />
    </div>
  );
};

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
  // State to store image dimensions for conditional cropping
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
        if (newZoom > 1.01) { // Apply a small tolerance
          calculatedCrop = { x: crop?.x ?? 50, y: crop?.y ?? 50, zoom: newZoom };
        }
      }
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-lg bg-white flex items-center justify-center`}>
      {photo ? (
        <div ref={containerRef} className={isHalfHeightLayout ? "w-full h-[65%] relative my-auto" : "w-full h-full relative"}>
          <ReadOnlyImage src={photo} crop={calculatedCrop} alt={`Foto ${photoIndex + 1}`} />
        </div>
      ) : textBox ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-white text-center">
          <div
            style={{ fontSize: `${textBox.fontSize}px`, fontFamily: textBox.fontFamily, color: textBox.color, wordBreak: 'break-word' }}
            className="w-full"
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
          coverImage={order.coverData?.image || ''}
          coverTitle={order.coverData?.title || ''}
          coverSubtitle={order.coverData?.subtitle || ''}
          coverYear={order.coverData?.year || ''}
          selectedLayout={order.coverData?.layout || 1}
          coverCrop={order.coverData?.crop}
        />
      </div>

      <div className="grid grid-cols-1 gap-12 mt-12">
        {order.pages?.map((pageObj, pageIndex) => {
          // Lógica robusta que lee tu JSON a la perfección
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
                className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mx-auto max-w-2xl"
                style={{ aspectRatio: isHorizontal ? '28/21' : isVertical ? '21/28' : '1/1' }}
              >
                <div className={`grid gap-2 p-4 h-full ${getGridLayout(currentPhotosPerPage, layout, size)}`}>
                  {slots.map((photo, photoIndex) => {
                    const textsFromPage = !Array.isArray(pageObj) ? pageObj?.texts : undefined;
                    const textBox = textsFromPage?.[photoIndex] || order.textBoxSlots?.[pageIndex]?.[photoIndex];
                    // Lee el crop del nuevo objeto `page` o del antiguo `photoCrops` para retrocompatibilidad
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
      </div>
    </div>
  );
};

// --- Mug Viewer ---
const MugViewer: React.FC<{ order: Order }> = ({ order }) => (
  <div className="space-y-6">
    <div className="flex items-center gap-2 text-gray-900 font-bold border-b pb-4">
      <Coffee className="w-5 h-5 text-primary" />
      <h4>Diseños de Tazas</h4>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
      {order.items?.map((item, index) => {
        // Lógica para compatibilidad con estructuras de datos antiguas y nuevas
        const photo = item.photo || item.photos?.[0];
        const crop = item.crop || item.photoCrops?.[0];
        return (<div key={item.id || index} className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Taza #{index + 1}</p>
          <div className="aspect-square bg-gray-100 rounded-2xl shadow-inner border-4 border-white overflow-hidden relative group">
            {photo ? (
              <ReadOnlyImage src={photo} crop={crop} alt={`Taza ${index + 1}`} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <Package className="w-16 h-16 opacity-20" />
              </div>
            )}
            {item.text && (
              <div
                className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none"
                style={{
                  fontSize: `${item.fontSize}px`,
                  fontFamily: item.fontFamily,
                  color: photo ? 'white' : 'black',
                  textShadow: photo ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
                  textAlign: 'center',
                  wordBreak: 'break-word',
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

// --- Calendar Viewer ---
const CalendarViewer: React.FC<{ order: Order }> = ({ order }) => {
  const year = order.customization?.year || new Date().getFullYear();
  const orientation = order.customization?.orientation || 'horizontal';
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
        <h4>Meses del Calendario</h4>
      </div>
      <div className="space-y-12">
        {MONTHS_ES.map((month, index) => (
          <div key={index} className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">{month} {year}</p>
            <div
              className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden mx-auto"
              style={{
                aspectRatio: orientation === 'horizontal' ? '28/21' : '21/28',
                maxWidth: orientation === 'horizontal' ? '100%' : '500px'
              }}
            >
              <div className={`flex h-full ${orientation === 'horizontal' ? 'flex-row' : 'flex-col'}`}>
                <div className={`bg-gray-50 relative ${orientation === 'horizontal' ? 'w-1/2 border-r' : 'h-1/2 border-b'} border-gray-100`}>
                  {(() => {
                    // Lógica de retrocompatibilidad para calendarios
                    const pageData = (order.pages as any)?.[index]; // Nueva estructura: { image, crop }
                    const oldPhotoData = (order.photos as any)?.[index]; // Antigua estructura: string

                    const photo = pageData?.image || oldPhotoData;
                    const crop = pageData?.crop || order.photoCrops?.[index]; // Fallback para crops antiguos

                    if (photo) {
                      return <ReadOnlyImage src={photo} crop={crop} alt={`Foto para ${month}`} />;
                    }
                    
                    return (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <BookOpen className="w-12 h-12 opacity-20" />
                      </div>
                    );
                  })()}
                </div>
                <div className={`p-4 flex flex-col justify-center bg-white ${orientation === 'horizontal' ? 'w-1/2' : 'flex-1'}`}>
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
                          className={`aspect-square flex items-center justify-center text-[8px] rounded ${holiday ? 'bg-red-50 text-red-600 font-bold border border-red-100' : 'bg-gray-50 border border-gray-100 text-gray-700'}`}
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
};

// --- Main Modal Component ---
const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, onClose, order }) => {
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

  const renderPagesPreview = () => {
    // Motor de deducción inteligente: Revisa el tipo, el ID, el nombre o la estructura de datos
    const productString = String(order.product?.type || order.product?.id || order.product?.name || (order as any).productType || '').toLowerCase();

    // Lógica de renderizado por prioridad para evitar conflictos
    if (productString.includes('album') || productString.includes('photobook')) {
      return <AlbumViewer order={order} />;
    }
    
    if (productString.includes('mug') || productString.includes('taza')) {
      return <MugViewer order={order} />;
    }
    
    if (productString.includes('calendar') || productString.includes('calendario')) {
      return <CalendarViewer order={order} />;
    }
    
    // Fallbacks basados en la estructura de datos si el tipo de producto no es claro
    if (order.pages && Array.isArray(order.pages)) {
      return <AlbumViewer order={order} />;
    }
    if (order.items && Array.isArray(order.items)) {
      return <MugViewer order={order} />;
    }

    return ( // Si no se puede determinar el tipo
      <div className="text-center py-10 text-gray-500">
        <p>No hay una vista previa disponible para este tipo de producto.</p>
        <p className="text-xs mt-2 opacity-50">Tipo detectado: {productString || 'Desconocido'}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-gray-50/30 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-900 text-white rounded-xl shadow-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">Detalles del Pedido</h2>
                {getStatusBadge(order.status)}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">ID: {order.id}</p>
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
          {/* Main Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="aspect-square rounded-xl overflow-hidden shadow-inner bg-white border border-gray-100 p-2">
                {order.coverData?.image ? (
                  <img src={order.coverData.image} alt="Portada" className="w-full h-full object-cover rounded-lg" />
                ) : order.product?.image ? (
                  <img src={order.product.image} alt="Producto" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <BookOpen className="w-16 h-16" />
                  </div>
                )}
              </div>
            </div>
            
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 leading-tight">
                  {order.coverData?.title || order.product?.name || 'Pedido Personalizado'}
                </h3>
                {order.coverData?.subtitle && (
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
                      <span className="font-bold text-gray-900">{order.customization?.size || order.customization?.orientation || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-medium">Extra:</span>
                      <span className="font-bold text-gray-900">{order.customization?.paper || order.customization?.year || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-2">Contenido</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-medium">Elementos:</span>
                      <span className="font-bold text-gray-900 capitalize">
                        {order.pages?.length || order.items?.length || (order.photos?.length ? '12 Meses' : 'N/A')}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Shipping Address */}
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

            {/* Billing Address */}
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

          {/* Render High Fidelity Preview based on Product Type */}
          <div className="pt-8 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            {renderPagesPreview()}
          </div>
        </div>

        {/* Footer */}
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