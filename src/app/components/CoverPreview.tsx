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

  const containerShadow = hideSpine ? 'shadow-none' : 'shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)]';
  const floatingBoxShadow = hideSpine ? 'shadow-none' : 'shadow-2xl';
  const showSpine = !hideSpine && coverType !== 'Tela';

  // Tamaño de fuente del lomo: 0.5cm / (7% × ancho_cover) × 100
  // 30x30→24cqw | 20x20→36cqw | horizontal(28cm)→25.5cqw | vertical(21cm)→34cqw
  const spineTextCqw = coverSize === '30x30' ? 24 : coverSize === '20x20' ? 36 : isHorizontal ? 25.5 : 34;

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
    // LAYOUTS EXCLUSIVOS PARA PORTADA DE TELA (sin cambios)
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
    // VERTICAL — 21cm ancho × 28cm alto (coverSize '28x21', isVertical)
    // ========================================================================
    if (isVertical) {
      const baseStyle = { width: '100%', aspectRatio: '21 / 28', containerType: 'inline-size' as const };

      switch (selectedLayout) {
        // L1: margen top + imagen flex-1 + texto + margen bottom
        case 1:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white" style={{ height: '2%' }} />
              <div className="relative w-full flex-1">
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: '2.38%', right: '2.38%' }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-white z-10" style={{ height: '12%' }}>
                <div className="font-bold tracking-wide text-center leading-none" style={{ fontSize: '6.2cqw', color: typographyColor }}>{coverTitle}</div>
                <div className="mt-[1cqw] text-center font-medium tracking-widest leading-none" style={{ fontSize: '4.8cqw', color: typographyColor }}>{coverSubtitle}</div>
              </div>
              <div className="flex-shrink-0 bg-white" style={{ height: '2%' }} />
            </div>
          );
        // L2: margen top + imagen flex-1 + líneas+texto + margen bottom
        case 2:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white" style={{ height: '2%' }} />
              <div className="relative w-full flex-1">
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: '2.38%', right: '2.38%' }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-white z-10" style={{ height: '10%' }}>
                <div style={{ width: '95.24%' }}>
                  <div className="h-[0.2cqw] w-full" style={{ backgroundColor: typographyColor }} />
                  <div className="flex justify-between items-center py-[1.5cqw]">
                    <h2 className="font-bold leading-none" style={{ fontSize: '2.86cqw', color: typographyColor }}>{coverTitle}</h2>
                    <p className="leading-none" style={{ fontSize: '2.86cqw', color: typographyColor }}>{coverSubtitle}</p>
                  </div>
                  <div className="h-[0.2cqw] w-full" style={{ backgroundColor: typographyColor }} />
                </div>
              </div>
              <div className="flex-shrink-0 bg-white" style={{ height: '2%' }} />
            </div>
          );
        // L3: imagen ocupa toda la página, recuadro blanco — 11cm×3.5cm a 1cm del borde inferior
        case 3: {
          const boxInset = { top: '0%', left: '0%', right: '0%', bottom: '0%' };
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100">
                {renderImageSlot()}
              </div>
              <div className="absolute inset-0 z-10 pointer-events-none" style={{ containerType: 'inline-size' as const }}>
                <div
                  className={`absolute left-1/2 -translate-x-1/2 bg-white border ${floatingBoxShadow} flex flex-col items-center justify-center ring-white ring-[1.6cqw]`}
                  style={{ width: '52.38%', height: '12.5%', bottom: '3.57%', borderColor: typographyColor }}
                >
                  <h2 className="font-black tracking-tight leading-none text-center" style={{ fontSize: '4.1cqw', color: typographyColor }}>{coverTitle}</h2>
                  <div className="w-[85%] h-[0.2cqw] my-[0.8cqw]" style={{ backgroundColor: typographyColor }} />
                  <p className="font-medium tracking-widest leading-tight text-center" style={{ fontSize: '4.1cqw', color: typographyColor }}>{coverSubtitle}</p>
                </div>
              </div>
            </div>
          );
        }
        // L4: sándwich título|imagen|subtítulo — imagen 19.7cm×20cm
        case 4:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white z-10 flex items-center" style={{ height: '14.29%' }}>
                <h2 className="font-bold leading-none px-[4%]" style={{ fontSize: '4.29cqw', color: typographyColor }}>{coverTitle}</h2>
              </div>
              <div className="relative w-full flex-shrink-0" style={{ height: '71.43%' }}>
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: '3.10%', right: '3.10%' }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 bg-white z-10 flex items-center justify-end" style={{ height: '14.28%' }}>
                <p className="leading-none px-[4%]" style={{ fontSize: '3.81cqw', color: typographyColor }}>{coverSubtitle}</p>
              </div>
            </div>
          );
        default: return null;
      }
    }

    // ========================================================================
    // HORIZONTAL — 28cm ancho × 21cm alto (coverSize '21x28', isHorizontal)
    // ========================================================================
    if (isHorizontal) {
      const baseStyle = { width: '100%', aspectRatio: '28 / 21', containerType: 'inline-size' as const };

      switch (selectedLayout) {
        // L1: margen top + imagen flex-1 + texto + margen bottom
        case 1:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white" style={{ height: '1.5%' }} />
              <div className="relative w-full flex-1">
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: '8.93%', right: '8.93%' }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-white z-10" style={{ height: '15%' }}>
                <div className="font-bold tracking-wide text-center leading-none" style={{ fontSize: '4.6cqw', color: typographyColor }}>{coverTitle}</div>
                <div className="mt-[1cqw] text-center font-medium tracking-widest leading-none" style={{ fontSize: '3.6cqw', color: typographyColor }}>{coverSubtitle}</div>
              </div>
              <div className="flex-shrink-0 bg-white" style={{ height: '1.5%' }} />
            </div>
          );
        // L2: margen top + imagen flex-1 + líneas+texto + margen bottom
        case 2:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white" style={{ height: '1.5%' }} />
              <div className="relative w-full flex-1">
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: '8.93%', right: '8.93%' }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-white z-10" style={{ height: '13%' }}>
                <div style={{ width: '82.14%' }}>
                  <div className="h-[0.2cqw] w-full" style={{ backgroundColor: typographyColor }} />
                  <div className="flex justify-between items-center py-[1.5cqw]">
                    <h2 className="font-bold leading-none" style={{ fontSize: '2.86cqw', color: typographyColor }}>{coverTitle}</h2>
                    <p className="leading-none" style={{ fontSize: '2.86cqw', color: typographyColor }}>{coverSubtitle}</p>
                  </div>
                  <div className="h-[0.2cqw] w-full" style={{ backgroundColor: typographyColor }} />
                </div>
              </div>
              <div className="flex-shrink-0 bg-white" style={{ height: '1.5%' }} />
            </div>
          );
        // L3: imagen ocupa toda la página, recuadro blanco — 11.75cm×3.75cm a 1.5cm del borde
        case 3:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100">
                {renderImageSlot()}
              </div>
              <div className="absolute inset-0 z-10 pointer-events-none" style={{ containerType: 'inline-size' as const }}>
                <div
                  className={`absolute left-1/2 -translate-x-1/2 bg-white border ${floatingBoxShadow} flex flex-col items-center justify-center ring-white ring-[1.6cqw]`}
                  style={{ width: '41.96%', height: '17.86%', bottom: '7.14%', borderColor: typographyColor }}
                >
                  <h2 className="font-black tracking-tight leading-none text-center" style={{ fontSize: '3.2cqw', color: typographyColor }}>{coverTitle}</h2>
                  <div className="w-[85%] h-[0.2cqw] my-[0.8cqw]" style={{ backgroundColor: typographyColor }} />
                  <p className="font-medium tracking-widest leading-tight text-center" style={{ fontSize: '3.2cqw', color: typographyColor }}>{coverSubtitle}</p>
                </div>
              </div>
            </div>
          );
        // L4: sándwich título|imagen|subtítulo — imagen 23.3cm×16.35cm
        case 4:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white z-10 flex items-center" style={{ height: '11.07%' }}>
                <h2 className="font-bold leading-none px-[4%]" style={{ fontSize: '2.86cqw', color: typographyColor }}>{coverTitle}</h2>
              </div>
              <div className="relative w-full flex-shrink-0" style={{ height: '77.86%' }}>
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: '8.39%', right: '8.39%' }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 bg-white z-10 flex items-center justify-end" style={{ height: '11.07%' }}>
                <p className="leading-none px-[4%]" style={{ fontSize: '2.86cqw', color: typographyColor }}>{coverSubtitle}</p>
              </div>
            </div>
          );
        // L5: imagen completa, texto superpuesto — título 1.5cm / subtítulo 1.5cm
        case 5:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100">
                {renderImageSlot()}
              </div>
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-[10cqw] pointer-events-none">
                <div className="w-full text-left">
                  <h2 className="font-bold leading-none" style={{ fontSize: '5.36cqw', color: typographyColor }}>{coverTitle}</h2>
                </div>
                <div className="w-full flex justify-end items-end">
                  <p className="font-medium leading-none" style={{ fontSize: '5.36cqw', color: typographyColor }}>{coverSubtitle}</p>
                </div>
              </div>
            </div>
          );
        default: return null;
      }
    }

    // ========================================================================
    // CUADRADO — 20×20cm y 30×30cm (isSquare)
    // ========================================================================
    if (isSquare) {
      const is30 = coverSize === '30x30';
      const baseStyle = { width: '100%', aspectRatio: '1 / 1', containerType: 'inline-size' as const };

      switch (selectedLayout) {
        // L1: imagen arriba, título+divisor+subtítulo abajo
        // 30x30: imagen 85%×68.33%, divisor 76.67%, título 6cqw, sub 5cqw
        // 20x20: imagen 85%×70%,    divisor 75%,    título 6.5cqw, sub 5cqw
        case 1: {
          const titleF = is30 ? '6cqw'   : '6.5cqw';
          const subF   = '5cqw';
          const divW   = is30 ? '76.67%' : '75%';
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white" style={{ height: '2.5%' }} />
              <div className="relative w-full flex-1">
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: '7.5%', right: '7.5%' }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-white z-10" style={{ height: '18%' }}>
                <div className="font-bold tracking-wide text-center leading-none" style={{ fontSize: titleF, color: typographyColor }}>{coverTitle}</div>
                <div className="my-[1cqw]" style={{ width: divW, height: '0.5cqw', backgroundColor: typographyColor }} />
                <div className="text-center font-medium tracking-widest leading-none" style={{ fontSize: subF, color: typographyColor }}>{coverSubtitle}</div>
              </div>
              <div className="flex-shrink-0 bg-white" style={{ height: '2.5%' }} />
            </div>
          );
        }
        // L2: margen top + imagen flex-1 + líneas+texto + margen bottom
        case 2: {
          const titleF = is30 ? '3.33cqw' : '3.5cqw';
          const subF   = titleF;
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white" style={{ height: '2.5%' }} />
              <div className="relative w-full flex-1">
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: '7.5%', right: '7.5%' }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-white z-10" style={{ height: '13%' }}>
                <div style={{ width: '85%' }}>
                  <div className="h-[0.2cqw] w-full" style={{ backgroundColor: typographyColor }} />
                  <div className="flex justify-between items-center py-[1.5cqw]">
                    <h2 className="font-bold leading-none" style={{ fontSize: titleF, color: typographyColor }}>{coverTitle}</h2>
                    <p className="leading-none" style={{ fontSize: subF, color: typographyColor }}>{coverSubtitle}</p>
                  </div>
                  <div className="h-[0.2cqw] w-full" style={{ backgroundColor: typographyColor }} />
                </div>
              </div>
              <div className="flex-shrink-0 bg-white" style={{ height: '2.5%' }} />
            </div>
          );
        }
        // L3: margen top+bottom 2.5%, imagen inset, recuadro blanco flotante
        // 30x30: overlay 95%×85%, box 60.78%×17.5%, bottom 3%, font 4.7cqw
        // 20x20: overlay 95%×85%, box 64.71%×18.5%, bottom 3%, font 4.7cqw
        case 3: {
          const boxW      = is30 ? '60.78%' : '64.71%';
          const boxH      = is30 ? '17.5%'  : '18.5%';
          const imgInset  = { top: '2.5%', left: '7.5%', right: '7.5%', bottom: '2.5%' };
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="absolute z-0 overflow-hidden bg-gray-100" style={imgInset}>
                {renderImageSlot()}
              </div>
              <div className="absolute z-10 pointer-events-none" style={{ ...imgInset, containerType: 'inline-size' as const }}>
                <div
                  className={`absolute left-1/2 -translate-x-1/2 bg-white border ${floatingBoxShadow} flex flex-col items-center justify-center ring-white ring-[1.6cqw]`}
                  style={{ width: boxW, height: boxH, bottom: '3%', borderColor: typographyColor }}
                >
                  <h2 className="font-black tracking-tight leading-none text-center" style={{ fontSize: '4.7cqw', color: typographyColor }}>{coverTitle}</h2>
                  <div className="w-[85%] h-[0.2cqw] my-[0.5cqw]" style={{ backgroundColor: typographyColor }} />
                  <p className="font-medium tracking-widest leading-tight text-center" style={{ fontSize: '4.7cqw', color: typographyColor }}>{coverSubtitle}</p>
                </div>
              </div>
            </div>
          );
        }
        // L4: sándwich título|imagen|subtítulo
        // 30x30: imagen 85%×73.33%, header 13.34%, footer 13.33%, título 3.33cqw, sub 3.33cqw
        // 20x20: imagen 85%×86%,    header 7%,     footer 7%,     título 3.5cqw,  sub 3.5cqw
        case 4: {
          const imgH    = is30 ? '73.33%' : '86%';
          const headerH = is30 ? '13.34%' : '7%';
          const footerH = is30 ? '13.33%' : '7%';
          const titleF  = is30 ? '3.33cqw' : '3.5cqw';
          const subF    = titleF;
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white z-10 flex items-center" style={{ height: headerH }}>
                <h2 className="font-bold leading-none px-[5%]" style={{ fontSize: titleF, color: typographyColor }}>{coverTitle}</h2>
              </div>
              <div className="relative w-full flex-shrink-0" style={{ height: imgH }}>
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: '7.5%', right: '7.5%' }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 bg-white z-10 flex items-center justify-end" style={{ height: footerH }}>
                <p className="leading-none px-[5%]" style={{ fontSize: subF, color: typographyColor }}>{coverSubtitle}</p>
              </div>
            </div>
          );
        }
        // L5: imagen completa, texto superpuesto
        // 30x30: título 9.33cqw (2.8cm), subtítulo 7.17cqw (2.15cm)
        // 20x20: título 8.5cqw  (1.7cm), subtítulo 6.5cqw  (1.3cm)
        case 5: {
          const titleF = is30 ? '9.33cqw' : '8.5cqw';
          const subF   = is30 ? '7.17cqw' : '6.5cqw';
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100">
                {renderImageSlot()}
              </div>
              <div className="absolute inset-0 z-10 flex flex-col justify-between p-[10cqw] pointer-events-none">
                <div className="w-full text-left">
                  <h2 className="font-bold leading-none" style={{ fontSize: titleF, color: typographyColor }}>{coverTitle}</h2>
                </div>
                <div className="w-full flex justify-end items-end">
                  <p className="font-medium leading-none" style={{ fontSize: subF, color: typographyColor }}>{coverSubtitle}</p>
                </div>
              </div>
            </div>
          );
        }
        default: return null;
      }
    }

    return null;
  };

  return (
    <div className="flex w-full items-stretch justify-center h-full">

      {/* Lomo (Spine) con texto alineado a la parte superior — Oculto en TELA */}
      {showSpine && (
        <div
          className="w-[7%] mr-[3%] bg-white relative overflow-hidden shrink-0 border border-gray-200 shadow-sm"
          style={{ containerType: 'inline-size' }}
        >
          <div className="absolute top-[10%] left-[50%]">
            <span
              className="block whitespace-nowrap tracking-widest font-bold opacity-80"
              style={{
                color: typographyColor,
                fontSize: `${spineTextCqw}cqw`,
                transform: 'rotate(90deg) translateY(-50%)',
                transformOrigin: 'top left'
              }}
            >
              {spineText}
            </span>
          </div>
        </div>
      )}

      {/* Recuadro de la Portada. Si es Tela, toma el 100% */}
      <div className={`${!showSpine ? 'w-full h-full' : 'w-[90%] shrink-0'} relative`}>
        {renderPreviewContent()}
      </div>

    </div>
  );
};

export default CoverPreview;
