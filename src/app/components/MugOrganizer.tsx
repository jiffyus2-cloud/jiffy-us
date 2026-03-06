import { useState, useRef } from 'react';
import { 
  Upload, X, Plus, Eye, Edit3, 
  Image as ImageIcon, Check, Trash2,
  Type, ALargeSmall
} from 'lucide-react';
import { MugProduct } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import type { MugCustomizationOptions } from './MugCustomization';
import ImageCropper from './ImageCropper';

export interface MugItem {
  id: string;
  photos: string[];
  text: string;
  fontSize: number;
  fontFamily: string;
  photoCrops?: Record<number, { x: number; y: number; zoom: number }>;
}

interface MugOrganizerProps {
  mug: MugProduct;
  customization: MugCustomizationOptions;
  items: MugItem[];
  onItemsChange: (items: MugItem[]) => void;
  onComplete?: () => void;
}

type Step = 'upload' | 'editor';

export default function MugOrganizer({ mug, customization, items, onItemsChange, onComplete }: MugOrganizerProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>(items.length > 0 ? 'editor' : 'upload');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTextSlot, setEditingTextSlot] = useState<{ itemId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeItems = items || [];
  const safeMug = mug || { name: 'Mug', type: 'mug' as const };
  const safeOnItemsChange = typeof onItemsChange === 'function' ? onItemsChange : () => {};

  const handleBatchUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const filesArray = Array.from(files);
    const loadedPhotos: string[] = [];
    let loadedCount = 0;

    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          loadedPhotos.push(result);
          loadedCount++;
          if (loadedCount === filesArray.length) {
            // Create a mug for each photo
            const newMugs: MugItem[] = loadedPhotos.map((photo, idx) => ({
              id: (Date.now() + idx).toString(),
              photos: [photo],
              text: '',
              fontSize: 24,
              fontFamily: 'Arial',
              photoCrops: { 0: { x: 50, y: 50, zoom: 1 } }
            }));
            safeOnItemsChange([...safeItems, ...newMugs]);
            setStep('editor');
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const addNewItem = () => {
    const newItem: MugItem = {
      id: Date.now().toString(),
      photos: [],
      text: '',
      fontSize: 24,
      fontFamily: 'Arial',
      photoCrops: {}
    };
    safeOnItemsChange([...safeItems, newItem]);
    setEditingItemId(newItem.id);
  };

  const removeItem = (id: string) => {
    safeOnItemsChange(safeItems.filter(item => item.id !== id));
  };

  const handleCropChange = (itemId: string, photoIndex: number, crop: { x: number, y: number, zoom: number }) => {
    safeOnItemsChange(safeItems.map(item => 
      item.id === itemId 
        ? { ...item, photoCrops: { ...item.photoCrops, [photoIndex]: crop } }
        : item
    ));
  };

  const updateItemText = (itemId: string, updates: any) => {
    safeOnItemsChange(safeItems.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));
  };

  const currentEditingItem = editingTextSlot ? safeItems.find(i => i.id === editingTextSlot.itemId) : null;

  if (step === 'upload') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-lg mb-4">
            <Upload className="w-10 h-10" />
          </div>
          <h2 className="text-3xl mb-2">{t('organizer.uploadTitle')}</h2>
          <p className="text-gray-600">
            {t('mug.uploadDesc') || 'Upload photos for your custom mugs. Each photo will create a separate mug design.'}
          </p>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-lg p-12">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-4"
          >
            <ImageIcon className="w-16 h-16 text-gray-400" />
            <div className="text-center">
              <p className="text-xl mb-2">{t('organizer.clickToSelect')}</p>
              <p className="text-sm text-gray-500">{t('organizer.selectMultiple')}</p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleBatchUpload}
            className="hidden"
          />

          <div className="mt-8 flex flex-col gap-4">
             <button
              onClick={addNewItem}
              className="w-full py-4 border-2 border-black rounded-lg text-lg font-medium hover:bg-gray-50 transition-all"
            >
              {t('mug.startEmpty') || 'Start with an empty mug'}
            </button>
            {safeItems.length > 0 && (
              <button
                onClick={() => setStep('editor')}
                className="w-full py-4 bg-black text-white rounded-lg text-lg font-medium hover:bg-gray-800 transition-all"
              >
                {t('organizer.continueToPages')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8 sticky top-24 bg-white/95 backdrop-blur-sm z-40 py-4 border-b">
        <div>
          <h2 className="text-2xl font-bold">{safeMug.name} Editor</h2>
          <p className="text-gray-500">{safeItems.length} mugs in your collection</p>
        </div>
        <button
          onClick={onComplete}
          className="px-8 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg font-medium"
        >
          {t('organizer.complete')}
        </button>
      </div>

      <div className="space-y-12">
        {safeItems.map((item, index) => (
          <div key={item.id} className="relative group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">
                Mug #{index + 1}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                    editingItemId === item.id
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-200 hover:border-black'
                  }`}
                >
                  {editingItemId === item.id ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  <span className="text-xs font-bold uppercase tracking-tight">
                    {editingItemId === item.id ? 'Finalizar Edición' : 'Habilitar Edición'}
                  </span>
                </button>
                {editingItemId === item.id && (
                   <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-full border-2 border-red-100 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div 
              className={`bg-white rounded-xl shadow-sm border-2 transition-all overflow-hidden ${
                editingItemId === item.id ? 'border-black ring-4 ring-black/5' : 'border-gray-100'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Visual Section (Clean Editor style) */}
                <div className="aspect-square bg-gray-100 flex items-center justify-center p-12 border-r border-gray-100">
                   <div className="relative w-full h-full bg-white shadow-xl rounded-xl border-4 border-gray-100 overflow-hidden">
                         {/* Design Area */}
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                            {item.photos[0] ? (
                               <div className="w-full h-full relative">
                                  <ImageCropper 
                                    src={item.photos[0]} 
                                    defaultPosition={item.photoCrops?.[0] || { x: 50, y: 50, zoom: 1 }}
                                    defaultZoom={item.photoCrops?.[0]?.zoom || 1}
                                    onCropChange={(newCrop) => handleCropChange(item.id, 0, newCrop)}
                                    isEditable={editingItemId === item.id}
                                  />
                               </div>
                            ) : (
                               <div className="text-gray-300 flex flex-col items-center gap-2">
                                  <ImageIcon className="w-16 h-16" />
                                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Design Area - No Photo</span>
                               </div>
                            )}
                            
                            {item.text && (
                               <div 
                                 className="absolute inset-0 flex items-center justify-center p-10 pointer-events-none"
                                 style={{
                                    fontSize: `${item.fontSize}px`,
                                    fontFamily: item.fontFamily,
                                    color: item.photos[0] ? 'white' : 'black',
                                    textShadow: item.photos[0] ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
                                    textAlign: 'center'
                                 }}
                               >
                                  {item.text}
                               </div>
                            )}
                         </div>
                   </div>
                </div>

                {/* Controls Section */}
                <div className="p-8 flex flex-col justify-center gap-6 bg-gray-50/50">
                   <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Design Controls</h4>
                      <div className="space-y-4">
                         {/* Photo Upload */}
                         <button
                           disabled={editingItemId !== item.id}
                           onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e: any) => {
                                 const file = e.target.files?.[0];
                                 if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                       safeOnItemsChange(safeItems.map(i => 
                                          i.id === item.id ? { ...i, photos: [ev.target?.result as string] } : i
                                       ));
                                    };
                                    reader.readAsDataURL(file);
                                 }
                              };
                              input.click();
                           }}
                           className={`w-full py-4 px-6 border-2 border-dashed rounded-xl flex items-center justify-center gap-3 transition-all ${
                              editingItemId === item.id 
                                ? 'border-black hover:bg-white text-black' 
                                : 'border-gray-200 text-gray-400 opacity-50'
                           }`}
                         >
                            <ImageIcon className="w-5 h-5" />
                            <span className="font-bold uppercase text-xs">{item.photos[0] ? 'Change Photo' : 'Add Photo'}</span>
                         </button>

                         {/* Text Input */}
                         <div className="relative">
                            <button
                              disabled={editingItemId !== item.id}
                              onClick={() => setEditingTextSlot({ itemId: item.id })}
                              className={`w-full py-4 px-6 border-2 rounded-xl flex items-center justify-between transition-all ${
                                 editingItemId === item.id 
                                   ? 'border-gray-200 bg-white hover:border-black text-black' 
                                   : 'border-gray-200 text-gray-400 opacity-50'
                              }`}
                            >
                               <div className="flex items-center gap-3">
                                  <Type className="w-5 h-5" />
                                  <span className="font-bold uppercase text-xs">
                                     {item.text || 'Add Custom Text'}
                                  </span>
                               </div>
                               {item.text && <Check className="w-4 h-4 text-green-500" />}
                            </button>
                            {item.text && editingItemId === item.id && (
                               <button 
                                 onClick={() => updateItemText(item.id, { text: '' })}
                                 className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg"
                               >
                                  <X className="w-3 h-3" />
                               </button>
                            )}
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 text-center pb-20">
        <button
          onClick={addNewItem}
          className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl hover:border-black hover:bg-gray-50 transition-all text-gray-500 hover:text-black"
        >
          <Plus className="w-6 h-6" />
          <span className="text-lg font-medium">Add Another Mug to Design</span>
        </button>
      </div>

      {/* Text Editor Modal (Reused style from Album) */}
      {editingTextSlot && currentEditingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                <h4 className="text-xl font-bold">Edit Mug Text</h4>
              </div>
              <button
                onClick={() => setEditingTextSlot(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Content</label>
                <input
                  type="text"
                  value={currentEditingItem.text}
                  onChange={(e) => updateItemText(currentEditingItem.id, { text: e.target.value })}
                  placeholder="Type your message here..."
                  className="w-full p-4 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black text-lg font-bold"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block flex items-center gap-2">
                    <ALargeSmall className="w-4 h-4" /> Size
                  </label>
                  <select
                    value={currentEditingItem.fontSize}
                    onChange={(e) => updateItemText(currentEditingItem.id, { fontSize: parseInt(e.target.value) })}
                    className="w-full p-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black bg-white font-bold"
                  >
                    {[12, 16, 20, 24, 32, 40, 48].map(size => (
                      <option key={size} value={size}>{size}px</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Font</label>
                  <select
                    value={currentEditingItem.fontFamily}
                    onChange={(e) => updateItemText(currentEditingItem.id, { fontFamily: e.target.value })}
                    className="w-full p-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black bg-white font-bold"
                  >
                    <option value="Arial">Sans Serif</option>
                    <option value="Georgia">Serif</option>
                    <option value="Courier New">Monospace</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setEditingTextSlot(null)}
                className="w-full py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-bold text-lg shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}