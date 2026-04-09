import React, { useMemo } from 'react';
import ImageCropper from './ImageCropper';

interface CoverPreviewProps {
  coverSize: '20x20' | '30x30' | '21x28' | '28x21';
  coverType?: 'Tela' | 'Papel';
  coverImage?: string;
  coverTitle?: string;
  coverSubtitle?: string;
  coverYear?: string;
  spineText?: string;
  selectedLayout: number;
  coverCrop?: { x: number; y: number; zoom: number };
  typographyColor?: string;

  hideSpine?: boolean; // Usado también para saber si estamos en "Modo Impresión PDF"
  customization?: any;
  photos?: (string | null)[];
  photoCrops?: Record<string, { x: number; y: number; zoom: number }>;
}

const CoverPreview: React.FC<CoverPreviewProps> = ({
  coverSize,
  coverType = 'Papel',
  coverImage = '',
  coverTitle = '',
  coverSubtitle = '',
  coverYear = '',
  spineText = '',
  selectedLayout,
  coverCrop = { x: 50, y: 50, zoom: 1 },
  typographyColor = '#000000',
  hideSpine = false,
}) => {
  const isVertical = coverSize === '28x21';
  const isSquare = coverSize === '20x20' || coverSize === '30x30';
  const isHorizontal = coverSize === '21x28';

  const aspectRatio = useMemo(() => {
    if (isVertical) return '21 / 28';
    if (isHorizontal) return '28 / 21';
    return '1 / 1';
  }, [isVertical, isHorizontal]);

  // --- ELIMINAR SOMBRAS SI ESTAMOS EN EL MODO DE IMPRESIÓN (hideSpine === true) ---
  const containerShadow = hideSpine ? 'shadow-none' : 'shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)]';
  const floatingBoxShadow = hideSpine ? 'shadow-none' : 'shadow-2xl';

  const renderImageSlot = () => {
    if (coverImage) {
      return (
        <div className="absolute inset-0 w-full h-full">
          <ImageCropper 
            src={coverImage} 
            position={coverCrop} 
            alt="Portada" 
          />
        </div>
      );
    }
    return (
      <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-[4cqw] text-gray-300">
          <div className="w-[16cqw] h-[16cqw] border-[0.5cqw] border-gray-300 rounded-[2cqw] flex items-center justify-center">
            <span className="text-[3cqw] font-black">IMAGE</span>
          </div>
          <span className="font-black tracking-[0.3em] text-[5cqw]">Sin Imagen</span>
        </div>
      </div>
    );
  };

  const renderPreviewContent = () => {
    // ========================================================================
    // LAYOUTS EXCLUSIVOS PARA PORTADA DE TELA
    // ========================================================================
    if (coverType === 'Tela') {
      const containerStyle = { width: '100%', aspectRatio, containerType: 'inline-size' as const };
      
      const commonOverlay = (
        <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100">
          {renderImageSlot()}
        </div>
      );

      switch (selectedLayout) {
        case 1:
          // Layout 1 Tela: Título a 30% top, Subtítulo a 60% top.
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={containerStyle}>
              {commonOverlay}
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="absolute w-full text-center" style={{ top: '30%', transform: 'translateY(-50%)' }}>
                  <h2 className="text-[4cqw] font-bold leading-none" style={{ color: typographyColor }}>{coverTitle}</h2>
                </div>
                <div className="absolute w-full text-center" style={{ top: '60%', transform: 'translateY(-50%)' }}>
                  <p className="text-[2.4cqw] font-medium tracking-widest" style={{ color: typographyColor }}>{coverSubtitle}</p>
                </div>
              </div>
            </div>
          );
        case 2:
          // Layout 2 Tela: Título centrado a 30% top. Subtítulo a 20% bottom, 20% right.
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={containerStyle}>
              {commonOverlay}
              <div className="absolute inset-0 z-10 pointer-events-none">
                <div className="absolute w-full text-center" style={{ top: '30%', transform: 'translateY(-50%)' }}>
                  <h2 className="text-[3.2cqw] font-bold leading-none" style={{ color: typographyColor }}>{coverTitle}</h2>
                </div>
                <div className="absolute" style={{ bottom: '20%', right: '20%' }}>
                  <p className="text-[3.2cqw] font-medium leading-none text-right" style={{ color: typographyColor }}>{coverSubtitle}</p>
                </div>
              </div>
            </div>
          );
        case 3:
          // Layout 3 Tela: Título Bottom-Right, Subtítulo Top-Left (Inverso a Papel 5)
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={containerStyle}>
              {commonOverlay}
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-[10cqw] pointer-events-none">
                <div className="w-full text-left">
                  <p className="text-[4cqw] font-medium leading-none" style={{ color: typographyColor }}>{coverSubtitle}</p>
                </div>
                <div className="w-full flex justify-end items-end">
                  <h2 className="text-[6.4cqw] font-bold leading-none text-right" style={{ color: typographyColor }}>{coverTitle}</h2>
                </div>
              </div>
            </div>
          );
        default: return null;
      }
    }

    // ========================================================================
    // LAYOUTS PARA PORTADA DE PAPEL (Diferenciados por tamaño)
    // ========================================================================
    if (isVertical) {
      switch (selectedLayout) {
        case 1:
          return (
            <div 
              className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '21 / 28', containerType: 'inline-size' }}
            >
              <div className="h-[20%] flex-shrink-0 flex flex-col items-center justify-center p-[10cqw] bg-white z-10">
                <div className="text-[4cqw] font-bold tracking-wide text-center leading-none" style={{ color: typographyColor }}>
                  {coverTitle}
                </div>
                <div className="text-[2.4cqw] text-center font-medium tracking-widest mt-[2cqw]" style={{ color: typographyColor }}>
                  {coverSubtitle}
                </div>
              </div>
              <div className="relative w-full h-[80%] bg-white">
                <div className="absolute top-[0%] left-[10%] right-[10%] bottom-[10%] overflow-hidden">
                  {renderImageSlot()}
                </div>
              </div>
            </div>
          );
        case 2:
          return (
            <div 
              className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '21 / 28', containerType: 'inline-size' }}
            >
              <div className="relative w-full h-[75%] bg-white">
                <div className="absolute top-[10%] left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {renderImageSlot()}
                </div>
              </div>
              <div className="h-[25%] flex-shrink-0 flex flex-col items-center justify-center p-[8cqw] bg-white z-10">
                <div className="w-full">
                  <div className="h-[0.2cqw] w-full" style={{ backgroundColor: typographyColor }} />
                  <div className="flex justify-between items-center py-[4cqw]">
                    <h2 className="text-[3.2cqw] font-bold" style={{ color: typographyColor }}>{coverTitle}</h2>
                    <p className="text-[3.2cqw]" style={{ color: typographyColor }}>{coverSubtitle}</p>
                  </div>
                  <div className="h-[0.2cqw] w-full" style={{ backgroundColor: typographyColor }} />
                </div>
              </div>
            </div>
          );
        case 3:
          return (
            <div 
              className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '21 / 28', containerType: 'inline-size' }}
            >
              <div className="absolute inset-[10%] z-0 overflow-hidden bg-gray-100">
                {renderImageSlot()}
              </div>
              <div className="absolute inset-[10%] z-10 pointer-events-none" style={{ containerType: 'inline-size' }}>
                <div 
                  className={`absolute left-1/2 -translate-x-1/2 bottom-[15%] bg-white border ${floatingBoxShadow} p-[3.2cqw] text-center w-[56%] ring-white ring-[1.6cqw]`}
                  style={{ borderColor: typographyColor }}
                >
                  <div className="w-full mb-[1.2cqw]">
                    <h2 className="text-[4.8cqw] font-black tracking-tight leading-none" style={{ color: typographyColor }}>{coverTitle}</h2>
                  </div>
                  <div className="w-[85%] h-[0.2cqw] mx-auto my-[2cqw]" style={{ backgroundColor: typographyColor }}></div>
                  <div className="w-full">
                    <p className="text-[2.8cqw] font-medium tracking-widest leading-tight" style={{ color: typographyColor }}>{coverSubtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        case 4:
          return (
            <div 
              className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '21 / 28', containerType: 'inline-size' }}
            >
              <div className="h-[10%] flex-shrink-0 flex flex-col items-center justify-center p-[8cqw] bg-white z-10">
                <div className="w-full">
                  <div className="flex justify-between items-center py-[4cqw]">
                    <h2 className="text-[3.2cqw] font-bold" style={{ color: typographyColor }}>{coverTitle}</h2>
                  </div>
                </div>
              </div>
              <div className="relative w-full h-[80%] bg-white">
                <div className="absolute top-0 left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {renderImageSlot()}
                </div>
              </div>
              <div className="h-[10%] flex-shrink-0 flex flex-col items-center justify-center p-[8cqw] bg-white z-10">
                <div className="w-full">
                  <div className="flex justify-end items-center py-[4cqw]">
                    <p className="text-[3.2cqw]" style={{ color: typographyColor }}>{coverSubtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        case 5:
          return (
            <div 
              className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '21 / 28', containerType: 'inline-size' }}>
              <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100">
                {renderImageSlot()}
              </div>
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-[10cqw] pointer-events-none">
                <div className="w-full text-left">
                  <h2 className="text-[6.4cqw] font-bold leading-none" style={{ color: typographyColor }}>{coverTitle}</h2>
                </div>
                <div className="w-full flex justify-end items-end">
                  <p className="text-[4cqw] font-medium leading-none" style={{ color: typographyColor }}>{coverSubtitle}</p>
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
              className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '28 / 21', containerType: 'inline-size' }}
            >
              <div className="h-[25%] flex-shrink-0 flex flex-col items-center justify-center p-[4cqw] bg-white z-10">
                <div className="absolute top-[8%]">
                  <div className="text-[4cqw] font-bold tracking-wide text-center leading-none" style={{ color: typographyColor }}>{coverTitle}</div>
                  <div className="text-[2.4cqw] text-center font-medium tracking-widest mt-[1cqw]" style={{ color: typographyColor }}>{coverSubtitle}</div>
                </div>
              </div>
              <div className="relative w-full h-[75%] bg-white">
                <div className="absolute top-[0%] left-[10%] right-[10%] bottom-[10%] overflow-hidden">
                  {renderImageSlot()}
                </div>
              </div>
            </div>
          );
        case 2:
          return (
            <div 
              className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '28 / 21', containerType: 'inline-size' }}
            >
              <div className="relative w-full h-[75%] bg-white">
                <div className="absolute top-[10%] left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {renderImageSlot()}
                </div>
              </div>
              <div className="h-[25%] flex-shrink-0 flex flex-col items-center justify-center p-[8cqw] bg-white z-10">
                <div className="w-full">
                  <div className="h-[0.2cqw] w-full" style={{ backgroundColor: typographyColor }} />
                  <div className="flex justify-between items-center py-[4cqw]">
                    <h2 className="text-[3.2cqw] font-bold" style={{ color: typographyColor }}>{coverTitle}</h2>
                    <p className="text-[3.2cqw]" style={{ color: typographyColor }}>{coverSubtitle}</p>
                  </div>
                  <div className="h-[0.2cqw] w-full" style={{ backgroundColor: typographyColor }} />
                </div>
              </div>
            </div>
          );
        case 3:
          return (
            <div 
              className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '28 / 21', containerType: 'inline-size' }}
            >
              <div className="absolute inset-[10%] z-0 overflow-hidden bg-gray-100">
                {renderImageSlot()}
              </div>
              <div className="absolute inset-[10%] z-10 pointer-events-none" style={{ containerType: 'inline-size' }}>
                <div 
                  className={`absolute left-1/2 -translate-x-1/2 bottom-[12%] bg-white border ${floatingBoxShadow} py-[2cqw] px-[3.2cqw] text-center w-[70%] ring-white ring-[1.6cqw]`}
                  style={{ borderColor: typographyColor }}
                >
                  <div className="w-full mb-[0.8cqw]">
                    <h2 className="text-[4.8cqw] font-black tracking-tight leading-none" style={{ color: typographyColor }}>{coverTitle}</h2>
                  </div>
                  <div className="w-[85%] h-[0.2cqw] mx-auto my-[1.5cqw]" style={{ backgroundColor: typographyColor }}></div>
                  <div className="w-full">
                    <p className="text-[2.8cqw] font-medium tracking-widest leading-tight" style={{ color: typographyColor }}>{coverSubtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        case 4:
          return (
            <div 
              className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '28 / 21', containerType: 'inline-size' }}
            >
              <div className="h-[5%] flex-shrink-0 flex flex-col items-center justify-center p-[5cqw] bg-white z-10">
                <div className="w-full">
                  <div className="flex justify-between items-center py-[4cqw]">
                    <h2 className="text-[3.2cqw] font-bold" style={{ color: typographyColor }}>{coverTitle}</h2>
                  </div>
                </div>
              </div>
              <div className="relative w-full h-[90%] bg-white">
                <div className="absolute top-0 left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {renderImageSlot()}
                </div>
              </div>
              <div className="h-[5%] flex-shrink-0 flex flex-col items-center justify-center p-[5cqw] bg-white z-10">
                <div className="w-full">
                  <div className="flex justify-end items-center py-[4cqw]">
                    <p className="text-[3.2cqw]" style={{ color: typographyColor }}>{coverSubtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        case 5:
          return (
            <div 
              className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '28 / 21', containerType: 'inline-size' }}>
              <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100">
                {renderImageSlot()}
              </div>
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-[10cqw] pointer-events-none">
                <div className="w-full text-left">
                  <h2 className="text-[6.4cqw] font-bold leading-none" style={{ color: typographyColor }}>{coverTitle}</h2>
                </div>
                <div className="w-full flex justify-end items-end">
                  <p className="text-[4cqw] font-medium leading-none" style={{ color: typographyColor }}>{coverSubtitle}</p>
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
              className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '1 / 1', containerType: 'inline-size' }}
            >
              <div className="relative w-full h-[70%] bg-white">
                <div className="absolute top-[10%] left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {renderImageSlot()}
                </div>
              </div>
              <div className="h-[30%] flex-shrink-0 flex flex-col items-center justify-center p-[4cqw] bg-white z-10">
                <div className="text-[4cqw] font-bold tracking-wide text-center leading-none" style={{ color: typographyColor }}>{coverTitle}</div>
                <div className="w-[85%] h-[0.5cqw] my-[2cqw]" style={{ backgroundColor: typographyColor }}></div>
                <div className="text-[2.4cqw] text-center font-medium tracking-widest" style={{ color: typographyColor }}>{coverSubtitle}</div>
              </div>
            </div>
          );
        case 2:
          return (
            <div 
              className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '1 / 1', containerType: 'inline-size' }}
            >
              <div className="relative w-full h-[75%] bg-white">
                <div className="absolute top-[10%] left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {renderImageSlot()}
                </div>
              </div>
              <div className="h-[25%] flex-shrink-0 flex flex-col items-center justify-center p-[8cqw] bg-white z-10">
                <div className="w-full">
                  <div className="h-[0.2cqw] w-full" style={{ backgroundColor: typographyColor }} />
                  <div className="flex justify-between items-center py-[4cqw]">
                    <h2 className="text-[3.2cqw] font-bold" style={{ color: typographyColor }}>{coverTitle}</h2>
                    <p className="text-[3.2cqw]" style={{ color: typographyColor }}>{coverSubtitle}</p>
                  </div>
                  <div className="h-[0.2cqw] w-full" style={{ backgroundColor: typographyColor }} />
                </div>
              </div>
            </div>
          );
        case 3:
            return (
              <div 
                className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
                style={{ width: '100%', aspectRatio: '1 / 1', containerType: 'inline-size' }}
              >
                <div className="absolute inset-[10%] z-0 overflow-hidden bg-gray-100">
                  {renderImageSlot()}
                </div>
                <div className="absolute inset-[10%] z-10 pointer-events-none" style={{ containerType: 'inline-size' }}>
                  <div 
                    className={`absolute left-1/2 -translate-x-1/2 bottom-[15%] bg-white border ${floatingBoxShadow} p-[3.2cqw] text-center w-[56%] ring-white ring-[1.6cqw]`}
                    style={{ borderColor: typographyColor }}
                  >
                    <div className="w-full mb-[1.2cqw]">
                      <h2 className="text-[4.8cqw] font-black tracking-tight leading-none" style={{ color: typographyColor }}>{coverTitle}</h2>
                    </div>
                    <div className="w-[85%] h-[0.2cqw] mx-auto my-[2cqw]" style={{ backgroundColor: typographyColor }}></div>
                    <div className="w-full">
                      <p className="text-[2.8cqw] font-medium tracking-widest leading-tight" style={{ color: typographyColor }}>{coverSubtitle}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
        case 4:
          return (
            <div 
              className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '1 / 1', containerType: 'inline-size' }}
            >
              <div className="h-[10%] flex-shrink-0 flex flex-col items-center justify-center p-[5cqw] bg-white z-10">
                <div className="w-full">
                  <div className="flex justify-between items-center py-[4cqw]">
                    <h2 className="text-[3.2cqw] font-bold" style={{ color: typographyColor }}>{coverTitle}</h2>
                  </div>
                </div>
              </div>
              <div className="relative w-full h-[80%] bg-white">
                <div className="absolute top-0 left-[10%] right-[10%] bottom-0 overflow-hidden">
                  {renderImageSlot()}
                </div>
              </div>
              <div className="h-[10%] flex-shrink-0 flex flex-col items-center justify-center p-[5cqw] bg-white z-10">
                <div className="w-full">
                  <div className="flex justify-end items-center py-[4cqw]">
                    <p className="text-[3.2cqw]" style={{ color: typographyColor }}>{coverSubtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        case 5:
          return (
            <div 
              className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`}
              style={{ width: '100%', aspectRatio: '1 / 1', containerType: 'inline-size' }}>
              <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100">
                {renderImageSlot()}
              </div>
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-[10cqw] pointer-events-none">
                <div className="w-full text-left">
                  <h2 className="text-[6.4cqw] font-bold leading-none" style={{ color: typographyColor }}>{coverTitle}</h2>
                </div>
                <div className="w-full flex justify-end items-end">
                  <p className="text-[4cqw] font-medium leading-none" style={{ color: typographyColor }}>{coverSubtitle}</p>
                </div>
              </div>
            </div>
          );
        default: return null;
      }
    }
    return null;
  };

  return (
    <div className="flex w-full items-stretch justify-center h-full">
      
      {/* Lomo (Spine) con el texto alineado a la parte superior */}
      {!hideSpine && (
        <div 
          className="w-[7%] mr-[3%] bg-white relative overflow-hidden shrink-0 border border-gray-200 shadow-sm" 
          style={{ containerType: 'inline-size' }}
        >
          <div className="absolute top-[10%] left-[50%]">
            <span 
              className="block whitespace-nowrap text-[35cqw] tracking-widest font-bold opacity-80" 
              style={{ 
                color: typographyColor,
                transform: 'rotate(90deg) translateY(-50%)',
                transformOrigin: 'top left'
              }}
            >
              {spineText}
            </span>
          </div>
        </div>
      )}

      {/* Recuadro de la Portada */}
      <div className={`${hideSpine ? 'w-full h-full' : 'w-[90%] shrink-0'} relative`}>
        {renderPreviewContent()}
      </div>

    </div>
  );
};

export default CoverPreview;