import { useState, useRef } from 'react';
import { 
  Upload, X, Plus, Eye, Edit3, 
  Image as ImageIcon, Check, Trash2,
  Type, ALargeSmall, Loader2, Crop as CropIcon
} from 'lucide-react';
import { MugProduct } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import type { MugCustomizationOptions } from './MugCustomization';
import ImageCropper from './ImageCropper';
import CropModal from './CropModal';

export interface MugItem {
  id: string;
  photos: string[];
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight?: number; 
  designStyle?: 'separate' | 'text-cutout';
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
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTextSlot, setEditingTextSlot] = useState<{ itemId: string } | null>(null);
  const [cropModalData, setCropModalData] = useState<{ itemId: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeItems = items || [];
  const safeMug = mug || { name: 'Mug', type: 'mug' as const };
  const safeOnItemsChange = typeof onItemsChange === 'function' ? onItemsChange : () => {};

  const handleBatchUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    await new Promise(resolve => setTimeout(resolve, 50));

    const filesArray = Array.from(files);
    
    const newMugs: MugItem[] = filesArray.map((file, idx) => ({
      id: (Date.now() + idx).toString(),
      photos: [URL.createObjectURL(file)],
      text: '',
      fontSize: 48,
      fontFamily: 'Arial',
      fontWeight: 400, 
      designStyle: 'separate',
      photoCrops: { 0: { x: 50, y: 50, zoom: 1 } }
    }));

    safeOnItemsChange([...safeItems, ...newMugs]);
    setStep('editor');
    setIsProcessingFiles(false);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addNewItem = () => {
    const newItem: MugItem = {
      id: Date.now().toString(),
      photos: [], text: '', fontSize: 48, fontFamily: 'Arial', fontWeight: 400, 
      designStyle: 'separate', photoCrops: {}
    };
    safeOnItemsChange([...safeItems, newItem]);
    setEditingItemId(newItem.id);
  };

  const removeItem = (id: string) => {
    safeOnItemsChange(safeItems.filter(item => item.id !== id));
  };

  const handleCropChange = (itemId: string, photoIndex: number, crop: { x: number, y: number, zoom: number }) => {
    safeOnItemsChange(safeItems.map(item => 
      item.id === itemId ? { ...item, photoCrops: { ...item.photoCrops, [photoIndex]: crop } } : item
    ));
  };

  const updateItemText = (itemId: string, updates: any) => {
    safeOnItemsChange(safeItems.map(item => item.id === itemId ? { ...item, ...updates } : item));
  };

  const currentEditingItem = editingTextSlot ? safeItems.find(i => i.id === editingTextSlot.itemId) : null;

  if (step === 'upload') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-lg mb-4"><Upload className="w-10 h-10" /></div>
          <h2 className="text-3xl mb-2">{t('organizer.uploadTitle') || 'Sube tus fotos'}</h2>
          <p className="text-gray-600">{t('mug.uploadDesc') || 'Sube las fotos para tus tazas. Cada foto creará un diseño independiente.'}</p>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-lg p-12">
          {isProcessingFiles ? (
             <div className="w-full py-16 flex flex-col items-center justify-center gap-4">
               <Loader2 className="w-16 h-16 text-gray-400 animate-spin" /><p className="text-xl font-bold">Procesando imágenes...</p><p className="text-sm text-gray-500">Optimizando las fotos para tu diseño...</p>
             </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-16 border-2 border-dashed border-gray-300 rounded-lg hover:border-black hover:bg-gray-50 transition-all flex flex-col items-center justify-center gap-4">
              <ImageIcon className="w-16 h-16 text-gray-400" />
              <div className="text-center"><p className="text-xl mb-2">{t('organizer.clickToSelect') || 'Haz clic para seleccionar'}</p><p className="text-sm text-gray-500">{t('organizer.selectMultiple') || 'Puedes seleccionar múltiples archivos'}</p></div>
            </button>
          )}
          
          <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleBatchUpload} className="hidden" disabled={isProcessingFiles} />

          <div className="mt-8 flex flex-col gap-4">
             <button onClick={addNewItem} disabled={isProcessingFiles} className="w-full py-4 border-2 border-black rounded-lg text-lg font-medium hover:bg-gray-50 transition-all disabled:opacity-50">{t('mug.startEmpty') || 'Comenzar con una taza en blanco'}</button>
            {safeItems.length > 0 && (
              <button onClick={() => setStep('editor')} disabled={isProcessingFiles} className="w-full py-4 bg-black text-white rounded-lg text-lg font-medium hover:bg-gray-800 transition-all disabled:opacity-50">{t('organizer.continueToPages') || 'Continuar al diseño'}</button>
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
          <h2 className="text-2xl font-bold">{safeMug.name} Editor</h2><p className="text-gray-500">{safeItems.length} tazas en tu colección</p>
        </div>
        <button onClick={onComplete} className="px-8 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg font-medium">{t('organizer.complete') || 'Continuar al Checkout'}</button>
      </div>

      <div className="space-y-12">
        {safeItems.map((item, index) => (
          <div key={item.id} className="relative group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Taza #{index + 1}</span>
              <div className="flex gap-2">
                <button onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)} className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${editingItemId === item.id ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-200 hover:border-black'}`}>
                  {editingItemId === item.id ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}<span className="text-xs font-bold uppercase tracking-tight">{editingItemId === item.id ? 'Finalizar Edición' : 'Habilitar Edición'}</span>
                </button>
                {editingItemId === item.id && (<button onClick={() => removeItem(item.id)} className="p-2 bg-red-50 text-red-600 rounded-full border-2 border-red-100 hover:bg-red-100 transition-colors"><Trash2 className="w-5 h-5" /></button>)}
              </div>
            </div>

            <div className={`bg-white rounded-xl shadow-sm border-2 transition-all overflow-hidden ${editingItemId === item.id ? 'border-black ring-4 ring-black/5' : 'border-gray-100'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="aspect-square bg-gray-100 flex items-center justify-center p-12 border-r border-gray-100">
                   <div className="relative w-full h-full bg-white shadow-xl rounded-xl border-4 border-gray-100 overflow-hidden">
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                            {item.photos[0] ? (
                               <div className="w-full h-full relative">
                                  <ImageCropper src={item.photos[0]} position={item.photoCrops?.[0] || { x: 50, y: 50, zoom: 1 }} />
                               </div>
                            ) : (
                               <div className="text-gray-300 flex flex-col items-center gap-2"><ImageIcon className="w-16 h-16" /><span className="text-xs font-bold uppercase tracking-widest text-gray-400">Área de Diseño</span></div>
                            )}
                            
                            {item.designStyle === 'text-cutout' ? (
                               <div className="absolute inset-0 bg-white pointer-events-none mix-blend-screen flex items-center justify-center p-6 z-10">
                                  <div style={{ fontSize: `${item.fontSize}px`, fontFamily: item.fontFamily, fontWeight: item.fontWeight || 400, color: 'black', textAlign: 'center', lineHeight: 1.1, wordBreak: 'break-word', width: '100%' }}>{item.text || (editingItemId === item.id ? 'ESCRIBE AQUÍ' : '')}</div>
                               </div>
                            ) : (
                               item.text && (
                                  <div className="absolute inset-0 flex items-center justify-center p-10 pointer-events-none z-10" style={{ fontSize: `${item.fontSize}px`, fontFamily: item.fontFamily, fontWeight: item.fontWeight || 400, color: item.photos[0] ? 'white' : 'black', textShadow: item.photos[0] ? '0 2px 8px rgba(0,0,0,0.6)' : 'none', textAlign: 'center', lineHeight: 1.1, wordBreak: 'break-word', width: '100%' }}>{item.text}</div>
                               )
                            )}
                         </div>
                   </div>
                </div>

                <div className="p-8 flex flex-col justify-center gap-6 bg-gray-50/50">
                   <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Configuración de Taza</h4>
                      <div className="space-y-6">
                         <div>
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Estilo Visual</label>
                           <div className="flex gap-2">
                             <button disabled={editingItemId !== item.id} onClick={() => updateItemText(item.id, { designStyle: 'separate' })} className={`flex-1 py-3 px-2 rounded-xl border-2 text-[10px] font-bold uppercase transition-all ${item.designStyle !== 'text-cutout' ? 'border-black bg-black text-white shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-black'} ${editingItemId !== item.id ? 'opacity-50 cursor-not-allowed' : ''}`}>Imagen y Texto</button>
                             <button disabled={editingItemId !== item.id} onClick={() => updateItemText(item.id, { designStyle: 'text-cutout' })} className={`flex-1 py-3 px-2 rounded-xl border-2 text-[10px] font-bold uppercase transition-all ${item.designStyle === 'text-cutout' ? 'border-black bg-black text-white shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-black'} ${editingItemId !== item.id ? 'opacity-50 cursor-not-allowed' : ''}`}>Texto con Foto</button>
                           </div>
                         </div>

                         <div className="flex gap-2">
                           <button disabled={editingItemId !== item.id || !item.photos[0]} onClick={() => setCropModalData({ itemId: item.id })} className={`flex-[1] py-4 border-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${editingItemId === item.id && item.photos[0] ? 'border-gray-200 bg-white hover:border-black text-black shadow-sm' : 'border-gray-200 text-gray-400 opacity-50 cursor-not-allowed'}`}><CropIcon className="w-4 h-4" /><span className="font-bold uppercase text-[9px]">Ajustar</span></button>
                           <button
                             disabled={editingItemId !== item.id}
                             onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.onchange = (e: any) => { const file = e.target.files?.[0]; if (file) { safeOnItemsChange(safeItems.map(i => i.id === item.id ? { ...i, photos: [URL.createObjectURL(file)] } : i)); } }; input.click(); }}
                             className={`flex-[3] py-4 px-6 border-2 border-dashed rounded-xl flex items-center justify-center gap-3 transition-all ${editingItemId === item.id ? 'border-black hover:bg-white text-black' : 'border-gray-200 text-gray-400 opacity-50'}`}
                           >
                              <ImageIcon className="w-5 h-5" /><span className="font-bold uppercase text-xs">{item.photos[0] ? 'Cambiar Foto' : 'Añadir Foto'}</span>
                           </button>
                         </div>

                         <div className="relative">
                            <button disabled={editingItemId !== item.id} onClick={() => setEditingTextSlot({ itemId: item.id })} className={`w-full py-4 px-6 border-2 rounded-xl flex items-center justify-between transition-all ${editingItemId === item.id ? 'border-gray-200 bg-white hover:border-black text-black' : 'border-gray-200 text-gray-400 opacity-50'}`}>
                               <div className="flex items-center gap-3"><Type className="w-5 h-5" /><span className="font-bold uppercase text-xs truncate max-w-[200px]">{item.text || 'Añadir Texto'}</span></div>{item.text && <Check className="w-4 h-4 text-green-500" />}
                            </button>
                            {item.text && editingItemId === item.id && (<button onClick={() => updateItemText(item.id, { text: '' })} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 transition-transform"><X className="w-3 h-3" /></button>)}
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
        <button onClick={addNewItem} className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl hover:border-black hover:bg-gray-50 transition-all text-gray-500 hover:text-black"><Plus className="w-6 h-6" /><span className="text-lg font-medium">Añadir otra Taza</span></button>
      </div>

      {cropModalData !== null && (
        <CropModal
          isOpen={true} onClose={() => setCropModalData(null)}
          imageSrc={safeItems.find(i => i.id === cropModalData.itemId)?.photos[0] || ''}
          currentCrop={safeItems.find(i => i.id === cropModalData.itemId)?.photoCrops?.[0]}
          aspectRatio={1} title="Ajustar Foto de la Taza"
          onSave={(newCrop) => handleCropChange(cropModalData.itemId, 0, newCrop)}
        />
      )}

      {editingTextSlot && currentEditingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2"><Type className="w-5 h-5" /><h4 className="text-xl font-bold">Editar Texto</h4></div>
              <button onClick={() => setEditingTextSlot(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Contenido</label>
                <input type="text" value={currentEditingItem.text} onChange={(e) => updateItemText(currentEditingItem.id, { text: e.target.value })} placeholder="Escribe aquí..." className="w-full p-4 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black text-lg font-bold" autoFocus />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1"><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block items-center gap-1.5 truncate"><ALargeSmall className="w-3.5 h-3.5 inline" /> Tamaño</label><select value={currentEditingItem.fontSize} onChange={(e) => updateItemText(currentEditingItem.id, { fontSize: parseInt(e.target.value) })} className="w-full h-[42px] px-2 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black bg-white font-bold text-sm">{[16, 24, 32, 48, 64, 80, 96, 120].map(size => (<option key={size} value={size}>{size}px</option>))}</select></div>
                <div className="col-span-1"><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block truncate">Fuente</label><select value={currentEditingItem.fontFamily} onChange={(e) => updateItemText(currentEditingItem.id, { fontFamily: e.target.value })} className="w-full h-[42px] px-1 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black bg-white font-bold text-sm"><option value="Arial">Sans Serif</option><option value="Georgia">Serif</option><option value="Courier New">Mono</option><option value="'Playfair Display', serif">Elegant</option><option value="'Dancing Script', cursive">Script</option></select></div>
                <div className="col-span-1"><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block truncate">Grosor</label><select value={currentEditingItem.fontWeight || 400} onChange={(e) => updateItemText(currentEditingItem.id, { fontWeight: parseInt(e.target.value) })} className="w-full h-[42px] px-1 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-black bg-white font-bold text-sm"><option value={400}>Normal</option><option value={500}>Medium</option><option value={600}>SemiBold</option><option value={700}>Bold</option><option value={800}>ExtraBold</option><option value={900}>Black</option></select></div>
              </div>
              <button onClick={() => setEditingTextSlot(null)} className="w-full py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-all font-bold text-lg shadow-lg">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}