import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, Timestamp, doc, deleteDoc, setDoc } from 'firebase/firestore';
// Importamos la lógica de Autenticación de Firebase
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../lib/firebase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Header } from './navigation/Header';
import { AlertCircle, Lock, LogOut, Download, Eye, Search, Filter, Loader2, Trash2, Settings as SettingsIcon, ShoppingBag, Tag, Save, Plus, Star } from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';
import * as XLSX from 'xlsx';

// --- DEPENDENCIAS PARA GENERAR EL PDF DE ALTA RESOLUCIÓN ---
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import { createRoot } from 'react-dom/client';
import CoverPreview from './CoverPreview'; 
import { getColombianHolidays, isHoliday } from '../utils/holidays';
import justWhiteImg from '../../assets/justwhite.png';
import jiffyLogo from '../../assets/JiffyLogo.svg'; 

// --- CONTEXTO DE LA TIENDA ---
import { useStoreConfig, StoreConfig } from '../context/StoreConfigContext';

interface Order {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
  total: number;
  shippingAddress?: { email?: string; name?: string; address?: string; city?: string; zipCode?: string; };
  billingAddress?: { email?: string; name?: string; address?: string; city?: string; zipCode?: string; };
  coverData?: {
    image?: string; title?: string; subtitle?: string; year?: string; layout?: number | string; spineText?: string;
    crop?: { x?: number; y?: number; zoom?: number; };
  };
  customization?: any;
  pages?: any[];
  [key: string]: any;
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// ============================================================================
// FUNCIONES HELPERS DE DIMENSIONES Y LAYOUT
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

const getDimensions = (order: Order) => {
  const productString = String(order.product?.type || order.product?.id || order.product?.name || order.productType || '').toLowerCase();
  const isCalendar = productString.includes('calendar') || productString.includes('calendario') || order.customization?.year !== undefined;
  const isAlbum = productString.includes('album') || productString.includes('photobook');
  const sizeStr = order.customization?.size || '20x20';
  const orientation = order.customization?.orientation || 'vertical';
  
  const isVert = sizeStr.toLowerCase().includes('vertical') || (isCalendar && orientation === 'vertical');
  const isHoriz = sizeStr.toLowerCase().includes('horizontal') || (isCalendar && orientation === 'horizontal');
  
  let wCm = 20;
  let hCm = 20;
  let coverSizeProp = '20x20';

  if (isVert) {
    wCm = 21; hCm = 28; coverSizeProp = '28x21'; 
  } else if (isHoriz) {
    wCm = 28; hCm = 21; coverSizeProp = '21x28'; 
  } else {
    const match = sizeStr.match(/(\d+)\s*x\s*(\d+)/i);
    if (match) {
      wCm = parseInt(match[1], 10);
      hCm = parseInt(match[2], 10);
      coverSizeProp = `${wCm}x${hCm}`;
    }
  }
  return { wCm, hCm, coverSizeProp, pxWidth: Math.round((wCm / 2.54) * 300), pxHeight: Math.round((hCm / 2.54) * 300), isCalendar, isAlbum };
}

// ============================================================================
// RENDERIZADOR CANVAS NATIVO
// ============================================================================
const CanvasCropper: React.FC<{ src: string, crop: any }> = ({ src, crop }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;

      const imgWidth = img.naturalWidth;
      const imgHeight = img.naturalHeight;
      const destWidth = canvas.width;
      const destHeight = canvas.height;

      const { x = 50, y = 50, zoom = 1 } = crop || { x: 50, y: 50, zoom: 1 };
      const imgAspect = imgWidth / imgHeight;
      const destAspect = destWidth / destHeight;

      let baseSWidth = imgWidth;
      let baseSHeight = imgHeight;

      if (imgAspect > destAspect) {
        baseSWidth = imgHeight * destAspect;
      } else {
        baseSHeight = imgWidth / destAspect;
      }

      const finalSWidth = baseSWidth / zoom;
      const finalSHeight = baseSHeight / zoom;

      const centerX = (x / 100) * imgWidth;
      const centerY = (y / 100) * imgHeight;

      const sX = centerX - (finalSWidth / 2);
      const sY = centerY - (finalSHeight / 2);

      ctx.clearRect(0, 0, destWidth, destHeight);
      ctx.drawImage(img, sX, sY, finalSWidth, finalSHeight, 0, 0, destWidth, destHeight);
    };
    img.src = src;
  }, [src, crop]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
};

// ============================================================================
// COMPONENTES AUXILIARES PARA RENDERIZAR LAS PÁGINAS INTERNAS EN EL PDF
// ============================================================================
const AlbumPagePrintView: React.FC<{pageObj: any, customization: any, pageIndex: number, order: any, pxWidth: number}> = ({pageObj, customization, pageIndex, order, pxWidth}) => {
  const size = customization?.size || '';
  
  const imagesArray = Array.isArray(pageObj) ? pageObj : (pageObj?.images || []);
  const variantFromPage = !Array.isArray(pageObj) ? pageObj?.variant : undefined;
  const layoutFromPage = !Array.isArray(pageObj) ? pageObj?.layout : undefined;
  
  const currentPhotosPerPage = variantFromPage || order.pageLayoutVariants?.[pageIndex] || getClosestAllowed(imagesArray.length, size);
  const layout = layoutFromPage || order.pageLayouts?.[pageIndex];
  const slots = Array.from({ length: currentPhotosPerPage }, (_, i) => imagesArray[i] || null);

  const gridClass = getGridLayout(currentPhotosPerPage, layout, size);

  return (
    <div className={`w-full h-full bg-white ${currentPhotosPerPage === 3 ? 'flex flex-col items-center justify-center' : ''}`}>
    <div className={`w-full ${currentPhotosPerPage === 3 ? 'h-4/5' : 'h-full'} grid gap-[2%] p-[4%] ${gridClass}`}>
      {slots.map((photo: string | null, photoIndex: number) => {
        const textsFromPage = !Array.isArray(pageObj) ? pageObj?.texts : undefined;
        const textBox = textsFromPage?.[photoIndex] || order.textBoxSlots?.[pageIndex]?.[photoIndex];
        const crop = (!Array.isArray(pageObj) ? (pageObj as any)?.crops?.[photoIndex] : null) || order.photoCrops?.[`${pageIndex}-${photoIndex}`] || { x: 50, y: 50, zoom: 1 };
        
        const isHalfHeightLayout = (currentPhotosPerPage === 2 || currentPhotosPerPage === 3) && layout !== 'column';

        return (
          <div key={photoIndex} className="relative overflow-hidden rounded-lg bg-white flex items-center justify-center w-full h-full border border-gray-100/50">
            {photo ? (
              <div className={isHalfHeightLayout ? "w-full h-[65%] relative my-auto bg-gray-100" : "w-full h-full relative bg-gray-100"}>
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                  <CanvasCropper src={photo} crop={crop} />
                </div>
              </div>
            ) : textBox ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-white" style={{ containerType: 'inline-size' }}>
                <div style={{ 
                  width: '90%', 
                  fontSize: `${(textBox.fontSize || 24) * 0.25}cqi`,
                  fontFamily: textBox.fontFamily || 'Arial', 
                  color: textBox.color || '#000', 
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.3'
                }}>
                  {textBox.text}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 w-full h-full" />
            )}
          </div>
        );
      })}
    </div>
    </div>
  );
};

const CalendarPagePrintView: React.FC<{ order: any, monthIndex: number, pxWidth: number }> = ({ order, monthIndex, pxWidth }) => {
  const year = order.customization?.year || new Date().getFullYear();
  const orientation = order.customization?.orientation || 'vertical';
  const type = order.customization?.type || 'desk';
  const imagesPerMonth = order.customization?.imagesPerMonth || 1;
  const holidays = getColombianHolidays(year);
  const month = MONTHS_ES[monthIndex];

  const generateCalendarGrid = (y: number, m: number) => {
    const date = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDayOfWeek = date.getDay();
    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  };

  const baseSize = pxWidth / 100;
  const titleSize = orientation === 'horizontal' ? baseSize * 2.5 : baseSize * 3.5;
  const headerSize = orientation === 'horizontal' ? baseSize * 1.3 : baseSize * 1.8;
  const daySize = orientation === 'horizontal' ? baseSize * 1.5 : baseSize * 2;
  const padding = baseSize * 3;
  const gap = baseSize * 0.5;

  let photosForMonth: string[] = [];
  const pageData = order.pages?.[monthIndex];
  if (pageData && Array.isArray(pageData.images)) {
    photosForMonth = pageData.images;
  } else if (pageData && pageData.image) {
    photosForMonth = [pageData.image];
  }
  
  const photoData = order.photos?.[monthIndex];
  if (photosForMonth.length === 0 && photoData) {
    if (Array.isArray(photoData)) photosForMonth = photoData as string[];
    else if (typeof photoData === 'string') photosForMonth = [photoData as string];
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: orientation === 'horizontal' ? 'row' : 'column', backgroundColor: 'white', boxSizing: 'border-box' }}>
      <div style={{ position: 'relative', backgroundColor: '#f9fafb', borderRight: orientation === 'horizontal' ? '2px solid #f3f4f6' : 'none', borderBottom: orientation === 'horizontal' ? 'none' : '2px solid #f3f4f6', width: orientation === 'horizontal' ? '50%' : '100%', height: orientation === 'horizontal' ? '100%' : '50%', boxSizing: 'border-box' }}>
        {(() => {
          if (photosForMonth.length > 0 && photosForMonth[0]) {
            if (type === 'wall' && imagesPerMonth === 4) {
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gridTemplateRows: 'repeat(2, minmax(0, 1fr))', gap: `${gap}px`, width: '100%', height: '100%', padding: `${gap}px`, boxSizing: 'border-box' }}>
                  {Array.from({ length: 4 }).map((_, photoIdx) => {
                    const photo = photosForMonth[photoIdx];
                    const crop = order.photoCrops?.[`${monthIndex}-${photoIdx}`];
                    return (
                      <div key={photoIdx} style={{ position: 'relative', backgroundColor: '#e5e7eb', borderRadius: `${baseSize*0.5}px`, overflow: 'hidden' }}>
                        {photo && (
                          <div className="absolute inset-0 w-full h-full pointer-events-none">
                            <CanvasCropper src={photo} crop={crop} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            } else {
              const photo = photosForMonth[0];
              const crop = order.photoCrops?.[monthIndex] || order.photoCrops?.[`${monthIndex}-0`];
              return (
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                  <CanvasCropper src={photo} crop={crop} />
                </div>
              );
            }
          }
          return <div style={{ width: '100%', height: '100%', backgroundColor: '#f3f4f6' }} />;
        })()}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', backgroundColor: 'rgba(249, 250, 251, 0.5)', padding: `${padding}px`, width: orientation === 'horizontal' ? '50%' : '100%', height: orientation === 'horizontal' ? '100%' : '50%', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: `${padding * 0.8}px` }}>
          <span style={{ fontSize: `${titleSize}px`, fontWeight: 'bold', color: '#111827', fontFamily: 'sans-serif' }}>{month} {year}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: `${gap}px`, flex: 1, minHeight: 0 }}>
          {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: `${headerSize}px`, fontWeight: 'bold', color: '#9ca3af', fontFamily: 'sans-serif' }}>{day}</div>
          ))}
          {generateCalendarGrid(year, monthIndex).map((day, i) => {
            if (!day) return <div key={i} style={{ height: '100%', minHeight: `${baseSize * 4}px` }} />;
            const date = new Date(year, monthIndex, day);
            const holiday = isHoliday(date, holidays);
            return (
              <div key={i} style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: `${daySize}px`, borderRadius: `${baseSize * 0.5}px`, height: '100%', minHeight: `${baseSize * 4}px`, fontFamily: 'sans-serif',
                ...(holiday 
                   ? { backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: 'bold', border: `${baseSize*0.1}px solid #fee2e2` } 
                   : { backgroundColor: 'white', border: `${baseSize*0.1}px solid #f3f4f6`, color: '#374151' })
              }}>
                {day}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: OWNER DASHBOARD
// ============================================================================
const OwnerDashboard: React.FC = () => {
  // 1. Estados de Autenticación actualizados a Firebase Auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');

  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ orderId: string | null; progress: number }>({ orderId: null, progress: 0 });

  // --- CONTEXTO GLOBAL DE LA TIENDA ---
  const storeConfig = useStoreConfig();
  const [localConfig, setLocalConfig] = useState<StoreConfig>(storeConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // 2. Comprobar sesión activa automáticamente con Firebase
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setLocalConfig(storeConfig);
  }, [storeConfig]);

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, 'settings', 'store_config'), localConfig);
      alert('¡Configuración guardada exitosamente! Los cambios ya están en vivo en toda la tienda.');
    } catch (error) {
      console.error("Error saving config:", error);
      alert('Error al guardar la configuración.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // 3. Nuevo manejo de Login con Firebase Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      setAuthError(null);
    } catch (error) {
      setAuthError('Correo o contraseña incorrectos, o no tienes permisos.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 4. Nuevo manejo de Logout
  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este pedido? Esta acción no se puede deshacer.')) return;
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
            if (dateVal && typeof dateVal === 'object' && dateVal.seconds) return new Date(dateVal.seconds * 1000).toISOString();
            return dateVal;
          };
          return { id: doc.id, ...data, createdAt: normalizeDate(data.createdAt), updatedAt: normalizeDate(data.updatedAt) } as Order;
        });

        const sortedOrders = ordersList.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
        setOrders(sortedOrders);
        setFilteredOrders(sortedOrders);
      } catch (err) {
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
      result = result.filter(order => order.id.toLowerCase().includes(lowSearch) || (order.shippingAddress?.email?.toLowerCase().includes(lowSearch)) || (order.shippingAddress?.name?.toLowerCase().includes(lowSearch)));
    }
    if (statusFilter !== 'all') result = result.filter(order => order.status === statusFilter);
    setFilteredOrders(result);
  }, [searchTerm, statusFilter, orders]);

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // ==========================================================================
  // GENERADORES DE PDF SEPARADOS (PORTADA A DOBLE PÁGINA E INTERIORES)
  // ==========================================================================

  const generateCoverPDF = async (order: Order, onProgress: (p: number) => void): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const { wCm, hCm, coverSizeProp, pxWidth, pxHeight } = getDimensions(order);
        
        // VALIDACIÓN DE TELA: Si es Tela, el PDF no debe tener lomo ni contraportada
        const isTela = order.customization?.coverType === 'Tela' || order.customization?.material === 'Tela';

        const spineCm = isTela ? 0 : 2;
        const totalWCm = isTela ? wCm : (wCm * 2) + spineCm;
        const totalHCm = hCm;

        const totalPxWidth = Math.round((totalWCm / 2.54) * 300);
        const spinePxWidth = isTela ? 0 : totalPxWidth - (pxWidth * 2);

        const pdf = new jsPDF({ orientation: isTela && wCm <= hCm ? 'portrait' : 'landscape', unit: 'cm', format: [totalWCm, totalHCm] });

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '-99999px'; 
        container.style.width = `${totalPxWidth}px`;
        container.style.height = `${pxHeight}px`;
        document.body.appendChild(container); 
        
        const root = createRoot(container);

        const renderAndCapture = async (element: React.ReactNode) => {
          return new Promise<string>((res, rej) => {
            root.render(<div style={{ width: totalPxWidth, height: pxHeight, position: 'relative', overflow: 'hidden' }}>{element}</div>);
            setTimeout(async () => {
              try {
                const node = container.firstChild as HTMLElement;
                const dataUrl = await htmlToImage.toJpeg(node, { quality: 0.95, pixelRatio: 1 });
                res(dataUrl);
              } catch (e) {
                rej(e);
              }
            }, 1500); 
          });
        };

        let coverImageForPdf = order.coverData?.image || '';
        if (typeof coverImageForPdf === 'string' && coverImageForPdf.includes('justwhite')) {
          coverImageForPdf = justWhiteImg;
        }
        
        const textColor = order.customization?.coverContent?.typographyColor || order.customization?.typographyColor || '#000000';
        const spineText = order.coverData?.spineText || order.customization?.coverContent?.spineText || order.coverData?.title || '';

        const dataUrl = await renderAndCapture(
            <div style={{ display: 'flex', width: totalPxWidth, height: pxHeight, backgroundColor: '#FFFFFF' }}>
               {!isTela && (
                 <>
                   {/* Contraportada (Izquierda) - Fondo Blanco puro */}
                   <div style={{ width: pxWidth, height: pxHeight, position: 'relative', backgroundColor: '#FFFFFF' }}>
                      <div style={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${pxWidth * 0.01}px` }}>
                         <img src={jiffyLogo} style={{ width: `${pxWidth * 0.125}px`, height: 'auto', filter: textColor === '#000000' ? 'none' : 'brightness(0) invert(1)' }} />
                         <span style={{ fontSize: `${pxWidth * 0.015}px`, fontWeight: 'bold', color: textColor, fontFamily: 'sans-serif' }}>@Jiffy.photos</span>
                      </div>
                   </div>
                   
                   {/* Lomo (Centro) - Fondo Blanco puro */}
                   <div style={{ width: spinePxWidth, height: pxHeight, position: 'relative', backgroundColor: '#FFFFFF' }}>
                       <div style={{ position: 'absolute', top: '10%', left: '50%' }}>
                           <span style={{ 
                              display: 'block',
                              transform: 'rotate(90deg) translateY(-50%)', 
                              transformOrigin: 'top left', 
                              whiteSpace: 'nowrap', 
                              fontSize: `${spinePxWidth * 0.25}px`, 
                              fontWeight: 'bold', 
                              letterSpacing: '8px', 
                              color: textColor 
                           }}>
                              {spineText}
                           </span>
                       </div>
                   </div>
                 </>
               )}
               
               {/* Portada (Derecha o Centro si es Tela) */}
               <div style={{ width: pxWidth, height: pxHeight, position: 'relative' }}>
                   <CoverPreview
                     coverSize={coverSizeProp as any} 
                     coverType={isTela ? 'Tela' : 'Papel'}
                     coverImage={coverImageForPdf} 
                     coverTitle={order.coverData?.title || ''}
                     coverSubtitle={order.coverData?.subtitle || ''} 
                     coverYear={order.coverData?.year || ''}
                     selectedLayout={Number(order.coverData?.layout) || 1} 
                     coverCrop={{ x: order.coverData?.crop?.x ?? 50, y: order.coverData?.crop?.y ?? 50, zoom: order.coverData?.crop?.zoom ?? 1 }}
                     typographyColor={textColor}
                     hideSpine={true}
                   />
               </div>
            </div>
        );

        pdf.addImage(dataUrl, 'JPEG', 0, 0, totalWCm, totalHCm);
        onProgress(100);
        
        root.unmount();
        document.body.removeChild(container);
        resolve(pdf.output('blob'));
      } catch (err) {
        reject(err);
      }
    });
  };

  const generateInnerPagesPDF = async (order: Order, onProgress: (p: number) => void): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const { wCm, hCm, pxWidth, pxHeight } = getDimensions(order);
        const totalItems = order.pages?.length || 0;
        let itemsProcessed = 0;

        const pdf = new jsPDF({ orientation: wCm > hCm ? 'landscape' : 'portrait', unit: 'cm', format: [wCm, hCm] });

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '-99999px'; 
        container.style.width = `${pxWidth}px`;
        container.style.height = `${pxHeight}px`;
        document.body.appendChild(container); 
        
        const root = createRoot(container);

        const renderAndCapture = async (element: React.ReactNode) => {
          return new Promise<string>((res, rej) => {
            root.render(<div style={{ width: pxWidth, height: pxHeight, position: 'relative', overflow: 'hidden' }}>{element}</div>);
            setTimeout(async () => {
              try {
                const node = container.firstChild as HTMLElement;
                const dataUrl = await htmlToImage.toJpeg(node, { quality: 0.95, pixelRatio: 1 });
                res(dataUrl);
              } catch (e) {
                rej(e);
              }
            }, 1500); 
          });
        };

        if (order.pages && order.pages.length > 0) {
          for (let i = 0; i < order.pages.length; i++) {
            if (i > 0) pdf.addPage();
            const pageDataUrl = await renderAndCapture(
              <AlbumPagePrintView pageObj={order.pages[i]} customization={order.customization} pageIndex={i} order={order} pxWidth={pxWidth} />
            );
            pdf.addImage(pageDataUrl, 'JPEG', 0, 0, wCm, hCm);
            itemsProcessed++;
            onProgress(Math.round((itemsProcessed / totalItems) * 100));
          }
        }

        root.unmount();
        document.body.removeChild(container);
        onProgress(100);
        resolve(pdf.output('blob'));
      } catch (err) {
        reject(err);
      }
    });
  };

  const generateCalendarPDF = async (order: Order, onProgress: (p: number) => void): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const { wCm, hCm, pxWidth, pxHeight } = getDimensions(order);
        const totalItems = 12;
        let itemsProcessed = 0;

        const pdf = new jsPDF({ orientation: wCm > hCm ? 'landscape' : 'portrait', unit: 'cm', format: [wCm, hCm] });

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '-99999px'; 
        container.style.width = `${pxWidth}px`;
        container.style.height = `${pxHeight}px`;
        document.body.appendChild(container); 
        
        const root = createRoot(container);

        const renderAndCapture = async (element: React.ReactNode) => {
          return new Promise<string>((res, rej) => {
            root.render(<div style={{ width: pxWidth, height: pxHeight, position: 'relative', overflow: 'hidden' }}>{element}</div>);
            setTimeout(async () => {
              try {
                const node = container.firstChild as HTMLElement;
                const dataUrl = await htmlToImage.toJpeg(node, { quality: 0.95, pixelRatio: 1 });
                res(dataUrl);
              } catch (e) {
                rej(e);
              }
            }, 1500); 
          });
        };

        for (let i = 0; i < 12; i++) {
          if (i > 0) pdf.addPage(); 
          const pageDataUrl = await renderAndCapture(<CalendarPagePrintView order={order} monthIndex={i} pxWidth={pxWidth} />);
          pdf.addImage(pageDataUrl, 'JPEG', 0, 0, wCm, hCm);
          itemsProcessed++;
          onProgress(Math.round((itemsProcessed / totalItems) * 100));
        }

        root.unmount();
        document.body.removeChild(container);
        onProgress(100);
        resolve(pdf.output('blob'));
      } catch (err) {
        reject(err);
      }
    });
  };

  // ==========================================================================

  const handleDownloadZIP = async (order: Order) => {
    if (downloadProgress.orderId) return;
    setDownloadProgress({ orderId: order.id, progress: 0 });
    try {
      const zip = new JSZip();
      const folder = zip.folder(`pedido_${order.id}`);
      if (!folder) throw new Error("No se pudo crear la carpeta en el ZIP.");

      const { isCalendar, isAlbum } = getDimensions(order);
      const isTela = order.customization?.coverType === 'Tela' || order.customization?.material === 'Tela';

      folder.file('datos_pedido.json', JSON.stringify(order, null, 2));

      const wb = XLSX.utils.book_new();
      
      const resumenData = [{
        'ID del Pedido': order.id, 'Fecha': new Date(order.createdAt).toLocaleString('es-ES'),
        'Estado': order.status === 'paid' || order.status === 'mock_paid' ? 'Pagado' : order.status,
        'Total Pagado ($)': order.total?.toFixed(2), 'Nombre del Cliente': order.shippingAddress?.name || 'N/A',
        'Email': order.shippingAddress?.email || 'N/A', 'Dirección de Envío': order.shippingAddress?.address || 'N/A',
        'Ciudad': order.shippingAddress?.city || 'N/A', 'Código Postal': order.shippingAddress?.zipCode || 'N/A'
      }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenData), "Resumen General");

      const configData = [{
        'Tipo de Producto': order.product?.name || order.product?.type || 'N/A',
        'Formato/Tamaño': order.customization?.size || order.customization?.orientation || 'N/A',
        'Papel/Material': order.customization?.paper || order.customization?.material || 'N/A',
        'Título de Portada': order.coverData?.title || 'N/A', 'Subtítulo': order.coverData?.subtitle || 'N/A',
        'Año': order.coverData?.year || 'N/A', 'Layout Portada': order.coverData?.layout || 'N/A',
        'Texto Lomo': !isTela ? (order.coverData?.spineText || order.customization?.coverContent?.spineText || order.coverData?.title || 'N/A') : 'N/A (Tela)'
      }];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(configData), "Configuración");

      let detallesData: any[] = [];
      if (order.pages && Array.isArray(order.pages)) {
        detallesData = order.pages.map((page, i) => ({
          'Página Número': (page.pageIndex !== undefined ? page.pageIndex : i) + 1,
          'Layout (Filas/Cols)': page.layout || 'N/A', 'Cantidad de Fotos': Array.isArray(page.images) ? page.images.length : 0,
          'Textos Incluidos': page.texts && Object.keys(page.texts).length > 0 ? Object.values(page.texts).map((t: any) => `"${t.text}" (${t.fontFamily} ${t.fontSize}px)`).join(' | ') : 'Sin textos'
        }));
      } else if (order.items && Array.isArray(order.items)) {
        detallesData = order.items.map((item, i) => ({
          'Taza Número': i + 1, 'Texto Impreso': item.text || 'Sin texto', 'Fuente': item.fontFamily || 'N/A',
          'Tamaño Fuente': item.fontSize || 'N/A', 'Cantidad de Fotos': Array.isArray(item.photos) ? item.photos.length : 0
        }));
      }
      if (detallesData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detallesData), "Detalles del Diseño");

      const imagenesData: any[] = [];
      if (!isCalendar && order.coverData?.image) {
        imagenesData.push({
          'Ubicación': 'Portada', 'Nombre de Archivo en ZIP': 'portada.jpg',
          'Zoom (Escala)': order.coverData.crop?.zoom?.toFixed(2) || '1.00', 'Posición X (%)': order.coverData.crop?.x?.toFixed(2) || '50.00',
          'Posición Y (%)': order.coverData.crop?.y?.toFixed(2) || '50.00', 'URL Original': typeof order.coverData.image === 'string' && order.coverData.image.includes('justwhite') ? 'Imagen Blanca (Color Sólido)' : order.coverData.image
        });
      }
      if (order.pages && Array.isArray(order.pages)) {
        order.pages.forEach((page, pageIndex) => {
          if (page.images && Array.isArray(page.images)) {
            page.images.forEach((imgUrl: any, imgIndex: number) => {
              const crop = page.crops?.[imgIndex] || order.photoCrops?.[`${pageIndex}-${imgIndex}`] || { x: 50, y: 50, zoom: 1 };
              imagenesData.push({
                'Ubicación': `Página ${pageIndex + 1}`, 'Nombre de Archivo en ZIP': `pagina_${String(pageIndex + 1).padStart(2, '0')}_foto_${imgIndex + 1}.jpg`,
                'Zoom (Escala)': crop.zoom?.toFixed(2) || '1.00', 'Posición X (%)': crop.x?.toFixed(2) || '50.00', 'Posición Y (%)': crop.y?.toFixed(2) || '50.00', 'URL Original': typeof imgUrl === 'string' ? imgUrl : 'N/A'
              });
            });
          }
        });
      }
      if (imagenesData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(imagenesData), "Reporte de Imágenes");
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      folder.file('resumen_pedido.xlsx', excelBuffer);

      const imgFolder = folder.folder('imagenes');
      if (!imgFolder) throw new Error("No se pudo crear la subcarpeta de imágenes.");

      const fetchImageAsBlob = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Error al descargar la imagen: ${url}`);
        return res.blob();
      };

      const imagePromises: Promise<void>[] = [];
      if (!isCalendar && order.coverData?.image) {
        let coverUrl = order.coverData.image;
        if (typeof coverUrl === 'string' && coverUrl.includes('justwhite')) coverUrl = justWhiteImg;
        imagePromises.push(fetchImageAsBlob(coverUrl).then(blob => { imgFolder.file('portada.jpg', blob); }).catch(e => console.error(`Error descargando portada:`, e)));
      }
      if (order.pages && Array.isArray(order.pages)) {
        order.pages.forEach((page, pageIndex) => {
          if (page.images && Array.isArray(page.images) && page.images.length > 0) {
            page.images.forEach((imgUrl: any, imgIndex: number) => {
              if (typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
                imagePromises.push(fetchImageAsBlob(imgUrl).then(blob => { imgFolder.file(`pagina_${String(pageIndex + 1).padStart(2, '0')}_foto_${imgIndex + 1}.jpg`, blob); }).catch(e => console.error(`Error descargando pág ${pageIndex + 1}, foto ${imgIndex + 1}:`, e)));
              }
            });
          }
        });
      }
      await Promise.all(imagePromises);

      try {
        if (isCalendar) {
          const pdfBlob = await generateCalendarPDF(order, (progress) => { setDownloadProgress({ orderId: order.id, progress }); });
          folder.file(`Impresion_Calendario_${order.id}_300DPI.pdf`, pdfBlob);
        } else if (isAlbum) {
          // Generar PDF 1: Portada (Frente únicamente si es tela, Completa si es Papel)
          const coverBlob = await generateCoverPDF(order, (progress) => { setDownloadProgress({ orderId: order.id, progress: Math.round(progress * 0.3) }); });
          folder.file(`Impresion_Portada_${order.id}_300DPI.pdf`, coverBlob);

          // Generar PDF 2: Páginas Interiores (70%)
          const innerBlob = await generateInnerPagesPDF(order, (progress) => { setDownloadProgress({ orderId: order.id, progress: 30 + Math.round(progress * 0.7) }); });
          folder.file(`Impresion_Interior_${order.id}_300DPI.pdf`, innerBlob);
        }
      } catch (pdfError) {
        console.error("Error al generar PDF de alta resolución:", pdfError);
        alert("Advertencia: El ZIP se descargará pero el PDF de previsualización no se pudo crear.");
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `pedido_${order.id}.zip`);
      setTimeout(() => { setDownloadProgress({ orderId: null, progress: 0 }); }, 2000);
    } catch (error: any) {
      console.error("Error al descargar el ZIP:", error);
      alert("Hubo un problema al empaquetar el pedido: " + (error.message || 'Error desconocido'));
      setDownloadProgress({ orderId: null, progress: 0 });
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white rounded-2xl shadow-xl w-full max-w-sm border border-gray-200">
          <div className="flex flex-col items-center mb-6">
            <div className="p-3 bg-gray-900 text-white rounded-full mb-3"><Lock className="w-6 h-6" /></div>
            <h1 className="text-2xl font-bold text-center text-gray-900">Acceso Administrador</h1>
          </div>
          <form onSubmit={handleLogin}>
            <div className="mb-4 space-y-3">
              <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all font-medium" placeholder="Correo electrónico" required />
              <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition-all font-medium" placeholder="Contraseña" required />
            </div>
            {authError && <p className="text-red-500 text-sm text-center mb-4">{authError}</p>}
            <button type="submit" disabled={isLoggingIn} className="w-full bg-gray-900 text-white py-3 rounded-xl hover:bg-black transition-colors font-bold text-lg flex justify-center items-center gap-2">
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Acceder al Panel'}
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
            <p className="text-gray-500 mt-1">Gestión integral de pedidos y configuración de la tienda.</p>
          </div>
          <button onClick={handleLogout} className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all font-medium self-start md:self-auto">
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </header>

        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-px">
          <button onClick={() => setActiveTab('orders')} className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all flex items-center gap-2 ${activeTab === 'orders' ? 'bg-white border-t border-l border-r border-gray-200 text-black translate-y-px' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}><ShoppingBag className="w-4 h-4" /> Pedidos Recibidos</button>
          <button onClick={() => setActiveTab('settings')} className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white border-t border-l border-r border-gray-200 text-black translate-y-px' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}><SettingsIcon className="w-4 h-4" /> Ajustes de Tienda</button>
        </div>

        {activeTab === 'orders' && (
          <>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Buscar por ID, Email o Nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black transition-all" />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-black transition-all text-sm font-medium">
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
                              <span className="text-xs text-gray-500">{format(new Date(order.createdAt), "d MMM, yyyy HH:mm", { locale: es })}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-gray-900 leading-none mb-1">{order.shippingAddress?.name || 'Usuario Invitado'}</span>
                              <span className="text-xs text-gray-500">{order.shippingAddress?.email || 'No email provided'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${order.status === 'paid' || order.status === 'mock_paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {order.status === 'mock_paid' || order.status === 'paid' ? 'PAGADO' : 'PENDIENTE'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-gray-900">${order.total?.toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleViewDetails(order)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors title='Ver detalles'"><Eye className="w-5 h-5" /></button>
                              {downloadProgress.orderId === order.id ? (
                                <div className="w-28 flex items-center gap-2" title={`Renderizando... ${downloadProgress.progress}%`}>
                                  <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${downloadProgress.progress}%` }}></div>
                                  </div>
                                  <span className="text-xs font-mono font-bold text-emerald-600 w-8 text-right">{downloadProgress.progress}%</span>
                                </div>
                              ) : (
                                <button onClick={() => handleDownloadZIP(order)} disabled={downloadProgress.orderId !== null} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={'Descargar ZIP con PDF'}><Download className="w-5 h-5" /></button>
                              )}
                              {(order.status === 'pending_payment' || order.status === 'draft') && (
                                <button onClick={() => handleDeleteOrder(order.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Pedido"><Trash2 className="w-5 h-5" /></button>
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
          </>
        )}

        {/* VISTA 2: AJUSTES DE TIENDA */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* COLUMNA IZQUIERDA: Descuentos y Promociones */}
            <div className="space-y-8">
              {/* Descuento Global (Para el Checkout) */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                  <Tag className="w-6 h-6 text-indigo-500" />
                  <h2 className="text-xl font-bold text-gray-900">Descuento Global (Checkout)</h2>
                </div>
                
                <div className="space-y-6">
                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={localConfig.discounts.active}
                      onChange={(e) => setLocalConfig({...localConfig, discounts: {...localConfig.discounts, active: e.target.checked}})}
                      className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black"
                    />
                    <div>
                      <span className="font-bold text-gray-900 block">Activar Descuento General</span>
                      <span className="text-sm text-gray-500">Se aplicará matemáticamente a todos los pedidos al momento de pagar.</span>
                    </div>
                  </label>

                  <div className={`space-y-4 transition-opacity ${!localConfig.discounts.active ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Porcentaje de Descuento (%)</label>
                      <input 
                        type="number" min="0" max="100"
                        value={localConfig.discounts.percentage}
                        onChange={(e) => setLocalConfig({...localConfig, discounts: {...localConfig.discounts, percentage: parseFloat(e.target.value)}})}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recuadros del Landing Page */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <Star className="w-6 h-6 text-amber-500" />
                    <h2 className="text-xl font-bold text-gray-900">Avisos del Landing Page</h2>
                  </div>
                  <button 
                    onClick={() => {
                      const newPromo = { id: Date.now().toString(), title: 'Nuevo Aviso', desc: 'Descripción...', icon: 'Tag', colorTheme: 'blue', active: true };
                      setLocalConfig({ ...localConfig, promotions: [...(localConfig.promotions || []), newPromo] });
                    }} 
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Añadir Aviso
                  </button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {(!localConfig.promotions || localConfig.promotions.length === 0) && (
                    <p className="text-sm text-gray-500 italic text-center py-4">No hay avisos configurados. La sección no se mostrará en el inicio.</p>
                  )}
                  {(localConfig.promotions || []).map((promo) => (
                    <div key={promo.id} className={`p-4 border-2 rounded-xl transition-all ${promo.active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={promo.active} 
                            onChange={(e) => setLocalConfig({
                              ...localConfig, 
                              promotions: localConfig.promotions.map(p => p.id === promo.id ? { ...p, active: e.target.checked } : p)
                            })} 
                            className="w-4 h-4 rounded text-black focus:ring-black" 
                          />
                          <span className="font-bold text-sm">Mostrar Aviso</span>
                        </label>
                        <button 
                          onClick={() => setLocalConfig({
                            ...localConfig, 
                            promotions: localConfig.promotions.filter(p => p.id !== promo.id)
                          })} 
                          className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Título</label>
                          <input type="text" value={promo.title} onChange={(e) => setLocalConfig({...localConfig, promotions: localConfig.promotions.map(p => p.id === promo.id ? { ...p, title: e.target.value } : p)})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Descripción</label>
                          <input type="text" value={promo.desc} onChange={(e) => setLocalConfig({...localConfig, promotions: localConfig.promotions.map(p => p.id === promo.id ? { ...p, desc: e.target.value } : p)})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Ícono</label>
                          <select value={promo.icon} onChange={(e) => setLocalConfig({...localConfig, promotions: localConfig.promotions.map(p => p.id === promo.id ? { ...p, icon: e.target.value } : p)})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none bg-white">
                            <option value="Tag">Etiqueta (Descuento)</option>
                            <option value="Truck">Camión (Envío)</option>
                            <option value="Gift">Regalo (Sorpresa)</option>
                            <option value="Star">Estrella (Destacado)</option>
                            <option value="ShoppingBag">Bolsa (Compra)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Color</label>
                          <select value={promo.colorTheme} onChange={(e) => setLocalConfig({...localConfig, promotions: localConfig.promotions.map(p => p.id === promo.id ? { ...p, colorTheme: e.target.value } : p)})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none bg-white">
                            <option value="blue">Azul</option>
                            <option value="green">Verde</option>
                            <option value="purple">Morado</option>
                            <option value="amber">Amarillo</option>
                            <option value="rose">Rosa</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: Tabla de Precios Base */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                <SettingsIcon className="w-6 h-6 text-gray-500" />
                <h2 className="text-xl font-bold text-gray-900">Tabla de Precios Base (COP)</h2>
              </div>
              
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-4">Álbumes Base (40 págs)</h3>
                {/* Encabezados de columna */}
                <div className="grid grid-cols-3 gap-2 mb-1">
                  <div className="text-xs font-bold text-gray-400 uppercase">Tamaño</div>
                  <div className="text-xs font-bold text-blue-500 uppercase text-center">Papel</div>
                  <div className="text-xs font-bold text-amber-600 uppercase text-center">Tela</div>
                </div>
                {/* Fila 20x20 */}
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="text-xs font-bold text-gray-700">20x20 cm</label>
                  <input type="number" value={localConfig.prices.album20x20} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, album20x20: parseInt(e.target.value)}})} className="w-full px-2 py-2 border-2 border-blue-200 rounded-lg text-sm" />
                  <input type="number" value={localConfig.prices.albumTela20x20} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, albumTela20x20: parseInt(e.target.value)}})} className="w-full px-2 py-2 border-2 border-amber-200 rounded-lg text-sm" />
                </div>
                {/* Fila 30x30 */}
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="text-xs font-bold text-gray-700">30x30 cm</label>
                  <input type="number" value={localConfig.prices.album30x30} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, album30x30: parseInt(e.target.value)}})} className="w-full px-2 py-2 border-2 border-blue-200 rounded-lg text-sm" />
                  <input type="number" value={localConfig.prices.albumTela30x30} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, albumTela30x30: parseInt(e.target.value)}})} className="w-full px-2 py-2 border-2 border-amber-200 rounded-lg text-sm" />
                </div>
                {/* Fila 28x21 */}
                <div className="grid grid-cols-3 gap-2 items-center">
                  <label className="text-xs font-bold text-gray-700">28x21 / 21x28</label>
                  <input type="number" value={localConfig.prices.albumRect} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, albumRect: parseInt(e.target.value)}})} className="w-full px-2 py-2 border-2 border-blue-200 rounded-lg text-sm" />
                  <input type="number" value={localConfig.prices.albumTelaRect} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, albumTelaRect: parseInt(e.target.value)}})} className="w-full px-2 py-2 border-2 border-amber-200 rounded-lg text-sm" />
                </div>

                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-4">Página Extra de Álbum</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">20x20</label>
                    <input type="number" value={localConfig.prices.albumExtra20x20} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, albumExtra20x20: parseInt(e.target.value)}})} className="w-full px-2 py-2 border-2 border-gray-200 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">30x30</label>
                    <input type="number" value={localConfig.prices.albumExtra30x30} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, albumExtra30x30: parseInt(e.target.value)}})} className="w-full px-2 py-2 border-2 border-gray-200 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">28x21</label>
                    <input type="number" value={localConfig.prices.albumExtraRect} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, albumExtraRect: parseInt(e.target.value)}})} className="w-full px-2 py-2 border-2 border-gray-200 rounded-lg text-xs" />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-4">Otros Productos</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Calendario Pared</label>
                    <input type="number" value={localConfig.prices.calendarWall} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, calendarWall: parseInt(e.target.value)}})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Calendario Escritorio</label>
                    <input type="number" value={localConfig.prices.calendarDesk} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, calendarDesk: parseInt(e.target.value)}})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Taza Personalizada</label>
                    <input type="number" value={localConfig.prices.mug} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, mug: parseInt(e.target.value)}})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Pack Fotos (Por foto)</label>
                    <input type="number" value={localConfig.prices.photoPackBase} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, photoPackBase: parseInt(e.target.value)}})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" />
                  </div>
                </div>

                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-4">Costos de Envío (COP)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Cali</label>
                    <input type="number" value={localConfig.prices.shippingCali} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, shippingCali: parseInt(e.target.value)}})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Resto de Colombia</label>
                    <input type="number" value={localConfig.prices.shippingNational} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, shippingNational: parseInt(e.target.value)}})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" />
                  </div>
                </div>
              </div>

              {/* Botón de Guardado Flotante */}
              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="flex items-center gap-2 px-8 py-3 bg-black hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {isSavingConfig ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Guardar Configuración
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <OrderDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} order={selectedOrder} />
      <footer className="py-6 text-center text-gray-400 text-xs border-t border-gray-100 bg-white">
        © {new Date().getFullYear()} Photo Album Creator - Panel de Control Seguro
      </footer>
    </div>
  );
};

export default OwnerDashboard;