import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ChevronLeft, Home, ShoppingBag, Palette, Settings, Image as ImageIcon, ShoppingCart } from 'lucide-react';
import ProductSelection, { ProductType } from './ProductSelection';
import AlbumSelection, { Album } from './AlbumSelection';
import AlbumCustomization, { CustomizationOptions } from './AlbumCustomization';
import PhotoOrganizer from './PhotoOrganizer';
import CalendarStyleSelection, { Calendar } from './CalendarStyleSelection';
import CalendarCustomization, { CalendarCustomizationOptions } from './CalendarCustomization';
import CalendarOrganizer from './CalendarOrganizer';
import MugStyleSelection, { MugProduct } from './MugStyleSelection';
import MugCustomization, { MugCustomizationOptions } from './MugCustomization';
import MugOrganizer, { MugItem } from './MugOrganizer';
import Checkout from './Checkout';

type Step = 'product' | 'style' | 'customization' | 'organize' | 'checkout';

export default function Creator() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState<Step>('product');
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const [selectedMug, setSelectedMug] = useState<MugProduct | null>(null);
  const [customization, setCustomization] = useState<CustomizationOptions | null>(null);
  const [calendarCustomization, setCalendarCustomization] = useState<CalendarCustomizationOptions | null>(null);
  const [mugCustomization, setMugCustomization] = useState<MugCustomizationOptions | null>(null);
  const [photos, setPhotos] = useState<string[][]>([]);
  const [calendarPhotos, setCalendarPhotos] = useState<string[]>([]);
  const [mugItems, setMugItems] = useState<MugItem[]>([]);
  const [textBoxSlots, setTextBoxSlots] = useState<Record<number, Record<number, any>>>({});  
  const progressRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleSelectProduct = (product: ProductType) => {
    setSelectedProduct(product);
  };

  const handleSelectAlbum = (album: Album) => {
    setSelectedAlbum(album);
  };

  const handleSelectCalendar = (calendar: Calendar) => {
    setSelectedCalendar(calendar);
  };

  const handleSelectMug = (mug: MugProduct) => {
    setSelectedMug(mug);
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

  const handlePhotosComplete = (uploadedPhotos: string[][]) => {
    setPhotos(uploadedPhotos);
    setCurrentStep('checkout');
  };

  const handleCalendarPhotosComplete = (uploadedPhotos: string[]) => {
    setCalendarPhotos(uploadedPhotos);
    setCurrentStep('checkout');
  };

  const handleMugItemsComplete = (items: MugItem[], slots: Record<number, Record<number, any>>) => {
    setMugItems(items);
    setTextBoxSlots(slots);
    setCurrentStep('checkout');
  };

  const handleBack = () => {
    if (currentStep === 'style') {
      setCurrentStep('product');
      setSelectedProduct(null);
      setSelectedAlbum(null);
      setSelectedCalendar(null);
      setSelectedMug(null);
    } else if (currentStep === 'customization') {
      setCurrentStep('style');
      if (selectedProduct === 'album') {
        setSelectedAlbum(null);
      } else if (selectedProduct === 'calendar') {
        setSelectedCalendar(null);
      } else if (selectedProduct === 'mug') {
        setSelectedMug(null);
      }
    } else if (currentStep === 'organize') {
      setCurrentStep('customization');
      setCustomization(null);
      setCalendarCustomization(null);
      setMugCustomization(null);
    } else if (currentStep === 'checkout') {
      setCurrentStep('organize');
      setPhotos([]);
      setCalendarPhotos([]);
      setMugItems([]);
    }
  };

  // Progress steps configuration
  const getProgressSteps = () => {
    if (selectedProduct === 'album') {
      return [
        { id: 'product', label: 'Product', active: true },
        { id: 'style', label: 'Style', active: currentStep !== 'product' },
        { id: 'customization', label: 'Customize', active: currentStep === 'customization' || currentStep === 'organize' || currentStep === 'checkout' },
        { id: 'organize', label: 'Photos', active: currentStep === 'organize' || currentStep === 'checkout' },
        { id: 'checkout', label: 'Checkout', active: currentStep === 'checkout' },
      ];
    } else if (selectedProduct === 'calendar') {
      return [
        { id: 'product', label: 'Product', active: true },
        { id: 'style', label: 'Style', active: currentStep !== 'product' },
        { id: 'customization', label: 'Customize', active: currentStep === 'customization' || currentStep === 'organize' || currentStep === 'checkout' },
        { id: 'organize', label: 'Photos', active: currentStep === 'organize' || currentStep === 'checkout' },
        { id: 'checkout', label: 'Checkout', active: currentStep === 'checkout' },
      ];
    } else if (selectedProduct === 'mug') {
      return [
        { id: 'product', label: 'Product', active: true },
        { id: 'style', label: 'Style', active: currentStep !== 'product' },
        { id: 'customization', label: 'Customize', active: currentStep === 'customization' || currentStep === 'organize' || currentStep === 'checkout' },
        { id: 'organize', label: 'Design', active: currentStep === 'organize' || currentStep === 'checkout' },
        { id: 'checkout', label: 'Checkout', active: currentStep === 'checkout' },
      ];
    }
    
    return [
      { id: 'product', label: 'Product', active: true },
    ];
  };

  const progressSteps = getProgressSteps();
  const activeStepIndex = progressSteps.findIndex(step => step.id === currentStep);

  // Handle direct navigation from modal
  useEffect(() => {
    const state = location.state as { startProduct?: ProductType } | null;
    if (state?.startProduct && !selectedProduct) {
      setSelectedProduct(state.startProduct);
      setCurrentStep('style');
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
      selectedProduct={selectedProduct}
      onSelectProduct={handleSelectProduct}
      onContinue={() => setCurrentStep('style')}
    />
  );

  // Render style selection based on product
  const renderStyleSelection = () => {
    if (selectedProduct === 'album') {
      return (
        <AlbumSelection 
          selectedAlbum={selectedAlbum}
          onSelectAlbum={handleSelectAlbum}
        />
      );
    } else if (selectedProduct === 'calendar') {
      return (
        <CalendarStyleSelection 
          selectedCalendar={selectedCalendar}
          onSelectCalendar={handleSelectCalendar}
        />
      );
    } else if (selectedProduct === 'mug') {
      return (
        <MugStyleSelection 
          selectedMug={selectedMug}
          onSelectMug={handleSelectMug}
        />
      );
    }
    return null;
  };

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
          textBoxSlots={textBoxSlots}
          onTextBoxSlotsChange={setTextBoxSlots}
          onComplete={() => setCurrentStep('checkout')}
        />
      );
    } else if (selectedProduct === 'calendar' && calendarCustomization) {
      return (
        <CalendarOrganizer 
          calendar={selectedCalendar!}
          customization={calendarCustomization}
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
          onComplete={() => setCurrentStep('checkout')}
        />
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Home Button */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="hidden md:inline">Home</span>
          </button>
          
          {currentStep !== 'product' && (
            <div className="text-sm text-gray-500">
              Step {activeStepIndex + 1} of {progressSteps.length}
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
                    case 'style': return <Palette className="w-5 h-5" />;
                    case 'customization': return <Settings className="w-5 h-5" />;
                    case 'organize': return <ImageIcon className="w-5 h-5" />;
                    case 'checkout': return <ShoppingCart className="w-5 h-5" />;
                    default: return null;
                  }
                };

                return (
                <div 
                  key={step.id}
                  ref={el => stepRefs.current[index] = el}
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
            <span className="hidden md:inline">Back</span>
          </button>
        </div>
      )}

      {/* Step Content */}
      {currentStep === 'product' && renderProductSelection()}
      
      {currentStep === 'style' && selectedProduct && (
        <>
          {renderStyleSelection()}
          <div className="max-w-6xl mx-auto px-4 pb-12">
            <button
              onClick={() => setCurrentStep('customization')}
              disabled={
                (selectedProduct === 'album' && !selectedAlbum) ||
                (selectedProduct === 'calendar' && !selectedCalendar) ||
                (selectedProduct === 'mug' && !selectedMug)
              }
              className={`w-full py-4 rounded-lg transition-colors text-lg ${
                ((selectedProduct === 'album' && selectedAlbum) || 
                 (selectedProduct === 'calendar' && selectedCalendar) ||
                 (selectedProduct === 'mug' && selectedMug))
                  ? 'bg-black text-white hover:bg-gray-800 cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to Customization
            </button>
          </div>
        </>
      )}
      
      {currentStep === 'customization' && renderCustomization()}
      
      {currentStep === 'organize' && renderOrganizer()}
      
      {currentStep === 'checkout' && (
        <Checkout 
          product={selectedProduct === 'album' ? selectedAlbum! : selectedProduct === 'calendar' ? selectedCalendar! : selectedMug!}
          productType={selectedProduct!}
          customization={selectedProduct === 'album' ? customization! : selectedProduct === 'calendar' ? calendarCustomization! : mugCustomization!}
          photos={selectedProduct === 'album' ? photos : selectedProduct === 'calendar' ? calendarPhotos : []}
          mugItems={selectedProduct === 'mug' ? mugItems : []}
          textBoxSlots={selectedProduct === 'mug' ? textBoxSlots : {}}
        />
      )}
    </div>
  );
}