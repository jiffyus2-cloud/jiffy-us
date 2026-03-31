import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop } from 'react-image-crop';
import { X, Maximize, ZoomIn, Search, Image as ImageIcon, RotateCcw, RotateCw } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  currentCrop?: { x: number; y: number; zoom: number; rotation?: number };
  aspectRatio: number;
  title?: string;
  onSave: (newCrop: { x: number; y: number; zoom: number; rotation: number }) => void;
}

export default function CropModal({ 
  isOpen, onClose, imageSrc, currentCrop, aspectRatio, title = "Ajustar Imagen", onSave 
}: CropModalProps) {
  
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Estado para el recorte (x, y, zoom calculados en porcentajes)
  const [crop, setCrop] = useState<Crop>();
  // Estado para la rotación en grados
  const [rotation, setRotation] = useState<number>(currentCrop?.rotation || 0);

  useEffect(() => {
    if (isOpen && imageSrc) {
      setCrop(undefined); 
      setRotation(currentCrop?.rotation || 0);
    }
  }, [isOpen, imageSrc, currentCrop]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const I_AR = naturalWidth / naturalHeight;
    const C_AR = aspectRatio;

    if (currentCrop && currentCrop.zoom >= 1) {
      // Reconstruimos el recuadro guardado basándonos en los porcentajes
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
      zoom: parseFloat(Math.max(1, zoom).toFixed(2)), // Bloquear zoom < 1
      rotation: rotation
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
        {/* CABECERA */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
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

        {/* ÁREA DE RECORTE */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-gray-50 flex-1 flex items-center justify-center min-h-[350px]">
          {imageSrc ? (
            <div className="shadow-xl rounded-lg overflow-hidden bg-white border border-gray-100">
               <ReactCrop
                crop={crop}
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
                  style={{ 
                    maxHeight: 'calc(95vh - 280px)', 
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.3s ease'
                  }} 
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

        {/* BARRA DE HERRAMIENTAS DE ROTACIÓN */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-4 max-w-2xl mx-auto">
            <button 
              onClick={() => setRotation(r => r - 90)} 
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-2 font-medium text-sm"
              title="Rotar 90º Izquierda"
            >
              <RotateCcw className="w-5 h-5" /> -90º
            </button>
            
            <div className="flex-1 flex items-center gap-3 w-full">
              <span className="text-xs font-bold text-gray-400">-180º</span>
              <input 
                type="range" 
                min="-180" 
                max="180" 
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
              />
              <span className="text-xs font-bold text-gray-400">+180º</span>
            </div>

            <button 
              onClick={() => setRotation(r => r + 90)} 
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-2 font-medium text-sm"
              title="Rotar 90º Derecha"
            >
              +90º <RotateCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PIE DE MODAL (GUARDAR/CANCELAR) */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 sticky bottom-0 z-10 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-all text-sm"
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