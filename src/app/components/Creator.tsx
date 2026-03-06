import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ChevronLeft, Home, ShoppingBag, Settings, Image as ImageIcon, ShoppingCart } from 'lucide-react';
import ProductSelection, { ProductType } from './ProductSelection';
import AlbumCustomization, { CustomizationOptions } from './AlbumCustomization';
import PhotoOrganizer from './PhotoOrganizer';
import CalendarCustomization, { CalendarCustomizationOptions } from './CalendarCustomization';
import CalendarOrganizer from './CalendarOrganizer';
import MugCustomization, { MugCustomizationOptions } from './MugCustomization';
import MugOrganizer, { MugItem } from './MugOrganizer';
import PhotoPackCustomization, { PhotoPackCustomizationOptions } from './PhotoPackCustomization';
import PhotoPackOrganizer from './PhotoPackOrganizer';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { Album, Calendar, MugProduct, PhotoPack, BASE_ALBUM, BASE_CALENDAR, BASE_MUG, BASE_PHOTO_PACK } from '../types/products';

type Step = 'product' | 'customization' | 'organize' | 'checkout';

export default function Creator() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>('product');

  const handleCheckoutRedirect = (finalData?: { 
    photos?: string[][] | string[], 
    mugItems?: MugItem[], 
    textBoxSlots?: Record<number, Record<number, any>> 
  }) => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }

    const activeProduct = getActiveProduct();
    const activeCustomization = getActiveCustomization();
    
    // Determine which photos to use (passed data or current state)
    let currentPhotosRaw = finalData?.photos || getActivePhotos();
    
    // Normalize photos to string[][] for the backend/checkout
    let photos: string[][] = [];
    if (Array.isArray(currentPhotosRaw)) {
      if (currentPhotosRaw.length > 0 && typeof currentPhotosRaw[0] === 'string') {
        // Flat array (Calendar, PhotoPack) -> convert to nested
        photos = (currentPhotosRaw as string[]).map(p => [p]);
      } else {
        // Already nested or empty
        photos = currentPhotosRaw as string[][];
      }
    }

    let currentMugItems = finalData?.mugItems || (selectedProduct === 'mug' ? mugItems : []);
    let currentTextBoxSlots = finalData?.textBoxSlots || (selectedProduct === 'mug' ? textBoxSlots : {});

    // Prepare coverData for Checkout preview
    let coverData = { image: '', title: '' };
    if (selectedProduct === 'album' && (customization as any)?.coverContent) {
      coverData = {
        image: (customization as any).coverContent.coverImage,
        title: (customization as any).coverContent.coverTitle
      };
    } else if (activeProduct) {
      coverData = {
        image: '', // Default or placeholder
        title: activeProduct.name
      };
    }

    const activePhotoCrops = selectedProduct === 'album' ? photoCrops 
                           : selectedProduct === 'calendar' ? calendarPhotoCrops
                           : selectedProduct === 'photo-pack' ? photoPackPhotoCrops
                           : {};

    const designData = {
      photos,
      pageLayouts,
      pageLayoutVariants,
      textBoxSlots: currentTextBoxSlots,
      customization: activeCustomization,
      coverData,
      photoCrops: activePhotoCrops,
      mugItems: currentMugItems
    };

    navigate('/checkout', { 
      state: { 
        designData,
        product: activeProduct,
        productType: selectedProduct
      } 
    });
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

  const handlePhotosComplete = (uploadedPhotos: string[][]) => {
    setPhotos(uploadedPhotos);
    handleCheckoutRedirect({ photos: uploadedPhotos });
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

  // Progress steps configuration
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

  // Handle direct navigation from modal or state restoration from checkout
  useEffect(() => {
    const state = location.state as any;
    
    // Restoration from checkout
    if (state?.designData && !selectedProduct) {
      const { designData, product, productType } = state;
      
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
        setCalendarPhotos(designData.photos.map((p: string[]) => p[0]));
        setCalendarPhotoCrops(designData.photoCrops || {});
      } else if (productType === 'mug') {
        setSelectedMug(product);
        setMugCustomization(designData.customization);
        setMugItems(designData.mugItems || []);
        setTextBoxSlots(designData.textBoxSlots || {});
      } else if (productType === 'photo-pack') {
        setSelectedPhotoPack(product);
        setPhotoPackCustomization(designData.customization);
        setPhotoPackPhotos(designData.photos.map((p: string[]) => p[0]));
        setPhotoPackPhotoCrops(designData.photoCrops || {});
      }
    } 
    // Handle direct navigation from modal
    else if (state?.startProduct && !selectedProduct) {
      handleSelectProduct(state.startProduct);
    }
  }, [location.state, selectedProduct]);

  // Auto-scroll progress bar
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

  // Render product selection
  const renderProductSelection = () => (
    <ProductSelection 
      onSelectProduct={handleSelectProduct}
    />
  );

  // Render customization based on product
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

  // Render organizer based on product
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
          onComplete={() => handlePhotosComplete(photos)}
        />
      );
    } else if (selectedProduct === 'calendar' && calendarCustomization) {
      return (
        <CalendarOrganizer 
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
      {/* Header with Home Button */}
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

      {/* Progress Bar */}
      {currentStep !== 'product' && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div 
              ref={progressRef}
              className="flex items-center gap-4 overflow-x-auto hide-scrollbar"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {progressSteps.map((step, index) => {
                // Get icon for each step
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

      {/* Back Button */}
      {currentStep !== 'product' && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden md:inline">{t('step.back')}</span>
          </button>
        </div>
      )}

      {/* Step Content */}
      {currentStep === 'product' && renderProductSelection()}
      
      {currentStep === 'customization' && renderCustomization()}
      
      {currentStep === 'organize' && renderOrganizer()}
    </div>
  );
}
