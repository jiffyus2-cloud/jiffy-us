import { useState, useRef } from 'react';
import { 
  Upload, X, Image as ImageIcon, Trash2,
  Check, Edit3, Plus, Loader2
} from 'lucide-react';
import { PhotoPack } from '../types/products';
import { useLanguage } from '../context/LanguageContext';
import { PhotoPackCustomizationOptions } from './PhotoPackCustomization';
import ImageCropper from './ImageCropper';

interface PhotoPackOrganizerProps {
  photoPack: PhotoPack;
  customization: PhotoPackCustomizationOptions;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  photoCrops: Record<number, { x: number; y: number; zoom: number }>;
  onPhotoCropsChange: (crops: Record<number, { x: number; y: number; zoom: number }>) => void;
  onComplete: (photos: string[]) => void;
}

type Step = 'upload' | 'editor';

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
  const [step, setStep] = useState<Step>(photos.length > 0 ? 'editor' : 'upload');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBatchUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    // Cedemos el hilo por 50ms para permitir que React dibuje el Loading
    await new Promise(resolve => setTimeout(resolve, 50));

    const filesArray = Array.from(files);
    
    // createObjectURL evita el cuelgue por procesamiento masivo
    const loadedPhotos = filesArray.map(file => URL.createObjectURL(file));

    onPhotosChange([...photos, ...loadedPhotos]);
    setStep('editor');
    setIsProcessingFiles(false);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
    if (editingPhotoIndex === index) setEditingPhotoIndex(null);
  };

  const handleCropChange = (index: number, crop: { x: number, y: number, zoom: number }) => {
    onPhotoCropsChange({
      ...photoCrops,
      [index]: crop
    });
  };

  const totalPrice = photos.length * photoPack.basePrice;

  if (step === 'upload') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-lg mb-4">
            <Upload className="w-10 h-10" />
          </div>
          <h2 className="text-3xl mb-2">{t('organizer.uploadTitle')}</h2>
          <p className="text-gray-600">
            {t('photopack.uploadDesc') || 'Select the photos you want to print. Each photo can be individually adjusted.'}
          </p>
        </div>

        <div className="bg-white border-2 border-gray-300 rounded-lg p-12">
          {isProcessingFiles ? (
             <div className="w-full py-16 flex flex-col items-center justify-center gap-4">
               <Loader2 className="w-16 h-16 text-gray-400 animate-spin" />
               <p className="text-xl font-bold">Procesando imágenes...</p>
               <p className="text-sm text-gray-500">Optimizando las fotos para tu diseño...</p>
             </div>
          ) : (
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
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleBatchUpload}
            className="hidden"
            disabled={isProcessingFiles}
          />

          {photos.length > 0 && !isProcessingFiles && (
             <div className="mt-8">
                <button
                  onClick={() => setStep('editor')}
                  className="w-full py-4 bg-black text-white rounded-lg text-lg font-medium hover:bg-gray-800 transition-all"
                >
                  {t('organizer.continueToPages')}
                </button>
             </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8 sticky top-24 bg-white/95 backdrop-blur-sm z-40 py-4 border-b">
        <div>
          <h2 className="text-2xl font-bold">{photoPack.name} Editor</h2>
          <p className="text-gray-500">{photos.length} photos • ${totalPrice.toFixed(2)} total</p>
        </div>
        <button
          onClick={() => onComplete(photos)}
          className="px-8 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-all shadow-lg font-medium"
        >
          {t('organizer.complete')}
        </button>
      </div>

      <div className="space-y-12">
        {photos.map((photo, index) => (
          <div key={index} className="relative group">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold uppercase tracking-widest text-gray-400">
                Photo #{index + 1}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingPhotoIndex(editingPhotoIndex === index ? null : index)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all ${
                    editingPhotoIndex === index
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-gray-200 hover:border-black'
                  }`}
                >
                  {editingPhotoIndex === index ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                  <span className="text-xs font-bold uppercase tracking-tight">
                    {editingPhotoIndex === index ? 'Finalizar Edición' : 'Habilitar Edición'}
                  </span>
                </button>
                {editingPhotoIndex === index && (
                   <button
                    onClick={() => removePhoto(index)}
                    className="p-2 bg-red-50 text-red-600 rounded-full border-2 border-red-100 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div 
              className={`bg-white rounded-xl shadow-sm border-2 transition-all overflow-hidden ${
                editingPhotoIndex === index ? 'border-black ring-4 ring-black/5' : 'border-gray-100'
              }`}
            >
              <div 
                className="relative bg-gray-50 flex items-center justify-center overflow-hidden"
                style={{ aspectRatio: customization.size === '4x6' ? '4/6' : customization.size === '5x7' ? '5/7' : '8/10' }}
              >
                <ImageCropper 
                  src={photo} 
                  defaultPosition={photoCrops[index] || { x: 50, y: 50, zoom: 1 }}
                  defaultZoom={photoCrops[index]?.zoom || 1}
                  onCropChange={(newCrop) => handleCropChange(index, newCrop)}
                  isEditable={editingPhotoIndex === index}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 text-center pb-20">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingFiles}
          className="inline-flex items-center gap-3 px-8 py-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl hover:border-black hover:bg-gray-50 transition-all text-gray-500 hover:text-black disabled:opacity-50"
        >
          {isProcessingFiles ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
          <span className="text-lg font-medium">Add More Photos to Pack</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleBatchUpload}
          className="hidden"
          disabled={isProcessingFiles}
        />
      </div>
    </div>
  );
}