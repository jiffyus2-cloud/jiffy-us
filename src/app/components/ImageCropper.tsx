import React, { useRef, useState, useLayoutEffect } from 'react';

interface ImageCropperProps {
  src: string;
  /** Posición central y zoom {x, y, zoom} provisto por Jiffy */
  position: { x: number; y: number; zoom: number };
  alt?: string;
}

export default function ImageCropper({ src, position, alt = "Photo" }: ImageCropperProps) {
  const { x = 50, y = 50, zoom = 1 } = position || {};
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Guardamos los estilos exactos calculados matemáticamente
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });

  useLayoutEffect(() => {
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

      // 5. Aplicar estilos definitivos (Hacemos Zoom exactamente alrededor de ese centro)
      setStyle({
        position: 'absolute',
        width: `${Rw}px`,
        height: `${Rh}px`,
        left: `${translateX}px`,
        top: `${translateY}px`,
        transform: `scale(${zoom})`,
        transformOrigin: `${imgCenterX}px ${imgCenterY}px`,
        maxWidth: 'none', 
        maxHeight: 'none',
        opacity: 1, // Mostrar imagen una vez calculada
      });
    };

    if (img.complete) updateStyle();
    img.addEventListener('load', updateStyle);

    // Si la pantalla cambia de tamaño (ej. gira el móvil), recalculamos
    const observer = new ResizeObserver(updateStyle);
    observer.observe(container);

    return () => {
      observer.disconnect();
      img.removeEventListener('load', updateStyle);
    };
  }, [x, y, zoom, src]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-gray-100 relative">
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="absolute pointer-events-none"
        style={style}
      />
    </div>
  );
}