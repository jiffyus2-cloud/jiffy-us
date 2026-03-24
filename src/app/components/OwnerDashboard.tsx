import React, { useState, useEffect } from 'react';
import { collection, getDocs, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Header } from './navigation/Header';
import { AlertCircle, Lock, LogOut, Download, Eye, Search, Filter, Loader2, Trash2 } from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';
import * as XLSX from 'xlsx';

// --- NUEVAS DEPENDENCIAS PARA GENERAR EL PDF DE ALTA RESOLUCIÓN ---
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import { createRoot } from 'react-dom/client';
import CoverPreview from './CoverPreview'; 

interface Order {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  total: number;
  shippingAddress?: { email?: string; name?: string; address?: string; city?: string; zipCode?: string; };
  billingAddress?: { email?: string; name?: string; address?: string; city?: string; zipCode?: string; };
  coverData?: {
    image?: string; title?: string; subtitle?: string; year?: string; layout?: number | string;
    crop?: { x?: number; y?: number; zoom?: number; };
  };
  customization?: any;
  pages?: any[];
  [key: string]: any;
}

// ============================================================================
// FUNCIONES HELPERS IDÉNTICAS A LAS DE OrderDetailsModal PARA EL LAYOUT
// ============================================================================
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

// ============================================================================
// COMPONENTE AUXILIAR PARA RENDERIZAR LAS PÁGINAS INTERNAS EN EL PDF
// ============================================================================
const AlbumPagePrintView: React.FC<{pageObj: any, customization: any, pageIndex: number, order: any, pxWidth: number}> = ({pageObj, customization, pageIndex, order, pxWidth}) => {
  const size = customization?.size || '';
  
  // 1. Extraer los datos con la misma lógica robusta de retrocompatibilidad
  const imagesArray = Array.isArray(pageObj) ? pageObj : (pageObj?.images || []);
  const variantFromPage = !Array.isArray(pageObj) ? pageObj?.variant : undefined;
  const layoutFromPage = !Array.isArray(pageObj) ? pageObj?.layout : undefined;
  
  // 2. Determinar la cuadrícula exacta
  const currentPhotosPerPage = variantFromPage || order.pageLayoutVariants?.[pageIndex] || getClosestAllowed(imagesArray.length, size);
  const layout = layoutFromPage || order.pageLayouts?.[pageIndex];
  const slots = Array.from({ length: currentPhotosPerPage }, (_, i) => imagesArray[i] || null);

  const gridClass = getGridLayout(currentPhotosPerPage, layout, size);
  
  // Escala de fuentes para alta resolución
  const textScale = Math.max(1, Math.round(pxWidth / 800)); 

  return (
    <div className={`w-full h-full bg-white grid gap-[2%] p-[4%] ${gridClass}`}>
      {slots.map((photo: string | null, photoIndex: number) => {
        const textsFromPage = !Array.isArray(pageObj) ? pageObj?.texts : undefined;
        const textBox = textsFromPage?.[photoIndex] || order.textBoxSlots?.[pageIndex]?.[photoIndex];
        const crop = (!Array.isArray(pageObj) ? (pageObj as any)?.crops?.[photoIndex] : null) || order.photoCrops?.[`${pageIndex}-${photoIndex}`] || { x: 50, y: 50, zoom: 1 };
        
        // Logica para centrado de fotos apaisadas en layouts anchos
        const isHalfHeightLayout = (currentPhotosPerPage === 2 || currentPhotosPerPage === 3) && layout !== 'column';

        return (
          <div key={photoIndex} className="relative overflow-hidden rounded-lg bg-white flex items-center justify-center w-full h-full border border-gray-100/50">
            {photo ? (
              <div className={isHalfHeightLayout ? "w-full h-[65%] relative my-auto bg-gray-100" : "w-full h-full relative bg-gray-100"}>
                <img 
                  src={photo} 
                  crossOrigin="anonymous"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{
                    objectPosition: '50% 50%',
                    transform: `scale(${crop.zoom || 1}) translate(${(50 - (crop.x || 50))}%, ${(50 - (crop.y || 50))}%)`,
                    transformOrigin: 'center center'
                  }}
                />
              </div>
            ) : textBox ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-white text-center">
                <div style={{ 
                  fontSize: `${(textBox.fontSize || 24) * textScale}px`, 
                  fontFamily: textBox.fontFamily || 'Arial', 
                  color: textBox.color || '#000', 
                  wordBreak: 'break-word' 
                }}>
                  {textBox.text}
                </div>
              </div>
            ) : (
              // Hueco vacío (si el layout tiene 4 huecos pero solo 3 fotos)
              <div className="bg-gray-50 w-full h-full" />
            )}
          </div>
        );
      })}
    </div>
  );
};
// ============================================================================

const OwnerDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('owner_authenticated') === 'true');
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
  const [downloadProgress, setDownloadProgress] = useState<{ orderId: string | null; progress: number }>({ orderId: null, progress: 0 });

  const ownerKey = import.meta.env.VITE_OWNER_KEY || 'admin123';

  // ============================================================================
  // MOTOR DE GENERACIÓN DEL PDF DE ALTA RESOLUCIÓN (300 DPI)
  // ============================================================================
  const generateAlbumPDF = async (order: Order, onProgress: (progress: number) => void): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        // 1. Deducir las dimensiones exactas y la orientación
        const sizeStr = order.customization?.size || '20x20';
        const isVert = sizeStr.toLowerCase().includes('vertical');
        const isHoriz = sizeStr.toLowerCase().includes('horizontal');
        
        let wCm = 20;
        let hCm = 20;
        let coverSizeProp = '20x20';

        // MAGIA AQUÍ: Obligamos a que el PDF y el CoverPreview se entiendan
        if (isVert) {
          wCm = 21;
          hCm = 28;
          coverSizeProp = '28x21'; // CoverPreview maneja 28x21 como Vertical internamente
        } else if (isHoriz) {
          wCm = 28;
          hCm = 21;
          coverSizeProp = '21x28'; // CoverPreview maneja 21x28 como Horizontal internamente
        } else {
          const match = sizeStr.match(/(\d+)\s*x\s*(\d+)/i);
          if (match) {
            wCm = parseInt(match[1], 10);
            hCm = parseInt(match[2], 10);
            coverSizeProp = `${wCm}x${hCm}`;
          }
        }
        
        // 2. Calcular los píxeles necesarios para 300 DPI (ppp)
        const pxWidth = Math.round((wCm / 2.54) * 300);
        const pxHeight = Math.round((hCm / 2.54) * 300);

        const totalItems = 1 + (order.pages?.length || 0);
        let itemsProcessed = 0;

        const pdf = new jsPDF({
          orientation: wCm > hCm ? 'landscape' : 'portrait',
          unit: 'cm',
          format: [wCm, hCm]
        });

        // 3. Crear un "Laboratorio de Renderizado" fuera de la pantalla
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '-99999px'; // Totalmente oculto al usuario
        container.style.width = `${pxWidth}px`;
        container.style.height = `${pxHeight}px`;
        document.body.appendChild(container); 
        
        const root = createRoot(container);

        // Función fotográfica: Monta el componente, espera y le toma foto.
        const renderAndCapture = async (element: React.ReactNode) => {
          return new Promise<string>((res, rej) => {
            root.render(
              <div style={{ width: pxWidth, height: pxHeight, position: 'relative', overflow: 'hidden' }}>
                {element}
              </div>
            );
            // Damos 1.5s por página para que las imágenes terminen de descargar desde la web
            setTimeout(async () => {
              try {
                const node = container.firstChild as HTMLElement;
                const dataUrl = await htmlToImage.toJpeg(node, {
                  quality: 0.95,
                  pixelRatio: 1, // El nodo ya tiene tamaño gigante, ratio 1 es suficiente.
                });
                res(dataUrl);
              } catch (e) {
                rej(e);
              }
            }, 1500); 
          });
        };

        console.log("Iniciando renderizado de Portada...");
        // 4. Renderizar y estampar la Portada
        const coverDataUrl = await renderAndCapture(
          <CoverPreview
            coverSize={coverSizeProp as any} // <-- Usamos la propiedad mapeada para no romper la portada
            coverImage={order.coverData?.image || ''}
            coverTitle={order.coverData?.title || ''}
            coverSubtitle={order.coverData?.subtitle || ''}
            coverYear={order.coverData?.year || ''}
            
            selectedLayout={Number(order.coverData?.layout) || 1}
            coverCrop={{ 
              x: order.coverData?.crop?.x ?? 50, 
              y: order.coverData?.crop?.y ?? 50, 
              zoom: order.coverData?.crop?.zoom ?? 1 
            }}
            
            customization={order.customization}
            photos={[order.coverData?.image || null, null]} 
            
            photoCrops={{ 
              'cover-0': { 
                x: order.coverData?.crop?.x ?? 50, 
                y: order.coverData?.crop?.y ?? 50, 
                zoom: order.coverData?.crop?.zoom ?? 1 
              } 
            }}
          />
        );
        pdf.addImage(coverDataUrl, 'JPEG', 0, 0, wCm, hCm);
        itemsProcessed++;
        onProgress(Math.round((itemsProcessed / totalItems) * 100));

        // 5. Renderizar y estampar Páginas Internas
        if (order.pages && order.pages.length > 0) {
          for (let i = 0; i < order.pages.length; i++) {
            console.log(`Renderizando página ${i + 1}/${order.pages.length}...`);
            pdf.addPage();
            const pageDataUrl = await renderAndCapture(
              <AlbumPagePrintView 
                pageObj={order.pages[i]} 
                customization={order.customization} 
                pageIndex={i}
                order={order}
                pxWidth={pxWidth}
              />
            );
            pdf.addImage(pageDataUrl, 'JPEG', 0, 0, wCm, hCm);
            itemsProcessed++;
            onProgress(Math.round((itemsProcessed / totalItems) * 100));
          }
        }

        // 6. Limpieza y exportación
        root.unmount();
        document.body.removeChild(container);
        onProgress(100);
        resolve(pdf.output('blob'));

      } catch (err) {
        reject(err);
      }
    });
  };
  // ============================================================================


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

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
    } catch (error) {
      console.error("Error deleting order: ", error);
      alert('No se pudo eliminar el pedido. Por favor, inténtalo de nuevo.');
    }
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
    if (downloadProgress.orderId) return;
    setDownloadProgress({ orderId: order.id, progress: 0 });
    try {
      const zip = new JSZip();
      const folder = zip.folder(`pedido_${order.id}`);

      if (!folder) throw new Error("No se pudo crear la carpeta en el ZIP.");

      // 1. Guardar el JSON crudo
      folder.file('datos_pedido.json', JSON.stringify(order, null, 2));

      // 2. CREAR EL ARCHIVO EXCEL (.xlsx) LEGIBLE
      const wb = XLSX.utils.book_new();
      
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
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenData), "Resumen General");

      const configData = [{
        'Tipo de Producto': order.product?.name || order.product?.type || 'N/A',
        'Formato/Tamaño': order.customization?.size || order.customization?.orientation || 'N/A',
        'Papel/Material': order.customization?.paper || order.customization?.material || 'N/A',
        'Título de Portada': order.coverData?.title || 'N/A',
        'Subtítulo': order.coverData?.subtitle || 'N/A',
        'Año': order.coverData?.year || 'N/A',
        'Layout Portada': order.coverData?.layout || 'N/A'
      }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(configData), "Configuración");

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
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detallesData), "Detalles del Diseño");
      }

      const imagenesData: any[] = [];
      if (order.coverData?.image) {
        imagenesData.push({
          'Ubicación': 'Portada', 'Nombre de Archivo en ZIP': 'portada.jpg',
          'Zoom (Escala)': order.coverData.crop?.zoom?.toFixed(2) || '1.00',
          'Posición X (%)': order.coverData.crop?.x?.toFixed(2) || '50.00',
          'Posición Y (%)': order.coverData.crop?.y?.toFixed(2) || '50.00',
          'URL Original': order.coverData.image
        });
      }
      if (order.pages && Array.isArray(order.pages)) {
        order.pages.forEach((page, pageIndex) => {
          if (page.images && Array.isArray(page.images)) {
            page.images.forEach((imgUrl: any, imgIndex: number) => {
              const crop = page.crops?.[imgIndex] || order.photoCrops?.[`${pageIndex}-${imgIndex}`] || { x: 50, y: 50, zoom: 1 };
              imagenesData.push({
                'Ubicación': `Página ${pageIndex + 1}`, 'Nombre de Archivo en ZIP': `pagina_${String(pageIndex + 1).padStart(2, '0')}_foto_${imgIndex + 1}.jpg`,
                'Zoom (Escala)': crop.zoom?.toFixed(2) || '1.00', 'Posición X (%)': crop.x?.toFixed(2) || '50.00',
                'Posición Y (%)': crop.y?.toFixed(2) || '50.00', 'URL Original': typeof imgUrl === 'string' ? imgUrl : 'N/A'
              });
            });
          }
        });
      }
      if (imagenesData.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(imagenesData), "Reporte de Imágenes");
      }
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      folder.file('resumen_pedido.xlsx', excelBuffer);

      // 3. Descarga de Archivos de Imagen
      const imgFolder = folder.folder('imagenes');
      if (!imgFolder) throw new Error("No se pudo crear la subcarpeta de imágenes.");

      const fetchImageAsBlob = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Error al descargar la imagen: ${url}`);
        return res.blob();
      };

      const imagePromises: Promise<void>[] = [];
      if (order.coverData?.image) {
        imagePromises.push(
          fetchImageAsBlob(order.coverData.image).then(blob => { imgFolder.file('portada.jpg', blob); })
          .catch(e => console.error(`Error descargando portada:`, e))
        );
      }
      if (order.pages && Array.isArray(order.pages)) {
        order.pages.forEach((page, pageIndex) => {
          if (page.images && Array.isArray(page.images) && page.images.length > 0) {
            page.images.forEach((imgUrl: any, imgIndex: number) => {
              if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                imagePromises.push(
                  fetchImageAsBlob(imgUrl).then(blob => { imgFolder.file(`pagina_${String(pageIndex + 1).padStart(2, '0')}_foto_${imgIndex + 1}.jpg`, blob); })
                  .catch(e => console.error(`Error descargando pág ${pageIndex + 1}, foto ${imgIndex + 1}:`, e))
                );
              }
            });
          }
        });
      }
      await Promise.all(imagePromises);

      // ============================================================================
      // 4. INYECTAR EL PDF DE ALTA RESOLUCIÓN AL ARCHIVO ZIP
      // ============================================================================
      try {
        const pdfBlob = await generateAlbumPDF(order, (progress) => {
          setDownloadProgress({ orderId: order.id, progress });
        });
        folder.file(`Impresion_Album_${order.id}_300DPI.pdf`, pdfBlob);
      } catch (pdfError) {
        console.error("Error al generar PDF de alta resolución:", pdfError);
        alert("Advertencia: El ZIP se descargará pero el PDF de previsualización no se pudo crear.");
      }
      // ============================================================================
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `pedido_${order.id}.zip`);

      // Success: wait a bit before resetting
      setTimeout(() => {
        setDownloadProgress({ orderId: null, progress: 0 });
      }, 2000);
    } catch (error: any) {
      console.error("Error al descargar el ZIP:", error);
      alert("Hubo un problema al empaquetar el pedido: " + (error.message || 'Error desconocido'));
      setDownloadProgress({ orderId: null, progress: 0 });
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
              <option value="draft">Borrador</option>
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
                          {/* BOTON DE DESCARGA */}
                          {downloadProgress.orderId === order.id ? (
                            <div className="w-28 flex items-center gap-2" title={`Renderizando... ${downloadProgress.progress}%`}>
                              <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
                                <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${downloadProgress.progress}%` }}></div>
                              </div>
                              <span className="text-xs font-mono font-bold text-emerald-600 w-8 text-right">{downloadProgress.progress}%</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDownloadZIP(order)}
                              disabled={downloadProgress.orderId !== null}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={'Descargar ZIP con PDF'}
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          )}
                          {(order.status === 'pending_payment' || order.status === 'draft') && (
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar Pedido"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
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