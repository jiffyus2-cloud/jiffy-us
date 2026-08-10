import React, { useRef, useState, useLayoutEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getCoverDimensions } from '../utils/cropMath';

interface ImageCropperProps {
  src: string;
  /** Posición central y zoom {x, y, zoom, rotation} provisto por Jiffy */
  position: { x: number; y: number; zoom: number; rotation?: number };
  alt?: string;
  onError?: (src: string) => void;
  onRetry?: (src: string) => void;
}

export default function ImageCropper({ src, position, alt = "Photo", onError, onRetry }: ImageCropperProps) {
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

    container.removeAttribute('data-ready');

    const updateStyle = () => {
      const Cw = container.offsetWidth;
      const Ch = container.offsetHeight;
      const Iw = img.naturalWidth;
      const Ih = img.naturalHeight;

      if (Cw === 0 || Ch === 0 || Iw === 0 || Ih === 0) return;

      const { Rw, Rh } = getCoverDimensions(Cw, Ch, Iw, Ih);

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
      container.setAttribute('data-ready', 'true');
    };

    let cancelled = false;

    const tryUpdate = (): boolean => {
      if (cancelled) return true;
      if (img.complete && img.naturalWidth > 0) {
        updateStyle();
        return true;
      }
      return false;
    };

    img.addEventListener('load', updateStyle);

    // Red de seguridad. Este efecto arranca siempre en `opacity: 0` y solo la
    // restaura en `load`; si el evento ya se había disparado antes de montar el
    // listener (imagen en caché, o React reutilizando el <img> tras reordenar y
    // cambiando solo el src), la foto se quedaba invisible aunque el estado
    // fuese correcto — "la foto desapareció de la página".
    if (!tryUpdate()) {
      let attempts = 0;
      const poll = () => {
        if (cancelled || attempts++ > 60) return;
        if (!tryUpdate()) requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    }

    const observer = new ResizeObserver(updateStyle);
    observer.observe(container);

    return () => {
      cancelled = true;
      observer.disconnect();
      img.removeEventListener('load', updateStyle);
    };
  }, [x, y, zoom, rotation, src]);

  return (
    <div ref={containerRef} data-image-cropper className="w-full h-full overflow-hidden bg-white relative">
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="absolute pointer-events-none"
        style={style}
        onError={() => {
          setHasError(true);
          // No hay más nada que pintar para esta imagen: marcar listo de una vez
          // para que waitForRenderReady() (exportación PDF) no espere el timeout completo.
          containerRef.current?.setAttribute('data-ready', 'true');
          onError?.(src);
        }}
      />
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 gap-1 z-10">
          <AlertTriangle className="text-orange-400" size={20} />
          <span className="text-[10px] text-gray-500 text-center px-1 leading-tight">No se cargó</span>
          {onRetry && (
            <button
              onClick={() => onRetry(src)}
              className="mt-1 text-[10px] bg-white border border-gray-300 rounded px-2 py-0.5 text-gray-600 active:bg-gray-50"
            >
              ↺ Reemplazar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
