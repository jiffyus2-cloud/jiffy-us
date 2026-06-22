import React, { useRef, useState, useLayoutEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ImageCropperProps {
  src: string;
  /** Posición central y zoom {x, y, zoom, rotation} provisto por Jiffy */
  position: { x: number; y: number; zoom: number; rotation?: number };
  alt?: string;
  onError?: (src: string) => void;
  onRetry?: (src: string) => void;
}

export default function ImageCropper({ src, position, alt = "Photo", onError, onRetry }: ImageCropperProps) {
  // Extraemos la rotación (0 por defecto si no existe)
  const { x = 50, y = 50, zoom = 1, rotation = 0 } = position || {};

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Guardamos los estilos exactos calculados matemáticamente
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [hasError, setHasError] = useState(false);

  useLayoutEffect(() => {
    setHasError(false);
    setStyle({ opacity: 0 });

    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const updateStyle = () => {
      // 1. Tomar medidas del hueco y de la foto real
      const Cw = container.offsetWidth;
      const Ch = container.offsetHeight;
      const Iw = img.naturalWidth;
      const Ih = img.naturalHeight;

      if (Cw === 0 || Ch === 0 || Iw === 0 || Ih === 0) return;

      const C_AR = Cw / Ch;
      const I_AR = Iw / Ih;

      // 2. Calcular tamaño Base de cobertura (Equivalente a object-fit: cover)
      let Rw = Cw;
      let Rh = Ch;

      if (I_AR > C_AR) {
        Rw = Ch * I_AR; // La imagen es más ancha que el hueco
      } else {
        Rh = Cw / I_AR; // La imagen es más alta que el hueco
      }

      // 3. Ubicar el punto central (x, y) de la imagen según los porcentajes guardados
      const imgCenterX = (x / 100) * Rw;
      const imgCenterY = (y / 100) * Rh;

      // 4. Calcular el desplazamiento para que ese punto quede justo en el centro del hueco
      const translateX = (Cw / 2) - imgCenterX;
      const translateY = (Ch / 2) - imgCenterY;

      // 5. Aplicar estilos definitivos (Rotación y Zoom se hacen alrededor del centro exacto)
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

    // Si la pantalla cambia de tamaño (ej. gira el móvil), recalculamos
    const observer = new ResizeObserver(updateStyle);
    observer.observe(container);

    return () => {
      observer.disconnect();
      img.removeEventListener('load', updateStyle);
    };
  }, [x, y, zoom, rotation, src]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-gray-100 relative">
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="absolute pointer-events-none"
        style={style}
        onError={() => {
          setHasError(true);
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
