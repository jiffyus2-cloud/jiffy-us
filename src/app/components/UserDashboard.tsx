import React, { useEffect, useState } from 'react';
import { Header } from './navigation/Header';
import { useAuth } from '../../hooks/useAuth';
import { getUserOrders } from '../../services/orderService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { AspectRatio } from './ui/aspect-ratio';
import { Skeleton } from './ui/skeleton';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Package, Calendar, FileText, Image as ImageIcon, AlertCircle, Coffee } from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';
import { useLanguage } from '../context/LanguageContext';

interface Order {
  id: string;
  createdAt: string;
  status: string;
  total: number;
  coverData?: {
    image?: string;
    title?: string;
    subtitle?: string;
  };
  customization?: {
    size?: string;
    paper?: string;
    year?: number;
  };
  pages?: Array<{ images?: string[]; image?: string }>; 
  photos?: string[] | string[][]; 
  items?: any[];
  product?: {
    id?: string;
    name?: string;
    type?: string;
  };
  productType?: string;
}

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'mock_paid':
      case 'paid':
        return { text: t('status.paid'), className: 'bg-green-100 text-green-800 hover:bg-green-100' };
      case 'pending_payment':
        return { text: t('status.pending_payment'), className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' };
      default:
        return { text: t('status.unknown'), className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' };
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const userOrders = await getUserOrders(user.uid);
        setOrders(userOrders);
      } catch (err: any) {
        console.error('Error fetching orders:', err);
        setError('error.fetchOrders');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const dateLocale = language === 'es' ? es : enUS;

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="container mx-auto py-10 px-4">
          <h1 className="text-3xl font-bold mb-8">{t('dashboard.title')}</h1>
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
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="container mx-auto py-10 px-4 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">{t('common.error')}</h2>
          <p className="text-gray-600">{t(error)}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto py-10 px-4">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-500 mt-2">{t('dashboard.subtitle')}</p>
      </header>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">{t('dashboard.noOrders')}</h3>
          <p className="text-gray-500 mt-1">{t('dashboard.noOrdersDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {orders.map((order) => {
            const statusInfo = getStatusBadge(order.status);
            
            // Lógica ultra-robusta para detectar el tipo de producto
            const productString = String(order.product?.type || order.product?.id || order.product?.name || order.productType || '').toLowerCase();
            const isCalendar = productString.includes('calendar') || productString.includes('calendario') || order.customization?.year !== undefined;
            const isMug = productString.includes('mug') || productString.includes('taza');
            
            const ProductIcon = isCalendar ? Calendar : isMug ? Coffee : ImageIcon;

            return (
              <Card key={order.id} className="group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white">
                <div className="relative overflow-hidden">
                  <AspectRatio ratio={1 / 1}>
                    {(() => {
                      let imageUrl: string | null | undefined = null;

                      // 1. SI ES CALENDARIO -> Forzamos a buscar la foto de ENERO
                      if (isCalendar) {
                        const januaryPage = order.pages?.[0];
                        if (januaryPage) {
                          if (Array.isArray(januaryPage.images) && januaryPage.images.length > 0) {
                            imageUrl = januaryPage.images[0];
                          } else if (januaryPage.image) {
                            imageUrl = januaryPage.image;
                          }
                        }
                        
                        if (!imageUrl && order.photos && order.photos.length > 0) {
                          const firstPhoto = order.photos[0];
                          if (Array.isArray(firstPhoto) && firstPhoto.length > 0) {
                            imageUrl = firstPhoto[0];
                          } else if (typeof firstPhoto === 'string') {
                            imageUrl = firstPhoto;
                          }
                        }
                      } 
                      // 2. SI ES TAZA -> Buscamos la foto del primer item
                      else if (isMug) {
                        if (order.items && order.items.length > 0) {
                          imageUrl = order.items[0].photo || order.items[0].photos?.[0];
                        }
                      } 
                      // 3. SI ES ÁLBUM O CUALQUIER OTRA COSA -> Priorizamos la portada
                      else {
                        imageUrl = order.coverData?.image;
                        if (!imageUrl && order.photos && order.photos.length > 0) {
                          const firstPhoto = order.photos[0];
                          imageUrl = Array.isArray(firstPhoto) ? firstPhoto[0] : firstPhoto as string;
                        }
                      }

                      // Fallback final: Si falló la extracción específica, intentamos con la portada genérica
                      if (!imageUrl) {
                        imageUrl = order.coverData?.image;
                      }

                      // RENDERIZADO DE LA IMAGEN
                      if (imageUrl) {
                        return (
                          <img
                            src={imageUrl}
                            alt={order.coverData?.title || order.product?.name || 'Preview'}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                          />
                        );
                      } else {
                        return (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <ProductIcon className="h-12 w-12 text-gray-300" />
                          </div>
                        );
                      }
                    })()}
                  </AspectRatio>
                  <div className="absolute top-4 right-4">
                    <Badge className={`${statusInfo.className} border-none font-medium px-3 py-1`}>
                      {statusInfo.text}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="p-5 pb-2">
                  <div className="flex items-center text-xs text-gray-500 mb-2">
                    <Calendar className="h-3 w-3 mr-1" />
                    {order.createdAt ? t('dashboard.orderDate', { date: format(new Date(order.createdAt), "P", { locale: dateLocale }) }) : t('status.unknown')}
                  </div>
                  <CardTitle className="text-xl font-bold truncate leading-tight">
                    {order.coverData?.title || order.product?.name || t('product.album')}
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
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t('dashboard.product')}</p>
                      <p className="text-sm font-medium text-gray-700 truncate">{order.product?.name || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t('dashboard.total')}</p>
                      <p className="text-sm font-medium text-gray-700 truncate">{order.total?.toFixed(2) || '0.00'}€</p>
                    </div>
                  </div>
                  
                  {productString.includes('album') && order.pages && (
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center text-sm text-gray-600">
                        <FileText className="h-4 w-4 mr-2 text-primary" />
                        <span>{t('dashboard.totalPages')}</span>
                      </div>
                      <span className="font-bold text-gray-900">{order.pages.length}</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="p-5 pt-0">
                  <button 
                    onClick={() => handleViewDetails(order)}
                    className="w-full py-2.5 px-4 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md active:scale-95 "
                  >
                    {t('dashboard.viewDetails')}
                  </button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <OrderDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={selectedOrder}
      />
      </div>
    </>
  );
};

export default UserDashboard;