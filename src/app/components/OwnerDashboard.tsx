import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, Timestamp, doc, deleteDoc, setDoc, query, orderBy, limit, addDoc } from 'firebase/firestore';
// Importamos la lógica de Autenticación de Firebase
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../lib/firebase';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Header } from './navigation/Header';
import { AlertCircle, Lock, LogOut, Download, Eye, Search, Loader2, Trash2, Settings as SettingsIcon, ShoppingBag, Tag, Save, Plus, Star, ChevronRight, Package, Zap, Users, FileText, Images, Sparkles } from 'lucide-react';
import ConnectionsSection from './ConnectionsSection';
import UsersSection from './UsersSection';
import { updateOrderStatus } from '../../services/orderService';
import OrderDetailsModal from './OrderDetailsModal';
import * as XLSX from 'xlsx';

// --- DEPENDENCIAS PARA GENERAR EL PDF DE ALTA RESOLUCIÓN ---
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import { createRoot } from 'react-dom/client';
import CoverPreview from './CoverPreview'; 
import { getColombianHolidays, isHoliday } from '../utils/holidays';
import { getCoverDimensions } from '../utils/cropMath';
import { getAlbumPageSlots, getPageImages } from '../utils/albumPageData';
import { AlbumPageSlots } from './AlbumPageRender';
import justWhiteImg from '../../assets/justwhite.png';
import jiffyLogo from '../../assets/JiffyLogo.svg'; 

// --- CONTEXTO DE LA TIENDA ---
import { useStoreConfig, StoreConfig } from '../context/StoreConfigContext';

interface ConfigHistoryEntry {
  id: string;
  config: StoreConfig;
  savedAt: Timestamp;
  savedBy: string;
}

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
// PRE-CARGA DE IMÁGENES COMO DATA URLS
// ============================================================================
async function preloadImages(urls: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    urls.filter(Boolean).map(async (url) => {
      try {
        const response = await fetch(url, { mode: 'cors', cache: 'force-cache' });
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return [url, dataUrl] as [string, string];
      } catch {
        return [url, url] as [string, string];
      }
    })
  );
  return Object.fromEntries(entries);
}

// ============================================================================
// ESPERA ACTIVA HASTA QUE TODAS LAS IMÁGENES (CanvasCropper / ImageCropper)
// DEL CONTENEDOR ESTÉN REALMENTE PINTADAS ANTES DE CAPTURAR CON html-to-image
// ============================================================================
function waitForRenderReady(container: HTMLElement, opts: { maxWaitMs?: number; minWaitMs?: number } = {}): Promise<void> {
  const MAX_WAIT_MS = opts.maxWaitMs ?? 15000;
  const MIN_WAIT_MS = opts.minWaitMs ?? 150;
  const POLL_MS = 100;
  const startTime = Date.now();

  return new Promise((resolve) => {
    const poll = setInterval(() => {
      const targets = container.querySelectorAll('[data-canvas-cropper], [data-image-cropper]');
      const readyTargets = container.querySelectorAll('[data-canvas-cropper][data-ready], [data-image-cropper][data-ready]');
      const elapsed = Date.now() - startTime;
      const allDone = targets.length === readyTargets.length;
      const timedOut = elapsed > MAX_WAIT_MS;

      if ((allDone && elapsed >= MIN_WAIT_MS) || timedOut) {
        clearInterval(poll);
        resolve();
      }
    }, POLL_MS);
  });
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

    let cancelled = false;

    canvas.removeAttribute('data-ready');

    const rect = canvas.getBoundingClientRect();
    const destWidth = Math.round(rect.width * 2);
    const destHeight = Math.round(rect.height * 2);
    if (destWidth === 0 || destHeight === 0) {
      canvas.setAttribute('data-ready', 'error');
      return;
    }
    canvas.width = destWidth;
    canvas.height = destHeight;

    const drawOnCanvas = (imgEl: HTMLImageElement) => {
      if (cancelled) return;
      const imgWidth = imgEl.naturalWidth;
      const imgHeight = imgEl.naturalHeight;
      if (imgWidth === 0 || imgHeight === 0) {
        canvas.setAttribute('data-ready', 'error');
        return;
      }

      const { x = 50, y = 50, zoom = 1, rotation = 0 } = crop || {};

      // Espejo exacto de ImageCropper: en vez de recortar un rectángulo DENTRO de
      // la imagen, se dibuja la imagen entera en un destino calculado. Es la única
      // forma de representar zoom < 1 ("foto completa"), donde el marco es más
      // grande que la imagen y el rectángulo fuente se saldría de ella: al recortar
      // el canvas la fuente contra los bordes, la foto salía pegada a la esquina y
      // el desplazamiento del usuario se ignoraba por completo.
      const { Rw, Rh } = getCoverDimensions(destWidth, destHeight, imgWidth, imgHeight);

      const drawWidth = Rw * zoom;
      const drawHeight = Rh * zoom;
      const dX = destWidth / 2 - (x / 100) * Rw * zoom;
      const dY = destHeight / 2 - (y / 100) * Rh * zoom;

      // El hueco que deja un zoom < 1 es blanco intencional, igual que el fondo de
      // ImageCropper en pantalla, y no el gris del contenedor que hay detrás.
      ctx.clearRect(0, 0, destWidth, destHeight);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, destWidth, destHeight);

      if (rotation !== 0) {
        ctx.save();
        ctx.translate(destWidth / 2, destHeight / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-destWidth / 2, -destHeight / 2);
      }

      try {
        ctx.drawImage(imgEl, 0, 0, imgWidth, imgHeight, dX, dY, drawWidth, drawHeight);
      } catch {
        ctx.drawImage(imgEl, 0, 0, destWidth, destHeight);
      }

      if (rotation !== 0) ctx.restore();
      canvas.setAttribute('data-ready', 'true');
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => drawOnCanvas(img);
    img.onerror = () => {
      if (cancelled) return;
      // No reintentar sin crossOrigin: eso "mancharía" (taint) el canvas y
      // rompería la captura de html-to-image de forma silenciosa más adelante.
      canvas.setAttribute('data-ready', 'error');
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, crop]);

  return <canvas data-canvas-cropper ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
};

// ============================================================================
// COMPONENTES AUXILIARES PARA RENDERIZAR LAS PÁGINAS INTERNAS EN EL PDF
// ============================================================================
// La página impresa se arma con los mismos marcos y el mismo contenido que el
// editor y el visor del pedido (`AlbumPageSlots`); lo único propio de aquí es
// que la foto se dibuja con `CanvasCropper`, porque html-to-image no captura
// bien el `ImageCropper` de pantalla.
const AlbumPagePrintView: React.FC<{customization: any, pageIndex: number, order: any, preloadedMap?: Record<string, string>}> = ({customization, pageIndex, order, preloadedMap}) => {
  const size = customization?.size || '';
  const slots = getAlbumPageSlots(order, pageIndex, size);

  return (
    <div className="w-full h-full bg-white">
      <AlbumPageSlots
        slots={slots}
        renderPhoto={(photo, crop) => (
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            <CanvasCropper src={preloadedMap?.[photo] || photo} crop={crop} />
          </div>
        )}
      />
    </div>
  );
};

const getPhotosForMonth = (order: any, monthIndex: number): string[] => {
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
  return photosForMonth;
};

const CalendarPagePrintView: React.FC<{ order: any, monthIndex: number, pxWidth: number, preloadedMap?: Record<string, string> }> = ({ order, monthIndex, pxWidth, preloadedMap }) => {
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

  const photosForMonth = getPhotosForMonth(order, monthIndex);

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
                    const resolvedSrc = photo ? (preloadedMap?.[photo] || photo) : null;
                    const crop = order.photoCrops?.[`${monthIndex}-${photoIdx}`];
                    return (
                      <div key={photoIdx} style={{ position: 'relative', backgroundColor: '#e5e7eb', borderRadius: `${baseSize*0.5}px`, overflow: 'hidden' }}>
                        {resolvedSrc && (
                          <div className="absolute inset-0 w-full h-full pointer-events-none">
                            <CanvasCropper src={resolvedSrc} crop={crop} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            } else {
              const photo = photosForMonth[0];
              const resolvedSrc = preloadedMap?.[photo] || photo;
              const crop = order.photoCrops?.[monthIndex] || order.photoCrops?.[`${monthIndex}-0`];
              return (
                <div className="absolute inset-0 w-full h-full pointer-events-none">
                  <CanvasCropper src={resolvedSrc} crop={crop} />
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

  const [activeTab, setActiveTab] = useState<'orders' | 'custom-albums' | 'settings' | 'users' | 'connections'>('orders');

  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ orderId: string | null; progress: number }>({ orderId: null, progress: 0 });
  const [downloadType, setDownloadType] = useState<'pdfs' | 'images' | null>(null);
  const [isTabHidden, setIsTabHidden] = useState(false);

  // --- Detectar cambio de pestaña durante la descarga ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabHidden(true);
      } else {
        setIsTabHidden(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // --- CONTEXTO GLOBAL DE LA TIENDA ---
  const storeConfig = useStoreConfig();
  const [localConfig, setLocalConfig] = useState<StoreConfig>(storeConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const hasSeededConfig = useRef(false);
  const lastRemoteConfigRef = useRef<StoreConfig>(storeConfig);
  const [remoteConfigChangedElsewhere, setRemoteConfigChangedElsewhere] = useState(false);

  const [historyEntries, setHistoryEntries] = useState<ConfigHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // 2. Comprobar sesión activa automáticamente con Firebase
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setIsAuthChecking(false);
      setCurrentUserEmail(user?.email ?? null);
    });
    return () => unsubscribe();
  }, []);

  // Sembramos localConfig UNA sola vez, en la transición de "no cargado" a "cargado".
  // Antes esto se ejecutaba en cada cambio de storeConfig, lo que podía pisar
  // silenciosamente ediciones sin guardar (o, peor, sembrar defaultConfig si el
  // guardado ocurría antes de que Firestore respondiera). Ver PR: fix reseteo de precios.
  useEffect(() => {
    if (!storeConfig.configLoaded) return;

    if (!hasSeededConfig.current) {
      setLocalConfig(storeConfig);
      hasSeededConfig.current = true;
      lastRemoteConfigRef.current = storeConfig;
      return;
    }

    // Ya sembrado antes: si llega un cambio remoto (otra sesión guardó algo),
    // no pisamos silenciosamente las ediciones locales — solo avisamos.
    if (JSON.stringify(storeConfig) !== JSON.stringify(lastRemoteConfigRef.current)) {
      lastRemoteConfigRef.current = storeConfig;
      setRemoteConfigChangedElsewhere(true);
    }
  }, [storeConfig]);

  const fetchConfigHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const historyQuery = query(
        collection(db, 'settings', 'store_config', 'history'),
        orderBy('savedAt', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(historyQuery);
      setHistoryEntries(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ConfigHistoryEntry)));
    } catch (error) {
      console.error('Error al cargar el historial de configuración:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) fetchConfigHistory();
  };

  // Guarda la config actual (previa a un guardado/restauración) como respaldo,
  // y poda entradas viejas para no acumular historial indefinidamente.
  const backupCurrentConfig = async (configToBackup: StoreConfig) => {
    try {
      await addDoc(collection(db, 'settings', 'store_config', 'history'), {
        config: configToBackup,
        savedAt: Timestamp.now(),
        savedBy: currentUserEmail || 'desconocido',
      });

      const pruneQuery = query(
        collection(db, 'settings', 'store_config', 'history'),
        orderBy('savedAt', 'desc'),
        limit(25)
      );
      const snapshot = await getDocs(pruneQuery);
      const excess = snapshot.docs.slice(20);
      await Promise.all(excess.map(d => deleteDoc(d.ref)));
    } catch (error) {
      // El respaldo es "best effort": si falla, no debe bloquear el guardado principal.
      console.error('Error al respaldar la configuración anterior:', error);
    }
  };

  const handleSaveConfig = async () => {
    if (!storeConfig.configLoaded) {
      alert('La configuración aún se está cargando. Espera un momento e intenta de nuevo.');
      return;
    }
    setIsSavingConfig(true);
    try {
      await backupCurrentConfig(storeConfig);
      await setDoc(doc(db, 'settings', 'store_config'), localConfig, { merge: true });
      setRemoteConfigChangedElsewhere(false);
      if (showHistory) fetchConfigHistory();
      alert('¡Configuración guardada exitosamente! Los cambios ya están en vivo en toda la tienda.');
    } catch (error) {
      console.error("Error saving config:", error);
      alert('Error al guardar la configuración.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleRestoreHistory = async (entry: ConfigHistoryEntry) => {
    if (!storeConfig.configLoaded) {
      alert('La configuración aún se está cargando. Espera un momento e intenta de nuevo.');
      return;
    }
    if (!window.confirm('¿Restaurar la configuración a esta versión anterior? Esto reemplazará los valores actuales de precios y promociones.')) return;
    setIsSavingConfig(true);
    try {
      await backupCurrentConfig(storeConfig);
      await setDoc(doc(db, 'settings', 'store_config'), entry.config, { merge: true });
      setLocalConfig(entry.config);
      lastRemoteConfigRef.current = entry.config;
      setRemoteConfigChangedElsewhere(false);
      fetchConfigHistory();
      alert('Configuración restaurada exitosamente.');
    } catch (error) {
      console.error('Error al restaurar la configuración:', error);
      alert('No se pudo restaurar la configuración.');
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

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
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
    } catch (err: any) {
      console.error('Error fetching orders from Firestore:', err);
      const isPermission = err?.code === 'permission-denied' || err?.message?.includes('permission');
      setFetchError(
        isPermission
          ? 'Acceso denegado. Asegúrate de estar autenticado como administrador (jiffyus2@gmail.com).'
          : `No se pudieron cargar los pedidos desde Firestore. (${err?.code ?? err?.message ?? 'error desconocido'})`
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
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

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('No se pudo actualizar el estado del pedido.');
    }
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

        // ── Dimensiones del lienzo (canvas) ──────────────────────────────────
        // Papel: lienzos fijos por tamaño con márgenes centrados
        // Tela:  sólo la portada, sin cambios
        const spineCm  = isTela ? 0 : 2;
        const gapCm    = isTela ? 0 : 1; // 1 cm entre caratula↔lomo y lomo↔contraportada

        let canvasWCm: number;
        let canvasHCm: number;
        if (isTela) {
          canvasWCm = wCm;
          canvasHCm = hCm;
        } else if (coverSizeProp === '20x20') {
          canvasWCm = 50; canvasHCm = 25;
        } else {
          // 30x30 | 21x28 (Horizontal) | 28x21 (Vertical)
          canvasWCm = 70; canvasHCm = 33;
        }

        const totalWCm     = canvasWCm;
        const totalHCm     = canvasHCm;
        const totalPxWidth  = Math.round((totalWCm  / 2.54) * 300);
        const totalPxHeight = Math.round((totalHCm  / 2.54) * 300);
        const spinePxWidth  = isTela ? 0 : Math.round((spineCm / 2.54) * 300);
        const pxGap         = isTela ? 0 : Math.round((gapCm   / 2.54) * 300);

        // Contenido total (horizontal): contraportada + gap + lomo + gap + portada
        const contentPxW = isTela ? pxWidth : (pxWidth * 2) + spinePxWidth + (pxGap * 2);
        const marginXPx  = isTela ? 0 : Math.round((totalPxWidth  - contentPxW) / 2);
        const marginYPx  = isTela ? 0 : Math.round((totalPxHeight - pxHeight)   / 2);

        const pdf = new jsPDF({
          orientation: isTela && wCm <= hCm ? 'portrait' : 'landscape',
          unit: 'cm',
          format: [totalWCm, totalHCm],
        });

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top  = '0';
        container.style.left = '-99999px';
        container.style.width  = `${totalPxWidth}px`;
        container.style.height = `${totalPxHeight}px`;
        document.body.appendChild(container);

        const root = createRoot(container);

        const renderAndCapture = async (buildElement: (preloadedMap: Record<string, string>) => React.ReactNode, imageUrls: string[] = []) => {
          // Pre-cargar imagen de portada como Data URL antes de renderizar
          const preloadedMap = await preloadImages(imageUrls);

          root.render(
            <div style={{ width: totalPxWidth, height: totalPxHeight, position: 'relative', overflow: 'hidden' }}>
              {buildElement(preloadedMap)}
            </div>
          );

          // Esperar activamente hasta que la imagen de portada esté realmente pintada
          await waitForRenderReady(container);

          const node = container.firstChild as HTMLElement;
          return htmlToImage.toJpeg(node, { quality: 0.95, pixelRatio: 1 });
        };

        let coverImageForPdf = order.coverData?.image || '';
        if (typeof coverImageForPdf === 'string' && coverImageForPdf.includes('justwhite')) {
          coverImageForPdf = justWhiteImg;
        }

        const textColor = order.customization?.coverContent?.typographyColor || order.customization?.typographyColor || '#000000';
        const spineText = order.coverData?.spineText || order.customization?.coverContent?.spineText || order.coverData?.title || '';

        const coverUrls = coverImageForPdf && !coverImageForPdf.startsWith('data:') ? [coverImageForPdf] : [];
        const dataUrl = await renderAndCapture(
          (preloadedMap) => {
            const resolvedCoverImage = preloadedMap[coverImageForPdf] || coverImageForPdf;
            return (
              <div style={{ width: totalPxWidth, height: totalPxHeight, backgroundColor: '#FFFFFF', position: 'relative' }}>
                {/* Contenido centrado en el lienzo */}
                <div style={{
                  position: 'absolute',
                  left: marginXPx,
                  top:  marginYPx,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                }}>
                  {!isTela && (
                    <>
                      {/* Contraportada */}
                      <div style={{ width: pxWidth, height: pxHeight, position: 'relative', backgroundColor: '#FFFFFF' }}>
                        <div style={{ position: 'absolute', bottom: '15%', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: `${pxWidth * 0.01}px` }}>
                          <img src={jiffyLogo} style={{ width: `${pxWidth * 0.125}px`, height: 'auto', filter: textColor === '#000000' ? 'none' : 'brightness(0) invert(1)' }} />
                          <span style={{ fontSize: `${pxWidth * 0.015}px`, fontWeight: 'bold', color: textColor, fontFamily: 'sans-serif' }}>@Jiffy.photos</span>
                        </div>
                      </div>

                      {/* Gap 1 cm: contraportada → lomo */}
                      <div style={{ width: pxGap, height: pxHeight, backgroundColor: '#FFFFFF' }} />

                      {/* Lomo */}
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
                            color: textColor,
                          }}>
                            {spineText}
                          </span>
                        </div>
                      </div>

                      {/* Gap 1 cm: lomo → portada */}
                      <div style={{ width: pxGap, height: pxHeight, backgroundColor: '#FFFFFF' }} />
                    </>
                  )}

                  {/* Portada */}
                  <div style={{ width: pxWidth, height: pxHeight, position: 'relative' }}>
                    <CoverPreview
                      coverSize={coverSizeProp as any}
                      coverType={isTela ? 'Tela' : 'Papel'}
                      coverImage={resolvedCoverImage}
                      coverTitle={order.coverData?.title || ''}
                      coverSubtitle={order.coverData?.subtitle || ''}
                      coverYear={order.coverData?.year || ''}
                      selectedLayout={Number(order.coverData?.layout) || 1}
                      coverCrop={{ x: order.coverData?.crop?.x ?? 50, y: order.coverData?.crop?.y ?? 50, zoom: order.coverData?.crop?.zoom ?? 1 }}
                      typographyColor={textColor}
                      hideSpine={true}
                      forPdf={true}
                    />
                  </div>
                </div>
              </div>
            );
          },
          coverUrls
        );

        pdf.addImage(dataUrl, 'JPEG', 0, 0, totalWCm, totalHCm);

        // ── Cm-space layout for cut lines ─────────────────────────────────────
        const contentWCm = isTela ? wCm : (wCm * 2) + spineCm + (gapCm * 2);
        const marginXCm  = isTela ? 0 : (totalWCm - contentWCm) / 2;
        const marginYCm  = isTela ? 0 : (totalHCm - hCm) / 2;

        // ── Segunda página: líneas de corte (vectores, sin JPEG) ──────────────
        pdf.addPage();
        pdf.setDrawColor(220, 30, 30);
        pdf.setLineWidth(0.02);

        if (isTela) {
          pdf.rect(0, 0, wCm, hCm, 'S');
        } else {
          pdf.rect(marginXCm,                                   marginYCm, wCm,     hCm, 'S'); // contraportada
          pdf.rect(marginXCm + wCm,                             marginYCm, gapCm,   hCm, 'S'); // gap 1
          pdf.rect(marginXCm + wCm + gapCm,                    marginYCm, spineCm, hCm, 'S'); // lomo
          pdf.rect(marginXCm + wCm + gapCm + spineCm,          marginYCm, gapCm,   hCm, 'S'); // gap 2
          pdf.rect(marginXCm + wCm + gapCm + spineCm + gapCm,  marginYCm, wCm,     hCm, 'S'); // portada
        }

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

        const renderAndCapture = async (buildElement: (preloadedMap: Record<string, string>) => React.ReactNode, imageUrls: string[] = []) => {
          // Pre-cargar todas las imágenes de la página como Data URLs antes de renderizar
          const preloadedMap = await preloadImages(imageUrls);

          root.render(<div style={{ width: pxWidth, height: pxHeight, position: 'relative', overflow: 'hidden' }}>{buildElement(preloadedMap)}</div>);

          // Esperar activamente hasta que todos los CanvasCropper de la página estén dibujados
          await waitForRenderReady(container);

          const node = container.firstChild as HTMLElement;
          return htmlToImage.toJpeg(node, { quality: 0.95, pixelRatio: 1 });
        };

        if (order.pages && order.pages.length > 0) {
          for (let i = 0; i < order.pages.length; i++) {
            if (i > 0) pdf.addPage();
            const currentPage = order.pages[i];
            const pageImages = getPageImages(currentPage).filter(Boolean) as string[];
            const pageDataUrl = await renderAndCapture(
              (preloadedMap) => (
                <AlbumPagePrintView key={i} customization={order.customization} pageIndex={i} order={order} preloadedMap={preloadedMap} />
              ),
              pageImages
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

        const renderAndCapture = async (buildElement: (preloadedMap: Record<string, string>) => React.ReactNode, imageUrls: string[] = []) => {
          // Pre-cargar imagen(es) del mes como Data URLs antes de renderizar
          const preloadedMap = await preloadImages(imageUrls);

          root.render(<div style={{ width: pxWidth, height: pxHeight, position: 'relative', overflow: 'hidden' }}>{buildElement(preloadedMap)}</div>);

          // Esperar activamente hasta que la imagen del mes esté realmente pintada
          await waitForRenderReady(container);

          const node = container.firstChild as HTMLElement;
          return htmlToImage.toJpeg(node, { quality: 0.95, pixelRatio: 1 });
        };

        for (let i = 0; i < 12; i++) {
          if (i > 0) pdf.addPage();
          const monthImages = getPhotosForMonth(order, i).filter(Boolean);
          const pageDataUrl = await renderAndCapture(
            (preloadedMap) => (
              <CalendarPagePrintView key={i} order={order} monthIndex={i} pxWidth={pxWidth} preloadedMap={preloadedMap} />
            ),
            monthImages
          );
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

      if (isCalendar) {
        try {
          const pdfBlob = await generateCalendarPDF(order, (progress) => { setDownloadProgress({ orderId: order.id, progress }); });
          folder.file(`Impresion_Calendario_${order.id}_300DPI.pdf`, pdfBlob);
        } catch (pdfError) {
          console.error("Error al generar PDF de calendario:", pdfError);
          alert("Advertencia: El PDF del calendario no se pudo crear. El resto del ZIP se descargará normalmente.");
        }
      } else if (isAlbum) {
        const pdfErrors: string[] = [];

        // PDF 1: Portada — independiente del interior
        try {
          const coverBlob = await generateCoverPDF(order, (progress) => { setDownloadProgress({ orderId: order.id, progress: Math.round(progress * 0.3) }); });
          folder.file(`Impresion_Portada_${order.id}_300DPI.pdf`, coverBlob);
        } catch (coverError) {
          console.error("Error al generar PDF de portada:", coverError);
          pdfErrors.push("portada");
        }

        // PDF 2: Interior — se intenta siempre, independientemente del resultado de la portada
        try {
          const innerBlob = await generateInnerPagesPDF(order, (progress) => { setDownloadProgress({ orderId: order.id, progress: 30 + Math.round(progress * 0.7) }); });
          folder.file(`Impresion_Interior_${order.id}_300DPI.pdf`, innerBlob);
        } catch (innerError) {
          console.error("Error al generar PDF de páginas interiores:", innerError);
          pdfErrors.push("páginas interiores");
        }

        if (pdfErrors.length > 0) {
          alert(`Advertencia: No se pudo generar el PDF de ${pdfErrors.join(" ni ")}. Los demás archivos se incluirán en el ZIP normalmente.`);
        }
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

  const handleDownloadPDFs = async (order: Order) => {
    if (downloadProgress.orderId) return;
    setDownloadProgress({ orderId: order.id, progress: 0 });
    setDownloadType('pdfs');
    try {
      const zip = new JSZip();
      const folder = zip.folder(`pdfs_${order.id}`);
      if (!folder) throw new Error("No se pudo crear la carpeta en el ZIP.");

      const { isCalendar, isAlbum } = getDimensions(order);

      if (isCalendar) {
        try {
          const pdfBlob = await generateCalendarPDF(order, (progress) => { setDownloadProgress({ orderId: order.id, progress }); });
          folder.file(`Impresion_Calendario_${order.id}_300DPI.pdf`, pdfBlob);
        } catch (pdfError) {
          console.error("Error al generar PDF de calendario:", pdfError);
          alert("No se pudo generar el PDF del calendario.");
          setDownloadProgress({ orderId: null, progress: 0 });
          setDownloadType(null);
          return;
        }
      } else if (isAlbum) {
        const pdfErrors: string[] = [];
        try {
          const coverBlob = await generateCoverPDF(order, (progress) => { setDownloadProgress({ orderId: order.id, progress: Math.round(progress * 0.3) }); });
          folder.file(`Impresion_Portada_${order.id}_300DPI.pdf`, coverBlob);
        } catch (coverError) {
          console.error("Error al generar PDF de portada:", coverError);
          pdfErrors.push("portada");
        }
        try {
          const innerBlob = await generateInnerPagesPDF(order, (progress) => { setDownloadProgress({ orderId: order.id, progress: 30 + Math.round(progress * 0.7) }); });
          folder.file(`Impresion_Interior_${order.id}_300DPI.pdf`, innerBlob);
        } catch (innerError) {
          console.error("Error al generar PDF de páginas interiores:", innerError);
          pdfErrors.push("páginas interiores");
        }
        if (pdfErrors.length > 0) {
          alert(`Advertencia: No se pudo generar el PDF de ${pdfErrors.join(" ni ")}.`);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `pdfs_pedido_${order.id}.zip`);
      setTimeout(() => { setDownloadProgress({ orderId: null, progress: 0 }); setDownloadType(null); }, 2000);
    } catch (error: any) {
      console.error("Error al descargar PDFs:", error);
      alert("Hubo un problema al generar los PDFs: " + (error.message || 'Error desconocido'));
      setDownloadProgress({ orderId: null, progress: 0 });
      setDownloadType(null);
    }
  };

  const handleDownloadImagesExcel = async (order: Order) => {
    if (downloadProgress.orderId) return;
    setDownloadProgress({ orderId: order.id, progress: 0 });
    setDownloadType('images');
    try {
      const zip = new JSZip();
      const folder = zip.folder(`imagenes_${order.id}`);
      if (!folder) throw new Error("No se pudo crear la carpeta en el ZIP.");

      const { isCalendar } = getDimensions(order);
      const isTela = order.customization?.coverType === 'Tela' || order.customization?.material === 'Tela';

      // Excel
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

      // Imágenes
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
        imagePromises.push(fetchImageAsBlob(coverUrl).then(blob => { imgFolder.file('portada.jpg', blob); }).catch(e => console.error('Error descargando portada:', e)));
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
      const total = imagePromises.length;
      let done = 0;
      await Promise.all(imagePromises.map(p => p.then(() => { done++; setDownloadProgress({ orderId: order.id, progress: Math.round((done / Math.max(total, 1)) * 100) }); })));

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `imagenes_pedido_${order.id}.zip`);
      setTimeout(() => { setDownloadProgress({ orderId: null, progress: 0 }); setDownloadType(null); }, 2000);
    } catch (error: any) {
      console.error("Error al descargar imágenes/Excel:", error);
      alert("Hubo un problema al empaquetar: " + (error.message || 'Error desconocido'));
      setDownloadProgress({ orderId: null, progress: 0 });
      setDownloadType(null);
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
          <button onClick={() => setActiveTab('custom-albums')} className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all flex items-center gap-2 ${activeTab === 'custom-albums' ? 'bg-white border-t border-l border-r border-gray-200 text-black translate-y-px' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}><Sparkles className="w-4 h-4" /> Álbumes Personalizados</button>
          <button onClick={() => setActiveTab('settings')} className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white border-t border-l border-r border-gray-200 text-black translate-y-px' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}><SettingsIcon className="w-4 h-4" /> Ajustes de Tienda</button>
          <button onClick={() => setActiveTab('users')} className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all flex items-center gap-2 ${activeTab === 'users' ? 'bg-white border-t border-l border-r border-gray-200 text-black translate-y-px' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}><Users className="w-4 h-4" /> Usuarios</button>
          <button onClick={() => setActiveTab('connections')} className={`px-6 py-3 font-bold text-sm rounded-t-xl transition-all flex items-center gap-2 ${activeTab === 'connections' ? 'bg-white border-t border-l border-r border-gray-200 text-black translate-y-px' : 'text-gray-500 hover:text-black hover:bg-gray-100'}`}><Zap className="w-4 h-4" /> Conexiones</button>
        </div>

        {activeTab === 'orders' && (() => {
          const KANBAN_COLUMNS = [
            { id: 'pagado', label: 'Pagado', statuses: ['paid', 'mock_paid'], headerBg: 'bg-green-500', badgeBg: 'bg-green-100 text-green-800', nextStatus: 'en_produccion', nextLabel: 'Poner en Producción' },
            { id: 'en_produccion', label: 'En Producción', statuses: ['en_produccion'], headerBg: 'bg-blue-500', badgeBg: 'bg-blue-100 text-blue-800', nextStatus: 'enviado', nextLabel: 'Marcar Enviado' },
            { id: 'enviado', label: 'Enviado', statuses: ['enviado'], headerBg: 'bg-purple-500', badgeBg: 'bg-purple-100 text-purple-800', nextStatus: 'entregado', nextLabel: 'Marcar Entregado' },
            { id: 'entregado', label: 'Entregado', statuses: ['entregado'], headerBg: 'bg-gray-400', badgeBg: 'bg-gray-100 text-gray-700', nextStatus: null, nextLabel: null },
          ];

          const searchLow = searchTerm.toLowerCase();
          const matchesSearch = (order: Order) =>
            !searchTerm ||
            order.id.toLowerCase().includes(searchLow) ||
            (order.shippingAddress?.email || '').toLowerCase().includes(searchLow) ||
            (order.shippingAddress?.name || '').toLowerCase().includes(searchLow);

          const pendingOrders = orders.filter(o => (o.status === 'pending_payment' || o.status === 'draft' || o.status === 'saved_draft') && matchesSearch(o));

          const formatCOP = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);

          return (
            <>
              {/* Barra de búsqueda */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" placeholder="Buscar por ID, Email o Nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-black transition-all" />
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
                  <p className="mt-1 opacity-80 text-sm max-w-md mx-auto">{fetchError}</p>
                  <button
                    onClick={fetchOrders}
                    className="mt-4 px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              ) : (
                <>
                  {/* KANBAN */}
                  <div className="flex gap-4 overflow-x-auto pb-4 items-start">
                    {KANBAN_COLUMNS.map(col => {
                      const colOrders = orders.filter(o => col.statuses.includes(o.status) && matchesSearch(o));
                      return (
                        <div key={col.id} className="min-w-[300px] flex-shrink-0 flex flex-col rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                          {/* Header */}
                          <div className={`${col.headerBg} px-4 py-3 flex items-center justify-between`}>
                            <span className="text-white font-bold text-sm">{col.label}</span>
                            <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{colOrders.length}</span>
                          </div>
                          {/* Cards */}
                          <div className="bg-gray-50 min-h-[200px] p-3 space-y-3 flex-1">
                            {colOrders.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                                <Package className="w-8 h-8 mb-2" />
                                <span className="text-xs">Sin pedidos</span>
                              </div>
                            ) : colOrders.map(order => (
                              <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow">
                                {/* ID + fecha */}
                                <div className="flex items-start justify-between mb-2">
                                  <span className="text-xs font-mono font-bold text-gray-700">#{order.id.slice(0, 8)}</span>
                                  <span className="text-[10px] text-gray-400">{format(new Date(order.createdAt), "d MMM yyyy", { locale: es })}</span>
                                </div>
                                {/* Cliente */}
                                <p className="text-sm font-semibold text-gray-900 truncate leading-none mb-0.5">{order.shippingAddress?.name || order.customerName || 'Sin nombre'}</p>
                                <p className="text-xs text-gray-400 truncate mb-2">{order.shippingAddress?.email || order.customerEmail || '—'}</p>
                                {/* Monto */}
                                <p className="text-sm font-bold text-gray-800 mb-3">{formatCOP(order.total)}</p>
                                {/* Acciones */}
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => handleViewDetails(order)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Ver detalles"><Eye className="w-4 h-4" /></button>
                                  {downloadProgress.orderId === order.id ? (
                                    <div className="flex-1 flex items-center gap-1.5">
                                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                        <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${downloadProgress.progress}%` }} />
                                      </div>
                                      <span className="text-[10px] font-mono text-emerald-600">{downloadProgress.progress}%</span>
                                    </div>
                                  ) : (
                                    <>
                                      <button onClick={() => handleDownloadPDFs(order)} disabled={downloadProgress.orderId !== null} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50" title="Descargar PDFs de impresión"><FileText className="w-4 h-4" /></button>
                                      <button onClick={() => handleDownloadImagesExcel(order)} disabled={downloadProgress.orderId !== null} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50" title="Descargar imágenes y Excel"><Images className="w-4 h-4" /></button>
                                    </>
                                  )}
                                  {col.nextStatus && (
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, col.nextStatus!)}
                                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors"
                                      title={col.nextLabel!}
                                    >
                                      {col.nextLabel} <ChevronRight className="w-3 h-3" />
                                    </button>
                                  )}
                                  {(order.status === 'pending_payment' || order.status === 'draft') && (
                                    <button onClick={() => handleDeleteOrder(order.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pedidos pendientes de pago (fuera del Kanban) */}
                  {pendingOrders.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Pendientes de Pago / Borradores</h3>
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead>
                            <tr className="bg-gray-50/50">
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Pedido</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Cliente</th>
                              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Estado</th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Monto</th>
                              <th className="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {pendingOrders.map(order => (
                              <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3">
                                  <span className="text-xs font-mono font-bold text-gray-700">#{order.id.slice(0, 8)}</span>
                                  <p className="text-[10px] text-gray-400">{format(new Date(order.createdAt), "d MMM yyyy", { locale: es })}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-sm font-semibold text-gray-900">{order.shippingAddress?.name || order.customerName || 'Sin nombre'}</p>
                                  <p className="text-xs text-gray-400">{order.shippingAddress?.email || order.customerEmail || '—'}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700">{order.status === 'pending_payment' ? 'Pendiente de Pago' : 'Borrador'}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-sm font-bold text-gray-900">{formatCOP(order.total)}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleViewDetails(order)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                                    {downloadProgress.orderId === order.id ? (
                                      <div className="flex items-center gap-1 px-1">
                                        <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                          <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${downloadProgress.progress}%` }} />
                                        </div>
                                        <span className="text-[10px] font-mono text-emerald-600">{downloadProgress.progress}%</span>
                                      </div>
                                    ) : (
                                      <>
                                        <button onClick={() => handleDownloadPDFs(order)} disabled={downloadProgress.orderId !== null} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50" title="Descargar PDFs de impresión"><FileText className="w-4 h-4" /></button>
                                        <button onClick={() => handleDownloadImagesExcel(order)} disabled={downloadProgress.orderId !== null} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50" title="Descargar imágenes y Excel"><Images className="w-4 h-4" /></button>
                                      </>
                                    )}
                                    <button onClick={() => handleDeleteOrder(order.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
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
            </>
          );
        })()}

        {/* VISTA 1.5: ÁLBUMES PERSONALIZADOS */}
        {activeTab === 'custom-albums' && (() => {
          const customAlbumOrders = orders.filter(o => o.productType === 'custom-album');
          const SIZE_LABELS: Record<string, string> = {
            customAlbum20x20: '20x20 cm',
            customAlbum30x30: '30x30 cm',
            customAlbumRect: 'Rectangular',
          };

          return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {customAlbumOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <Sparkles className="w-10 h-10 mb-3" />
                  <span className="text-sm text-gray-400">Aún no hay solicitudes de álbum personalizado</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Tamaño</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customAlbumOrders.map(order => (
                        <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono font-bold text-gray-700">#{order.id.slice(0, 8).toUpperCase()}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{order.customerName || 'Sin nombre'}</div>
                            <div className="text-xs text-gray-400">{order.customerEmail || 'Sin email'}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{SIZE_LABELS[order.customAlbumSize] || '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{order.createdAt ? format(new Date(order.createdAt), 'PPP', { locale: es }) : '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${order.status === 'custom_pendiente' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                              {order.status === 'custom_pendiente' ? 'Pendiente de contacto' : 'Contactado'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {order.status === 'custom_pendiente' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'custom_contactado')}
                                  className="px-3 py-1.5 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors"
                                >
                                  Marcar contactado
                                </button>
                              )}
                              <button onClick={() => handleDeleteOrder(order.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* VISTA 2: AJUSTES DE TIENDA */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {!storeConfig.configLoaded && !storeConfig.configError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando configuración actual desde el servidor...
              </div>
            )}
            {storeConfig.configError && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                No se pudo cargar la configuración ({storeConfig.configError}). Verifica tu conexión antes de intentar guardar.
              </div>
            )}
            {remoteConfigChangedElsewhere && (
              <div className="flex items-center justify-between gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-medium">
                <span>La configuración cambió en otra sesión. Si recargas la página verás los cambios más recientes (perderás tus ediciones no guardadas).</span>
                <button onClick={() => window.location.reload()} className="whitespace-nowrap px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors">
                  Recargar
                </button>
              </div>
            )}

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

                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-4">Álbum Personalizado (precios mock)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">20x20 cm</label>
                    <input type="number" value={localConfig.prices.customAlbum20x20} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, customAlbum20x20: parseInt(e.target.value)}})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">30x30 cm</label>
                    <input type="number" value={localConfig.prices.customAlbum30x30} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, customAlbum30x30: parseInt(e.target.value)}})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Rectangular</label>
                    <input type="number" value={localConfig.prices.customAlbumRect} onChange={(e) => setLocalConfig({...localConfig, prices: {...localConfig.prices, customAlbumRect: parseInt(e.target.value)}})} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm" />
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

              {/* Historial de configuración / Respaldos */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <button
                  onClick={toggleHistory}
                  className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-black transition-colors"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
                  Historial de cambios
                </button>
                {showHistory && (
                  <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-2">
                    {isHistoryLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Cargando historial...
                      </div>
                    )}
                    {!isHistoryLoading && historyEntries.length === 0 && (
                      <p className="text-sm text-gray-400">Todavía no hay versiones anteriores guardadas.</p>
                    )}
                    {!isHistoryLoading && historyEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-xl text-sm">
                        <div>
                          <span className="font-bold text-gray-800 block">
                            {entry.savedAt?.toDate ? format(entry.savedAt.toDate(), "d MMM yyyy, HH:mm", { locale: es }) : '—'}
                          </span>
                          <span className="text-xs text-gray-400">{entry.savedBy}</span>
                        </div>
                        <button
                          onClick={() => handleRestoreHistory(entry)}
                          disabled={isSavingConfig || !storeConfig.configLoaded}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          Restaurar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botón de Guardado Flotante */}
              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <button
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig || !storeConfig.configLoaded}
                  className="flex items-center gap-2 px-8 py-3 bg-black hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
                >
                  {isSavingConfig ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Guardar Configuración
                </button>
              </div>
            </div>
          </div>
          </div>
        )}

        {activeTab === 'users' && (
          <UsersSection />
        )}

        {activeTab === 'connections' && (
          <ConnectionsSection />
        )}
      </main>

      {/* Indicador flotante de descarga — visible en cualquier pestaña */}
      {downloadProgress.orderId && (
        <div className={`fixed bottom-6 right-6 z-50 bg-white shadow-2xl rounded-2xl px-5 py-4 flex flex-col gap-3 min-w-[280px] transition-all duration-300 ${isTabHidden ? 'border-2 border-amber-400' : 'border border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <Loader2 className={`w-5 h-5 animate-spin shrink-0 ${isTabHidden ? 'text-amber-500' : 'text-emerald-500'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-black uppercase tracking-widest mb-1.5 ${isTabHidden ? 'text-amber-600' : 'text-gray-500'}`}>
                {isTabHidden ? '⚠ Generación pausada' : downloadType === 'images' ? 'Descargando imágenes…' : 'Generando PDFs…'}
              </p>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${isTabHidden ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${downloadProgress.progress}%` }}
                />
              </div>
            </div>
            <span className={`text-sm font-black tabular-nums shrink-0 ${isTabHidden ? 'text-amber-600' : 'text-emerald-600'}`}>
              {downloadProgress.progress}%
            </span>
          </div>
          {isTabHidden && (
            <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 leading-snug">
              El navegador pausa la generación en pestañas inactivas. <strong>Vuelve a esta pestaña</strong> para que continúe.
            </p>
          )}
        </div>
      )}

      <OrderDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} order={selectedOrder} />
      <footer className="py-6 text-center text-gray-400 text-xs border-t border-gray-100 bg-white">
        © {new Date().getFullYear()} Photo Album Creator - Panel de Control Seguro
      </footer>
    </div>
  );
};

export default OwnerDashboard;