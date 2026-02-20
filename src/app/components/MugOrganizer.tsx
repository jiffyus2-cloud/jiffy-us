import { useState } from 'react';
import { Upload, X, Plus, Eye, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MugProduct } from './MugStyleSelection';
import type { MugCustomizationOptions } from './MugCustomization';

export interface MugItem {
  id: string;
  photos: string[]; // Changed from single photo to array
  text: string;
  fontSize: number;
  fontFamily: string;
}

interface MugOrganizerProps {
  mug: MugProduct;
  customization: MugCustomizationOptions;
  items: MugItem[];
  onItemsChange: (items: MugItem[]) => void;
}

export default function MugOrganizer({ mug, customization, items, onItemsChange }: MugOrganizerProps) {
  const [editingText, setEditingText] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'mockup'>('edit');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<Record<string, number>>({});

  const addNewItem = () => {
    const newItem: MugItem = {
      id: Date.now().toString(),
      photos: [], // Initialize with empty array
      text: '',
      fontSize: 20,
      fontFamily: 'Arial',
    };
    onItemsChange([...items, newItem]);
  };

  const addPhotoToItem = (id: string, photo: string) => {
    onItemsChange(items.map(item => 
      item.id === id ? { ...item, photos: [...item.photos, photo] } : item
    ));
  };

  const removePhotoFromItem = (id: string, photoIndex: number) => {
    onItemsChange(items.map(item => 
      item.id === id ? { ...item, photos: item.photos.filter((_, i) => i !== photoIndex) } : item
    ));
  };

  const updateItemText = (id: string, updates: Partial<MugItem>) => {
    onItemsChange(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const handlePhotoUpload = (id: string, files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          addPhotoToItem(id, result);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const getCurrentPhotoIndex = (itemId: string) => {
    return currentPhotoIndex[itemId] || 0;
  };

  const setPhotoIndex = (itemId: string, index: number) => {
    setCurrentPhotoIndex({ ...currentPhotoIndex, [itemId]: index });
  };

  const currentItem = items.find(item => item.id === editingText);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl mb-2">Create Your {mug.name}s</h2>
            <p className="text-sm md:text-base text-gray-600">
              {items.length} {mug.type === 'mug' ? 'mug' : 'thermos'}{items.length !== 1 ? 's' : ''} created
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 md:gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded transition-colors ${
                  viewMode === 'edit' 
                    ? 'bg-white shadow-sm' 
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden md:inline">Edit</span>
              </button>
              <button
                onClick={() => setViewMode('mockup')}
                className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded transition-colors ${
                  viewMode === 'mockup' 
                    ? 'bg-white shadow-sm' 
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span className="hidden md:inline">Preview</span>
              </button>
            </div>
            <button
              onClick={addNewItem}
              className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm md:text-base whitespace-nowrap"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Add New</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">No {mug.type === 'mug' ? 'mugs' : 'thermos bottles'} created yet</p>
          <button
            onClick={addNewItem}
            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First {mug.type === 'mug' ? 'Mug' : 'Thermos'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
            {viewMode === 'edit' ? (
              // Edit Mode
              <div className="p-6">
                {/* Photo Upload */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-2">
                    Photos {item.photos.length > 0 && `(${item.photos.length})`}
                  </label>
                  {item.photos.length > 0 ? (
                    <div className="space-y-2">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-50">
                        <img
                          src={item.photos[getCurrentPhotoIndex(item.id)]}
                          alt="Mug design"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removePhotoFromItem(item.id, getCurrentPhotoIndex(item.id))}
                          className="absolute top-2 right-2 bg-black text-white rounded-full p-1.5 hover:bg-gray-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        
                        {/* Navigation buttons */}
                        {item.photos.length > 1 && (
                          <>
                            <button
                              onClick={() => {
                                const newIndex = getCurrentPhotoIndex(item.id) > 0 
                                  ? getCurrentPhotoIndex(item.id) - 1 
                                  : item.photos.length - 1;
                                setPhotoIndex(item.id, newIndex);
                              }}
                              className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white rounded-full p-1.5 hover:bg-opacity-100 transition-all"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                const newIndex = getCurrentPhotoIndex(item.id) < item.photos.length - 1
                                  ? getCurrentPhotoIndex(item.id) + 1
                                  : 0;
                                setPhotoIndex(item.id, newIndex);
                              }}
                              className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white rounded-full p-1.5 hover:bg-opacity-100 transition-all"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            
                            {/* Photo counter */}
                            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                              {getCurrentPhotoIndex(item.id) + 1} / {item.photos.length}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Add more photos button */}
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.multiple = true;
                          input.onchange = (e: any) => {
                            const files = e.target?.files;
                            if (files) handlePhotoUpload(item.id, files);
                          };
                          input.click();
                        }}
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors text-sm text-gray-600 flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add More Photos
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.multiple = true;
                        input.onchange = (e: any) => {
                          const files = e.target?.files;
                          if (files) handlePhotoUpload(item.id, files);
                        };
                        input.click();
                      }}
                      className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">Upload Photos</span>
                      <span className="text-xs text-gray-400">Multiple files supported</span>
                    </button>
                  )}
                </div>

                {/* Text Customization - Click to Edit */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-2">Custom Text</label>
                  <button
                    onClick={() => setEditingText(item.id)}
                    className="w-full p-4 bg-gray-50 rounded border border-gray-200 text-center hover:border-gray-400 transition-colors"
                  >
                    {item.text ? (
                      <div 
                        style={{
                          fontSize: `${Math.min(item.fontSize, 16)}px`,
                          fontFamily: item.fontFamily,
                        }}
                      >
                        {item.text}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">
                        Click to add text
                      </div>
                    )}
                  </button>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="w-full py-2 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                >
                  Remove
                </button>
              </div>
            ) : (
              // Mockup Mode
              <div className="relative">
                <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-8">
                  {/* Mug/Thermos Mockup */}
                  <div className="relative w-full h-full">
                    {mug.type === 'mug' ? (
                      // Mug mockup
                      <div className="w-full h-full relative">
                        {/* Mug shape */}
                        <div className="absolute inset-0 bg-white rounded-b-3xl shadow-2xl" style={{
                          clipPath: 'polygon(10% 0%, 90% 0%, 95% 100%, 5% 100%)'
                        }}>
                          {/* Photo on mug */}
                          {item.photos.length > 0 && (
                            <div className="absolute inset-0 p-8">
                              <img
                                src={item.photos[getCurrentPhotoIndex(item.id)]}
                                alt="Mug design"
                                className="w-full h-full object-cover rounded"
                              />
                            </div>
                          )}
                          
                          {/* Text on mug */}
                          {item.text && (
                            <div 
                              className="absolute inset-0 flex items-center justify-center p-8"
                              style={{
                                fontSize: `${item.fontSize * 0.8}px`,
                                fontFamily: item.fontFamily,
                                color: item.photos.length > 0 ? 'white' : 'black',
                                textShadow: item.photos.length > 0 ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                              }}
                            >
                              {item.text}
                            </div>
                          )}
                        </div>
                        
                        {/* Mug handle */}
                        <div className="absolute right-0 top-1/4 w-8 h-1/2 bg-white rounded-r-full shadow-lg" />
                      </div>
                    ) : (
                      // Thermos mockup
                      <div className="w-full h-full relative flex justify-center">
                        <div className="w-2/3 h-full bg-gradient-to-r from-gray-300 to-gray-100 rounded-t-lg rounded-b-lg shadow-2xl relative overflow-hidden">
                          {/* Cap */}
                          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-gray-400 to-gray-300 rounded-t-lg" />
                          
                          {/* Photo on thermos */}
                          {item.photos.length > 0 && (
                            <div className="absolute top-20 left-0 right-0 bottom-4 p-4">
                              <img
                                src={item.photos[getCurrentPhotoIndex(item.id)]}
                                alt="Thermos design"
                                className="w-full h-full object-cover rounded"
                              />
                            </div>
                          )}
                          
                          {/* Text on thermos */}
                          {item.text && (
                            <div 
                              className="absolute top-20 left-0 right-0 bottom-4 flex items-center justify-center p-4"
                              style={{
                                fontSize: `${item.fontSize * 0.7}px`,
                                fontFamily: item.fontFamily,
                                color: item.photos.length > 0 ? 'white' : 'black',
                                textShadow: item.photos.length > 0 ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none',
                              }}
                            >
                              {item.text}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Quick Actions in Mockup */}
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingText(item.id)}
                      className="flex-1 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    >
                      Edit Text
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="flex-1 py-2 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Compact Text Editor Modal */}
      {editingText && currentItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium">Edit Text</h4>
              <button
                onClick={() => setEditingText(null)}
                className="text-gray-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Text Content */}
              <div>
                <input
                  type="text"
                  value={currentItem.text}
                  onChange={(e) => updateItemText(currentItem.id, { text: e.target.value })}
                  placeholder="Enter your text..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black text-base"
                  autoFocus
                />
              </div>

              {/* Preview */}
              {currentItem.text && (
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                  <div
                    className="text-center"
                    style={{
                      fontSize: `${currentItem.fontSize}px`,
                      fontFamily: currentItem.fontFamily,
                    }}
                  >
                    {currentItem.text}
                  </div>
                </div>
              )}

              {/* Typography Options - Compact */}
              <details className="border border-gray-200 rounded-lg">
                <summary className="px-4 py-2 cursor-pointer text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
                  Typography options
                </summary>
                <div className="p-4 space-y-3 border-t border-gray-200">
                  {/* Font Size */}
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">
                      Size: {currentItem.fontSize}px
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="48"
                      value={currentItem.fontSize}
                      onChange={(e) => updateItemText(currentItem.id, { fontSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Font</label>
                    <select
                      value={currentItem.fontFamily}
                      onChange={(e) => updateItemText(currentItem.id, { fontFamily: e.target.value })}
                      className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:border-black"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Verdana">Verdana</option>
                    </select>
                  </div>
                </div>
              </details>

              <button
                onClick={() => setEditingText(null)}
                className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}