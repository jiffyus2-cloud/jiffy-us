import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
// `?inline` mete el logo en el bundle como data URL: sale en el primer
// fotograma, sin petición de red que pueda tardar o fallar.
import jiffyLogo from '../../../assets/JiffyLogo.svg?inline';

/**
 * Imagen de la tienda (carrusel, tarjetas, galerías…) con espera de marca.
 *
 * Hasta que la imagen termina de descargarse se ve un fondo blanco con el logo
 * de Jiffy en tenue; luego el fondo se desvanece. Cubre los dos momentos en
 * los que antes se veía otra cosa: mientras Firestore no ha dicho qué imagen
 * toca (`src` vacío) y mientras se descarga la que subió la administración.
 *
 * La imagen real va oculta (`visibility: hidden`) mientras no ha cargado: así
 * el navegador no enseña su icono de imagen en carga o rota (en Safari, un
 * cuadro azul con «?»). Si falla, se queda el logo.
 *
 * El contenedor es quien ocupa el hueco; por defecto `absolute inset-0`, así
 * que el padre tiene que estar posicionado (`relative`). Es más fiable que
 * `h-full`, que en Safari no siempre resuelve dentro de un `aspect-ratio`.
 */
interface StoreImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** URL a pintar; '' mientras aún no se sabe cuál es. */
  src: string;
  /** Clases del contenedor, que es quien ocupa el hueco. */
  wrapperClassName?: string;
  /** Tamaño del logo de espera dentro del hueco. */
  logoClassName?: string;
  /** Se llama cuando la imagen ya se ve (para mostrar lo que va encima a la vez). */
  onReady?: (src: string) => void;
}

export default function StoreImage({
  src,
  alt,
  wrapperClassName = 'absolute inset-0',
  logoClassName = 'w-1/3 max-w-[160px]',
  onLoad,
  onReady,
  style,
  ...imgProps
}: StoreImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  // Se guarda QUÉ url terminó de cargar: si cambia `src`, vuelve la espera sola.
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const ready = src !== '' && loadedSrc === src;

  // Una imagen que ya estaba en caché puede estar completa antes de que React
  // enganche `onLoad`; en ese caso no hay que esperar ningún evento.
  useLayoutEffect(() => {
    const img = imgRef.current;
    if (src && img?.complete && img.naturalWidth > 0) setLoadedSrc(src);
  }, [src]);

  useEffect(() => {
    if (ready) onReady?.(src);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, src]);

  return (
    <div className={wrapperClassName}>
      {src && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={e => {
            setLoadedSrc(src);
            onLoad?.(e);
          }}
          style={{ ...style, visibility: ready ? 'visible' : 'hidden' }}
          {...imgProps}
        />
      )}
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-white flex items-center justify-center pointer-events-none transition-opacity duration-500 ${
          ready ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <img src={jiffyLogo} alt="" className={`${logoClassName} h-auto opacity-20`} />
      </div>
    </div>
  );
}
