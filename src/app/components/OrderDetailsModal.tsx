import React from 'react';
import { X, Package, Calendar, MapPin, CreditCard, BookOpen, Layers, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from './ui/badge';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
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
              <div className="aspect-square rounded-xl overflow-hidden shadow-inner bg-gray-50 border border-gray-100">
                {order.coverData?.image ? (
                  <img
                    src={order.coverData.image}
                    alt="Portada"
                    className="w-full h-full object-cover"
                  />
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
                  {order.coverData?.title || 'Sin título'}
                </h3>
                {order.coverData?.subtitle && (
                  <p className="text-lg text-gray-600 mt-1">{order.coverData.subtitle}</p>
                )}
                <div className="flex items-center text-gray-500 mt-3 text-sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Realizado el {formatDate(order.createdAt)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Configuración</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Formato:</span>
                      <span className="font-semibold text-gray-900">{order.customization?.size || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Papel:</span>
                      <span className="font-semibold text-gray-900">{order.customization?.paper || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Contenido</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Total Páginas:</span>
                      <span className="font-semibold text-gray-900">{order.pages?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Año:</span>
                      <span className="font-semibold text-gray-900">{order.coverData?.year || 'N/A'}</span>
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
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-1 text-sm text-gray-700">
                <p className="font-bold text-gray-900 text-base mb-1">{order.shippingAddress?.name}</p>
                <p>{order.shippingAddress?.address}</p>
                <p>{order.shippingAddress?.city}, {order.shippingAddress?.zipCode}</p>
                <p className="text-gray-500 mt-2">{order.shippingAddress?.email}</p>
              </div>
            </div>

            {/* Billing Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-bold">
                <CreditCard className="w-5 h-5 text-primary" />
                <h4>Datos de Facturación</h4>
              </div>
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-1 text-sm text-gray-700">
                <p className="font-bold text-gray-900 text-base mb-1">{order.billingAddress?.name}</p>
                <p>{order.billingAddress?.address}</p>
                <p>{order.billingAddress?.city}, {order.billingAddress?.zipCode}</p>
                <p className="text-gray-500 mt-2">{order.billingAddress?.email}</p>
              </div>
            </div>
          </div>

          {/* Pages Preview (Simplified) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-bold">
              <Layers className="w-5 h-5 text-primary" />
              <h4>Vista Previa de Páginas</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {order.pages?.map((page: any, idx: number) => (
                <div key={idx} className="aspect-[4/3] bg-gray-50 rounded-lg border border-gray-100 overflow-hidden relative group">
                  {page.images && page.images[0] ? (
                    <img src={page.images[0]} alt={`Página ${idx + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                      Sin foto
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">Pág. {idx + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
