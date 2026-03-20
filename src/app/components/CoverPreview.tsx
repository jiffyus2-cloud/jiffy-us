import React, { useMemo } from 'react';

interface CoverPreviewProps {
  coverSize: '20x20' | '30x30' | '21x28' | '28x21';
  coverImage: string;
  coverTitle: string;
  coverSubtitle: string;
  coverYear: string;
  selectedLayout: number;
  coverCrop?: { x: number; y: number; zoom: number };
}

const CoverPreview: React.FC<CoverPreviewProps> = ({
  coverSize,
  coverImage,
  coverTitle,
  coverSubtitle,
  coverYear,
  selectedLayout,
  coverCrop = { x: 50, y: 50, zoom: 1 }
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

    if (isSquare) {
      switch (selectedLayout) {
        case 2:
          return (
            <div className="absolute inset-x-0 bottom-0 p-[8cqw]">
              <div className="h-[2cqw] bg-black w-full mb-[4cqw]" />
              <div className="flex justify-between items-end">
                <h2 className="text-white text-[6cqw] font-bold uppercase" style={textShadow}>{coverTitle}</h2>
                <p className="text-white text-[4cqw] uppercase" style={textShadow}>{coverSubtitle}</p>
              </div>
            </div>
          );
        case 3:
          return (
            <div className="absolute inset-x-0 bottom-[12cqw] flex justify-center">
              <div className="bg-white p-[8cqw] shadow-2xl text-center min-w-[65%]">
                <h2 className="text-black text-[7.5cqw] font-black uppercase">{coverTitle}</h2>
                <p className="text-gray-600 text-[4.5cqw] mt-[2cqw] uppercase font-medium">{coverSubtitle}</p>
              </div>
            </div>
          );
        case 4:
          return (
            <div className="absolute inset-0 p-[10cqw] flex flex-col justify-between">
              <h2 className="text-white text-[7.5cqw] font-bold self-start uppercase max-w-[70%] text-left" style={textShadow}>{coverTitle}</h2>
              <p className="text-white text-[5cqw] font-bold self-end uppercase text-right" style={textShadow}>{coverSubtitle}</p>
            </div>
          );
        case 5:
          return (
            <div className="absolute inset-0 p-[10cqw] flex flex-col justify-between overflow-hidden">
              <p className="text-white text-[6cqw] font-black self-start" style={textShadow}>{coverYear}</p>
              <h2 className="text-white text-[16cqw] font-black self-end uppercase leading-[0.85] text-right max-w-[95%] break-words" style={textShadow}>{coverTitle}</h2>
            </div>
          );
        default: return null;
      }
    }

    if (isVertical) {
      switch (selectedLayout) {
        case 1:
          return (
            <div className="absolute top-0 inset-x-0 flex justify-center">
              <div className="bg-white px-[10cqw] py-[8cqw] shadow-xl text-center rounded-b-[2cqw] border-x border-b border-gray-100">
                <h2 className="text-black text-[6cqw] font-bold uppercase leading-tight">{coverTitle}</h2>
                <p className="text-gray-500 text-[3.5cqw] mt-[2cqw] uppercase tracking-[0.2em] font-bold">{coverSubtitle}</p>
              </div>
            </div>
          );
        case 2:
          return (
            <div className="absolute inset-x-0 bottom-0 p-[8cqw]">
              <div className="h-[2cqw] bg-black w-full mb-[6cqw]" />
              <div className="flex justify-between items-end gap-[4cqw]">
                <h2 className="text-white text-[6cqw] font-black uppercase text-left leading-none" style={textShadow}>{coverTitle}</h2>
                <p className="text-white text-[3.5cqw] font-bold uppercase text-right" style={textShadow}>{coverSubtitle}</p>
              </div>
            </div>
          );
        case 3:
          return (
            <div className="absolute inset-x-0 bottom-[20cqw] flex justify-center px-[8cqw]">
              <div className="bg-white border-[1.5cqw] border-black p-[8cqw] text-center w-full shadow-2xl">
                <h2 className="text-black text-[7.5cqw] font-black uppercase leading-tight">{coverTitle}</h2>
                <div className="h-[0.25cqw] bg-black w-[12cqw] mx-auto my-[4cqw]" />
                <p className="text-black text-[4cqw] font-bold uppercase tracking-widest">{coverSubtitle}</p>
              </div>
            </div>
          );
        case 4:
          return (
            <div className="absolute inset-0 p-[12cqw] flex flex-col justify-between">
              <p className="text-white text-[6cqw] font-bold self-start uppercase text-left tracking-tight" style={textShadow}>{coverSubtitle}</p>
              <h2 className="text-white text-[12cqw] font-black self-end uppercase text-right leading-none" style={textShadow}>{coverTitle}</h2>
            </div>
          );
        default: return null;
      }
    }

    if (isHorizontal) {
      switch (selectedLayout) {
        case 1:
          return (
            <div className="absolute top-[12cqw] inset-x-0 flex flex-col items-center text-center px-[12cqw]">
              <h2 className="text-white text-[12cqw] font-black uppercase tracking-tighter italic" style={textShadow}>{coverTitle}</h2>
              <p className="text-white text-[6cqw] mt-[3cqw] font-bold tracking-[0.1em]" style={textShadow}>{coverSubtitle}</p>
            </div>
          );
        case 2:
          return (
            <div className="absolute inset-x-0 bottom-0 p-[10cqw]">
              <div className="h-[2.5cqw] bg-black w-full mb-[6cqw]" />
              <div className="flex justify-between items-end">
                <h2 className="text-white text-[7.5cqw] font-black uppercase" style={textShadow}>{coverTitle}</h2>
                <p className="text-white text-[4.5cqw] font-bold uppercase tracking-widest" style={textShadow}>{coverSubtitle}</p>
              </div>
            </div>
          );
        case 3:
          return (
            <div className="absolute inset-x-0 bottom-[12cqw] flex justify-center">
              <div className="bg-white border-[1cqw] border-black p-[8cqw] shadow-2xl text-center min-w-[50%]">
                <h2 className="text-black text-[9cqw] font-black uppercase">{coverTitle}</h2>
                <p className="text-black text-[5cqw] mt-[2cqw] font-medium uppercase tracking-widest">{coverSubtitle}</p>
              </div>
            </div>
          );
        case 4:
          return (
            <div className="absolute inset-0 p-[14cqw] flex flex-col justify-between">
              <h2 className="text-white text-[12cqw] font-black self-start uppercase max-w-[60%] leading-none text-left" style={textShadow}>{coverTitle}</h2>
              <p className="text-white text-[7.5cqw] font-bold self-end uppercase text-right" style={textShadow}>{coverSubtitle}</p>
            </div>
          );
        case 5:
          return (
            <div className="absolute inset-0 p-[12cqw] flex flex-col justify-between overflow-hidden">
              <p className="text-white text-[6cqw] font-black self-start tracking-tighter" style={textShadow}>{coverYear}</p>
              <h2 className="text-white text-[15cqw] font-black self-end uppercase leading-[0.75] text-right max-w-[95%] break-words" style={textShadow}>{coverTitle}</h2>
            </div>
          );
        default: return null;
      }
    }
    return null;
  };

  // NUEVO LAYOUT: Diseño 1 en formato cuadrado (Basado en la estructura CoverV1)
  if (isSquare && selectedLayout === 1) {
    return (
      <div 
        className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{ 
          width: '100%',
          aspectRatio: '1 / 1',
          containerType: 'inline-size'
        }}
      >
        {/* Contenedor de la Imagen (80% superior con padding visual) */}
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
        
        {/* Frame 4 (El bloque inferior con los textos, max 20% de alto) */}
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
  }

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