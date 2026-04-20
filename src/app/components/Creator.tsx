import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ChevronLeft, Home, ShoppingBag, Settings, Image as ImageIcon, ShoppingCart, Loader2, Upload } from 'lucide-react';
import ProductSelection, { ProductType } from './ProductSelection';
import AlbumCustomization, { CustomizationOptions } from './AlbumCustomization';
import PhotoOrganizer from './PhotoOrganizer';
import CalendarCustomization, { CalendarCustomizationOptions } from './CalendarCustomization';
import CalendarOrganizer from './CalendarOrganizer';
import MugCustomization, { MugCustomizationOptions } from './MugCustomization';
import MugOrganizer, { MugItem } from './MugOrganizer';
import PhotoPackCustomization, { PhotoPackCustomizationOptions } from './PhotoPackCustomization';
import PhotoPackOrganizer from './PhotoPackOrganizer';
import ProductDetailsModal from './ProductDetailsModal'; // <-- IMPORTAMOS EL MODAL
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { Album, Calendar, MugProduct, PhotoPack, BASE_ALBUM, BASE_CALENDAR, BASE_MUG, BASE_PHOTO_PACK } from '../types/products';
import { createDraftOrder, getOrder } from '../../services/orderService';

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>('product');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resumingOrderId, setResumingOrderId] = useState<string | null>(null);

  const [previewProduct, setPreviewProduct] = useState<ProductType | null>(null);

  // EFECTO PARA LLEVAR EL SCROLL SIEMPRE ARRIBA AL CAMBIAR DE PASO
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentStep, previewProduct]);

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

      const orderId = await createDraftOrder(user.uid, designData, activeProduct, (progress) => {
        setUploadProgress(progress);
      }, resumingOrderId || undefined, selectedProduct || undefined);

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

    if (!apiKey) {
      console.warn("La variable VITE_1CLIC_API_KEY no está configurada. El widget de 1Clic no se cargará.");
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
    };
  }, []);

  const restoreDesignToState = (designData: any, product: any, productType: ProductType) => {
    setSelectedProduct(productType);
    setCurrentStep('organize');

    if (productType === 'album') {
      setSelectedAlbum(product);
      setCustomization(designData.customization);
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

  const handleSelectProduct = (product: ProductType) => {
    setSelectedProduct(product);
    if (product === 'album') setSelectedAlbum(BASE_ALBUM);
    if (product === 'calendar') setSelectedCalendar(BASE_CALENDAR);
    if (product === 'mug') setSelectedMug(BASE_MUG);
    if (product === 'photo-pack') setSelectedPhotoPack(BASE_PHOTO_PACK);
    setCurrentStep('customization');
  };

  const handleCustomizationComplete = (options: CustomizationOptions) => {
    setCustomization(options);
    setCurrentStep('organize');
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
      setCustomization(null);
      setCalendarCustomization(null);
      setMugCustomization(null);
      setPhotoPackCustomization(null);
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
          onComplete={() => handleCheckoutRedirect()}
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
              <p className="text-gray-500 text-sm mb-6">
                {user ? t('creator.savingDescUser') : t('creator.savingDescGuest')} 
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

    </div>
  );
}