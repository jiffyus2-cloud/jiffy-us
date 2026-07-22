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
  subtitlePlaceholder?: boolean; // Cuando es true, coverSubtitle es texto de muestra (no guardado) y se renderiza atenuado
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
  subtitlePlaceholder = false,
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

  // Lomo físico: 1cm en todos los tamaños
  // Fuente: 11pt = 0.3881cm → 0.3881/1×100 = 38.81cqw (igual para todos)
  const spineTextCqw = 38.81;
  // Posición top del lomo: 1.5cm / alto_álbum_cm × 100
  // 20x20→7.5% | 30x30→5% | horizontal(21cm alto)→7.14% | vertical(28cm alto)→5.36%
  const spineTopPct = coverSize === '30x30' ? '5%' : coverSize === '20x20' ? '7.5%' : isHorizontal ? '7.14%' : '5.36%';
  // Anchos CSS: 1/(1+ancho_cm)×97% [gap=3%]
  // 20x20→4.62% | 30x30→3.13% | horizontal(28cm)→3.34% | vertical(21cm)→4.41%
  const spineWidthPct = coverSize === '30x30' ? '3.13%' : coverSize === '20x20' ? '4.62%' : isHorizontal ? '3.34%' : '4.41%';
  const coverWidthPct = coverSize === '30x30' ? '93.87%' : coverSize === '20x20' ? '92.38%' : isHorizontal ? '93.66%' : '92.59%';

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
                  {(coverSubtitle || subtitlePlaceholder) && <p className="text-[2.4cqw] font-medium tracking-widest" style={{ color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</p>}
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
                  {(coverSubtitle || subtitlePlaceholder) && <p className="text-[3.2cqw] font-medium leading-none text-right" style={{ color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</p>}
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
                  {(coverSubtitle || subtitlePlaceholder) && <p className="text-[4cqw] font-medium leading-none" style={{ color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</p>}
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
    // Usuario lo llama "Albunes 21x28"
    // ========================================================================
    if (isVertical) {
      const baseStyle = { width: '100%', aspectRatio: '21 / 28', containerType: 'inline-size' as const };

      switch (selectedLayout) {
        // L1: zona texto (23.57%) arriba, título izq a 0.7cm del borde (left=3.33%) y a 3.7cm del tope (top=56.07% del header)
        //     sin subtítulo; imagen flex-1 full-width sin margen inferior
        // título: 5cqw
        case 1:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 relative bg-white" style={{ height: '23.57%' }}>
                <h2 className="absolute font-bold leading-none" style={{ top: '56.07%', left: '3.33%', fontSize: '5cqw', color: typographyColor }}>{coverTitle}</h2>
              </div>
              <div className="relative w-full flex-1">
                <div className="absolute inset-0 overflow-hidden">
                  {renderImageSlot()}
                </div>
              </div>
            </div>
          );

        // L2: imagen full-width flex-1, bottomSection=16.79%
        // línea1=21.32%, texto=47.89%, línea2=74.45%; lr=0% (borde a borde)
        // título = sub: 3.36cqw (20pt / 21cm)
        case 2:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="relative w-full flex-1">
                <div className="absolute inset-0 overflow-hidden">
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 relative bg-white" style={{ height: '16.79%' }}>
                <div className="absolute h-[0.2cqw] left-0 right-0" style={{ top: '21.32%', backgroundColor: typographyColor }} />
                <div className="absolute flex justify-between items-center w-full" style={{ top: '47.89%', transform: 'translateY(-50%)' }}>
                  <h2 className="font-bold leading-none px-[2%]" style={{ fontSize: '3.36cqw', color: typographyColor }}>{coverTitle}</h2>
                  {(coverSubtitle || subtitlePlaceholder) && <p className="leading-none px-[2%]" style={{ fontSize: '3.36cqw', color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</p>}
                </div>
                <div className="absolute h-[0.2cqw] left-0 right-0" style={{ top: '74.45%', backgroundColor: typographyColor }} />
              </div>
            </div>
          );

        // L3: imagen full page, recuadro blanco + borde negro interno
        // box: top=83.21%, lr=25.71%, bot=6.07%; inner: tb=10%, lr=3.92%; font=3.04cqw
        case 3: {
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100">
                {renderImageSlot()}
              </div>
              <div className="absolute inset-0 z-10 pointer-events-none" style={{ containerType: 'inline-size' as const }}>
                <div
                  className={`absolute bg-white ${floatingBoxShadow}`}
                  style={{ top: '83.21%', left: '25.71%', right: '25.71%', bottom: '6.07%' }}
                >
                  <div
                    className="absolute border"
                    style={{ top: '10%', left: '3.92%', right: '3.92%', bottom: '10%', borderColor: typographyColor }}
                  >
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <h2 className="font-black tracking-tight leading-none text-center" style={{ fontSize: '3.04cqw', color: typographyColor }}>{coverTitle}</h2>
                      {(coverSubtitle || subtitlePlaceholder) && <p className="font-medium tracking-widest leading-tight text-center" style={{ fontSize: '3.04cqw', color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // L4: sándwich título|imagen|subtítulo — imagen full-width
        // header=15.36%, img=71.43%, footer=13.21%, lr=0%, padding=3.33%
        // título=3.87cqw, sub=3.36cqw
        case 4:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white z-10 flex items-end" style={{ height: '15.36%', paddingBottom: '3.33%' }}>
                <h2 className="font-bold leading-none w-full text-left px-[2%]" style={{ fontSize: '3.87cqw', color: typographyColor }}>{coverTitle}</h2>
              </div>
              <div className="relative w-full flex-shrink-0" style={{ height: '71.43%' }}>
                <div className="absolute inset-0 overflow-hidden">
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 bg-white z-10 flex items-start justify-end" style={{ height: '13.21%', paddingTop: '3.33%' }}>
                {(coverSubtitle || subtitlePlaceholder) && <p className="leading-none px-[2%]" style={{ fontSize: '3.36cqw', color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</p>}
              </div>
            </div>
          );

        default: return null;
      }
    }

    // ========================================================================
    // HORIZONTAL — 28cm ancho × 21cm alto (coverSize '21x28', isHorizontal)
    // Usuario lo llama "Albunes 28x21"
    // ========================================================================
    if (isHorizontal) {
      const baseStyle = { width: '100%', aspectRatio: '28 / 21', containerType: 'inline-size' as const };

      switch (selectedLayout) {
        // L1: header=17.62% (título centrado a 1.2cm del tope, subtítulo a 0.2cm del título), imagen=75.24%, footer vacío=7.14%
        // título: top=32.43% del header (=1.2cm); sub: marginTop=0.714cqw (=0.2cm); lr imagen=7.14%
        // título=3.30cqw, sub=2.12cqw
        case 1:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 relative bg-white" style={{ height: '17.62%' }}>
                <div className="absolute w-full flex flex-col items-center" style={{ top: '32.43%' }}>
                  <h2 className="font-bold leading-none text-center" style={{ fontSize: '3.30cqw', color: typographyColor }}>{coverTitle}</h2>
                  {(coverSubtitle || subtitlePlaceholder) && <p className="font-medium leading-none text-center" style={{ marginTop: '0.714cqw', fontSize: '2.12cqw', color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</p>}
                </div>
              </div>
              <div className="relative w-full flex-1">
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: '7.14%', right: '7.14%' }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 bg-white" style={{ height: '7.14%' }} />
            </div>
          );

        // L2: topSpacer=5.71%, imagen flex-1 (lr=7.14%), bottomSection=19.05%
        // línea1=25%, texto=44.84%, línea2=64.67%; lr líneas=7.14%
        // título = sub: 2.52cqw (20pt / 28cm)
        case 2:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white" style={{ height: '5.71%' }} />
              <div className="relative w-full flex-1">
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: '7.14%', right: '7.14%' }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 relative bg-white" style={{ height: '19.05%' }}>
                <div className="absolute h-[0.2cqw]" style={{ top: '25%', left: '7.14%', right: '7.14%', backgroundColor: typographyColor }} />
                <div className="absolute flex justify-between items-center w-full" style={{ top: '44.84%', transform: 'translateY(-50%)', paddingLeft: '7.14%', paddingRight: '7.14%' }}>
                  <h2 className="font-bold leading-none" style={{ fontSize: '2.52cqw', color: typographyColor }}>{coverTitle}</h2>
                  {(coverSubtitle || subtitlePlaceholder) && <p className="leading-none" style={{ fontSize: '2.52cqw', color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</p>}
                </div>
                <div className="absolute h-[0.2cqw]" style={{ top: '64.67%', left: '7.14%', right: '7.14%', backgroundColor: typographyColor }} />
              </div>
            </div>
          );

        // L3: imagen full page, recuadro blanco + borde negro interno
        // box: top=80%, lr=30.71%, bot=7.14%; inner: tb=11.11%, lr=3.70%; font=2.17cqw
        case 3:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100">
                {renderImageSlot()}
              </div>
              <div className="absolute inset-0 z-10 pointer-events-none" style={{ containerType: 'inline-size' as const }}>
                <div
                  className={`absolute bg-white ${floatingBoxShadow}`}
                  style={{ top: '80%', left: '30.71%', right: '30.71%', bottom: '7.14%' }}
                >
                  <div
                    className="absolute border"
                    style={{ top: '11.11%', left: '3.70%', right: '3.70%', bottom: '11.11%', borderColor: typographyColor }}
                  >
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <h2 className="font-black tracking-tight leading-none text-center" style={{ fontSize: '2.17cqw', color: typographyColor }}>{coverTitle}</h2>
                      {(coverSubtitle || subtitlePlaceholder) && <p className="font-medium tracking-widest leading-tight text-center" style={{ fontSize: '2.17cqw', color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );

        // L4: sándwich título|imagen|subtítulo
        // header=10.95%, img=78.10%, footer=10.95%, lr=6.07%, padding=2.5%
        // título = sub: 2.52cqw (20pt / 28cm)
        case 4:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white z-10 flex items-end" style={{ height: '10.95%', paddingBottom: '2.5%', paddingLeft: '6.07%' }}>
                <h2 className="font-bold leading-none" style={{ fontSize: '2.52cqw', color: typographyColor }}>{coverTitle}</h2>
              </div>
              <div className="relative w-full flex-shrink-0" style={{ height: '78.10%' }}>
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: '6.07%', right: '6.07%' }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 bg-white z-10 flex items-start justify-end" style={{ height: '10.95%', paddingTop: '2.5%', paddingRight: '6.07%' }}>
                {(coverSubtitle || subtitlePlaceholder) && <p className="leading-none" style={{ fontSize: '2.52cqw', color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</p>}
              </div>
            </div>
          );

        // L5: imagen full bleed sin texto (igual que Square L5) — sin recuadro de respaldo, no debe llevar texto
        case 5:
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100">
                {renderImageSlot()}
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
        // L1: margen top + imagen flex-1 + divisor+texto + margen bottom
        // 20x20: top=5%(1cm), lr=5%(1cm), textArea=19%, botSpacer=2.5%, total-bot=21.5%(4.3cm), t=5cqw, s=3.8cqw
        // 30x30: top=6.67%(2cm), lr=6.67%(2cm), textArea=19.17%, botSpacer=2.5%, total-bot=21.67%(6.5cm), t=5.2cqw, s=4.1cqw
        case 1: {
          const topH   = is30 ? '6.67%' : '5%';
          const lrI    = is30 ? '6.67%' : '5%';
          const textH  = is30 ? '19.17%' : '19%';
          const titleF = is30 ? '5.2cqw' : '5cqw';
          const subF   = is30 ? '4.1cqw' : '3.8cqw';
          const divW   = is30 ? '76.67%' : '75%';
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white" style={{ height: topH }} />
              <div className="relative w-full flex-1">
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: lrI, right: lrI }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-white z-10" style={{ height: textH }}>
                <div className="font-bold tracking-wide text-center leading-none" style={{ fontSize: titleF, color: typographyColor }}>{coverTitle}</div>
                <div className="my-[1cqw]" style={{ width: divW, height: '0.5cqw', backgroundColor: typographyColor }} />
                {(coverSubtitle || subtitlePlaceholder) && <div className="text-center font-medium tracking-widest leading-none" style={{ fontSize: subF, color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</div>}
              </div>
              <div className="flex-shrink-0 bg-white" style={{ height: '2.5%' }} />
            </div>
          );
        }

        // L2: margen top + imagen flex-1 + sección inferior con líneas posicionadas
        // 20x20: top=5%, lr=5.5%, botSection=17.5%, l1=28.57%, txt=47.14%, l2=65.71%, lrL=5.5%, font=2.82cqw
        // 30x30: top=6.67%, lr=6.67%, botSection=15%, l1=22.22%, txt=45.56%, l2=68.89%, lrL=6.67%, font=2.35cqw
        case 2: {
          const topH   = is30 ? '6.67%' : '5%';
          const lrI    = is30 ? '6.67%' : '5.5%';
          const botH   = is30 ? '15%'   : '17.5%';
          const l1Top  = is30 ? '22.22%' : '28.57%';
          const txtTop = is30 ? '45.56%' : '47.14%';
          const l2Top  = is30 ? '68.89%' : '65.71%';
          const lrL    = is30 ? '6.67%'  : '5.5%';
          const titleF = is30 ? '2.35cqw' : '2.82cqw';
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="flex-shrink-0 bg-white" style={{ height: topH }} />
              <div className="relative w-full flex-1">
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: lrI, right: lrI }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 relative bg-white" style={{ height: botH }}>
                <div className="absolute h-[0.2cqw]" style={{ top: l1Top, left: lrL, right: lrL, backgroundColor: typographyColor }} />
                <div className="absolute flex justify-between items-center w-full" style={{ top: txtTop, transform: 'translateY(-50%)', paddingLeft: lrL, paddingRight: lrL }}>
                  <h2 className="font-bold leading-none" style={{ fontSize: titleF, color: typographyColor }}>{coverTitle}</h2>
                  {(coverSubtitle || subtitlePlaceholder) && <p className="leading-none" style={{ fontSize: titleF, color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</p>}
                </div>
                <div className="absolute h-[0.2cqw]" style={{ top: l2Top, left: lrL, right: lrL, backgroundColor: typographyColor }} />
              </div>
            </div>
          );
        }

        // L3: imagen con inset, recuadro blanco + borde negro interno
        // 20x20: imgInset t/b=6.5% lr=5%; box t=80.46% lr=21.11% b=4.60%; inner t/b=11.54% lr=3.85%; font=3.49cqw(18cm ref)
        // 30x30: imgInset t/b=6% lr=6.67%; box t=79.17% lr=23.08% b=4.55%; inner t/b=6.98% lr=2.86%; font=3.08cqw(26cm ref)
        case 3: {
          const imgInset = is30
            ? { top: '6%',   left: '6.67%', right: '6.67%', bottom: '6%'   }
            : { top: '6.5%', left: '5%',    right: '5%',    bottom: '6.5%' };
          const boxTop  = is30 ? '79.17%' : '80.46%';
          const boxLR   = is30 ? '23.08%' : '21.11%';
          const boxBot  = is30 ? '4.55%'  : '4.60%';
          const innerTB = is30 ? '6.98%'  : '11.54%';
          const innerLR = is30 ? '2.86%'  : '3.85%';
          const fontF   = is30 ? '3.08cqw' : '3.49cqw';
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="absolute z-0 overflow-hidden bg-gray-100" style={imgInset}>
                {renderImageSlot()}
              </div>
              <div className="absolute z-10 pointer-events-none" style={{ ...imgInset, containerType: 'inline-size' as const }}>
                <div
                  className={`absolute bg-white ${floatingBoxShadow}`}
                  style={{ top: boxTop, left: boxLR, right: boxLR, bottom: boxBot }}
                >
                  <div
                    className="absolute border"
                    style={{ top: innerTB, left: innerLR, right: innerLR, bottom: innerTB, borderColor: typographyColor }}
                  >
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <h2 className="font-black tracking-tight leading-none text-center" style={{ fontSize: fontF, color: typographyColor }}>{coverTitle}</h2>
                      {(coverSubtitle || subtitlePlaceholder) && <p className="font-medium tracking-widest leading-tight text-center" style={{ fontSize: fontF, color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // L4: sándwich título|imagen|subtítulo
        // 20x20: header=7.5%(1.5cm), img=85%(17cm), footer=7.5%, lr=5%(1cm), título top=3%(0.6cm), font=2.86cqw
        // 30x30: header=10%(3cm),   img=80%(24cm), footer=10%, lr=6.67%(2cm), pad=2.33%(0.7cm), font=2.59cqw
        case 4: {
          const headerH = is30 ? '10%'    : '7.5%';
          const imgH    = is30 ? '80%'    : '85%';
          const footerH = is30 ? '10%'    : '7.5%';
          const lrI     = is30 ? '6.67%'  : '5%';
          const pad     = is30 ? '2.33%'  : '3.5%';
          const titleF  = is30 ? '2.59cqw' : '2.86cqw';
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden flex flex-col transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className={`flex-shrink-0 bg-white z-10 flex ${is30 ? 'items-end' : 'items-start'}`} style={{ height: headerH, ...(is30 ? { paddingBottom: pad } : { paddingTop: '3%' }), paddingLeft: lrI }}>
                <h2 className="font-bold leading-none" style={{ fontSize: titleF, color: typographyColor }}>{coverTitle}</h2>
              </div>
              <div className="relative w-full flex-shrink-0" style={{ height: imgH }}>
                <div className="absolute top-0 bottom-0 overflow-hidden" style={{ left: lrI, right: lrI }}>
                  {renderImageSlot()}
                </div>
              </div>
              <div className="flex-shrink-0 bg-white z-10 flex items-start justify-end" style={{ height: footerH, paddingTop: pad, paddingRight: lrI }}>
                {(coverSubtitle || subtitlePlaceholder) && <p className="leading-none" style={{ fontSize: titleF, color: typographyColor, opacity: subtitlePlaceholder ? 0.4 : 1 }}>{coverSubtitle}</p>}
              </div>
            </div>
          );
        }

        // L5: imagen full bleed sin texto
        case 5: {
          return (
            <div className={`relative bg-white ${containerShadow} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]`} style={baseStyle}>
              <div className="absolute inset-0 z-0 overflow-hidden bg-gray-100">
                {renderImageSlot()}
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
    <div className="flex w-full items-stretch justify-center h-full" style={{ fontFamily: "Avenir, 'Century Gothic', 'Gill Sans', sans-serif" }}>

      {/* Lomo (Spine) con texto alineado a la parte superior — Oculto en TELA */}
      {showSpine && (
        <div
          className="bg-white relative overflow-hidden shrink-0 border border-gray-200 shadow-sm"
          style={{ width: spineWidthPct, marginRight: '3%', containerType: 'inline-size' as const }}
        >
          <div className="absolute left-[50%]" style={{ top: spineTopPct }}>
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
      <div className={`relative ${!showSpine ? 'w-full h-full' : 'shrink-0'}`} style={showSpine ? { width: coverWidthPct } : undefined}>
        {renderPreviewContent()}
      </div>

    </div>
  );
};

export default CoverPreview;
