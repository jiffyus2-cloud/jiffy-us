import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { PhotoPack } from '../types/products';
import { PhotoPackCustomizationOptions } from './PhotoPackCustomization';

interface PhotoPackOrganizerProps {
  photoPack: PhotoPack;
  customization: PhotoPackCustomizationOptions;
  onComplete: (photos: string[]) => void;
}

export default function PhotoPackOrganizer({ photoPack, customization, onComplete }: PhotoPackOrganizerProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
            setPhotos((prev) => [...prev, ...loadedPhotos]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const totalPrice = photos.length * photoPack.basePrice;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl mb-2">Upload Your Photos</h2>
          <p className="text-gray-600">
            {photos.length} photos added • {customization.size} • {customization.finish} finish
          </p>
        </div>
        <div className="bg-gray-50 px-6 py-3 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Estimated Price</div>
          <div className="text-2xl font-bold">${totalPrice.toFixed(2)}</div>
        </div>
      </div>

      {/* Upload Area */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="mb-8 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-black hover:bg-gray-50 transition-all cursor-pointer"
      >
        <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl mb-2">Click to upload photos</h3>
        <p className="text-gray-500">You can select multiple photos at once</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Photos Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {photos.map((photo, index) => (
            <div key={index} className="aspect-square relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <img src={photo} alt="" className="w-full h-full object-cover" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePhoto(index);
                }}
                className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-gray-50 rounded-lg border-2 border-gray-100">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No photos uploaded yet</p>
        </div>
      )}

      {/* Actions */}
      {photos.length > 0 && (
        <div className="mt-12 flex justify-end">
          <button
            onClick={() => onComplete(photos)}
            className="px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg"
          >
            Continue to Checkout
          </button>
        </div>
      )}
    </div>
  );
}
