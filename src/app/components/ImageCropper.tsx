import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Move, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { Slider } from './ui/slider';

interface ImageCropperProps {
  src: string;
  defaultPosition?: { x: number; y: number };
  defaultZoom?: number;
  onCropChange: (crop: { x: number; y: number; zoom: number }) => void;
  isEditable?: boolean;
  className?: string;
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  src,
  defaultPosition = { x: 50, y: 50 },
  defaultZoom = 1,
  onCropChange,
  isEditable = false,
  className = ""
}) => {
  const [isDragMode, setIsDragMode] = useState(false);
  const [position, setPosition] = useState(defaultPosition);
  const [zoom, setZoom] = useState(defaultZoom);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startImgPos = useRef({ x: 50, y: 50 });

  // Sincronizar con props iniciales
  useEffect(() => {
    setPosition(defaultPosition);
    setZoom(defaultZoom);
  }, [defaultPosition, defaultZoom]);

  const handleStart = (clientX: number, clientY: number) => {
    if (!isDragMode) return;
    setIsDragging(true);
    startPos.current = { x: clientX, y: clientY };
    startImgPos.current = { ...position };
  };

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !containerRef.current) return;

    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;

    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    // Convertir desplazamiento a porcentaje
    const moveX = (deltaX / containerWidth) * 100 / zoom;
    const moveY = (deltaY / containerHeight) * 100 / zoom;

    const newX = Math.max(0, Math.min(100, startImgPos.current.x - moveX));
    const newY = Math.max(0, Math.min(100, startImgPos.current.y - moveY));

    setPosition({ x: newX, y: newY });
    onCropChange({ x: newX, y: newY, zoom });
  }, [isDragging, zoom, onCropChange]);

  const handleEnd = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const handleZoomChange = (newZoom: number[]) => {
    const val = newZoom[0];
    setZoom(val);
    onCropChange({ ...position, zoom: val });
  };

  const handleXChange = (val: number[]) => {
    const newX = val[0];
    setPosition(prev => ({ ...prev, x: newX }));
    onCropChange({ ...position, x: newX, zoom });
  };

  const handleYChange = (val: number[]) => {
    const newY = val[0];
    setPosition(prev => ({ ...prev, y: newY }));
    onCropChange({ ...position, y: newY, zoom });
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden group w-full h-full ${className} ${isDragMode ? 'cursor-move' : ''}`}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
    >
      <img
        src={src}
        alt="Crop view"
        className="w-full h-full object-contain transition-transform duration-75 pointer-events-none select-none"
        style={{
          transform: `scale(${zoom}) translate(${(50 - position.x)}%, ${(50 - position.y)}%)`,
        }}
      />

      {isEditable && (
        <>
          {/* Botón flotante para activar modo arrastre */}
          <div className="absolute top-2 left-2 flex gap-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDragMode(!isDragMode);
              }}
              className={`p-2 rounded-full shadow-lg transition-all ${
                isDragMode ? 'bg-black text-white' : 'bg-white/90 text-black hover:bg-white'
              }`}
              title={isDragMode ? "Confirmar encuadre" : "Ajustar encuadre"}
            >
              {isDragMode ? <Check size={18} /> : <Move size={18} />}
            </button>
          </div>

          {/* Controles de Ajuste (Zoom y Paneo) */}
          {isDragMode && (
            <div 
              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[92%] max-w-[260px] bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 z-20 border border-gray-100/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Zoom Control */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[9px] font-black text-black/40 uppercase tracking-tighter">Zoom</span>
                  <span className="text-[9px] font-mono font-bold text-black">{zoom.toFixed(1)}x</span>
                </div>
                <div className="flex items-center gap-2">
                  <ZoomOut size={12} className="text-gray-400" />
                  <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.1}
                    onValueChange={handleZoomChange}
                    className="flex-1"
                  />
                  <ZoomIn size={12} className="text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Paneo Eje X */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center px-0.5">
                    <span className="text-[9px] font-black text-black/40 uppercase tracking-tighter">Eje X</span>
                    <span className="text-[9px] font-mono font-bold text-black">{Math.round(position.x)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[position.x]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={handleXChange}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Paneo Eje Y */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center px-0.5">
                    <span className="text-[9px] font-black text-black/40 uppercase tracking-tighter">Eje Y</span>
                    <span className="text-[9px] font-mono font-bold text-black">{Math.round(position.y)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[position.y]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={handleYChange}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Overlay indicador de modo arrastre */}
          {isDragMode && (
            <div className="absolute inset-0 border-2 border-black/20 pointer-events-none flex items-center justify-center">
               {!isDragging && (
                 <span className="bg-black/50 text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                   Arrastra para encuadrar
                 </span>
               )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ImageCropper;
