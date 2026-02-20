import { useState, useRef, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import ProductSelection, { ProductType } from './components/ProductSelection';
import AlbumSelection, { Album } from './components/AlbumSelection';
import AlbumCustomization, { CustomizationOptions } from './components/AlbumCustomization';
import PhotoOrganizer from './components/PhotoOrganizer';
import CalendarStyleSelection, { Calendar } from './components/CalendarStyleSelection';
import CalendarCustomization, { CalendarCustomizationOptions } from './components/CalendarCustomization';
import CalendarOrganizer from './components/CalendarOrganizer';
import MugStyleSelection, { MugProduct } from './components/MugStyleSelection';
import MugCustomization, { MugCustomizationOptions } from './components/MugCustomization';
import MugOrganizer, { MugItem } from './components/MugOrganizer';
import Checkout from './components/Checkout';

type Step = 'product' | 'style' | 'customization' | 'organize' | 'checkout';

export default function App() {
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

  const handleNext = () => {
    if (currentStep === 'product' && selectedProduct) {
      setCurrentStep('style');
    } else if (currentStep === 'style' && (selectedAlbum || selectedCalendar || selectedMug)) {
      setCurrentStep('customization');
    } else if (currentStep === 'organize') {
      setCurrentStep('checkout');
    }
  };

  const handleBack = () => {
    if (currentStep === 'style') {
      setCurrentStep('product');
    } else if (currentStep === 'customization') {
      setCurrentStep('style');
    } else if (currentStep === 'organize') {
      setCurrentStep('customization');
    } else if (currentStep === 'checkout') {
      setCurrentStep('organize');
    }
  };

  const handleCheckoutComplete = () => {
    // Reset to start
    setCurrentStep('product');
    setSelectedProduct(null);
    setSelectedAlbum(null);
    setSelectedCalendar(null);
    setSelectedMug(null);
    setCustomization(null);
    setCalendarCustomization(null);
    setMugCustomization(null);
    setPhotos([]);
    setCalendarPhotos([]);
    setMugItems([]);
    setTextBoxSlots({});
  };

  const totalPhotos = photos.reduce((acc, page) => acc + page.length, 0);
  
  // Calculate actual total pages (length of photos array)
  const actualTotalPages = photos.length;
  
  // Count text boxes across all pages
  const totalTextBoxes = Object.values(textBoxSlots).reduce((acc, pageSlots) => {
    return acc + Object.keys(pageSlots).length;
  }, 0);

  const steps = [
    { id: 'product', label: 'Choose Product', number: 1 },
    { id: 'style', label: 'Choose Style', number: 2 },
    { id: 'customization', label: 'Customize', number: 3 },
    { id: 'organize', label: 'Add Photos', number: 4 },
    { id: 'checkout', label: 'Checkout', number: 5 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  // Auto-scroll to current step
  useEffect(() => {
    if (progressRef.current && stepRefs.current[currentStepIndex]) {
      const container = progressRef.current;
      const activeStep = stepRefs.current[currentStepIndex];
      
      if (activeStep) {
        const containerWidth = container.offsetWidth;
        const stepLeft = activeStep.offsetLeft;
        const stepWidth = activeStep.offsetWidth;
        
        // Calculate scroll position to center the active step
        const scrollPosition = stepLeft - (containerWidth / 2) + (stepWidth / 2);
        
        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [currentStepIndex]);

  // Dynamic title based on selected product
  const getAppTitle = () => {
    if (selectedProduct === 'album') return 'Photo Album Creator';
    if (selectedProduct === 'calendar') return 'Photo Calendar Creator';
    if (selectedProduct === 'mug') return 'Photo Mug Creator';
    return 'Product Creator';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with progress */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl">{getAppTitle()}</h1>
            {currentStep !== 'product' && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Back
              </button>
            )}
          </div>

          {/* Progress indicator */}
          <div className="flex justify-center">
            <div className="flex items-center gap-1 md:gap-2 overflow-x-auto pb-2 max-w-full md:max-w-3xl" ref={progressRef}>
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors text-xs md:text-sm ${
                        index <= currentStepIndex
                          ? 'bg-black text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                      ref={el => stepRefs.current[index] = el}
                    >
                      {step.number}
                    </div>
                    <span
                      className={`text-[10px] md:text-xs mt-1 whitespace-nowrap ${
                        index <= currentStepIndex ? 'text-black' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-6 md:w-16 h-0.5 md:h-1 mx-1 md:mx-2 mb-4 md:mb-5 transition-colors ${
                        index < currentStepIndex ? 'bg-black' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>
        {currentStep === 'product' && (
          <ProductSelection
            selectedProduct={selectedProduct}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {currentStep === 'style' && selectedProduct === 'album' && (
          <AlbumSelection
            selectedAlbum={selectedAlbum}
            onSelectAlbum={handleSelectAlbum}
          />
        )}

        {currentStep === 'style' && selectedProduct === 'calendar' && (
          <CalendarStyleSelection
            selectedCalendar={selectedCalendar}
            onSelectCalendar={handleSelectCalendar}
          />
        )}

        {currentStep === 'style' && selectedProduct === 'mug' && (
          <MugStyleSelection
            selectedMug={selectedMug}
            onSelectMug={handleSelectMug}
          />
        )}

        {currentStep === 'customization' && selectedProduct === 'album' && selectedAlbum && (
          <AlbumCustomization
            album={selectedAlbum}
            onCustomizationComplete={handleCustomizationComplete}
          />
        )}

        {currentStep === 'customization' && selectedProduct === 'calendar' && selectedCalendar && (
          <CalendarCustomization
            calendar={selectedCalendar}
            onCustomizationComplete={handleCalendarCustomizationComplete}
          />
        )}

        {currentStep === 'customization' && selectedProduct === 'mug' && selectedMug && (
          <MugCustomization
            product={selectedMug}
            onCustomizationComplete={handleMugCustomizationComplete}
          />
        )}

        {currentStep === 'organize' && selectedProduct === 'album' && selectedAlbum && customization && (
          <PhotoOrganizer
            album={{ ...selectedAlbum, pages: customization.pages }}
            photos={photos}
            onPhotosChange={setPhotos}
            textBoxSlots={textBoxSlots}
            onTextBoxSlotsChange={setTextBoxSlots}
          />
        )}

        {currentStep === 'organize' && selectedProduct === 'calendar' && selectedCalendar && calendarCustomization && (
          <CalendarOrganizer
            calendar={selectedCalendar}
            year={calendarCustomization.year}
            photos={calendarPhotos}
            onPhotosChange={setCalendarPhotos}
          />
        )}

        {currentStep === 'organize' && selectedProduct === 'mug' && selectedMug && mugCustomization && (
          <MugOrganizer
            mug={selectedMug}
            customization={mugCustomization}
            items={mugItems}
            onItemsChange={setMugItems}
          />
        )}

        {currentStep === 'checkout' && selectedProduct === 'album' && selectedAlbum && (
          <Checkout
            product={selectedAlbum}
            productType="album"
            photoCount={totalPhotos}
            textBoxCount={totalTextBoxes}
            totalPages={actualTotalPages > 0 ? actualTotalPages : selectedAlbum.pages}
            customizationDetails={customization}
            onComplete={handleCheckoutComplete}
          />
        )}

        {currentStep === 'checkout' && selectedProduct === 'calendar' && selectedCalendar && (
          <Checkout
            product={selectedCalendar}
            productType="calendar"
            photoCount={calendarPhotos.filter(p => p !== '').length}
            customizationDetails={calendarCustomization}
            onComplete={handleCheckoutComplete}
          />
        )}

        {currentStep === 'checkout' && selectedProduct === 'mug' && selectedMug && (
          <Checkout
            product={selectedMug}
            productType="mug"
            photoCount={mugItems.length}
            itemCount={mugItems.length}
            customizationDetails={mugCustomization}
            onComplete={handleCheckoutComplete}
          />
        )}
      </main>

      {/* Footer navigation */}
      {currentStep !== 'checkout' && (
        <footer className="bg-white border-t border-gray-200 sticky bottom-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex justify-end">
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 'product' && !selectedProduct) ||
                  (currentStep === 'style' && !selectedAlbum && !selectedCalendar && !selectedMug)
                }
                className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-lg"
              >
                {currentStep === 'product' || currentStep === 'style' ? 'Continue' : 'Proceed to Checkout'}
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}