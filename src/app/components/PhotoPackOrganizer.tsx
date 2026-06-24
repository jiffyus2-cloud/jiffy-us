import { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Upload, Image as ImageIcon, Trash2, Edit3, Loader2, Check } from 'lucide-react';
import { PhotoPack } from '../types/products';
import { PhotoPackCustomizationOptions } from './PhotoPackCustomization';
import ImageCropper from './ImageCropper'; 
import CropModal from './CropModal';
import { convertFileIfHeic } from '../utils/imageUtils';

interface PhotoPackOrganizerProps {
  photoPack: PhotoPack;
  customization: PhotoPackCustomizationOptions;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  photoCrops: Record<number, { x: number; y: number; zoom: number }>;
  onPhotoCropsChange: (crops: Record<number, { x: number; y: number; zoom: number }>) => void;
  onComplete: (photos: string[]) => void;
}

export default function PhotoPackOrganizer({
  photoPack,
  customization,
  photos,
  onPhotosChange,
  photoCrops,
  onPhotoCropsChange,
  onComplete
}: PhotoPackOrganizerProps) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);

  const targetAspectRatio = customization.size === '4x6' ? 4/6 : customization.size === '5x7' ? 5/7 : 8/10; 

  const handleBatchUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsProcessingFiles(true);
    await new Promise(resolve => setTimeout(resolve, 50));
    const filesArray = Array.from(files);
    const convertedFiles = await Promise.all(filesArray.map(convertFileIfHeic));
    const loadedPhotos = convertedFiles.map(file => URL.createObjectURL(file));
    onPhotosChange([...photos, ...loadedPhotos]);
    setIsProcessingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
    const newCrops: Record<number, any> = {};
    for (const key of Object.keys(photoCrops)) {
      const k = Number(key);
      if (k < index) newCrops[k] = photoCrops[k];
      else if (k > index) newCrops[k - 1] = photoCrops[k];
    }
    onPhotoCropsChange(newCrops);
  };

  const handleSaveCrop = (newCrop: { x: number; y: number; zoom: number }) => {
    if (editingPhotoIndex === null) return;
    onPhotoCropsChange({
      ...photoCrops,
      [editingPhotoIndex]: newCrop
    });
    setEditingPhotoIndex(null); 
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8 sticky top-24 bg-white/95 backdrop-blur-sm z-40 py-4 border-b">
        <div>
          <h2 className="text-2xl font-bold">{photoPack.name} Editor</h2>
          <p className="text-gray-500">{photos.length} fotos añadidas</p>
        </div>
        <button
          onClick={() => onComplete(photos)}
          disabled={photos.length === 0}
          className="px-8 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg disabled:bg-gray-300 disabled:shadow-none font-medium text-sm"
        >
          {t('organizer.complete')}
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <Upload className="w-16 h-16 mx-auto mb-6 text-gray-300" />
          <h3 className="text-xl font-semibold mb-2">{t('organizer.uploadTitle')}</h3>
          <p className="text-gray-500 mb-8">{t('organizer.clickToSelect')}</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-black text-white rounded-xl font-medium"
          >
            {isProcessingFiles ? <Loader2 className="animate-spin" /> : "Seleccionar Fotos"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {photos.map((photo, index) => (
            <div key={index} className="relative group bg-white p-2 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all">
              <div className="relative bg-gray-100 rounded-xl overflow-hidden shadow-inner border border-gray-50" style={{ aspectRatio: targetAspectRatio }}>
                <ImageCropper 
                  src={photo} 
                  position={photoCrops[index] || { x: 50, y: 50, zoom: 1 }} 
                />

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => setEditingPhotoIndex(index)} title="Ajustar recorte" className="p-2.5 bg-white text-gray-900 rounded-full hover:scale-110 transition-transform shadow-lg"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => removePhoto(index)} title="Eliminar foto" className="p-2.5 bg-red-100 text-red-600 rounded-full hover:scale-110 transition-transform shadow-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="absolute top-3 right-3 p-1.5 bg-black/60 text-white rounded-full text-xs font-bold w-6 h-6 flex items-center justify-center">{index + 1}</div>
            </div>
          ))}

          <button onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-black hover:text-black hover:bg-gray-50 transition-all" style={{ aspectRatio: targetAspectRatio }}>
            {isProcessingFiles ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8 mb-2" />}
            <span className="text-xs font-medium">Añadir</span>
          </button>
        </div>
      )}

      <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleBatchUpload} className="hidden" />

      {editingPhotoIndex !== null && (
        <CropModal 
          isOpen={true} onClose={() => setEditingPhotoIndex(null)}
          imageSrc={photos[editingPhotoIndex]} currentCrop={photoCrops[editingPhotoIndex]}
          aspectRatio={targetAspectRatio} title={`Ajustar Foto #${editingPhotoIndex + 1}`} onSave={handleSaveCrop}
        />
      )}
    </div>
  );
}