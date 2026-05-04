import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ChevronLeft, Home, ShoppingBag, Settings, Image as ImageIcon, ShoppingCart, Loader2, Upload, BookMarked, Check } from 'lucide-react';
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
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { Album, Calendar, MugProduct, PhotoPack, BASE_ALBUM, BASE_CALENDAR, BASE_MUG, BASE_PHOTO_PACK } from '../types/products';
import { createDraftOrder, getOrder, getUserSavedDrafts, deleteSavedDraft, updateOrderDesign } from '../../services/orderService';

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

type Step = 'product' | 'customization' | 'organize' | 'checkout';

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
  const [savedDrafts, setSavedDrafts] = useState<any[]>([]);
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaveSuccess, setDraftSaveSuccess] = useState(false);
  const [showDraftHint, setShowDraftHint] = useState(false);
  const [autoSaveBanner, setAutoSaveBanner] = useState<string | null>(null);

  const [previewProduct, setPreviewProduct] = useState<ProductType | null>(null);

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

  const handleCheckoutRedirect = async (finalData?: { 
    photos?: string[][] | string[], 
    mugItems?: MugItem[], 
    textBoxSlots?: Record<number, Record<number, any>> 
  }) => {
    setIsSaving(true); 
    setUploadProgress(0);

    try {
      const activeProduct = getActiveProduct();
      const activeCustomization = getActiveCustomization();
      
      let currentPhotosRaw = finalData?.photos || getActivePhotos();
      let currentMugItems = finalData?.mugItems || (selectedProduct === 'mug' ? mugItems : []);
      let currentTextBoxSlots = finalData?.textBoxSlots || textBoxSlots; 

      let coverData: any = { image: '', title: '' };
      if (selectedProduct === 'album' && (activeCustomization as any)?.coverContent) {
        const content = (activeCustomization as any).coverContent;
        coverData = {
          image: content.coverImage || '',
          title: content.coverTitle || '',
          subtitle: content.coverSubtitle || '',
          year: content.coverYear || '',
          layout: content.selectedLayout || 1,
          crop: content.coverCrop || { x: 50, y: 50, zoom: 1 }
        };
      } else if (activeProduct) {
        coverData = { image: '', title: activeProduct.name };
      }

      const activePhotoCrops = selectedProduct === 'album' ? photoCrops 
                             : selectedProduct === 'calendar' ? calendarPhotoCrops
                             : selectedProduct === 'photo-pack' ? photoPackPhotoCrops
                             : {};

      const designData = {
        photos: currentPhotosRaw, 
        pageLayouts,
        pageLayoutVariants,
        textBoxSlots: currentTextBoxSlots,
        customization: activeCustomization,
        coverData,
        photoCrops: activePhotoCrops,
        items: currentMugItems, 
        mugItems: currentMugItems
      };

      if (!user) {
        const draftData = { designData, product: activeProduct, productType: selectedProduct };
        await saveDraftToDB(draftData); 
        navigate('/login', { state: { from: location.pathname } }); 
        return;
      }

      const userInfo = { name: userData?.name || user.displayName || undefined, email: user.email || undefined };
      const orderId = await createDraftOrder(user.uid, designData, activeProduct, (progress) => {
        setUploadProgress(progress);
      }, activeDraftId || resumingOrderId || undefined, selectedProduct || undefined, 'saved_draft', userInfo);

      setActiveDraftId(orderId);
      setResumingOrderId(null);
      navigate('/checkout', {
        state: {
          orderId,
          product: activeProduct,
          productType: selectedProduct
        }
      });

    } catch (error) {
      console.error("Error al guardar el diseño:", error);
      alert(t('error.processingImages'));
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
  const [photoCrops, setPhotoCrops] = useState<Record<string, { x: number, y: number, zoom: number }>>({});
  const [calendarPhotos, setCalendarPhotos] = useState<string[]>([]);
  const [calendarPhotoCrops, setCalendarPhotoCrops] = useState<Record<number, { x: number, y: number, zoom: number }>>({});
  const [photoPackPhotos, setPhotoPackPhotos] = useState<string[]>([]);
  const [photoPackPhotoCrops, setPhotoPackPhotoCrops] = useState<Record<number, { x: number, y: number, zoom: number }>>({});
  const [mugItems, setMugItems] = useState<MugItem[]>([]);
  const [textBoxSlots, setTextBoxSlots] = useState<Record<number, Record<number, any>>>({});  
  const [pageLayouts, setPageLayouts] = useState<Record<number, 'grid' | 'row' | 'column'>>({});
  const [pageLayoutVariants, setPageLayoutVariants] = useState<Record<number, number>>({});
  const progressRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  const restoreDesignToState = (designData: any, product: any, productType: ProductType) => {
    setSelectedProduct(productType);
    setCurrentStep('organize');

    if (productType === 'album') {
      setSelectedAlbum(product);
      let albumCustomization = designData.customization;
      if (
        albumCustomization?.coverContent?.coverImage === 'uploaded' &&
        designData.coverData?.image
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

            const photos = detectedType === 'album'
              ? (order.pages?.map((p: any) => p.images || []) || [])
              : (order.photos || []);

            const designData = {
              photos,
              photoCrops: order.photoCrops || {},
              textBoxSlots: order.textBoxSlots || {},
              pageLayouts: order.pageLayouts || {},
              pageLayoutVariants: order.pageLayoutVariants || {},
              customization: order.customization,
              coverData: order.coverData,
              items: order.items || order.mugItems || [],
              mugItems: order.items || order.mugItems || [],
            };

            restoreDesignToState(designData, order.product, detectedType);
            setActiveDraftId(state.resumeSavedDraft);
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

            const photos = detectedType === 'album'
              ? (order.pages?.map((p: any) => p.images || []) || [])
              : (order.photos || []);

            const designData = {
              photos,
              photoCrops: order.photoCrops || {},
              textBoxSlots: order.textBoxSlots || {},
              pageLayouts: order.pageLayouts || {},
              pageLayoutVariants: order.pageLayoutVariants || {},
              customization: order.customization,
              coverData: order.coverData,
              items: order.items || order.mugItems || [],
              mugItems: order.items || order.mugItems || [],
            };

            restoreDesignToState(designData, order.product, detectedType);
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

            const photos = detectedType === 'album'
              ? (order.pages?.map((p: any) => p.images || []) || [])
              : (order.photos || []);

            const designData = {
              photos,
              photoCrops: order.photoCrops || {},
              textBoxSlots: order.textBoxSlots || {},
              pageLayouts: order.pageLayouts || {},
              pageLayoutVariants: order.pageLayoutVariants || {},
              customization: order.customization,
              coverData: order.coverData,
              items: order.items || order.mugItems || [],
              mugItems: order.items || order.mugItems || [],
            };

            restoreDesignToState(designData, order.product, detectedType);
            setResumingOrderId(state.orderId);
            setActiveDraftId(state.orderId);
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
      const isUpdatingExisting = activeDraftId !== null;
      if (!isUpdatingExisting && currentDrafts.length >= 3) {
        alert(t('draft.limitReached'));
        return;
      }

      setIsSavingDraft(true);

      const activeProduct = getActiveProduct();
      const activeCustomization = getActiveCustomization();

      let coverData: any = { image: '', title: '' };
      if (selectedProduct === 'album' && (activeCustomization as any)?.coverContent) {
        const content = (activeCustomization as any).coverContent;
        coverData = {
          image: content.coverImage || '',
          title: content.coverTitle || '',
          subtitle: content.coverSubtitle || '',
          year: content.coverYear || '',
          layout: content.selectedLayout || 1,
          crop: content.coverCrop || { x: 50, y: 50, zoom: 1 }
        };
      } else if (activeProduct) {
        coverData = { image: '', title: activeProduct.name };
      }

      const activePhotoCrops = selectedProduct === 'album' ? photoCrops
                             : selectedProduct === 'calendar' ? calendarPhotoCrops
                             : selectedProduct === 'photo-pack' ? photoPackPhotoCrops
                             : {};

      const currentMugItems = selectedProduct === 'mug' ? mugItems : [];

      const designData = {
        photos: getActivePhotos(),
        pageLayouts,
        pageLayoutVariants,
        textBoxSlots,
        customization: activeCustomization,
        coverData,
        photoCrops: activePhotoCrops,
        items: currentMugItems,
        mugItems: currentMugItems,
      };

      const userInfo = { name: userData?.name || user.displayName || undefined, email: user.email || undefined };
      const newDraftId = await createDraftOrder(
        user.uid,
        designData,
        activeProduct,
        undefined,
        activeDraftId || resumingOrderId || undefined,
        selectedProduct || undefined,
        'saved_draft',
        userInfo
      );

      setActiveDraftId(newDraftId);
      setSavedDrafts(prev => {
        const exists = prev.find(d => d.id === newDraftId);
        if (exists) {
          return prev.map(d => d.id === newDraftId ? { ...d, updatedAt: new Date().toISOString() } : d);
        }
        return [...prev, { id: newDraftId, updatedAt: new Date().toISOString() }];
      });

      setDraftSaveSuccess(true);
      setTimeout(() => setDraftSaveSuccess(false), 2500);

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
    try {
      const activeCustomization = getActiveCustomization();
      let coverData: any = { image: '', title: '' };
      if (selectedProduct === 'album' && (activeCustomization as any)?.coverContent) {
        const content = (activeCustomization as any).coverContent;
        coverData = { image: content.coverImage || '', title: content.coverTitle || '', subtitle: content.coverSubtitle || '', year: content.coverYear || '', layout: content.selectedLayout || 1, crop: content.coverCrop || { x: 50, y: 50, zoom: 1 } };
      } else if (getActiveProduct()) {
        coverData = { image: '', title: getActiveProduct()?.name };
      }
      const activePhotoCrops = selectedProduct === 'album' ? photoCrops : selectedProduct === 'calendar' ? calendarPhotoCrops : selectedProduct === 'photo-pack' ? photoPackPhotoCrops : {};
      const currentMugItems = selectedProduct === 'mug' ? mugItems : [];
      const designData = {
        photos: getActivePhotos(),
        pageLayouts,
        pageLayoutVariants,
        textBoxSlots,
        customization: activeCustomization,
        coverData,
        photoCrops: activePhotoCrops,
        items: currentMugItems,
        mugItems: currentMugItems,
      };
      await updateOrderDesign(editingPaidOrderId, user.uid, designData, setUploadProgress);
      setDraftSaveSuccess(true);
      setTimeout(() => setDraftSaveSuccess(false), 2500);
    } catch (e) {
      console.error('Error saving paid order changes', e);
      alert(t('error.savingDraft'));
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

    const photos = detectedType === 'album'
      ? (draft.pages?.map((p: any) => p.images || []) || [])
      : (draft.photos || []);

    const designData = {
      photos,
      photoCrops: draft.photoCrops || {},
      textBoxSlots: draft.textBoxSlots || {},
      pageLayouts: draft.pageLayouts || {},
      pageLayoutVariants: draft.pageLayoutVariants || {},
      customization: draft.customization,
      coverData: draft.coverData,
      items: draft.items || draft.mugItems || [],
      mugItems: draft.items || draft.mugItems || [],
    };

    restoreDesignToState(designData, draft.product, detectedType);
    setActiveDraftId(draft.id);
  };

  const handleStartNew = () => {
    setShowDraftPrompt(false);
    setActiveDraftId(null);
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
      if (activeDraftId === draftId) setActiveDraftId(null);
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
    setCurrentStep('customization');
  };

  const autoSaveDraftSilently = async (customizationOverride?: any) => {
    if (!user) return;
    try {
      const activeProduct = getActiveProduct();
      if (!activeProduct) return;
      const effectiveCustomization = customizationOverride ?? getActiveCustomization();

      let coverData: any = { image: '', title: activeProduct.name };
      if (selectedProduct === 'album' && (effectiveCustomization as any)?.coverContent) {
        const content = (effectiveCustomization as any).coverContent;
        coverData = {
          image: content.coverImage || '',
          title: content.coverTitle || '',
          subtitle: content.coverSubtitle || '',
          year: content.coverYear || '',
          layout: content.selectedLayout || 1,
          crop: content.coverCrop || { x: 50, y: 50, zoom: 1 }
        };
      }

      const activePhotoCrops = selectedProduct === 'album' ? photoCrops
                             : selectedProduct === 'calendar' ? calendarPhotoCrops
                             : selectedProduct === 'photo-pack' ? photoPackPhotoCrops
                             : {};

      const designData = {
        photos: getActivePhotos(),
        pageLayouts,
        pageLayoutVariants,
        textBoxSlots,
        customization: effectiveCustomization,
        coverData,
        photoCrops: activePhotoCrops,
        items: selectedProduct === 'mug' ? mugItems : [],
        mugItems: selectedProduct === 'mug' ? mugItems : [],
      };

      const userInfo = { name: userData?.name || user.displayName || undefined, email: user.email || undefined };
      const newDraftId = await createDraftOrder(
        user.uid,
        designData,
        activeProduct,
        undefined,
        activeDraftId || undefined,
        selectedProduct || undefined,
        'saved_draft',
        userInfo
      );
      setActiveDraftId(newDraftId);
      setAutoSaveBanner('Borrador guardado automáticamente');
      setTimeout(() => setAutoSaveBanner(null), 3500);
    } catch (e) {
      console.error('Auto-save silencioso falló:', e);
    }
  };

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
    if (currentStep === 'customization') {
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
      onSelectProduct={(product) => setPreviewProduct(product)}
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

  const getActiveProduct = () => {
    if (selectedProduct === 'album') return selectedAlbum;
    if (selectedProduct === 'calendar') return selectedCalendar;
    if (selectedProduct === 'mug') return selectedMug;
    if (selectedProduct === 'photo-pack') return selectedPhotoPack;
    return null;
  };

  const getActiveCustomization = () => {
    if (selectedProduct === 'album') return customization;
    if (selectedProduct === 'calendar') return calendarCustomization;
    if (selectedProduct === 'mug') return mugCustomization;
    if (selectedProduct === 'photo-pack') return photoPackCustomization;
    return null;
  };

  const getActivePhotos = () => {
    if (selectedProduct === 'album') return photos;
    if (selectedProduct === 'calendar') return calendarPhotos;
    if (selectedProduct === 'photo-pack') return photoPackPhotos;
    return [];
  };

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

          {user && currentStep !== 'product' && currentStep !== 'checkout' && (
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
            <span className="hidden md:inline">{t('step.back')}</span>
          </button>
        </div>
      )}

      {currentStep === 'product' && renderProductSelection()}
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium pointer-events-none">
          <Check className="w-4 h-4 text-green-400 shrink-0" />
          {autoSaveBanner}
        </div>
      )}

    </div>
  );
}