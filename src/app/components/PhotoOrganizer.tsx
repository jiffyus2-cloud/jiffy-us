import { useState, useRef, useEffect } from 'react';
import { Upload, X, ChevronLeft, ChevronRight, Image as ImageIcon, Sparkles, Grid3x3, Edit3, Layers, Shuffle, Trash2, Type, ArrowLeft, ArrowRight } from 'lucide-react';
import type { Album } from './AlbumSelection';

interface PhotoOrganizerProps {
  album: Album;
  photos: string[][];
  onPhotosChange: (photos: string[][]) => void;
  textBoxSlots: Record<number, Record<number, TextBox>>;
  onTextBoxSlotsChange: (slots: Record<number, Record<number, TextBox>>) => void;
}

type OrganizerMode = 'manual' | 'ai' | null;
type LayoutType = 'orthogonal' | 'fluid';

interface AIConfig {
  maxPhotosPerPage: number;
  layoutType: LayoutType;
  pages: number;
}

interface TextBox {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
}

type PageItem = string | TextBox; // Can be photo URL or text box

export default function PhotoOrganizer({ album, photos, onPhotosChange, textBoxSlots, onTextBoxSlotsChange }: PhotoOrganizerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const [pageTexts, setPageTexts] = useState<Record<number, { content: string; fontSize: number; fontFamily: string; }>>({});
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [editingTextSlot, setEditingTextSlot] = useState<{page: number; slot: number} | null>(null);
  const [mode, setMode] = useState<OrganizerMode>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [manualPages, setManualPages] = useState<number | null>(null);
  const [tempMaxPhotos, setTempMaxPhotos] = useState(4);
  const [tempLayoutType, setTempLayoutType] = useState<LayoutType>('orthogonal');
  const [tempPages, setTempPages] = useState(20);
  const [tempManualPages, setTempManualPages] = useState(20);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageLayouts, setPageLayouts] = useState<Record<number, number>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Check if user is returning with existing photos
  const hasExistingPhotos = photos.flat().length > 0;
  
  // Check if user has existing text boxes
  const hasExistingTextBoxes = Object.keys(textBoxSlots).length > 0;

  // Sync aiConfig pages with photos array length when in AI mode
  // This ensures the UI updates when pages are added/deleted
  useEffect(() => {
    if (mode === 'ai' && aiConfig && photos.length > 0 && aiConfig.pages !== photos.length) {
      setAiConfig({ ...aiConfig, pages: photos.length });
    }
  }, [photos.length, mode, aiConfig]);

  // Sync manualPages with photos array length when in manual mode
  useEffect(() => {
    if (mode === 'manual' && manualPages !== null && photos.length > 0 && manualPages !== photos.length) {
      setManualPages(photos.length);
    }
  }, [photos.length, mode, manualPages]);

  // Always start in edit mode when the main organizer view is displayed
  useEffect(() => {
    if ((mode === 'manual' && manualPages !== null && manualPages > 0) || 
        (mode === 'ai' && photos.flat().length > 0)) {
      setIsEditMode(true);
    }
  }, [mode, manualPages, photos]);

  // If returning with photos, restore state from photos array
  if (hasExistingPhotos && !initialized) {
    // Calculate the actual total number of pages from the photos array length
    const actualTotalPages = photos.length;
    
    // Detect layouts from existing photos AND text boxes
    const detectedLayouts: Record<number, number> = {};
    photos.forEach((page, index) => {
      let maxSlot = (page && page.length > 0) ? page.length - 1 : -1; // Last photo slot (0-indexed)
      
      // Check if there are text boxes in higher slots
      if (textBoxSlots[index]) {
        const textBoxSlotNumbers = Object.keys(textBoxSlots[index]).map(k => parseInt(k));
        if (textBoxSlotNumbers.length > 0) {
          const maxTextBoxSlot = Math.max(...textBoxSlotNumbers);
          maxSlot = Math.max(maxSlot, maxTextBoxSlot);
        }
      }
      
      // Set layout based on highest occupied slot (photo or text box)
      if (maxSlot >= 0) {
        detectedLayouts[index] = maxSlot + 1; // +1 because slots are 0-indexed
      }
    });
    
    // Set the restored state
    setMode('manual');
    setManualPages(actualTotalPages); // Use actual length instead of counting non-empty pages
    setPageLayouts(detectedLayouts);
    setIsEditMode(true); // Start in edit mode when returning
    setInitialized(true);
  }

  // Calculate total pages to use
  const totalPages = aiConfig?.pages || manualPages || album.pages;

  // Mode Selection Screen
  if (mode === null && !hasExistingPhotos) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-3xl mb-2">How would you like to organize your photos?</h2>
          <p className="text-gray-600">
            Choose between manual control or AI-powered organization
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manual Mode Option */}
          <button
            onClick={() => setMode('manual')}
            className="group p-8 border-2 border-gray-300 rounded-lg hover:border-black hover:bg-gray-50 transition-all text-left"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg mb-4 group-hover:bg-black group-hover:text-white transition-colors">
              <Grid3x3 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl mb-2">Manual Organization</h3>
            <p className="text-gray-600 mb-4">
              Complete creative control. Upload and arrange photos page by page, choosing layouts and positions for each page.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-black">•</span>
                <span>Choose layout for each page (1-6 photos)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-black">•</span>
                <span>Upload photos page by page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-black">•</span>
                <span>Full control over placement</span>
              </li>
            </ul>
          </button>

          {/* AI Mode Option */}
          <button
            onClick={() => setMode('ai')}
            className="group p-8 border-2 border-gray-300 rounded-lg hover:border-black hover:bg-gray-50 transition-all text-left"
          >
            <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg mb-4 group-hover:bg-black group-hover:text-white transition-colors">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-2xl mb-2">AI Organization</h3>
            <p className="text-gray-600 mb-4">
              Let AI do the work. Upload all photos at once and let our system automatically distribute them across your {album.pages} pages.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-black"></span>
                <span>Batch upload all photos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-black">•</span>
                <span>AI distributes photos across pages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-black">•</span>
                <span>Edit and adjust before checkout</span>
              </li>
            </ul>
          </button>
        </div>
      </div>
    );
  }

  // Manual Configuration Screen
  if (mode === 'manual' && manualPages === null) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => setMode(null)}
          className="mb-6 text-gray-600 hover:text-black transition-colors flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to mode selection
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-lg mb-4">
            <Grid3x3 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl mb-2">Configure Manual Organization</h2>
          <p className="text-gray-600">
            Set the number of pages for your album
          </p>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-lg p-8">
          <div>
            <h3 className="text-xl mb-4 text-center">Number of Pages</h3>
            <p className="text-gray-600 text-sm mb-6 text-center">
              Set the total number of pages for your album
            </p>
            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              {[10, 20, 30, 40, 50].map((num) => (
                <button
                  key={num}
                  onClick={() => setTempManualPages(num)}
                  className={`py-4 rounded-lg border-2 transition-all ${
                    tempManualPages === num
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-1">{num}</div>
                  <div className="text-xs opacity-75">pages</div>
                </button>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={() => setManualPages(tempManualPages)}
            className="w-full mt-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // AI Configuration Screen
  if (mode === 'ai' && aiConfig === null) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => setMode(null)}
          className="mb-6 text-gray-600 hover:text-black transition-colors flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to mode selection
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-lg mb-4">
            <Sparkles className="w-10 h-10" />
          </div>
          <h2 className="text-3xl mb-2">Configure AI Organization</h2>
          <p className="text-gray-600">
            Customize how AI will organize your photos
          </p>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-lg p-8 space-y-8">
          {/* Number of Pages and Max Photos Per Page - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Number of Pages */}
            <div>
              <h3 className="text-xl mb-4">Number of Pages</h3>
              <p className="text-gray-600 text-sm mb-4">
                Set the total number of pages for your album
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[10, 20, 30, 40, 50].map((num) => (
                  <button
                    key={num}
                    onClick={() => setTempPages(num)}
                    className={`py-3 rounded-lg border-2 transition-all ${
                      tempPages === num
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="text-xl mb-1">{num}</div>
                    <div className="text-xs opacity-75">pages</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Max Photos Per Page */}
            <div>
              <h3 className="text-xl mb-4">Max Photos Per Page</h3>
              <p className="text-gray-600 text-sm mb-4">
                Set the maximum number of photos per page
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setTempMaxPhotos(num)}
                    className={`py-3 rounded-lg border-2 transition-all ${
                      tempMaxPhotos === num
                        ? 'border-black bg-black text-white'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                  >
                    <div className="text-xl mb-1">{num}</div>
                    <div className="text-xs opacity-75">photos</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Photo Capacity Preview */}
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm text-gray-600 mb-1">Maximum Photo Capacity</h4>
                <p className="text-gray-500 text-xs">Based on your configuration</p>
              </div>
              <div className="text-right">
                <div className="text-3xl mb-1">{tempMaxPhotos * tempPages}</div>
                <div className="text-xs text-gray-500">total photos</div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-300">
              <div className="text-xs text-gray-600 mb-2">
                {tempMaxPhotos} photos per page × {tempPages} pages = {tempMaxPhotos * tempPages} photos
              </div>
              <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 p-3 rounded">
                <span className="text-blue-600">ℹ️</span>
                <p>
                  <strong>Note:</strong> If you upload fewer photos than the maximum capacity, 
                  they will be evenly distributed across all {tempPages} pages to create a balanced layout.
                </p>
              </div>
            </div>
          </div>

          {/* Layout Type */}
          <div>
            <h3 className="text-xl mb-4">Predominant Layout Type</h3>
            <p className="text-gray-600 text-sm mb-4">
              Choose the style of photo arrangement
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Orthogonal Layout */}
              <button
                onClick={() => setTempLayoutType('orthogonal')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  tempLayoutType === 'orthogonal'
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className={`flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${
                  tempLayoutType === 'orthogonal' ? 'bg-white text-black' : 'bg-gray-100'
                }`}>
                  <Layers className="w-6 h-6" />
                </div>
                <h4 className="text-lg mb-2">Orthogonal</h4>
                <p className={`text-sm ${
                  tempLayoutType === 'orthogonal' ? 'text-gray-200' : 'text-gray-600'
                }`}>
                  Clean grid-based layouts with aligned photos. Perfect for a structured, organized look.
                </p>
              </button>

              {/* Fluid Layout */}
              <button
                onClick={() => setTempLayoutType('fluid')}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  tempLayoutType === 'fluid'
                    ? 'border-black bg-black text-white'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <div className={`flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${
                  tempLayoutType === 'fluid' ? 'bg-white text-black' : 'bg-gray-100'
                }`}>
                  <Shuffle className="w-6 h-6" />
                </div>
                <h4 className="text-lg mb-2">Fluid</h4>
                <p className={`text-sm ${
                  tempLayoutType === 'fluid' ? 'text-gray-200' : 'text-gray-600'
                }`}>
                  Dynamic layouts with diagonal cuts and asymmetric structures for a creative, modern feel.
                </p>
              </button>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={() => setAiConfig({ maxPhotosPerPage: tempMaxPhotos, layoutType: tempLayoutType, pages: tempPages })}
            className="w-full py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg"
          >
            Continue to Upload
          </button>
        </div>
      </div>
    );
  }

  // AI Mode - Batch Upload Screen (after configuration)
  if (mode === 'ai' && photos.flat().length === 0 && aiConfig) {
    const handleBatchUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;

      const filesArray = Array.from(files);
      const allPhotos: string[] = [];

      filesArray.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            allPhotos.push(result);
            
            // When all photos are loaded, distribute them
            if (allPhotos.length === filesArray.length) {
              distributePhotosAcrossPages(allPhotos);
            }
          }
        };
        reader.readAsDataURL(file);
      });
    };

    const distributePhotosAcrossPages = (allPhotos: string[]) => {
      const newPhotos: string[][] = [];
      const newLayouts: Record<number, number> = {};
      
      const { maxPhotosPerPage, layoutType, pages } = aiConfig;
      
      // Calculate how to distribute photos across all pages
      const totalPhotos = allPhotos.length;
      const photosPerPage = Math.ceil(totalPhotos / pages);
      const actualPhotosPerPage = Math.min(photosPerPage, maxPhotosPerPage);
      
      let photoIndex = 0;
      
      if (layoutType === 'orthogonal') {
        // Orthogonal: Evenly distribute photos across all pages
        for (let page = 0; page < pages; page++) {
          const pagePhotos: string[] = [];
          const remainingPhotos = totalPhotos - photoIndex;
          const remainingPages = pages - page;
          
          // Calculate photos for this page to ensure even distribution
          const photosForThisPage = Math.min(
            actualPhotosPerPage,
            Math.ceil(remainingPhotos / remainingPages)
          );
          
          for (let i = 0; i < photosForThisPage; i++) {
            if (photoIndex < totalPhotos) {
              pagePhotos.push(allPhotos[photoIndex]);
              photoIndex++;
            }
          }
          
          if (pagePhotos.length > 0) {
            newPhotos[page] = pagePhotos;
            newLayouts[page] = pagePhotos.length;
          }
        }
      } else {
        // Fluid: Varied layouts with asymmetric structures, but still distributed
        const layoutVariations = [1, 2, 3, actualPhotosPerPage, Math.min(5, actualPhotosPerPage), Math.min(6, actualPhotosPerPage)];
        let layoutIndex = 0;
        
        for (let page = 0; page < pages; page++) {
          const pagePhotos: string[] = [];
          const remainingPhotos = totalPhotos - photoIndex;
          const remainingPages = pages - page;
          
          // Use varied layout but ensure distribution
          const maxForThisPage = layoutVariations[layoutIndex % layoutVariations.length];
          const photosForThisPage = Math.min(
            maxForThisPage,
            Math.ceil(remainingPhotos / remainingPages)
          );
          
          for (let i = 0; i < photosForThisPage; i++) {
            if (photoIndex < totalPhotos) {
              pagePhotos.push(allPhotos[photoIndex]);
              photoIndex++;
            }
          }
          
          if (pagePhotos.length > 0) {
            newPhotos[page] = pagePhotos;
            newLayouts[page] = pagePhotos.length;
            layoutIndex++;
          }
        }
      }
      
      setPageLayouts(newLayouts);
      onPhotosChange(newPhotos);
      setIsEditMode(true);
    };

    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <button
          onClick={() => setAiConfig(null)}
          className="mb-6 text-gray-600 hover:text-black transition-colors flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to configuration
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-lg mb-4">
            <Sparkles className="w-10 h-10" />
          </div>
          <h2 className="text-3xl mb-2">Upload Your Photos</h2>
          <p className="text-gray-600">
            Upload all your photos and AI will organize them across {album.pages} pages
          </p>
          <div className="mt-4 inline-flex items-center gap-4 text-sm text-gray-600">
            <span className="px-3 py-1 bg-gray-100 rounded-full">
              Max {aiConfig.maxPhotosPerPage} photos per page
            </span>
            <span className="px-3 py-1 bg-gray-100 rounded-full">
              {aiConfig.layoutType === 'orthogonal' ? 'Orthogonal' : 'Fluid'} layout
            </span>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-lg p-12">
          <button
            onClick={() => batchFileInputRef.current?.click()}
            className="w-full py-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-4"
          >
            <Upload className="w-16 h-16 text-gray-400" />
            <div className="text-center">
              <p className="text-xl mb-2">Click to upload your photos</p>
              <p className="text-sm text-gray-500">
                Select all photos at once (recommended: {album.pages * 2}-{album.pages * aiConfig.maxPhotosPerPage} photos)
              </p>
            </div>
          </button>
          <input
            ref={batchFileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleBatchUpload}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  // Shared functions for both modes
  const getCurrentLayout = () => pageLayouts[currentPage] || 4;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const currentLayout = getCurrentLayout();
    const newPhotos = [...photos];
    
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          if (!newPhotos[currentPage]) {
            newPhotos[currentPage] = [];
          }
          if (newPhotos[currentPage].length < currentLayout) {
            newPhotos[currentPage] = [...newPhotos[currentPage], result];
            onPhotosChange(newPhotos);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLayoutChange = (layout: number) => {
    setPageLayouts({
      ...pageLayouts,
      [currentPage]: layout,
    });
    
    if (photos[currentPage] && photos[currentPage].length > layout) {
      const newPhotos = [...photos];
      newPhotos[currentPage] = newPhotos[currentPage].slice(0, layout);
      onPhotosChange(newPhotos);
    }
  };

  const getGridClass = (layout: number) => {
    switch (layout) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-3';
      case 4:
        return 'grid-cols-2';
      case 5:
        return 'grid-cols-3';
      case 6:
        return 'grid-cols-3';
      default:
        return 'grid-cols-2';
    }
  };

  const removePhoto = (pageIndex: number, photoIndex: number) => {
    const newPhotos = [...photos];
    newPhotos[pageIndex] = newPhotos[pageIndex].filter((_, i) => i !== photoIndex);
    onPhotosChange(newPhotos);
  };

  const deletePage = () => {
    if (totalPages <= 1) return; // Don't delete if it's the last page
    
    const newPhotos = [...photos];
    newPhotos.splice(currentPage, 1); // Remove the current page
    
    // Remove layout for deleted page and shift remaining layouts
    const newLayouts: Record<number, number> = {};
    Object.keys(pageLayouts).forEach((key) => {
      const pageIndex = parseInt(key);
      if (pageIndex < currentPage) {
        newLayouts[pageIndex] = pageLayouts[pageIndex];
      } else if (pageIndex > currentPage) {
        newLayouts[pageIndex - 1] = pageLayouts[pageIndex];
      }
    });
    setPageLayouts(newLayouts);
    
    // Move to previous page if we deleted the last page
    if (currentPage >= newPhotos.length && currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
    
    // Update photos array first
    onPhotosChange(newPhotos);
    
    // Then update page count
    if (mode === 'ai' && aiConfig) {
      setAiConfig({ ...aiConfig, pages: newPhotos.length });
    } else if (mode === 'manual' && manualPages) {
      setManualPages(newPhotos.length);
    }
  };

  const addPage = () => {
    // Add an empty page to the photos array
    const newPhotos = [...photos, []];
    onPhotosChange(newPhotos);
    
    // Update page count
    if (mode === 'ai' && aiConfig) {
      setAiConfig({ ...aiConfig, pages: newPhotos.length });
    } else if (mode === 'manual' && manualPages) {
      setManualPages(newPhotos.length);
    }
  };

  // Function to swap slots
  const swapSlots = (fromIndex: number, toIndex: number) => {
    const currentLayout = getCurrentLayout();
    
    // Swap photos
    const newPhotos = [...photos];
    if (!newPhotos[currentPage]) {
      newPhotos[currentPage] = [];
    }
    
    const tempPhoto = newPhotos[currentPage][fromIndex];
    newPhotos[currentPage][fromIndex] = newPhotos[currentPage][toIndex];
    newPhotos[currentPage][toIndex] = tempPhoto;
    
    onPhotosChange(newPhotos);
    
    // Swap text boxes if they exist
    const newSlots = { ...textBoxSlots };
    if (newSlots[currentPage]) {
      const tempText = newSlots[currentPage][fromIndex];
      const targetText = newSlots[currentPage][toIndex];
      
      // Clear both slots first
      if (newSlots[currentPage][fromIndex]) {
        delete newSlots[currentPage][fromIndex];
      }
      if (newSlots[currentPage][toIndex]) {
        delete newSlots[currentPage][toIndex];
      }
      
      // Swap if they existed
      if (tempText) {
        newSlots[currentPage][toIndex] = tempText;
      }
      if (targetText) {
        newSlots[currentPage][fromIndex] = targetText;
      }
      
      onTextBoxSlotsChange(newSlots);
    }
  };

  const totalPhotos = photos.reduce((acc, page) => acc + page.length, 0);

  const completedPages = Array.from({ length: totalPages }).filter((_, index) => {
    const pageLayout = pageLayouts[index] || 4;
    const pagePhotos = photos[index] || [];
    return pagePhotos.length === pageLayout;
  }).length;

  const progressPercentage = (completedPages / totalPages) * 100;

  // Main Organizer View (for both Manual and AI modes after upload)
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl mb-2">
              {isEditMode ? 'Edit Your Album' : 'Preview Your Album'}
            </h2>
            <p className="text-gray-600">
              {album.name} - {totalPages} pages available • {totalPhotos} photos uploaded • {completedPages} of {totalPages} pages completed
            </p>
          </div>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
              isEditMode 
                ? 'border-black bg-black text-white' 
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>{isEditMode ? 'Preview Mode' : 'Edit Mode'}</span>
          </button>
        </div>
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Album Progress</span>
            <span className="text-sm">{Math.round(progressPercentage)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main photo organizer */}
        <div className="lg:col-span-2">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl">
                Page {currentPage + 1} of {totalPages}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                {isEditMode && totalPages > 1 && (
                  <button
                    onClick={deletePage}
                    className="p-2 border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors ml-2"
                    title="Delete current page"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Layout selector (only visible in edit mode) */}
            {isEditMode && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-3">Photos per page:</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6].map((layout) => (
                    <button
                      key={layout}
                      onClick={() => handleLayoutChange(layout)}
                      className={`px-4 py-2 rounded border-2 transition-all ${
                        getCurrentLayout() === layout
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      {layout}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Photo grid for current page */}
            <div className={`grid ${getGridClass(getCurrentLayout())} gap-4 mb-6`}>
              {Array.from({ length: getCurrentLayout() }).map((_, index) => {
                const photo = photos[currentPage]?.[index];
                const textBox = textBoxSlots[currentPage]?.[index];
                const hasContent = photo || textBox;
                
                return (
                  <div
                    key={index}
                    className="aspect-square border-2 border-dashed border-gray-300 rounded-lg overflow-hidden relative bg-gray-50"
                  >
                    {/* Show text box if exists */}
                    {textBox ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 relative bg-white">
                        <div
                          className="text-center overflow-auto max-h-full"
                          style={{
                            fontSize: `${textBox.fontSize}px`,
                            fontFamily: textBox.fontFamily,
                          }}
                        >
                          {textBox.content}
                        </div>
                        {isEditMode && (
                          <>
                            <div className="absolute top-2 right-2 flex gap-1">
                              <button
                                onClick={() => setEditingTextSlot({ page: currentPage, slot: index })}
                                className="bg-blue-600 text-white rounded-full p-1 hover:bg-blue-700"
                                title="Edit text"
                              >
                                <Type className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  const newSlots = { ...textBoxSlots };
                                  if (newSlots[currentPage]) {
                                    delete newSlots[currentPage][index];
                                    if (Object.keys(newSlots[currentPage]).length === 0) {
                                      delete newSlots[currentPage];
                                    }
                                  }
                                  onTextBoxSlotsChange(newSlots);
                                }}
                                className="bg-black text-white rounded-full p-1 hover:bg-gray-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            {/* Reorder buttons */}
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                              {index > 0 && (
                                <button
                                  onClick={() => swapSlots(index, index - 1)}
                                  className="bg-gray-800 text-white rounded-full p-1 hover:bg-gray-700"
                                  title="Move left"
                                >
                                  <ArrowLeft className="w-4 h-4" />
                                </button>
                              )}
                              {index < getCurrentLayout() - 1 && (
                                <button
                                  onClick={() => swapSlots(index, index + 1)}
                                  className="bg-gray-800 text-white rounded-full p-1 hover:bg-gray-700"
                                  title="Move right"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ) : photo ? (
                      /* Show photo if exists */
                      <>
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {isEditMode && (
                          <>
                            <button
                              onClick={() => removePhoto(currentPage, index)}
                              className="absolute top-2 right-2 bg-black text-white rounded-full p-1 hover:bg-gray-800"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            {/* Reorder buttons */}
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                              {index > 0 && (
                                <button
                                  onClick={() => swapSlots(index, index - 1)}
                                  className="bg-gray-800 text-white rounded-full p-1 hover:bg-gray-700"
                                  title="Move left"
                                >
                                  <ArrowLeft className="w-4 h-4" />
                                </button>
                              )}
                              {index < getCurrentLayout() - 1 && (
                                <button
                                  onClick={() => swapSlots(index, index + 1)}
                                  className="bg-gray-800 text-white rounded-full p-1 hover:bg-gray-700"
                                  title="Move right"
                                >
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      /* Empty slot - show options to add photo or text */
                      isEditMode ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
                          <button
                            onClick={() => {
                              // Trigger file upload for this specific slot
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e: any) => {
                                const file = e.target?.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const result = event.target?.result as string;
                                    if (result) {
                                      const newPhotos = [...photos];
                                      if (!newPhotos[currentPage]) {
                                        newPhotos[currentPage] = [];
                                      }
                                      newPhotos[currentPage][index] = result;
                                      onPhotosChange(newPhotos);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              };
                              input.click();
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                          >
                            <ImageIcon className="w-5 h-5" />
                            <span className="text-sm hidden md:inline">Add Photo</span>
                          </button>
                          <button
                            onClick={() => setEditingTextSlot({ page: currentPage, slot: index })}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                          >
                            <Type className="w-5 h-5" />
                            <span className="text-sm hidden md:inline">Add Text</span>
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-gray-300" />
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>

            {/* Text Editor Modal */}
            {editingTextSlot && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl">Configure Text Box</h4>
                    <button
                      onClick={() => setEditingTextSlot(null)}
                      className="text-gray-500 hover:text-black"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Text Content */}
                  <div className="mb-4">
                    <label className="block text-sm mb-2">Text Content</label>
                    <textarea
                      value={textBoxSlots[editingTextSlot.page]?.[editingTextSlot.slot]?.content || ''}
                      onChange={(e) => {
                        const newSlots = { ...textBoxSlots };
                        if (!newSlots[editingTextSlot.page]) {
                          newSlots[editingTextSlot.page] = {};
                        }
                        newSlots[editingTextSlot.page][editingTextSlot.slot] = {
                          type: 'text',
                          content: e.target.value,
                          fontSize: newSlots[editingTextSlot.page][editingTextSlot.slot]?.fontSize || 16,
                          fontFamily: newSlots[editingTextSlot.page][editingTextSlot.slot]?.fontFamily || 'Arial',
                        };
                        onTextBoxSlotsChange(newSlots);
                      }}
                      placeholder="Enter your text here..."
                      className="w-full p-3 border-2 border-gray-300 rounded-lg resize-none focus:outline-none focus:border-black"
                      rows={6}
                    />
                  </div>

                  {/* Font Size */}
                  <div className="mb-4">
                    <label className="block text-sm mb-2">
                      Font Size: {textBoxSlots[editingTextSlot.page]?.[editingTextSlot.slot]?.fontSize || 16}px
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="48"
                      value={textBoxSlots[editingTextSlot.page]?.[editingTextSlot.slot]?.fontSize || 16}
                      onChange={(e) => {
                        const newSlots = { ...textBoxSlots };
                        if (!newSlots[editingTextSlot.page]) {
                          newSlots[editingTextSlot.page] = {};
                        }
                        newSlots[editingTextSlot.page][editingTextSlot.slot] = {
                          type: 'text',
                          content: newSlots[editingTextSlot.page][editingTextSlot.slot]?.content || '',
                          fontSize: parseInt(e.target.value),
                          fontFamily: newSlots[editingTextSlot.page][editingTextSlot.slot]?.fontFamily || 'Arial',
                        };
                        onTextBoxSlotsChange(newSlots);
                      }}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>12px</span>
                      <span>48px</span>
                    </div>
                  </div>

                  {/* Font Family */}
                  <div className="mb-4">
                    <label className="block text-sm mb-2">Font Family</label>
                    <select
                      value={textBoxSlots[editingTextSlot.page]?.[editingTextSlot.slot]?.fontFamily || 'Arial'}
                      onChange={(e) => {
                        const newSlots = { ...textBoxSlots };
                        if (!newSlots[editingTextSlot.page]) {
                          newSlots[editingTextSlot.page] = {};
                        }
                        newSlots[editingTextSlot.page][editingTextSlot.slot] = {
                          type: 'text',
                          content: newSlots[editingTextSlot.page][editingTextSlot.slot]?.content || '',
                          fontSize: newSlots[editingTextSlot.page][editingTextSlot.slot]?.fontSize || 16,
                          fontFamily: e.target.value,
                        };
                        onTextBoxSlotsChange(newSlots);
                      }}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Palatino">Palatino</option>
                      <option value="Garamond">Garamond</option>
                    </select>
                  </div>

                  {/* Preview */}
                  {textBoxSlots[editingTextSlot.page]?.[editingTextSlot.slot]?.content && (
                    <div className="mb-4 pt-4 border-t border-gray-300">
                      <label className="block text-sm mb-2">Preview</label>
                      <div
                        className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg min-h-[100px] flex items-center justify-center"
                        style={{
                          fontSize: `${textBoxSlots[editingTextSlot.page][editingTextSlot.slot].fontSize}px`,
                          fontFamily: textBoxSlots[editingTextSlot.page][editingTextSlot.slot].fontFamily,
                        }}
                      >
                        {textBoxSlots[editingTextSlot.page][editingTextSlot.slot].content}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setEditingTextSlot(null)}
                    className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Upload button removed - now each slot has its own add buttons */}
            {isEditMode && (
              <div className="text-center text-sm text-gray-500 mt-4">
                Click on any empty slot above to add a photo or text box
              </div>
            )}
          </div>
        </div>

        {/* Page thumbnails sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg">All Pages</h3>
              {isEditMode && (
                <button
                  onClick={addPage}
                  className="px-3 py-1 text-sm bg-black text-white rounded hover:bg-gray-800 transition-colors"
                >
                  + Add Page
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {Array.from({ length: totalPages }).map((_, index) => {
                const pagePhotos = photos[index] || [];
                const pageLayout = pageLayouts[index] || 4;
                const photoCount = pagePhotos.length;
                
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index)}
                    className={`w-full p-3 rounded border-2 transition-all text-left ${
                      currentPage === index
                        ? 'border-black bg-white'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Page {index + 1}</span>
                      <span className="text-xs text-gray-500">{photoCount}/{pageLayout}</span>
                    </div>
                    <div className={`grid ${getGridClass(pageLayout)} gap-1`}>
                      {Array.from({ length: pageLayout }).map((_, photoIndex) => (
                        <div
                          key={photoIndex}
                          className="aspect-square bg-gray-200 rounded overflow-hidden"
                        >
                          {pagePhotos[photoIndex] && (
                            <img
                              src={pagePhotos[photoIndex]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}