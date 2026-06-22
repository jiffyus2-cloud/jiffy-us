import React, { useRef, useState, useLayoutEffect } from 'react';

interface ImageCropperProps {
  src: string;
  /** Posición central y zoom {x, y, zoom, rotation} provisto por Jiffy */
  position: { x: number; y: number; zoom: number; rotation?: number };
  alt?: string;
}

export default function ImageCropper({ src, position, alt = "Photo" }: ImageCropperProps) {
  const { x = 50, y = 50, zoom = 1, rotation = 0 } = position || {};

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [hasError, setHasError] = useState(false);

  useLayoutEffect(() => {
    setHasError(false);
    setStyle({ opacity: 0 });

    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const updateStyle = () => {
      const Cw = container.offsetWidth;
      const Ch = container.offsetHeight;
      const Iw = img.naturalWidth;
      const Ih = img.naturalHeight;

      if (Cw === 0 || Ch === 0 || Iw === 0 || Ih === 0) return;

      const C_AR = Cw / Ch;
      const I_AR = Iw / Ih;

      let Rw = Cw;
      let Rh = Ch;

      if (I_AR > C_AR) {
        Rw = Ch * I_AR;
      } else {
        Rh = Cw / I_AR;
      }

      const imgCenterX = (x / 100) * Rw;
      const imgCenterY = (y / 100) * Rh;

      const translateX = (Cw / 2) - imgCenterX;
      const translateY = (Ch / 2) - imgCenterY;

      setStyle({
        position: 'absolute',
        width: `${Rw}px`,
        height: `${Rh}px`,
        left: `${translateX}px`,
        top: `${translateY}px`,
        transform: `rotate(${rotation}deg) scale(${zoom})`,
        transformOrigin: `${imgCenterX}px ${imgCenterY}px`,
        maxWidth: 'none',
        maxHeight: 'none',
        opacity: 1,
      });
    };

    if (img.complete && img.naturalWidth > 0) updateStyle();
    img.addEventListener('load', updateStyle);

    const observer = new ResizeObserver(updateStyle);
    observer.observe(container);

    return () => {
      observer.disconnect();
      img.removeEventListener('load', updateStyle);
    };
  }, [x, y, zoom, rotation, src]);

  // Si la imagen falló, mostrarla con object-fit cover como fallback (visible, no gris)
  if (hasError) {
    return (
      <div className="w-full h-full overflow-hidden bg-gray-100 relative">
        <img src={src} alt={alt} className="w-full h-full object-cover pointer-events-none" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-gray-100 relative">
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="absolute pointer-events-none"
        style={style}
        onError={() => setHasError(true)}
      />
    </div>
  );
}