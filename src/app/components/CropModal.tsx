import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop } from 'react-image-crop';
import { X, Maximize, ZoomIn, Search, Image as ImageIcon } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  currentCrop?: { x: number; y: number; zoom: number };
  aspectRatio: number;
  title?: string;
  onSave: (newCrop: { x: number; y: number; zoom: number }) => void;
}

export default function CropModal({ 
  isOpen, onClose, imageSrc, currentCrop, aspectRatio, title = "Ajustar Imagen", onSave 
}: CropModalProps) {
  
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Mantenemos solo el estado en porcentaje para evitar los fallos de píxeles
  const [crop, setCrop] = useState<Crop>();

  useEffect(() => {
    if (isOpen && imageSrc) {
      setCrop(undefined); 
    }
  }, [isOpen, imageSrc]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const I_AR = naturalWidth / naturalHeight;
    const C_AR = aspectRatio;

    if (currentCrop && currentCrop.zoom >= 1) {
      // Reconstruimos el recuadro guardado basándonos en los porcentajes universales
      const baseScaleX = Math.min(1, C_AR / I_AR);
      const widthPercent = (baseScaleX / currentCrop.zoom) * 100;
      const heightPercent = widthPercent * (I_AR / C_AR);

      const topLeftX = currentCrop.x - (widthPercent / 2);
      const topLeftY = currentCrop.y - (heightPercent / 2);

      setCrop({
        unit: '%',
        x: Math.max(0, Math.min(100 - widthPercent, topLeftX)),
        y: Math.max(0, Math.min(100 - heightPercent, topLeftY)),
        width: widthPercent,
        height: heightPercent
      });
    } else {
      // Recuadro por defecto al máximo tamaño posible
      let widthPercent = 100;
      let heightPercent = 100;
      
      if (I_AR > C_AR) {
        widthPercent = 100 * C_AR / I_AR;
      } else {
        heightPercent = 100 * I_AR / C_AR;
      }

      setCrop({
        unit: '%',
        x: (100 - widthPercent) / 2,
        y: (100 - heightPercent) / 2,
        width: widthPercent,
        height: heightPercent
      });
    }
  }

  const handleSave = () => {
    if (!crop || !imgRef.current) return;
    
    const { naturalWidth, naturalHeight } = imgRef.current;
    const I_AR = naturalWidth / naturalHeight;
    const C_AR = aspectRatio;

    // 1. Centro en Porcentajes directo desde el recuadro
    const centerXPercent = crop.x + (crop.width / 2);
    const centerYPercent = crop.y + (crop.height / 2);

    // 2. Zoom = Ancho Máximo Base (%) / Ancho del Recorte Actual (%)
    let baseWidthPercent = 100;
    if (I_AR > C_AR) {
      baseWidthPercent = 100 * C_AR / I_AR;
    }
    const zoom = baseWidthPercent / crop.width;

    onSave({
      x: parseFloat(centerXPercent.toFixed(2)),
      y: parseFloat(centerYPercent.toFixed(2)),
      zoom: parseFloat(Math.max(1, zoom).toFixed(2)) // Bloquear el zoom para que nunca sea < 1
    });
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-900 text-white rounded-xl shadow-md">
              <Search className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-8 bg-gray-50 flex-1 flex items-center justify-center min-h-[400px]">
          {imageSrc ? (
            <div className="shadow-xl rounded-lg overflow-hidden bg-white border border-gray-100">
               <ReactCrop
                crop={crop}
                // Ignoramos el primer argumento (píxeles) y guardamos directamente los porcentajes
                onChange={(_, percentCrop) => setCrop(percentCrop)} 
                aspect={aspectRatio}
                className="max-w-full"
                minWidth={10} 
                keepSelection 
                ruleOfThirds 
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Crop preview"
                  onLoad={onImageLoad}
                  style={{ maxHeight: 'calc(95vh - 200px)' }} 
                  className="block max-w-full h-auto pointer-events-none"
                />
              </ReactCrop>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-20">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
              Cargando imagen...
            </div>
          )}
        </div>

        <div className="px-8 py-4 bg-white border-t border-gray-100 text-sm text-gray-500 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex items-center gap-2">
                <Maximize className="w-4 h-4 text-blue-500" />
                <span>Arrastra las esquinas del recuadro para ajustar el área visible.</span>
            </div>
            <div className="flex items-center gap-2">
                <ZoomIn className="w-4 h-4 text-blue-500" />
                <span>Mueve el recuadro completo para centrar tu foto.</span>
            </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-end gap-3 sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!crop} 
            className="px-8 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-md hover:shadow-xl disabled:bg-gray-300 disabled:shadow-none text-sm"
          >
            Aplicar Recorte
          </button>
        </div>
      </div>
    </div>
  );
}