import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getUserOrders } from '../../services/orderService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { AspectRatio } from './ui/aspect-ratio';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, Calendar, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const userOrders = await getUserOrders(user.uid);
        setOrders(userOrders);
      } catch (err: any) {
        console.error('Error fetching orders:', err);
        setError('No se pudieron cargar tus pedidos. Inténtalo de nuevo más tarde.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-8">Mis Pedidos</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">¡Ups! Algo salió mal</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Mis Pedidos</h1>
        <p className="text-gray-500 mt-2">Gestiona y revisa el estado de tus creaciones.</p>
      </header>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No tienes pedidos aún</h3>
          <p className="text-gray-500 mt-1">¡Empieza a crear tu primer álbum hoy mismo!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {orders.map((order) => (
            <Card key={order.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white">
              <div className="relative overflow-hidden">
                <AspectRatio ratio={1 / 1}>
                  {order.coverData?.image ? (
                    <img
                      src={order.coverData.image}
                      alt={order.coverData.title || 'Portada del álbum'}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                </AspectRatio>
                <div className="absolute top-4 right-4">
                  <Badge 
                    className={`${
                      order.status === 'mock_paid' 
                        ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                        : 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                    } border-none font-medium px-3 py-1`}
                  >
                    {order.status === 'mock_paid' ? 'Pagado / En Producción' : order.status}
                  </Badge>
                </div>
              </div>

              <CardHeader className="p-5 pb-2">
                <div className="flex items-center text-xs text-gray-500 mb-2">
                  <Calendar className="h-3 w-3 mr-1" />
                  {order.createdAt ? format(new Date(order.createdAt), "d 'de' MMMM, yyyy", { locale: es }) : 'Fecha desconocida'}
                </div>
                <CardTitle className="text-xl font-bold truncate leading-tight">
                  {order.coverData?.title || 'Sin título'}
                </CardTitle>
                {order.coverData?.subtitle && (
                  <CardDescription className="truncate text-gray-600">
                    {order.coverData.subtitle}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Formato</p>
                    <p className="text-sm font-medium text-gray-700 truncate">{order.customization?.size || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Papel</p>
                    <p className="text-sm font-medium text-gray-700 truncate">{order.customization?.paper || 'N/A'}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="h-4 w-4 mr-2 text-primary" />
                    <span>Total Páginas</span>
                  </div>
                  <span className="font-bold text-gray-900">{order.pages?.length || 0}</span>
                </div>
              </CardContent>

              <CardFooter className="p-5 pt-0">
                <button 
                  onClick={() => handleViewDetails(order)}
                  className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md active:scale-95 transition-all"
                >
                  Ver Detalles
                </button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <OrderDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={selectedOrder}
      />
    </div>
  );
};

export default UserDashboard;
