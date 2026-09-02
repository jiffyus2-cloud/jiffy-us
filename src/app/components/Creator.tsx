import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ChevronLeft, Home, ShoppingBag, Settings, Image as ImageIcon, ShoppingCart, Loader2, Upload, BookMarked, Check, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import ProductSelection, { ProductType } from './ProductSelection';
import AlbumCustomization, { CustomizationOptions } from './AlbumCustomization';
import PhotoOrganizer from './PhotoOrganizer';
import CalendarCustomization, { CalendarCustomizationOptions } from './CalendarCustomization';
import CalendarOrganizer from './CalendarOrganizer';
import MugCustomization, { MugCustomizationOptions } from './MugCustomization';
import MugOrganizer, { MugItem } from './MugOrganizer';
import PhotoPackCustomization, { PhotoPackCustomizationOptions } from './PhotoPackCustomization';
import PhotoPackOrganizer from './PhotoPackOrganizer';
import ProductDetailsModal from './ProductDetailsModal';
import DraftPromptModal from './DraftPromptModal';
import CustomAlbumInfo, { CustomAlbumSize } from './CustomAlbumInfo';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { Album, Calendar, MugProduct, PhotoPack, CustomAlbumProduct, BASE_ALBUM, BASE_CALENDAR, BASE_MUG, BASE_PHOTO_PACK, BASE_CUSTOM_ALBUM } from '../types/products';
import { createDraftOrder, getOrder, getUserSavedDrafts, deleteSavedDraft, updateOrderDesign, createCustomAlbumOrder, PhotoUploadError, PhotoLossError } from '../../services/orderService';
import { buildWhatsAppUrl } from '../config/contact';
import type { PageVariantId } from '../utils/pageLayouts';

const DB_NAME = 'JiffyAppDB';
const STORE_NAME = 'drafts';

const saveDraftToDB = (data: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(data, 'pending_checkout');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
};

const loadDraftFromDB = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const getReq = tx.objectStore(STORE_NAME).get('pending_checkout');
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
};

const clearDraftFromDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete('pending_checkout');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
};

type Step = 'product' | 'customization' | 'organize' | 'checkout' | 'custom-album-info';

export default function Creator() {
  const { t } = useLanguage();
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>('product');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const savingMessages = [
    'Estamos preparando tu álbum ✨',
    'Tus recuerdos están casi listos 📸',
    'Optimizando la calidad de tus fotos 🖼️',
    'Guardando cada detalle con cuidado 💛',
    'Ya casi terminamos, un momento más...',
  ];
  const [savingMsgIndex, setSavingMsgIndex] = useState(0);
  useEffect(() => {
    if (!isSaving) return;
    setSavingMsgIndex(0);
    const interval = setInterval(() => {
      setSavingMsgIndex(prev => (prev + 1) % savingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isSaving]);
  const [resumingOrderId, setResumingOrderId] = useState<string | null>(null);
  const [editingPaidOrderId, setEditingPaidOrderId] = useState<string | null>(null);
  const [isPageCountLocked, setIsPageCountLocked] = useState(false);

  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const activeDraftIdRef = useRef<string | null>(null);
  const updateActiveDraftId = (id: string | null) => {
    activeDraftIdRef.current = id;
    setActiveDraftId(id);
  };
  const [savedDrafts, setSavedDrafts] = useState<any[]>([]);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaveSuccess, setDraftSaveSuccess] = useState(false);
  const [showDraftHint, setShowDraftHint] = useState(false);
  const [autoSaveBanner, setAutoSaveBanner] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);

  /**
   * Equivalencias `blob:`/`data:` → URL de Firebase Storage descubiertas en guardados
   * anteriores de esta sesión. Evita resubir lo ya subido y, sobre todo, permite guardar
   * aunque la `blob:` original haya muerto (pestaña descartada por iOS, PWA en segundo plano).
   */
  const [uploadedUrlMap, setUploadedUrlMap] = useState<Record<string, string>>({});
  /** Fotos que no se pudieron subir tras los reintentos; bloquea el avance a checkout. */
  const [uploadFailure, setUploadFailure] = useState<{ urls: string[]; count: number } | null>(null);
  /** URLs señaladas en el editor para que el usuario las reemplace una a una. */
  const [failedUploadUrls, setFailedUploadUrls] = useState<string[]>([]);

  const [previewProduct, setPreviewProduct] = useState<ProductType | null>(null);
  const [selectedCustomAlbum, setSelectedCustomAlbum] = useState<CustomAlbumProduct | null>(null);
  const [isSubmittingCustomAlbum, setIsSubmittingCustomAlbum] = useState(false);

  // EFECTO PARA LLEVAR EL SCROLL SIEMPRE ARRIBA AL CAMBIAR DE PASO
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentStep, previewProduct]);

  useEffect(() => {
    if (currentStep === 'customization' && user) {
      const seen = localStorage.getItem('jiffy_draft_hint_seen');
      if (!seen) setShowDraftHint(true);
    }
  }, [currentStep, user]);

  useEffect(() => {
    const checkSavedDrafts = async () => {
      if (!user) return;
      if (selectedProduct) return;
      if (location.state?.fromCheckout) return;
      if (location.state?.editPaidOrder) return;
      try {
        const drafts = await getUserSavedDrafts(user.uid);
        if (drafts.length > 0) {
          setSavedDrafts(drafts);
          setShowDraftPrompt(true);
        }
      } catch (e) {
        console.error('Error checking saved drafts', e);
      }
    };
    checkSavedDrafts();
  }, [user]);

  // ───────────────────────────────────────────────────────────────────────────
  // Cola de guardado
  //
  // Las escrituras del pedido se ejecutan ESTRICTAMENTE en serie. El esquema
  // anterior ("single-flight") solo esperaba la promesa en curso, así que dos
  // llamadas que esperaban la misma promesa reanudaban a la vez y lanzaban dos
  // createDraftOrder en paralelo sobre el mismo documento; como cada uno sube N
  // imágenes y tarda distinto, el que salió con datos más viejos podía escribir
  // el último y borrar las fotos añadidas entre medias.
  // ───────────────────────────────────────────────────────────────────────────
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const saveSeqRef = useRef(0);

  const enqueueSave = <T,>(
    task: () => Promise<T>,
    opts?: { coalescable?: boolean; onSkip?: () => T }
  ): Promise<T> => {
    const ticket = ++saveSeqRef.current;
    const run = saveQueueRef.current.then(
      () => {
        // Un autoguardado que ya fue superado por otro posterior no aporta nada.
        if (opts?.coalescable && ticket !== saveSeqRef.current) {
          return Promise.resolve(opts.onSkip ? opts.onSkip() : (undefined as unknown as T));
        }
        return task();
      },
      // Encadenar aunque el guardado anterior haya fallado.
      () => task()
    );
    saveQueueRef.current = run.then(() => undefined, () => undefined);
    return run;
  };

  /**
   * Espejo del estado de diseño, refrescado en cada render. Los guardados leen de aquí
   * en el momento en que se ejecutan (ya dentro de la cola), no de la closure congelada
   * en el momento en que se encolaron.
   */
  const designRef = useRef<any>({});

  const buildDesignData = (overrides?: {
    photos?: string[][] | string[];
    mugItems?: MugItem[];
    textBoxSlots?: Record<number, Record<number, any>>;
    customization?: any;
  }) => {
    const d = designRef.current;
    const product = d.selectedProduct as ProductType | null;

    const activeCustomization = overrides?.customization ?? (
      product === 'album' ? d.customization
      : product === 'calendar' ? d.calendarCustomization
      : product === 'mug' ? d.mugCustomization
      : product === 'photo-pack' ? d.photoPackCustomization
      : null
    );

    const activeProduct = product === 'album' ? d.selectedAlbum
                        : product === 'calendar' ? d.selectedCalendar
                        : product === 'mug' ? d.selectedMug
                        : product === 'photo-pack' ? d.selectedPhotoPack
                        : null;

    const activePhotos = overrides?.photos ?? (
      product === 'album' ? d.photos
      : product === 'calendar' ? d.calendarPhotos
      : product === 'photo-pack' ? d.photoPackPhotos
      : []
    );

    const activePhotoCrops = product === 'album' ? d.photoCrops
                           : product === 'calendar' ? d.calendarPhotoCrops
                           : product === 'photo-pack' ? d.photoPackPhotoCrops
                           : {};

    const currentMugItems = overrides?.mugItems ?? (product === 'mug' ? d.mugItems : []);

    let coverData: any = { image: '', title: activeProduct?.name || '' };
    if (product === 'album' && (activeCustomization as any)?.coverContent) {
      const content = (activeCustomization as any).coverContent;
      coverData = {
        image: content.coverImage || '',
        title: content.coverTitle || '',
        subtitle: content.coverSubtitle || '',
        year: content.coverYear || '',
        layout: content.selectedLayout || 1,
        crop: content.coverCrop || { x: 50, y: 50, zoom: 1 },
      };
    }

    return {
      activeProduct,
      designData: {
        photos: activePhotos,
        pageLayouts: d.pageLayouts,
        pageLayoutVariants: d.pageLayoutVariants,
        textBoxSlots: overrides?.textBoxSlots ?? d.textBoxSlots,
        customization: activeCustomization,
        coverData,
        photoCrops: activePhotoCrops,
        items: currentMugItems,
        mugItems: currentMugItems,
        uploadedUrlMap: d.uploadedUrlMap,
      },
    };
  };

  const currentUserInfo = () => ({
    name: userData?.name || user?.displayName || undefined,
    email: user?.email || undefined,
  });

  /**
   * Guarda el borrador. El `designData` se construye DENTRO de la tarea encolada,
   * de modo que siempre refleja el estado más reciente y no una copia congelada.
   */
  const persistDraft = (opts?: {
    status?: 'draft' | 'saved_draft';
    onProgress?: (progress: number) => void;
    overrides?: Parameters<typeof buildDesignData>[0];
    coalescable?: boolean;
    allowShrink?: boolean;
  }): Promise<string | null> =>
    enqueueSave<string | null>(
      async () => {
        const { activeProduct, designData } = buildDesignData(opts?.overrides);
        if (!activeProduct) return activeDraftIdRef.current;

        const result = await createDraftOrder(
          user!.uid,
          designData,
          activeProduct,
          opts?.onProgress,
          activeDraftIdRef.current || resumingOrderId || undefined,
          designRef.current.selectedProduct || undefined,
          opts?.status ?? 'saved_draft',
          currentUserInfo(),
          opts?.allowShrink ?? false
        );

        updateActiveDraftId(result.orderId);
        if (Object.keys(result.uploadedUrlMap).length > 0) {
          setUploadedUrlMap(prev => ({ ...prev, ...result.uploadedUrlMap }));
        }
        setFailedUploadUrls([]);
        return result.orderId;
      },
      // null = "no se guardó" (coalescado). Así el llamante no muestra el banner
      // de éxito por un guardado que en realidad nunca ocurrió.
      { coalescable: opts?.coalescable, onSkip: () => null }
    );

  /**
   * Traduce los errores tipados del servicio a algo accionable para el usuario.
   * Devuelve `true` si el error ya fue manejado aquí.
   */
  const handleSaveError = (e: unknown, opts?: { onConfirmShrink?: () => void }): boolean => {
    if (e instanceof PhotoUploadError) {
      setUploadFailure({
        urls: e.failures.map(f => f.sourceUrl),
        count: e.failures.length,
      });
      return true;
    }
    if (e instanceof PhotoLossError) {
      // Dejar el pedido en CERO fotos nunca es intencional y no admite override:
      // no tiene sentido ofrecer un "continuar" que volvería a fallar.
      if (e.after === 0) {
        setAutoSaveBanner({
          text: `No guardamos: el diseño se quedaría sin ninguna de tus ${e.before} fotos. ` +
                `Recarga la página y vuelve a abrir el borrador; el guardado anterior sigue intacto.`,
          tone: 'error',
        });
        return true;
      }
      if (opts?.onConfirmShrink) {
        const ok = window.confirm(
          `Tu diseño pasaría de ${e.before} a ${e.after} fotos guardadas.\n\n` +
          `Si no borraste fotos a propósito, cancela y avísanos.\n\n¿Continuar de todos modos?`
        );
        if (ok) opts.onConfirmShrink();
      } else {
        setAutoSaveBanner({
          text: 'No guardamos automáticamente: el diseño tenía menos fotos de lo esperado.',
          tone: 'error',
        });
      }
      return true;
    }
    return false;
  };

  const handleCheckoutRedirect = async (finalData?: {
    photos?: string[][] | string[], 
    mugItems?: MugItem[], 
    textBoxSlots?: Record<number, Record<number, any>> 
  }) => {
    const overrides = {
      photos: finalData?.photos,
      mugItems: finalData?.mugItems,
      textBoxSlots: finalData?.textBoxSlots,
    };

    setIsSaving(true);
    setUploadProgress(0);

    const attempt = async (allowShrink: boolean): Promise<void> => {
      const { activeProduct, designData } = buildDesignData(overrides);

      if (!user) {
        const draftData = {
          designData,
          product: activeProduct,
          productType: designRef.current.selectedProduct,
        };
        await saveDraftToDB(draftData);
        navigate('/login', { state: { from: location.pathname } });
        return;
      }

      const orderId = await persistDraft({
        status: 'saved_draft',
        onProgress: (progress) => setUploadProgress(progress),
        overrides,
        allowShrink,
      });

      setResumingOrderId(null);
      navigate('/checkout', {
        state: {
          orderId,
          product: activeProduct,
          productType: designRef.current.selectedProduct,
        },
      });
    };

    try {
      await attempt(false);
    } catch (error) {
      const handled = handleSaveError(error, {
        onConfirmShrink: () => {
          attempt(true).catch(e => {
            console.error('Error al guardar el diseño (reintento):', e);
            if (!handleSaveError(e)) alert(t('error.processingImages'));
          });
        },
      });
      if (!handled) {
        console.error('Error al guardar el diseño:', error);
        alert(t('error.processingImages'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const [selectedMug, setSelectedMug] = useState<MugProduct | null>(null);
  const [selectedPhotoPack, setSelectedPhotoPack] = useState<PhotoPack | null>(null);
  
  const [customization, setCustomization] = useState<CustomizationOptions | null>(null);
  const [calendarCustomization, setCalendarCustomization] = useState<CalendarCustomizationOptions | null>(null);
  const [mugCustomization, setMugCustomization] = useState<MugCustomizationOptions | null>(null);
  const [photoPackCustomization, setPhotoPackCustomization] = useState<PhotoPackCustomizationOptions | null>(null);
  
  const [photos, setPhotos] = useState<string[][]>([]);
  const [fileSignatures, setFileSignatures] = useState<string[][]>([]);
  const [photoCrops, setPhotoCrops] = useState<Record<string, { x: number, y: number, zoom: number }>>({});
  const [calendarPhotos, setCalendarPhotos] = useState<string[]>([]);
  const [calendarPhotoCrops, setCalendarPhotoCrops] = useState<Record<number, { x: number, y: number, zoom: number }>>({});
  const [photoPackPhotos, setPhotoPackPhotos] = useState<string[]>([]);
  const [photoPackPhotoCrops, setPhotoPackPhotoCrops] = useState<Record<number, { x: number, y: number, zoom: number }>>({});
  const [mugItems, setMugItems] = useState<MugItem[]>([]);
  const [textBoxSlots, setTextBoxSlots] = useState<Record<number, Record<number, any>>>({});  
  const [pageLayouts, setPageLayouts] = useState<Record<number, PageVariantId>>({});
  const [pageLayoutVariants, setPageLayoutVariants] = useState<Record<number, number>>({});
  const progressRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Sin array de dependencias a propósito: designRef debe reflejar el último render.
  useEffect(() => {
    designRef.current = {
      selectedProduct, selectedAlbum, selectedCalendar, selectedMug, selectedPhotoPack,
      customization, calendarCustomization, mugCustomization, photoPackCustomization,
      photos, photoCrops, textBoxSlots, pageLayouts, pageLayoutVariants,
      calendarPhotos, calendarPhotoCrops, photoPackPhotos, photoPackPhotoCrops,
      mugItems, uploadedUrlMap,
    };
  });

  useEffect(() => {
    const apiKey = import.meta.env.VITE_1CLIC_API_KEY;

    if (!apiKey || currentStep !== 'organize') {
      const existing = document.querySelector('script[src="https://www.1clic.ai/badge.js"]');
      if (existing) existing.remove();
      const badge = document.getElementById('oneclic-badge') || document.querySelector('[id*="1clic"]');
      if (badge) badge.remove();
      return;
    }

    const script = document.createElement('script');
    script.src = "https://www.1clic.ai/badge.js";
    script.setAttribute('data-agent', "53893e5c-cc14-4432-b98b-88e8782b2f8b");
    script.setAttribute('data-key', apiKey);
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      const badge = document.getElementById('oneclic-badge') || document.querySelector('[id*="1clic"]');
      if (badge) badge.remove();
    };
  }, [currentStep]);

  const buildDesignDataFromOrder = (order: any, detectedType: ProductType) => {
    const photos = detectedType === 'album'
      ? (order.pages?.map((p: any) => p.images || []) || [])
      : (order.photos || []);

    // Reconstruir photoCrops desde pages[i].crops (fuente de verdad) con fallback al campo raíz
    let photoCrops: Record<string, any> = {};
    if (detectedType === 'album' && order.pages?.length) {
      order.pages.forEach((page: any, i: number) => {
        const crops = page.crops || {};
        Object.keys(crops).forEach(j => {
          photoCrops[`${i}-${j}`] = crops[Number(j)];
        });
      });
    } else {
      photoCrops = order.photoCrops || {};
    }
    // Completar con el campo raíz si alguna clave falta
    const rootCrops = order.photoCrops || {};
    Object.keys(rootCrops).forEach(k => {
      if (!photoCrops[k]) photoCrops[k] = rootCrops[k];
    });

    // Construir fileSignatures placeholder desde pages para habilitar detección de duplicados
    const fileSignatures = detectedType === 'album'
      ? (order.pages?.map((p: any) => (p.images || []).map((url: string) => url || '')) || [])
      : [];

    return {
      photos,
      photoCrops,
      fileSignatures,
      textBoxSlots: order.textBoxSlots || {},
      pageLayouts: order.pageLayouts || {},
      pageLayoutVariants: order.pageLayoutVariants || {},
      customization: order.customization,
      coverData: order.coverData,
      items: order.items || order.mugItems || [],
      mugItems: order.items || order.mugItems || [],
    };
  };

  const restoreDesignToState = (designData: any, product: any, productType: ProductType) => {
    setSelectedProduct(productType);
    setCurrentStep('customization');
    // El borrador de invitado (IndexedDB) viaja con las equivalencias blob: → Storage
    // ya descubiertas: sin ellas, al volver del login las blob: muertas fallarían al subir.
    setUploadedUrlMap(designData.uploadedUrlMap || {});
    setUploadFailure(null);
    setFailedUploadUrls([]);

    if (productType === 'album') {
      setSelectedAlbum(product);
      let albumCustomization = designData.customization;
      if (
        albumCustomization?.coverContent?.coverImage === 'uploaded' &&
        designData.coverData?.image &&
        designData.coverData.image !== 'uploaded'
      ) {
        albumCustomization = {
          ...albumCustomization,
          coverContent: {
            ...albumCustomization.coverContent,
            coverImage: designData.coverData.image,
          },
        };
      }
      setCustomization(albumCustomization);
      setPhotos(designData.photos);
      setPhotoCrops(designData.photoCrops || {});
      setFileSignatures(designData.fileSignatures || (designData.photos || []).map((page: string[]) => (page || []).map(() => '')));
      setTextBoxSlots(designData.textBoxSlots || {});
      setPageLayouts(designData.pageLayouts || {});
      setPageLayoutVariants(designData.pageLayoutVariants || {});
    } else if (productType === 'calendar') {
      setSelectedCalendar(product);
      setCalendarCustomization(designData.customization);
      setCalendarPhotos(designData.photos || []);
      setCalendarPhotoCrops(designData.photoCrops || {});
    } else if (productType === 'mug') {
      setSelectedMug(product);
      setMugCustomization(designData.customization);
      setMugItems(designData.items || designData.mugItems || []);
      setTextBoxSlots(designData.textBoxSlots || {});
    } else if (productType === 'photo-pack') {
      setSelectedPhotoPack(product);
      setPhotoPackCustomization(designData.customization);
      setPhotoPackPhotos(designData.photos || []);
      setPhotoPackPhotoCrops(designData.photoCrops || {});
    }
  };

  useEffect(() => {
    const restoreState = async () => {
      const state = location.state as any;

      if (state?.resumeSavedDraft && !selectedProduct) {
        try {
          const order = await getOrder(state.resumeSavedDraft) as any;
          if (order && order.status === 'saved_draft') {
            const productTypeStr = String(order.productType || order.product?.type || order.product?.id || order.product?.name || '').toLowerCase();
            let detectedType: ProductType = 'album';
            if (productTypeStr.includes('calendar') || productTypeStr.includes('calendario')) detectedType = 'calendar';
            else if (productTypeStr.includes('mug') || productTypeStr.includes('taza')) detectedType = 'mug';
            else if (productTypeStr.includes('photo') || productTypeStr.includes('foto') || productTypeStr.includes('pack')) detectedType = 'photo-pack';

            restoreDesignToState(buildDesignDataFromOrder(order, detectedType), order.product, detectedType);
            updateActiveDraftId(state.resumeSavedDraft);
          }
        } catch (e) {
          console.error('Error restaurando saved draft', e);
        }
        return;
      }

      if (state?.editPaidOrder && !selectedProduct) {
        try {
          const order = await getOrder(state.editPaidOrder) as any;
          if (order && (order.status === 'paid' || order.status === 'mock_paid')) {
            const productTypeStr = String(order.productType || order.product?.type || order.product?.id || order.product?.name || '').toLowerCase();
            let detectedType: ProductType = 'album';
            if (productTypeStr.includes('calendar') || productTypeStr.includes('calendario')) detectedType = 'calendar';
            else if (productTypeStr.includes('mug') || productTypeStr.includes('taza')) detectedType = 'mug';
            else if (productTypeStr.includes('photo') || productTypeStr.includes('foto') || productTypeStr.includes('pack')) detectedType = 'photo-pack';

            restoreDesignToState(buildDesignDataFromOrder(order, detectedType), order.product, detectedType);
            setEditingPaidOrderId(state.editPaidOrder);
            setIsPageCountLocked(true);
          }
        } catch (e) {
          console.error('Error restaurando orden pagada para edición', e);
        }
        return;
      }

      if (state?.fromCheckout && state?.orderId && !selectedProduct) {
        try {
          const order = await getOrder(state.orderId) as any;
          if (order) {
            const productTypeStr = String(order.productType || order.product?.type || order.product?.id || order.product?.name || '').toLowerCase();
            let detectedType: ProductType = 'album';
            if (productTypeStr.includes('calendar') || productTypeStr.includes('calendario')) detectedType = 'calendar';
            else if (productTypeStr.includes('mug') || productTypeStr.includes('taza')) detectedType = 'mug';
            else if (productTypeStr.includes('photo') || productTypeStr.includes('foto') || productTypeStr.includes('pack')) detectedType = 'photo-pack';

            restoreDesignToState(buildDesignDataFromOrder(order, detectedType), order.product, detectedType);
            setResumingOrderId(state.orderId);
            updateActiveDraftId(state.orderId);
          }
        } catch (e) {
          console.error('Error al restaurar orden desde checkout', e);
        }
        return;
      }

      if (state?.designData && !selectedProduct) {
        restoreDesignToState(state.designData, state.product, state.productType);
      }
      else if (user && !selectedProduct) {
        try {
          const draft = await loadDraftFromDB();
          if (draft) {
            restoreDesignToState(draft.designData, draft.product, draft.productType);
            await clearDraftFromDB(); 
          } else if (state?.startProduct) {
            handleSelectProduct(state.startProduct);
          }
        } catch (e) {
          console.error("Error al cargar el borrador de IndexedDB", e);
        }
      }
      else if (state?.startProduct && !selectedProduct) {
        handleSelectProduct(state.startProduct);
      }
    };

    restoreState();
  }, [location.state, selectedProduct, user]);

  const handleSaveDraft = async () => {
    if (!user) return;
    if (currentStep === 'product' || currentStep === 'checkout') return;

    try {
      const currentDrafts = await getUserSavedDrafts(user.uid);
      const isUpdatingExisting = activeDraftIdRef.current !== null;
      if (!isUpdatingExisting && currentDrafts.length >= 3) {
        alert(t('draft.limitReached'));
        return;
      }

      setIsSavingDraft(true);

      const attempt = async (allowShrink: boolean) => {
        const newDraftId = await persistDraft({ status: 'saved_draft', allowShrink });

        setSavedDrafts(prev => {
          const exists = prev.find(d => d.id === newDraftId);
          if (exists) {
            return prev.map(d => d.id === newDraftId ? { ...d, updatedAt: new Date().toISOString() } : d);
          }
          return [...prev, { id: newDraftId, updatedAt: new Date().toISOString() }];
        });

        setDraftSaveSuccess(true);
        setTimeout(() => setDraftSaveSuccess(false), 2500);
      };

      try {
        await attempt(false);
      } catch (e) {
        const handled = handleSaveError(e, {
          onConfirmShrink: () => {
            attempt(true).catch(err => {
              console.error('Error saving draft (reintento)', err);
              if (!handleSaveError(err)) alert(t('error.savingDraft'));
            });
          },
        });
        if (!handled) {
          console.error('Error saving draft', e);
          alert(t('error.savingDraft'));
        }
      }
    } catch (e) {
      console.error('Error saving draft', e);
      alert(t('error.savingDraft'));
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSavePaidOrderChanges = async () => {
    if (!user || !editingPaidOrderId) return;
    setIsSavingDraft(true);
    setUploadProgress(0);
    const attempt = (allowShrink: boolean) =>
      enqueueSave(async () => {
        const { designData } = buildDesignData();
        const result = await updateOrderDesign(
          editingPaidOrderId, user.uid, designData, setUploadProgress, allowShrink
        );
        if (Object.keys(result.uploadedUrlMap).length > 0) {
          setUploadedUrlMap(prev => ({ ...prev, ...result.uploadedUrlMap }));
        }
        setDraftSaveSuccess(true);
        setTimeout(() => setDraftSaveSuccess(false), 2500);
      });

    try {
      await attempt(false);
    } catch (e) {
      const handled = handleSaveError(e, {
        onConfirmShrink: () => {
          attempt(true).catch(err => {
            console.error('Error saving paid order changes (reintento)', err);
            if (!handleSaveError(err)) alert(t('error.savingDraft'));
          });
        },
      });
      if (!handled) {
        console.error('Error saving paid order changes', e);
        alert(t('error.savingDraft'));
      }
    } finally {
      setIsSavingDraft(false);
      setUploadProgress(0);
    }
  };

  const handleContinueDraft = (draft: any) => {
    setShowDraftPrompt(false);

    const productTypeStr = String(draft.productType || draft.product?.type || draft.product?.id || draft.product?.name || '').toLowerCase();
    let detectedType: ProductType = 'album';
    if (productTypeStr.includes('calendar') || productTypeStr.includes('calendario')) detectedType = 'calendar';
    else if (productTypeStr.includes('mug') || productTypeStr.includes('taza')) detectedType = 'mug';
    else if (productTypeStr.includes('photo') || productTypeStr.includes('foto') || productTypeStr.includes('pack')) detectedType = 'photo-pack';

    restoreDesignToState(buildDesignDataFromOrder(draft, detectedType), draft.product, detectedType);
    updateActiveDraftId(draft.id);
  };

  const handleStartNew = () => {
    setShowDraftPrompt(false);
    updateActiveDraftId(null);
  };

  const handleDismissDraftHint = () => {
    setShowDraftHint(false);
    localStorage.setItem('jiffy_draft_hint_seen', '1');
  };

  const handleDeleteDraftFromModal = async (draftId: string) => {
    try {
      await deleteSavedDraft(draftId);
      const updated = savedDrafts.filter(d => d.id !== draftId);
      setSavedDrafts(updated);
      if (updated.length === 0) setShowDraftPrompt(false);
      if (activeDraftIdRef.current === draftId) updateActiveDraftId(null);
    } catch (e) {
      console.error('Error deleting draft', e);
    }
  };

  const handleSelectProduct = (product: ProductType) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname, startProduct: product } });
      return;
    }
    setSelectedProduct(product);
    if (product === 'album') setSelectedAlbum(BASE_ALBUM);
    if (product === 'calendar') setSelectedCalendar(BASE_CALENDAR);
    if (product === 'mug') setSelectedMug(BASE_MUG);
    if (product === 'photo-pack') setSelectedPhotoPack(BASE_PHOTO_PACK);
    if (product === 'custom-album') {
      setSelectedCustomAlbum(BASE_CUSTOM_ALBUM);
      setCurrentStep('custom-album-info');
      return;
    }
    setCurrentStep('customization');
  };

  const handleConfirmCustomAlbum = async (size: CustomAlbumSize) => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname, startProduct: 'custom-album' } });
      return;
    }
    setIsSubmittingCustomAlbum(true);
    try {
      const userInfo = { name: userData?.name || user.displayName || undefined, email: user.email || undefined };
      const orderId = await createCustomAlbumOrder(user.uid, size, userInfo);
      const code = orderId.slice(0, 8).toUpperCase();
      const message = `Hola, quiero hacer un Álbum Personalizado. Mi solicitud fue registrada con el código ${code}.`;
      window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
      navigate('/dashboard');
    } catch (e) {
      console.error('Error creando orden de álbum personalizado', e);
    } finally {
      setIsSubmittingCustomAlbum(false);
    }
  };

  /**
   * Autoguardado. Nunca usa `allowShrink`: un guardado automático jamás debe poder
   * reducir el diseño. Si algo falla, el usuario se entera — antes solo iba a consola
   * mientras la UI podía llegar a mostrar el banner de éxito.
   */
  const autoSaveDraftSilently = async (
    customizationOverride?: any,
    opts?: { silentUi?: boolean }
  ) => {
    if (!user) return;
    if (!designRef.current.selectedProduct) return;
    if (uploadFailure) return; // hay fotos sin subir: no insistir en bucle

    if (!opts?.silentUi) setIsSaving(true);
    try {
      const saved = await persistDraft({
        status: 'saved_draft',
        overrides: customizationOverride ? { customization: customizationOverride } : undefined,
        coalescable: true,
      });
      if (saved) {
        setAutoSaveBanner({ text: 'Borrador guardado automáticamente', tone: 'ok' });
        setTimeout(() => setAutoSaveBanner(null), 3500);
      }
    } catch (e) {
      console.error('Auto-save silencioso falló:', e);
      if (!handleSaveError(e)) {
        setAutoSaveBanner({
          text: 'No pudimos guardar automáticamente. Usa "Guardar borrador".',
          tone: 'error',
        });
      }
    } finally {
      if (!opts?.silentUi) setIsSaving(false);
    }
  };

  // ── C2: autoguardado periódico y al ocultar la pestaña ─────────────────────
  // El editor solo se guardaba al pulsar un botón; una pestaña descartada por iOS
  // (PWA en segundo plano) se llevaba consigo todas las blob: URLs.
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUnsavedChangesRef = useRef(false);

  useEffect(() => {
    if (currentStep !== 'organize' || !user) return;
    if (editingPaidOrderId) return; // los pedidos pagados solo se guardan explícitamente
    if (photos.length === 0 && mugItems.length === 0) return;

    hasUnsavedChangesRef.current = true;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      hasUnsavedChangesRef.current = false;
      autoSaveDraftSilently(undefined, { silentUi: true });
    }, 20000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [photos, pageLayouts, pageLayoutVariants, textBoxSlots, photoCrops, mugItems, currentStep, user, editingPaidOrderId]);

  useEffect(() => {
    // `visibilitychange` es más fiable que `beforeunload` en iOS/PWA.
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return;
      if (!hasUnsavedChangesRef.current) return;
      if (currentStep !== 'organize' || !user || editingPaidOrderId) return;
      hasUnsavedChangesRef.current = false;
      autoSaveDraftSilently(undefined, { silentUi: true });
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [currentStep, user, editingPaidOrderId]);

  const handleCustomizationComplete = (options: CustomizationOptions) => {
    setCustomization(options);
    setCurrentStep('organize');
    autoSaveDraftSilently(options);
  };

  const handleCalendarCustomizationComplete = (options: CalendarCustomizationOptions) => {
    setCalendarCustomization(options);
    setCurrentStep('organize');
  };

  const handleMugCustomizationComplete = (options: MugCustomizationOptions) => {
    setMugCustomization(options);
    setCurrentStep('organize');
  };

  const handlePhotoPackCustomizationComplete = (options: PhotoPackCustomizationOptions) => {
    setPhotoPackCustomization(options);
    setCurrentStep('organize');
  };

  const handleCalendarPhotosComplete = (uploadedPhotos: string[]) => {
    setCalendarPhotos(uploadedPhotos);
    handleCheckoutRedirect({ photos: uploadedPhotos });
  };

  const handlePhotoPackPhotosComplete = (uploadedPhotos: string[]) => {
    setPhotoPackPhotos(uploadedPhotos);
    handleCheckoutRedirect({ photos: uploadedPhotos });
  };

  const handleMugItemsComplete = () => {
    handleCheckoutRedirect({ mugItems: mugItems });
  };

  const handleBack = () => {
    if (currentStep === 'custom-album-info') {
      setCurrentStep('product');
      setSelectedProduct(null);
      setSelectedCustomAlbum(null);
    } else if (currentStep === 'customization') {
      setCurrentStep('product');
      setSelectedProduct(null);
      setSelectedAlbum(null);
      setSelectedCalendar(null);
      setSelectedMug(null);
      setSelectedPhotoPack(null);
    } else if (currentStep === 'organize') {
      setCurrentStep('customization');
      // No limpiamos el estado para preservar los datos del cover al retroceder
    } else if (currentStep === 'checkout') {
      setCurrentStep('organize');
      setPhotos([]);
      setCalendarPhotos([]);
      setMugItems([]);
      setPhotoPackPhotos([]);
      setPhotoCrops({});
    }
  };

  const getProgressSteps = () => {
    if (selectedProduct === 'custom-album') {
      return [
        { id: 'product', label: t('step.product'), active: true },
        { id: 'custom-album-info', label: 'Información', active: currentStep === 'custom-album-info' },
      ];
    }

    const commonSteps = [
      { id: 'product', label: t('step.product'), active: true },
      { id: 'customization', label: t('step.customize'), active: currentStep === 'customization' || currentStep === 'organize' || currentStep === 'checkout' },
      { id: 'organize', label: t('step.photos'), active: currentStep === 'organize' || currentStep === 'checkout' },
      { id: 'checkout', label: t('step.checkout'), active: currentStep === 'checkout' },
    ];

    if (selectedProduct === 'mug') {
      commonSteps[2].label = t('step.design');
    }
    
    if (selectedProduct) return commonSteps;
    
    return [
      { id: 'product', label: t('step.product'), active: true },
    ];
  };

  const progressSteps = getProgressSteps();
  const activeStepIndex = progressSteps.findIndex(step => step.id === currentStep);

  useEffect(() => {
    if (progressRef.current && stepRefs.current[activeStepIndex]) {
      const stepElement = stepRefs.current[activeStepIndex];
      if (stepElement) {
        const containerWidth = progressRef.current.offsetWidth;
        const stepLeft = stepElement.offsetLeft;
        const stepWidth = stepElement.offsetWidth;
        const scrollPosition = stepLeft - (containerWidth / 2) + (stepWidth / 2);
        
        progressRef.current.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [currentStep, activeStepIndex]);

  const renderProductSelection = () => (
    <ProductSelection
      onSelectProduct={(product) => product === 'custom-album' ? handleSelectProduct(product) : setPreviewProduct(product)}
    />
  );

  const renderCustomAlbumInfo = () => (
    <CustomAlbumInfo
      onConfirm={handleConfirmCustomAlbum}
      onBack={handleBack}
      isSubmitting={isSubmittingCustomAlbum}
    />
  );

  const renderCustomization = () => {
    if (selectedProduct === 'album' && selectedAlbum) {
      return (
        <AlbumCustomization
          album={selectedAlbum}
          onCustomizationComplete={handleCustomizationComplete}
          initialData={customization}
        />
      );
    } else if (selectedProduct === 'calendar' && selectedCalendar) {
      return (
        <CalendarCustomization 
          calendar={selectedCalendar}
          onCustomizationComplete={handleCalendarCustomizationComplete}
        />
      );
    } else if (selectedProduct === 'mug' && selectedMug) {
      return (
        <MugCustomization 
          product={selectedMug}
          onCustomizationComplete={handleMugCustomizationComplete}
        />
      );
    } else if (selectedProduct === 'photo-pack' && selectedPhotoPack) {
      return (
        <PhotoPackCustomization 
          photoPack={selectedPhotoPack}
          onCustomizationComplete={handlePhotoPackCustomizationComplete}
        />
      );
    }
    return null;
  };

  const renderOrganizer = () => {
    if (selectedProduct === 'album' && customization) {
      return (
        <PhotoOrganizer
          album={selectedAlbum!}
          customization={customization}
          photos={photos}
          onPhotosChange={setPhotos}
          photoCrops={photoCrops}
          onPhotoCropsChange={setPhotoCrops}
          textBoxSlots={textBoxSlots}
          onTextBoxSlotsChange={setTextBoxSlots}
          pageLayouts={pageLayouts}
          onPageLayoutsChange={setPageLayouts}
          pageLayoutVariants={pageLayoutVariants}
          onPageLayoutVariantsChange={setPageLayoutVariants}
          onComplete={() => editingPaidOrderId ? handleSavePaidOrderChanges() : handleCheckoutRedirect()}
          pagesLocked={isPageCountLocked}
          initialFileSignatures={fileSignatures.length > 0 ? fileSignatures : undefined}
          isSaving={isSaving}
          failedUploadUrls={failedUploadUrls}
        />
      );
    } else if (selectedProduct === 'calendar' && calendarCustomization) {
      const AnyCalendarOrganizer = CalendarOrganizer as any;
      return (
        <AnyCalendarOrganizer
          calendar={selectedCalendar!}
          customization={calendarCustomization}
          photos={calendarPhotos}
          onPhotosChange={setCalendarPhotos}
          photoCrops={calendarPhotoCrops}
          onPhotoCropsChange={setCalendarPhotoCrops}
          onComplete={handleCalendarPhotosComplete}
          isSaving={isSaving}
        />
      );
    } else if (selectedProduct === 'mug' && mugCustomization) {
      return (
        <MugOrganizer
          mug={selectedMug!}
          customization={mugCustomization}
          items={mugItems}
          onItemsChange={setMugItems}
          onComplete={handleMugItemsComplete}
          isSaving={isSaving}
        />
      );
    } else if (selectedProduct === 'photo-pack' && photoPackCustomization) {
      return (
        <PhotoPackOrganizer 
          photoPack={selectedPhotoPack!}
          customization={photoPackCustomization}
          photos={photoPackPhotos}
          onPhotosChange={setPhotoPackPhotos}
          photoCrops={photoPackPhotoCrops}
          onPhotoCropsChange={setPhotoPackPhotoCrops}
          onComplete={handlePhotoPackPhotosComplete}
        />
      );
    }
    return null;
  };

  // getActiveProduct / getActiveCustomization / getActivePhotos vivían aquí y se
  // duplicaban en cada ruta de guardado. Ahora esa selección la hace buildDesignData
  // leyendo designRef, para que ningún guardado use una copia congelada del estado.

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="hidden md:inline">{t('nav.home')}</span>
          </button>
          
          {currentStep !== 'product' && (
            <div className="text-sm text-gray-500">
              {t('step.step')} {activeStepIndex + 1} {t('step.of')} {progressSteps.length}
            </div>
          )}

          {user && currentStep !== 'product' && currentStep !== 'checkout' && currentStep !== 'custom-album-info' && (
            <div className="relative">
              <button
                onClick={editingPaidOrderId ? handleSavePaidOrderChanges : handleSaveDraft}
                disabled={isSavingDraft}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg transition-all disabled:opacity-50 ${
                  editingPaidOrderId
                    ? 'border-black bg-black text-white hover:bg-gray-800'
                    : showDraftHint
                    ? 'border-black bg-black text-white hover:text-white ring-4 ring-black/20 animate-pulse'
                    : 'text-gray-600 hover:text-black border-gray-200 hover:border-gray-400'
                }`}
              >
                {isSavingDraft ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : draftSaveSuccess ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <BookMarked className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isSavingDraft
                    ? t('common.saving')
                    : draftSaveSuccess
                    ? (editingPaidOrderId ? t('creator.changesSaved') : t('draft.saved'))
                    : (editingPaidOrderId ? t('creator.saveChanges') : t('draft.saveDraft'))}
                </span>
              </button>

              {showDraftHint && (
                <div className="absolute right-0 top-full mt-3 w-72 bg-gray-900 text-white rounded-2xl shadow-2xl p-4 z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Arrow pointing up-right */}
                  <div className="absolute -top-2 right-4 w-4 h-4 bg-gray-900 rotate-45 rounded-sm" />
                  <div className="flex items-start gap-3">
                    <div className="bg-white/10 p-2 rounded-xl flex-shrink-0 mt-0.5">
                      <BookMarked className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm leading-snug">{t('draft.hintTitle')}</p>
                      <p className="text-xs text-gray-300 mt-1 leading-relaxed">{t('draft.hintBody')}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDismissDraftHint}
                    className="mt-3 w-full py-2 bg-white text-gray-900 text-sm font-bold rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    {t('draft.hintDismiss')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {currentStep !== 'product' && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div 
              ref={progressRef}
              className="flex items-center gap-4 overflow-x-auto hide-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {progressSteps.map((step, index) => {
                const getStepIcon = () => {
                  switch(step.id) {
                    case 'product': return <ShoppingBag className="w-5 h-5" />;
                    case 'customization': return <Settings className="w-5 h-5" />;
                    case 'organize': return <ImageIcon className="w-5 h-5" />;
                    case 'checkout': return <ShoppingCart className="w-5 h-5" />;
                    case 'custom-album-info': return <Sparkles className="w-5 h-5" />;
                    default: return null;
                  }
                };

                return (
                  <div 
                  key={step.id}
                  ref={(el) => { stepRefs.current[index] = el; }}
                  className="flex items-center gap-4 flex-shrink-0"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      step.active 
                        ? 'bg-black text-white' 
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {getStepIcon()}
                    </div>
                    <span className={`text-sm font-medium whitespace-nowrap ${
                      step.active ? 'text-black' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {index < progressSteps.length - 1 && (
                    <div className={`w-12 h-0.5 ${
                      progressSteps[index + 1].active ? 'bg-black' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )})}
            </div>
          </div>
        </div>
      )}

      {currentStep !== 'product' && (
        <div className="max-w-6xl mx-auto px-4 pt-6"> {/* Espacio ajustado, sin margen inferior extra */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-gray-500 hover:text-black font-semibold transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{t('step.back')}</span>
          </button>
        </div>
      )}

      {currentStep === 'product' && renderProductSelection()}
      {currentStep === 'custom-album-info' && renderCustomAlbumInfo()}
      {currentStep === 'customization' && renderCustomization()}
      {currentStep === 'organize' && renderOrganizer()}

      {isSaving && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center px-4">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full flex flex-col items-center gap-6 shadow-2xl animate-in zoom-in-95 duration-300">
            
            <div className="bg-gray-50 p-4 rounded-full">
              <Upload className="w-8 h-8 text-black animate-bounce" />
            </div>
            
            <div className="text-center w-full">
              <h3 className="text-2xl font-black text-gray-900 mb-2">{t('creator.savingTitle')}</h3>
              <p className="text-gray-500 text-sm mb-6 transition-all duration-500 min-h-[20px]">
                {savingMessages[savingMsgIndex]}
              </p>
              
              <div className="w-full bg-gray-100 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
                <div 
                  className="bg-black h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              
              <div className="flex justify-between w-full text-xs font-bold text-gray-400 uppercase tracking-widest">
                <span>{t('creator.uploading')}</span>
                <span>{uploadProgress}%</span>
              </div>
            </div>

          </div>
        </div>
      )}

      <ProductDetailsModal
        isOpen={previewProduct !== null}
        onClose={() => setPreviewProduct(null)}
        productType={previewProduct || 'album'}
        onConfirm={() => {
          if (previewProduct) {
            handleSelectProduct(previewProduct);
          }
          setPreviewProduct(null);
        }}
      />

      <DraftPromptModal
        isOpen={showDraftPrompt}
        drafts={savedDrafts}
        onContinue={handleContinueDraft}
        onStartNew={handleStartNew}
        onDeleteDraft={handleDeleteDraftFromModal}
      />

      {showDraftHint && (
        <div
          className="fixed inset-0 z-[40] bg-black/40 backdrop-blur-[1px]"
          onClick={handleDismissDraftHint}
        />
      )}

      {autoSaveBanner && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-medium ${
            autoSaveBanner.tone === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-gray-900 text-white pointer-events-none'
          }`}
        >
          {autoSaveBanner.tone === 'error' ? (
            <>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{autoSaveBanner.text}</span>
              <button
                onClick={() => setAutoSaveBanner(null)}
                className="ml-2 underline underline-offset-2 shrink-0"
              >
                Entendido
              </button>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-green-400 shrink-0" />
              <span>{autoSaveBanner.text}</span>
            </>
          )}
        </div>
      )}

      {/*
        Fotos que no se pudieron subir. El guardado se abortó ENTERO, así que el
        documento anterior sigue intacto y el diseño sigue completo en memoria:
        el mensaje debe dejar claro que no se perdió nada.
      */}
      {uploadFailure && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  No pudimos subir {uploadFailure.count} foto{uploadFailure.count === 1 ? '' : 's'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Tus fotos siguen aquí, no se perdió nada y tu diseño no cambió.
                  Revisa tu conexión e inténtalo otra vez.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  setUploadFailure(null);
                  if (editingPaidOrderId) handleSavePaidOrderChanges();
                  else handleCheckoutRedirect();
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
              <button
                onClick={() => {
                  setFailedUploadUrls(uploadFailure.urls);
                  setUploadFailure(null);
                }}
                className="flex-1 border-2 border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Ver fotos afectadas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}