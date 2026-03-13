import React from 'react';
import { X, User, Mail, Home, BookImage, FileImage } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Nota: Esta interfaz 'Order' debería moverse a un archivo de tipos compartido (ej. src/types/order.ts)
// para ser importada tanto en OwnerDashboard.tsx como aquí, evitando duplicación.
interface Order {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  total: number;
  shippingAddress?: {
    email?: string;
    name?: string;
    address?: string;
    city?: string;
    zipCode?: string;
  };
  coverData?: {
    image?: string;
    title?: string;
    subtitle?: string;
  };
  pages?: { image: string }[]; // Asumimos que cada página tiene al menos una propiedad 'image'
  [key: string]: any;
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, order, onClose }) => {
  if (!isOpen || !order) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="p-6 border-b border-gray-200 flex items-start justify-between sticky top-0 bg-gray-50 rounded-t-2xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Máquina del Tiempo: Pedido</h2>
            <p className="text-sm text-gray-500 font-mono mt-1">{order.id}</p>
            <p className="text-xs text-gray-400 mt-2">
              {format(new Date(order.createdAt), "d MMM, yyyy HH:mm", { locale: es })}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-800 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-8">
          {/* Client Info */}
          <section>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Información del Cliente</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-800">{order.shippingAddress?.name || 'No disponible'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${order.shippingAddress?.email}`} className="text-indigo-600 hover:underline">
                  {order.shippingAddress?.email || 'No disponible'}
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Home className="w-4 h-4 text-gray-400 mt-0.5" />
                <p className="text-gray-700">
                  {order.shippingAddress?.address || 'No disponible'} <br />
                  {order.shippingAddress?.city}, {order.shippingAddress?.zipCode}
                </p>
              </div>
            </div>
          </section>

          {/* Canvas Reconstruction */}
          <section>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Reconstrucción del Diseño</h3>
            
            {/* Cover */}
            <div className="mb-8">
              <h4 className="text-md font-semibold mb-3 text-gray-700 flex items-center gap-2">
                <BookImage className="w-5 h-5 text-primary" />
                Diseño de Portada
              </h4>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                {order.coverData?.image ? (
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                    <img src={order.coverData.image} alt="Portada" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                    <span>Sin imagen de portada</span>
                  </div>
                )}
                <div className="mt-4 text-center">
                  <p className="text-xl font-bold">{order.coverData?.title || 'Sin Título'}</p>
                  <p className="text-gray-500">{order.coverData?.subtitle || 'Sin Subtítulo'}</p>
                </div>
              </div>
            </div>

            {/* Pages */}
            {order.pages && order.pages.length > 0 && (
              <div>
                <h4 className="text-md font-semibold mb-3 text-gray-700 flex items-center gap-2">
                  <FileImage className="w-5 h-5 text-primary" />
                  Páginas del Álbum ({order.pages.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  {order.pages.map((page, index) => (
                    <div key={index} className="aspect-square bg-gray-100 rounded-md overflow-hidden relative group">
                      {page.image ? (
                        <img src={page.image} alt={`Página ${index + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Sin imagen</div>
                      )}
                      <div className="absolute bottom-0 left-0 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-tr-md">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;