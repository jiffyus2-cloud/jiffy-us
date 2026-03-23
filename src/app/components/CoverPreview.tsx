import React, { useMemo } from 'react';

interface CoverPreviewProps {
  coverSize: '20x20' | '30x30' | '21x28' | '28x21';
  coverImage?: string;
  coverTitle?: string;
  coverSubtitle?: string;
  coverYear?: string;
  selectedLayout: number;
  coverCrop?: { x: number; y: number; zoom: number };
  
  // --- AÑADIDO PARA SOLUCIONAR EL ERROR DE TYPESCRIPT ---
  customization?: any;
  photos?: (string | null)[];
  photoCrops?: Record<string, { x: number; y: number; zoom: number }>;
}

const CoverPreview: React.FC<CoverPreviewProps> = ({
  coverSize,
  coverImage = '',
  coverTitle = '',
  coverSubtitle = '',
  coverYear = '',
  selectedLayout,
  coverCrop = { x: 50, y: 50, zoom: 1 },
  
  // --- VALORES POR DEFECTO PARA LAS NUEVAS PROPS ---
  customization = {},
  photos = [],
  photoCrops = {}
}) => {
  const isVertical = coverSize === '28x21';
  const isSquare = coverSize === '20x20' || coverSize === '30x30';
  const isHorizontal = coverSize === '21x28';

  const aspectRatio = useMemo(() => {
    if (isVertical) return '21 / 28';
    if (isHorizontal) return '28 / 21';
    return '1 / 1';
  }, [isVertical, isHorizontal]);

  const renderPreviewContent = () => {
    const textShadow = { textShadow: '0 0.5cqw 1cqw rgba(0,0,0,0.5)' };

    if (isVertical) {
      switch (selectedLayout) {
        case 1:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '21 / 28',
                containerType: 'inline-size'
              }}
            >
              {/* Frame 4 (El bloque inferior con los textos, 30% de alto) */}
              <div className="h-[20%] flex-shrink-0 flex flex-col items-center justify-center p-[10cqw] bg-white z-10">
                <div className="text-[5cqw] font-bold tracking-wide text-black text-center leading-none">
                  {coverTitle}
                </div>
                {/* Frame 3 (Línea separadora) */}
                <div className="text-[3cqw] text-gray-600 text-center font-medium tracking-widest">
                  {coverSubtitle}
                </div>
              </div>
              {/* Contenedor de la Imagen (70% superior con padding visual) */}
              <div className="relative w-full h-[80%] bg-white">
                <div className="absolute top-[0%] left-[10%] right-[10%] bottom-[10%] overflow-hidden">
                  {coverImage ? (
                    <img 
                      src={coverImage} 
                      alt="Portada del Álbum" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700" 
                      style={{
                        objectPosition: '50% 50%',
                        transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                        <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                           <span className="text-[3cqw] font-black">IMAGE</span>
                        </div>
                        <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
            </div>
          );
        case 2:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '21 / 28',
                containerType: 'inline-size'
              }}
            >
              {/* Contenedor de la Imagen (75% superior con padding visual) */}
              <div className="relative w-full h-[75%] bg-white">
                <div className="absolute top-[10%] left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {coverImage ? (
                    <img 
                      src={coverImage} 
                      alt="Portada del Álbum" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700" 
                      style={{
                        objectPosition: '50% 50%',
                        transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                        <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                           <span className="text-[3cqw] font-black">IMAGE</span>
                        </div>
                        <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Frame 4 (El bloque inferior con los textos, 25% de alto) */}
                <div className="h-[25%] flex-shrink-0 flex flex-col items-center justify-center p-[8cqw] bg-white z-10">
                  <div className="w-full py-[500cqw]">
                    <div className="h-[.8cqw] bg-black w-full" />
                    <div className="flex justify-between items-center py-[4cqw]">
                      <h2 className="text-black text-[4cqw] font-bold">{coverTitle}</h2>
                      <p className="text-black text-[4cqw]">{coverSubtitle}</p>
                    </div>
                    <div className="h-[.8cqw] bg-black w-full" />
                  </div>
                </div>
            </div>
          );
        case 3:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '21 / 28',
                containerType: 'inline-size'
              }}
            >
              {/* Capa 1: Contenedor de la Imagen con MARGEN del 10% */}
              <div className="absolute inset-[10%] z-0 overflow-hidden bg-gray-100">
                {coverImage ? (
                  <img 
                    src={coverImage} 
                    alt="Portada del Álbum" 
                    className="w-full h-full object-cover transition-transform duration-700" 
                    style={{
                      objectPosition: '50% 50%',
                      transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                      <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                        <span className="text-[3cqw] font-black">IMAGE</span>
                      </div>
                      <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                    </div>
                  </div>
                )}
              </div>
    
              {/* Capa 2: Contenedor de Textos Superpuestos (z-10) */}
              <div 
                className="absolute inset-[10%] z-10 pointer-events-none"
                style={{ containerType: 'inline-size' }}
              >
                {/* Recuadro de textos - TAMAÑO REDUCIDO */}
                <div 
                  className="absolute left-1/2 -translate-x-1/2 bottom-[15%] bg-white border border-black shadow-2xl p-[4cqw] text-center w-[70%] ring-white ring-[2cqw]"
                >
                  {/* Título - alineado al centro */}
                  <div className="w-full mb-[1.5cqw]">
                    <h2 
                      className="text-black text-[6cqw] font-black tracking-tight leading-none" 
                    >
                      {coverTitle}
                    </h2>
                  </div>
                  
                  {/* Línea separadora negro */}
                  <div className="w-[85%] h-[0.25cqw] bg-black mx-auto my-[2.5cqw]"></div>
    
                  {/* Subtítulo - alineado al centro */}
                  <div className="w-full">
                    <p 
                      className="text-gray-600 text-[3.5cqw] font-medium tracking-widest leading-tight" 
                    >
                      {coverSubtitle}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        case 4:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '21 / 28',
                containerType: 'inline-size'
              }}
            >
              {/* Frame 4 (El bloque inferior con los textos, max 10% de alto) */}
              <div className="h-[10%] flex-shrink-0 flex flex-col items-center justify-center p-[8cqw] bg-white z-10">
                <div className="w-full py-[500cqw]">
                  <div className="flex justify-between items-center py-[4cqw]">
                    <h2 className="text-black text-[4cqw] font-bold">{coverTitle}</h2>
                  </div>
                </div>
              </div>
              {/* Contenedor de la Imagen (80% central con padding visual) */}
              <div className="relative w-full h-[80%] bg-white">
                <div className="absolute top-0 left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {coverImage ? (
                    <img 
                      src={coverImage} 
                      alt="Portada del Álbum" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700" 
                      style={{
                        objectPosition: '50% 50%',
                        transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                        <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                           <span className="text-[3cqw] font-black">IMAGE</span>
                        </div>
                        <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Frame 4 (El bloque inferior con los textos, max 10% de alto) */}
              <div className="h-[10%] flex-shrink-0 flex flex-col items-center justify-center p-[8cqw] bg-white z-10">
                <div className="w-full py-[500cqw]">
                  <div className="flex justify-end items-center py-[4cqw]">
                    <p className="text-black text-[4cqw]">{coverSubtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        case 5:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '21 / 28',
                containerType: 'inline-size'
              }}>
              {/* Capa 1: Contenedor de la Imagen con MARGEN del 10% */}
              <div className="absolute inset-[10%] z-0 overflow-hidden bg-gray-100">
                {coverImage ? (
                  <img 
                    src={coverImage} 
                    alt="Portada del Álbum" 
                    className="w-full h-full object-cover transition-transform duration-700" 
                    style={{
                      objectPosition: '50% 50%',
                      transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                    }}
                />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                      <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                        <span className="text-[3cqw] font-black">IMAGE</span>
                      </div>
                      <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                    </div>
                  </div>
                )}
              </div>
    
              {/* Capa 2: pointer-events-none permite interactuar con la imagen */}
              <div className="absolute inset-[10%] z-10 flex flex-col justify-between p-[6cqw] pointer-events-none">
                {/* Título en la parte superior izquierda del área de la imagen */}
                <div className="w-full text-left">
                  <h2 className="text-black text-[8cqw] font-bold leading-none">
                    {coverTitle}
                  </h2>
                </div>
                
                {/* Subtítulo en la parte inferior derecha del área de la imagen */}
                <div className="w-full flex justify-end items-end">
                  <p className="text-black text-[5cqw] font-medium leading-none">
                    {coverSubtitle}
                  </p>
                </div>
              </div>
            </div>
          );
        default: return null;
      }
    }
    
    if (isHorizontal) {
      switch (selectedLayout) {
        case 1:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '28 / 21',
                containerType: 'inline-size'
              }}
            >
              <div className="h-[25%] flex-shrink-0 flex flex-col items-center justify-center p-[4cqw] bg-white z-10">
                <div className="absolute top-[8%]">
                  <div className="text-[5cqw] font-bold tracking-wide text-black text-center leading-none">
                    {coverTitle}
                  </div>
                  {/* Frame 3 (Línea separadora) */}
                  <div className="text-[3cqw] text-gray-600 text-center font-medium tracking-widest">
                    {coverSubtitle}
                  </div>
                </div>
              </div>
              {/* Contenedor de la Imagen (70% superior con padding visual) */}
              <div className="relative w-full h-[75%] bg-white">
                <div className="absolute top-[0%] left-[10%] right-[10%] bottom-[10%] overflow-hidden">
                  {coverImage ? (
                    <img 
                      src={coverImage} 
                      alt="Portada del Álbum" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700" 
                      style={{
                        objectPosition: '50% 50%',
                        transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                        <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                           <span className="text-[3cqw] font-black">IMAGE</span>
                        </div>
                        <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Frame 4 (El bloque inferior con los textos, 30% de alto) */}
              
            </div>
          );
        case 2:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '28 / 21',
                containerType: 'inline-size'
              }}
            >
              {/* Contenedor de la Imagen (75% superior con padding visual) */}
              <div className="relative w-full h-[75%] bg-white">
                <div className="absolute top-[10%] left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {coverImage ? (
                    <img 
                      src={coverImage} 
                      alt="Portada del Álbum" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700" 
                      style={{
                        objectPosition: '50% 50%',
                        transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                        <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                           <span className="text-[3cqw] font-black">IMAGE</span>
                        </div>
                        <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Frame 4 (El bloque inferior con los textos, 25% de alto) */}
                <div className="h-[25%] flex-shrink-0 flex flex-col items-center justify-center p-[8cqw] bg-white z-10">
                  <div className="w-full py-[500cqw]">
                    <div className="h-[.8cqw] bg-black w-full" />
                    <div className="flex justify-between items-center py-[4cqw]">
                      <h2 className="text-black text-[4cqw] font-bold">{coverTitle}</h2>
                      <p className="text-black text-[4cqw]">{coverSubtitle}</p>
                    </div>
                    <div className="h-[.8cqw] bg-black w-full" />
                  </div>
                </div>
            </div>
          );
        case 3:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '28 / 21',
                containerType: 'inline-size'
              }}
            >
              {/* Capa 1: Contenedor de la Imagen con MARGEN del 10% */}
              <div className="absolute inset-[10%] z-0 overflow-hidden bg-gray-100">
                {coverImage ? (
                  <img 
                    src={coverImage} 
                    alt="Portada del Álbum" 
                    className="w-full h-full object-cover transition-transform duration-700" 
                    style={{
                      objectPosition: '50% 50%',
                      transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                      <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                        <span className="text-[3cqw] font-black">IMAGE</span>
                      </div>
                      <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                    </div>
                  </div>
                )}
              </div>
    
              {/* Capa 2: Contenedor de Textos Superpuestos (z-10) */}
              <div 
                className="absolute inset-[10%] z-10 pointer-events-none"
                style={{ containerType: 'inline-size' }}
              >
                {/* Recuadro de textos - TAMAÑO REDUCIDO */}
                <div 
                  className="absolute left-1/2 -translate-x-1/2 bottom-[15%] bg-white border border-black shadow-2xl p-[4cqw] text-center w-[65%] ring-white ring-[2cqw]"
                >
                  {/* Título - alineado al centro */}
                  <div className="w-full mb-[1.5cqw]">
                    <h2 
                      className="text-black text-[6cqw] font-black tracking-tight leading-none" 
                    >
                      {coverTitle}
                    </h2>
                  </div>
                  
                  {/* Línea separadora negro */}
                  <div className="w-[85%] h-[0.25cqw] bg-black mx-auto my-[2.5cqw]"></div>
    
                  {/* Subtítulo - alineado al centro */}
                  <div className="w-full">
                    <p 
                      className="text-gray-600 text-[3.5cqw] font-medium tracking-widest leading-tight" 
                    >
                      {coverSubtitle}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        case 4:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '28 / 21',
                containerType: 'inline-size'
              }}
            >
              {/* Frame 4 (El bloque inferior con los textos, max 20% de alto) */}
              <div className="h-[5%] flex-shrink-0 flex flex-col items-center justify-center p-[5cqw] bg-white z-10">
                <div className="w-full py-[500cqw]">
                  <div className="flex justify-between items-center py-[4cqw]">
                    <h2 className="text-black text-[4cqw] font-bold">{coverTitle}</h2>
                  </div>
                </div>
              </div>
              {/* Contenedor de la Imagen (80% superior con padding visual) */}
              <div className="relative w-full h-[90%] bg-white">
                <div className="absolute top-0 left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {coverImage ? (
                    <img 
                      src={coverImage} 
                      alt="Portada del Álbum" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700" 
                      style={{
                        objectPosition: '50% 50%',
                        transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                        <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                           <span className="text-[3cqw] font-black">IMAGE</span>
                        </div>
                        <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Frame 4 (El bloque inferior con los textos, max 20% de alto) */}
              <div className="h-[5%] flex-shrink-0 flex flex-col items-center justify-center p-[5cqw] bg-white z-10">
                <div className="w-full py-[500cqw]">
                  <div className="flex justify-end items-center py-[4cqw]">
                    <p className="text-black text-[4cqw]">{coverSubtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        case 5:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '28 / 21',
                containerType: 'inline-size'
              }}>
              {/* Capa 1: Contenedor de la Imagen con MARGEN del 10% */}
              <div className="absolute inset-[10%] z-0 overflow-hidden bg-gray-100">
                {coverImage ? (
                  <img 
                    src={coverImage} 
                    alt="Portada del Álbum" 
                    className="w-full h-full object-cover transition-transform duration-700" 
                    style={{
                      objectPosition: '50% 50%',
                      transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                    }}
                />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                      <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                        <span className="text-[3cqw] font-black">IMAGE</span>
                      </div>
                      <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                    </div>
                  </div>
                )}
              </div>
    
              {/* pointer-events-none permite que los clics pasen a través del texto para interactuar con la imagen */}
              <div className="absolute inset-[10%] z-10 flex flex-col justify-between p-[6cqw] pointer-events-none">
                {/* Título en la parte superior izquierda del área de la imagen */}
                <div className="w-full text-left">
                  <h2 className="text-black text-[8cqw] font-bold leading-none">
                    {coverTitle}
                  </h2>
                </div>
                
                {/* Subtítulo en la parte inferior derecha del área de la imagen */}
                <div className="w-full flex justify-end items-end">
                  <p className="text-black text-[5cqw] font-medium leading-none">
                    {coverSubtitle}
                  </p>
                </div>
              </div>
            </div>
          );
        default: return null;
      }
    }

    if (isSquare) {
      switch (selectedLayout) {
        case 1:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '1 / 1',
                containerType: 'inline-size'
              }}
            >
              {/* Contenedor de la Imagen (70% superior con padding visual) */}
              <div className="relative w-full h-[70%] bg-white">
                <div className="absolute top-[10%] left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {coverImage ? (
                    <img 
                      src={coverImage} 
                      alt="Portada del Álbum" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700" 
                      style={{
                        objectPosition: '50% 50%',
                        transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                        <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                           <span className="text-[3cqw] font-black">IMAGE</span>
                        </div>
                        <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Frame 4 (El bloque inferior con los textos, 30% de alto) */}
                <div className="h-[30%] flex-shrink-0 flex flex-col items-center justify-center p-[4cqw] bg-white z-10">
                  <div className="text-[5cqw] font-bold tracking-wide text-black text-center leading-none">
                    {coverTitle}
                  </div>
                  {/* Frame 3 (Línea separadora) */}
                  <div className="w-[85%] h-[0.5cqw] bg-black my-[2cqw]"></div>
                  <div className="text-[3cqw] text-gray-600 text-center font-medium tracking-widest">
                    {coverSubtitle}
                  </div>
                </div>
            </div>
          );
        case 2:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '1 / 1',
                containerType: 'inline-size'
              }}
            >
              {/* Contenedor de la Imagen (75% superior con padding visual) */}
              <div className="relative w-full h-[75%] bg-white">
                <div className="absolute top-[10%] left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {coverImage ? (
                    <img 
                      src={coverImage} 
                      alt="Portada del Álbum" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700" 
                      style={{
                        objectPosition: '50% 50%',
                        transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                        <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                           <span className="text-[3cqw] font-black">IMAGE</span>
                        </div>
                        <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Frame 4 (El bloque inferior con los textos, 25% de alto) */}
                <div className="h-[25%] flex-shrink-0 flex flex-col items-center justify-center p-[8cqw] bg-white z-10">
                  <div className="w-full py-[500cqw]">
                    <div className="h-[.8cqw] bg-black w-full" />
                    <div className="flex justify-between items-center py-[4cqw]">
                      <h2 className="text-black text-[4cqw] font-bold">{coverTitle}</h2>
                      <p className="text-black text-[4cqw]">{coverSubtitle}</p>
                    </div>
                    <div className="h-[.8cqw] bg-black w-full" />
                  </div>
                </div>
            </div>
          );
        case 3:
            return (
              <div 
                className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ 
                  width: '100%',
                  aspectRatio: '1 / 1',
                  containerType: 'inline-size'
                }}
              >
                {/* Capa 1: Contenedor de la Imagen con MARGEN del 10% */}
                <div className="absolute inset-[10%] z-0 overflow-hidden bg-gray-100">
                  {coverImage ? (
                    <img 
                      src={coverImage} 
                      alt="Portada del Álbum" 
                      className="w-full h-full object-cover transition-transform duration-700" 
                      style={{
                        objectPosition: '50% 50%',
                        transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                        <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                          <span className="text-[3cqw] font-black">IMAGE</span>
                        </div>
                        <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                      </div>
                    </div>
                  )}
                </div>
      
                {/* Capa 2: Contenedor de Textos Superpuestos (z-10) */}
                {/* CORRECCIÓN: Se quitó overflow-hidden para que la sombra y el marco no se corten */}
                <div 
                  className="absolute inset-[10%] z-10 pointer-events-none"
                  style={{ containerType: 'inline-size' }}
                >
                  {/* Recuadro de textos - CORRECCIÓN: Se usa bottom-[15%] en lugar de cqh */}
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 bottom-[15%] bg-white border border-black shadow-2xl p-[4cqw] text-center w-[70%] ring-white ring-[2cqw]"
                  >
                    {/* Título - alineado al centro */}
                    <div className="w-full mb-[1.5cqw]">
                      <h2 
                        className="text-black text-[6cqw] font-black tracking-tight leading-none" 
                      >
                        {coverTitle}
                      </h2>
                    </div>
                    
                    {/* Línea separadora negro */}
                    <div className="w-[85%] h-[0.25cqw] bg-black mx-auto my-[2.5cqw]"></div>
      
                    {/* Subtítulo - alineado al centro */}
                    <div className="w-full">
                      <p 
                        className="text-gray-600 text-[3.5cqw] font-medium tracking-widest leading-tight" 
                      >
                        {coverSubtitle}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
        case 4:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '1 / 1',
                containerType: 'inline-size'
              }}
            >
              {/* Frame 4 (El bloque inferior con los textos, max 20% de alto) */}
              <div className="h-[10%] flex-shrink-0 flex flex-col items-center justify-center p-[5cqw] bg-white z-10">
                <div className="w-full py-[500cqw]">
                  <div className="flex justify-between items-center py-[4cqw]">
                    <h2 className="text-black text-[4cqw] font-bold">{coverTitle}</h2>
                  </div>
                </div>
              </div>
              {/* Contenedor de la Imagen (80% superior con padding visual) */}
              <div className="relative w-full h-[80%] bg-white">
                <div className="absolute top-0 left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {coverImage ? (
                    <img 
                      src={coverImage} 
                      alt="Portada del Álbum" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700" 
                      style={{
                        objectPosition: '50% 50%',
                        transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                        <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                           <span className="text-[3cqw] font-black">IMAGE</span>
                        </div>
                        <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Frame 4 (El bloque inferior con los textos, max 20% de alto) */}
              <div className="h-[10%] flex-shrink-0 flex flex-col items-center justify-center p-[5cqw] bg-white z-10">
                <div className="w-full py-[500cqw]">
                  <div className="flex justify-end items-center py-[4cqw]">
                    <p className="text-black text-[4cqw]">{coverSubtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        case 5:
          return (
            <div 
              className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ 
                width: '100%',
                aspectRatio: '1 / 1',
                containerType: 'inline-size'
              }}>
              {/* Capa 1: Contenedor de la Imagen con MARGEN del 10% */}
              {/* inset-[10%] aplica top, right, bottom, left: 10% */}
              <div className="absolute inset-[10%] z-0 overflow-hidden bg-gray-100">
                {coverImage ? (
                  <img 
                    src={coverImage} 
                    alt="Portada del Álbum" 
                    className="w-full h-full object-cover transition-transform duration-700" 
                    style={{
                      objectPosition: '50% 50%',
                      transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
                    }}
                />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
                      <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
                        <span className="text-[3cqw] font-black">IMAGE</span>
                      </div>
                      <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
                    </div>
                  </div>
                )}
              </div>
    
              {/* pointer-events-none permite que los clics pasen a través del texto para interactuar con la imagen */}
              <div className="absolute inset-[10%] z-10 flex flex-col justify-between p-[6cqw] pointer-events-none">
                
                {/* Título en la parte superior izquierda del área de la imagen */}
                <div className="w-full text-left">
                  <h2 
                    className="text-black text-[8cqw] font-bold leading-none" 
                  >
                    {coverTitle}
                  </h2>
                </div>
                
                {/* Subtítulo en la parte inferior derecha del área de la imagen */}
                <div className="w-full flex justify-end items-end">
                  <p 
                    className="text-black text-[5cqw] font-medium leading-none" 
                  >
                    {coverSubtitle}
                  </p>
                </div>
    
              </div>
            </div>
          );
      }
    }
    return null;
  };

  // --- RETORNO PRINCIPAL DEL COMPONENTE RESTAURADO ---
  
  // Para los formatos cuadrados, renderPreviewContent() devuelve la tarjeta entera
  if (isSquare) {
    return (
      <React.Fragment>
        {renderPreviewContent()}
      </React.Fragment>
    );
  }

  // Para formatos verticales y horizontales (el comportamiento clásico)
  return (
    <div 
      className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
      style={{ 
        width: '100%',
        aspectRatio: aspectRatio,
        containerType: 'inline-size'
      }}
    >
      {coverImage ? (
        <img 
          src={coverImage} 
          alt="Portada del Álbum" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700" 
          style={{
            objectPosition: '50% 50%',
            transform: `scale(${coverCrop.zoom}) translate(${(50 - coverCrop.x)}%, ${(50 - coverCrop.y)}%)`
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
            <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
               <span className="text-[3cqw] font-black">IMAGE</span>
            </div>
            <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
          </div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none select-none">
         {renderPreviewContent()}
      </div>
    </div>
  );
};

export default CoverPreview;