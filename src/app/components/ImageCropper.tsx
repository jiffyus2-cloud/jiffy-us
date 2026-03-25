import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Move } from 'lucide-react'; // Keep Move icon for potential future use or if parent wants to display it

interface ImageCropperProps {
  src: string;
  defaultPosition?: { x: number; y: number };
  defaultZoom?: number;
  onCropChange: (crop: { x: number; y: number; zoom: number }) => void;
  isEditable?: boolean;
  className?: string; // Keep className for styling the cropper itself
}

const ImageCropper: React.FC<ImageCropperProps> = ({
  src,
  defaultPosition = { x: 50, y: 50 },
  defaultZoom = 1,
  onCropChange,
  isEditable = false,
  className = ""
}) => {
  const [position, setPosition] = useState(defaultPosition);
  const [zoom, setZoom] = useState(defaultZoom);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startImgPos = useRef({ x: 50, y: 50 });

  // Synchronize with initial position and zoom props
  useEffect(() => {
    setPosition(defaultPosition);
    setZoom(defaultZoom);
  }, [defaultPosition, defaultZoom]);

  const handleStart = (clientX: number, clientY: number) => {
    if (!isEditable) return;
    setIsDragging(true);
    startPos.current = { x: clientX, y: clientY };
    startImgPos.current = { ...position };
  };

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !containerRef.current || !isEditable) return; // Only allow dragging if editable

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
    onCropChange({ x: newX, y: newY, zoom }); // Always update parent on crop change
  }, [isDragging, zoom, onCropChange, isEditable]);

  const handleEnd = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden group w-full h-full ${className} ${isEditable ? 'cursor-grab active:cursor-grabbing' : ''}`}
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

    </div>
  );
};

export default ImageCropper;
