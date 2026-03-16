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
import * as XLSX from 'xlsx';

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
    year?: string;
    layout?: number | string;
    crop?: {
      x?: number;
      y?: number;
      zoom?: number;
    };
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

      // 1. Guardar el JSON crudo (Para respaldo técnico)
      folder.file('datos_pedido.json', JSON.stringify(order, null, 2));

      // ==========================================
      // 2. CREAR EL ARCHIVO EXCEL (.xlsx) LEGIBLE
      // ==========================================
      const wb = XLSX.utils.book_new();

      // HOJA 1: Información General y Cliente
      const resumenData = [{
        'ID del Pedido': order.id,
        'Fecha': new Date(order.createdAt).toLocaleString('es-ES'),
        'Estado': order.status === 'paid' || order.status === 'mock_paid' ? 'Pagado' : order.status,
        'Total Pagado ($)': order.total?.toFixed(2),
        'Nombre del Cliente': order.shippingAddress?.name || 'N/A',
        'Email': order.shippingAddress?.email || 'N/A',
        'Dirección de Envío': order.shippingAddress?.address || 'N/A',
        'Ciudad': order.shippingAddress?.city || 'N/A',
        'Código Postal': order.shippingAddress?.zipCode || 'N/A'
      }];
      const wsResumen = XLSX.utils.json_to_sheet(resumenData);
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen General");

      // HOJA 2: Configuración del Producto
      const configData = [{
        'Tipo de Producto': order.product?.name || order.product?.type || 'N/A',
        'Formato/Tamaño': order.customization?.size || order.customization?.orientation || 'N/A',
        'Papel/Material': order.customization?.paper || order.customization?.material || 'N/A',
        'Título de Portada': order.coverData?.title || 'N/A',
        'Subtítulo': order.coverData?.subtitle || 'N/A',
        'Año': order.coverData?.year || 'N/A',
        'Layout Portada': order.coverData?.layout || 'N/A'
      }];
      const wsConfig = XLSX.utils.json_to_sheet(configData);
      XLSX.utils.book_append_sheet(wb, wsConfig, "Configuración");

      // HOJA 3: Detalles Internos (Textos y Layouts)
      let detallesData: any[] = [];
      if (order.pages && Array.isArray(order.pages)) {
        detallesData = order.pages.map((page, i) => ({
          'Página Número': (page.pageIndex !== undefined ? page.pageIndex : i) + 1,
          'Layout (Filas/Cols)': page.layout || 'N/A',
          'Cantidad de Fotos': Array.isArray(page.images) ? page.images.length : 0,
          'Textos Incluidos': page.texts && Object.keys(page.texts).length > 0 
            ? Object.values(page.texts).map((t: any) => `"${t.text}" (${t.fontFamily} ${t.fontSize}px)`).join(' | ') 
            : 'Sin textos'
        }));
      } else if (order.items && Array.isArray(order.items)) {
        detallesData = order.items.map((item, i) => ({
          'Taza Número': i + 1,
          'Texto Impreso': item.text || 'Sin texto',
          'Fuente': item.fontFamily || 'N/A',
          'Tamaño Fuente': item.fontSize || 'N/A',
          'Cantidad de Fotos': Array.isArray(item.photos) ? item.photos.length : 0
        }));
      }
      
      if (detallesData.length > 0) {
        const wsDetalles = XLSX.utils.json_to_sheet(detallesData);
        XLSX.utils.book_append_sheet(wb, wsDetalles, "Detalles del Diseño");
      }

      // HOJA 4: Reporte Exacto de Imágenes y Crops (NUEVO)
      const imagenesData: any[] = [];

      // Extraer datos de la Portada
      if (order.coverData?.image) {
        imagenesData.push({
          'Ubicación': 'Portada',
          'Nombre de Archivo en ZIP': 'portada.jpg',
          'Zoom (Escala)': order.coverData.crop?.zoom?.toFixed(2) || '1.00',
          'Posición X (%)': order.coverData.crop?.x?.toFixed(2) || '50.00',
          'Posición Y (%)': order.coverData.crop?.y?.toFixed(2) || '50.00',
          'URL Original': order.coverData.image
        });
      }

      // Extraer datos de las páginas del álbum
      if (order.pages && Array.isArray(order.pages)) {
        order.pages.forEach((page, pageIndex) => {
          if (page.images && Array.isArray(page.images)) {
            page.images.forEach((imgUrl: any, imgIndex: number) => {
              // Lógica robusta para buscar el crop ya sea en la página o en la raíz (pedidos viejos)
              const crop = page.crops?.[imgIndex] || order.photoCrops?.[`${pageIndex}-${imgIndex}`] || { x: 50, y: 50, zoom: 1 };
              imagenesData.push({
                'Ubicación': `Página ${pageIndex + 1}`,
                'Nombre de Archivo en ZIP': `pagina_${String(pageIndex + 1).padStart(2, '0')}_foto_${imgIndex + 1}.jpg`,
                'Zoom (Escala)': crop.zoom?.toFixed(2) || '1.00',
                'Posición X (%)': crop.x?.toFixed(2) || '50.00',
                'Posición Y (%)': crop.y?.toFixed(2) || '50.00',
                'URL Original': typeof imgUrl === 'string' ? imgUrl : 'N/A'
              });
            });
          }
        });
      } 
      // Extraer datos si es una taza u otro producto
      else if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item, itemIndex) => {
          if (item.photos && Array.isArray(item.photos)) {
            item.photos.forEach((imgUrl: any, imgIndex: number) => {
              const crop = item.photoCrops?.[imgIndex] || item.crop || { x: 50, y: 50, zoom: 1 };
              imagenesData.push({
                'Ubicación': `Taza ${itemIndex + 1}`,
                'Nombre de Archivo en ZIP': `taza_${String(itemIndex + 1).padStart(2, '0')}_foto_${imgIndex + 1}.jpg`,
                'Zoom (Escala)': crop.zoom?.toFixed(2) || '1.00',
                'Posición X (%)': crop.x?.toFixed(2) || '50.00',
                'Posición Y (%)': crop.y?.toFixed(2) || '50.00',
                'URL Original': typeof imgUrl === 'string' ? imgUrl : 'N/A'
              });
            });
          }
        });
      }

      if (imagenesData.length > 0) {
        const wsImagenes = XLSX.utils.json_to_sheet(imagenesData);
        XLSX.utils.book_append_sheet(wb, wsImagenes, "Reporte de Imágenes");
      }

      // Generar el archivo en buffer e inyectarlo en el ZIP
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      folder.file('resumen_pedido.xlsx', excelBuffer);
      // ==========================================


      // 3. Crear subcarpeta para imágenes físicas
      const imgFolder = folder.folder('imagenes');
      if (!imgFolder) {
        throw new Error("No se pudo crear la subcarpeta de imágenes.");
      }

      const fetchImageAsBlob = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Error al descargar la imagen: ${url} (estado: ${res.status})`);
        }
        return res.blob();
      };

      const imagePromises: Promise<void>[] = [];

      // Descargar Portada
      if (order.coverData?.image) {
        imagePromises.push(
          fetchImageAsBlob(order.coverData.image).then(blob => {
            imgFolder.file('portada.jpg', blob);
          }).catch(e => console.error(`Error descargando portada:`, e))
        );
      }

      // Descargar Páginas
      if (order.pages && Array.isArray(order.pages)) {
        order.pages.forEach((page, pageIndex) => {
          if (page.images && Array.isArray(page.images) && page.images.length > 0) {
            page.images.forEach((imgUrl: any, imgIndex: number) => {
              if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                imagePromises.push(
                  fetchImageAsBlob(imgUrl).then(blob => {
                    imgFolder.file(`pagina_${String(pageIndex + 1).padStart(2, '0')}_foto_${imgIndex + 1}.jpg`, blob);
                  }).catch(e => console.error(`Error descargando pág ${pageIndex + 1}, foto ${imgIndex + 1}:`, e))
                );
              }
            });
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