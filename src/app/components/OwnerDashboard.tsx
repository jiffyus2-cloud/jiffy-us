import React, { useState, useEffect } from 'react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Header } from './navigation/Header';
import { AlertCircle, Lock, LogOut, Download, Eye, Search, Filter, Loader2 } from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';

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
  billingAddress?: {
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
  customization?: any;
  pages?: any[];
  [key: string]: any;
}

const OwnerDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('owner_authenticated') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);

  const ownerKey = import.meta.env.VITE_OWNER_KEY || 'admin123';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === ownerKey) {
      setIsAuthenticated(true);
      localStorage.setItem('owner_authenticated', 'true');
      setAuthError(null);
    } else {
      setAuthError('Clave de acceso incorrecta.');
      setPasswordInput('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('owner_authenticated');
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const ordersCollection = collection(db, 'orders');
        const orderSnapshot = await getDocs(ordersCollection);
        const ordersList = orderSnapshot.docs.map(doc => {
          const data = doc.data();
          
          // Helper to normalize dates
          const normalizeDate = (dateVal: any) => {
            if (dateVal instanceof Timestamp) return dateVal.toDate().toISOString();
            if (dateVal && typeof dateVal === 'object' && dateVal.seconds) {
              return new Date(dateVal.seconds * 1000).toISOString();
            }
            return dateVal;
          };

          return {
            id: doc.id,
            ...data,
            createdAt: normalizeDate(data.createdAt),
            updatedAt: normalizeDate(data.updatedAt),
          } as Order;
        });

        const sortedOrders = ordersList.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt).getTime();
          return dateB - dateA;
        });

        setOrders(sortedOrders);
        setFilteredOrders(sortedOrders);
      } catch (err) {
        console.error("Error fetching orders: ", err);
        setFetchError('No se pudieron cargar los pedidos desde Firestore.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated]);

  useEffect(() => {
    let result = orders;

    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.id.toLowerCase().includes(lowSearch) || 
        (order.shippingAddress?.email?.toLowerCase().includes(lowSearch)) ||
        (order.shippingAddress?.name?.toLowerCase().includes(lowSearch))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(result);
  }, [searchTerm, statusFilter, orders]);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleDownloadZIP = async (order: Order) => {
    if (isDownloadingId === order.id) return;
    setIsDownloadingId(order.id);
    try {
      const zip = new JSZip();
      const folder = zip.folder(`pedido_${order.id}`);

      if (!folder) {
        throw new Error("No se pudo crear la carpeta en el ZIP.");
      }

      // Guardar el JSON crudo
      folder.file('datos_pedido.json', JSON.stringify(order, null, 2));

      // Crear subcarpeta para imágenes
      const imgFolder = folder.folder('imagenes');
      if (!imgFolder) {
        throw new Error("No se pudo crear la subcarpeta de imágenes.");
      }

      // Función auxiliar para descargar imágenes como blob
      const fetchImageAsBlob = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Error al descargar la imagen: ${url} (estado: ${res.status})`);
        }
        return res.blob();
      };

      const imagePromises: Promise<void>[] = [];

      // Añadir promesa para la portada
      if (order.coverData?.image) {
        imagePromises.push(
          fetchImageAsBlob(order.coverData.image).then(blob => {
            imgFolder.file('portada.jpg', blob);
          }).catch(e => console.error(`Error descargando portada para pedido ${order.id}:`, e))
        );
      }

      // Añadir promesas para las páginas
      if (order.pages && Array.isArray(order.pages)) {
        order.pages.forEach((page, pageIndex) => {
          
          // Ahora sabemos que tus fotos viven dentro del array page.images
          if (page.images && Array.isArray(page.images) && page.images.length > 0) {
            
            // Recorremos cada imagen dentro de esa página
            page.images.forEach((imgUrl: any, imgIndex: number) => {
              if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                imagePromises.push(
                  fetchImageAsBlob(imgUrl).then(blob => {
                    // Guardamos la foto indicando su página y su orden. Ej: pagina_01_foto_1.jpg
                    imgFolder.file(`pagina_${String(pageIndex + 1).padStart(2, '0')}_foto_${imgIndex + 1}.jpg`, blob);
                  }).catch(e => console.error(`Error descargando pág ${pageIndex + 1}, foto ${imgIndex + 1}:`, e))
                );
              }
            });

          } else {
            // Si la página se guardó sin fotos, es normal, pero lo dejamos en consola por si acaso
            console.log(`La página ${pageIndex + 1} no tiene fotos en su arreglo 'images'.`);
          }
        });
      }

      await Promise.all(imagePromises);

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `pedido_${order.id}.zip`);
    } catch (error: any) {
      console.error("Error al descargar el ZIP:", error);
      alert("Hubo un problema al empaquetar las imágenes: " + (error.message || 'Error desconocido'));
    } finally {
      setIsDownloadingId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white rounded-2xl shadow-xl w-full max-w-sm border border-gray-200">
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-gray-900 text-white rounded-full mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900">Acceso Administrador</h1>
          </div>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <input
                id="password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-center font-medium"
                placeholder="Ingresa la clave maestra"
              />
            </div>
            {authError && <p className="text-red-500 text-sm text-center mb-4">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-gray-900 text-white py-3 rounded-xl hover:bg-black transition-colors font-bold text-lg"
            >
              Acceder al Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto py-8 px-4 max-w-7xl">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="text-gray-500 mt-1">Gestión integral de todos los pedidos realizados.</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all font-medium self-start md:self-auto"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </header>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por ID, Email o Nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-black transition-all text-sm font-medium"
            >
              <option value="all">Todos los estados</option>
              <option value="paid">Pagado</option>
              <option value="mock_paid">Mock Paid</option>
              <option value="pending_payment">Pendiente</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-black rounded-full animate-spin mb-4" />
            <p className="text-gray-500 font-medium text-lg">Cargando base de datos...</p>
          </div>
        ) : fetchError ? (
          <div className="text-center py-20 bg-red-50 rounded-2xl border-2 border-dashed border-red-200 text-red-700">
            <AlertCircle className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-bold">Error de Conexión</h3>
            <p className="mt-1 opacity-80">{fetchError}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-lg">No se encontraron pedidos que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Info Pedido</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Monto</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-bold text-gray-900 mb-1">#{order.id.slice(0, 8)}...</span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(order.createdAt), "d MMM, yyyy HH:mm", { locale: es })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 leading-none mb-1">
                            {order.shippingAddress?.name || 'Usuario Invitado'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {order.shippingAddress?.email || 'No email provided'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                          order.status === 'paid' || order.status === 'mock_paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.status === 'mock_paid' || order.status === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900">${order.total?.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors title='Ver detalles'"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDownloadZIP(order)}
                            disabled={isDownloadingId === order.id}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title='Descargar ZIP'
                          >
                            {isDownloadingId === order.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <OrderDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={selectedOrder}
      />
      
      <footer className="py-6 text-center text-gray-400 text-xs border-t border-gray-100 bg-white">
        © {new Date().getFullYear()} Photo Album Creator - Panel de Control Seguro
      </footer>
    </div>
  );
};

export default OwnerDashboard;