import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { X, Maximize, ZoomIn, Search, Image as ImageIcon, RotateCcw, RotateCw, AlignCenterHorizontal, AlignCenterVertical } from 'lucide-react';
import ImageCropper from './ImageCropper';
import { getCoverDimensions, getMinZoom } from '../utils/cropMath';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  currentCrop?: { x: number; y: number; zoom: number; rotation?: number };
  aspectRatio: number;
  title?: string;
  onSave: (newCrop: { x: number; y: number; zoom: number; rotation: number }) => void;
}

const MAX_ZOOM = 5;
// Límites del marco de recorte: ancho máximo en escritorio y alto mínimo para que siga siendo usable
// en pantallas de poca altura (por debajo de eso el modal pasa a desplazarse en vez de encoger más).
const MAX_FRAME_WIDTH = 640;
const MIN_FRAME_HEIGHT = 160;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function CropModal({
  isOpen, onClose, imageSrc, currentCrop, aspectRatio, title = "Ajustar Imagen", onSave
}: CropModalProps) {

  // Estado del recorte: x,y = punto de la imagen centrado en el marco (%), zoom = escala sobre el "cover" base
  const [x, setX] = useState<number>(currentCrop?.x ?? 50);
  const [y, setY] = useState<number>(currentCrop?.y ?? 50);
  const [zoom, setZoom] = useState<number>(currentCrop?.zoom ?? 1);
  const [rotation, setRotation] = useState<number>(currentCrop?.rotation || 0);

  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // Refs espejo del estado, para leer valores actuales dentro de los handlers de puntero sin closures obsoletas
  const xRef = useRef(x);
  const yRef = useRef(y);
  const zoomRef = useRef(zoom);
  const rotationRef = useRef(rotation);
  useEffect(() => { xRef.current = x; }, [x]);
  useEffect(() => { yRef.current = y; }, [y]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const panRef = useRef<{ startX: number; startY: number; cropX: number; cropY: number; zoom: number; rotation: number; Rw: number; Rh: number } | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);

  // Reiniciar el estado al abrir el modal o cambiar de imagen
  useEffect(() => {
    if (isOpen && imageSrc) {
      setX(currentCrop?.x ?? 50);
      setY(currentCrop?.y ?? 50);
      setZoom(currentCrop?.zoom ?? 1);
      setRotation(currentCrop?.rotation || 0);
      setNaturalSize(null);

      const img = new Image();
      img.onload = () => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = imageSrc;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, imageSrc, currentCrop]);

  // Medir el espacio disponible para el marco y calcular su tamaño manteniendo aspectRatio.
  // El alto NO se lee del área (su altura depende del propio marco y crearía un bucle): se deduce
  // del alto máximo que puede tener el modal menos lo que ocupan cabecera, herramientas y pie.
  // Así el marco siempre cabe junto con los controles y el botón de aplicar nunca los tapa.
  useLayoutEffect(() => {
    const modal = modalRef.current;
    const area = areaRef.current;
    if (!modal || !area) return;

    const paddingY = (el: Element) => {
      const cs = getComputedStyle(el);
      return (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    };

    const updateFrameSize = () => {
      const areaStyle = getComputedStyle(area);
      const areaPadX = (parseFloat(areaStyle.paddingLeft) || 0) + (parseFloat(areaStyle.paddingRight) || 0);
      const availW = Math.min(area.clientWidth - areaPadX, MAX_FRAME_WIDTH);

      // Alto máximo real del modal: su max-height (95vh) o, si es menor, el hueco que deja el overlay
      const overlay = modal.parentElement;
      const overlayInnerH = window.innerHeight - (overlay ? paddingY(overlay) : 0);
      const modalMaxH = Math.min(parseFloat(getComputedStyle(modal).maxHeight) || overlayInnerH, overlayInnerH);

      const fixedH =
        (headerRef.current?.offsetHeight ?? 0) +
        (toolbarRef.current?.offsetHeight ?? 0) +
        (footerRef.current?.offsetHeight ?? 0);
      const availH = Math.max(MIN_FRAME_HEIGHT, modalMaxH - fixedH - paddingY(area));
      if (availW <= 0) return;

      let frameW = availW;
      let frameH = availW / aspectRatio;
      if (frameH > availH) {
        frameH = availH;
        frameW = availH * aspectRatio;
      }
      setFrameSize(prev => (prev && prev.w === frameW && prev.h === frameH ? prev : { w: frameW, h: frameH }));
    };

    updateFrameSize();
    // El modal cambia de ancho con la ventana y las filas de herramientas se reagrupan por breakpoint
    const observer = new ResizeObserver(updateFrameSize);
    observer.observe(modal);
    window.addEventListener('resize', updateFrameSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateFrameSize);
    };
  }, [aspectRatio, isOpen]);

  const minZoom = naturalSize && frameSize
    ? getMinZoom(frameSize.w, frameSize.h, naturalSize.w, naturalSize.h)
    : 1;

  // Si el zoom guardado quedó por debajo del nuevo mínimo posible (marco/imagen recién medidos), ajustarlo
  useEffect(() => {
    if (zoom < minZoom) setZoom(minZoom);
  }, [minZoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const getRwRh = useCallback(() => {
    if (!naturalSize || !frameSize) return { Rw: 0, Rh: 0 };
    return getCoverDimensions(frameSize.w, frameSize.h, naturalSize.w, naturalSize.h);
  }, [naturalSize, frameSize]);

  // Centrado: x/y = 50 pone el centro de la imagen sobre el centro del marco
  const centerHorizontal = () => setX(50);
  const centerVertical = () => setY(50);
  const centerBoth = () => { setX(50); setY(50); };

  const applyPan = (clientX: number, clientY: number) => {
    const pan = panRef.current;
    if (!pan || pan.Rw === 0 || pan.Rh === 0) return;

    const rawDx = clientX - pan.startX;
    const rawDy = clientY - pan.startY;

    const theta = (-pan.rotation * Math.PI) / 180;
    const rotDx = rawDx * Math.cos(theta) - rawDy * Math.sin(theta);
    const rotDy = rawDx * Math.sin(theta) + rawDy * Math.cos(theta);

    const localDx = -rotDx / pan.zoom;
    const localDy = -rotDy / pan.zoom;

    const dxPercent = (localDx / pan.Rw) * 100;
    const dyPercent = (localDy / pan.Rh) * 100;

    setX(clamp(pan.cropX + dxPercent, 0, 100));
    setY(clamp(pan.cropY + dyPercent, 0, 100));
  };

  const applyPinch = (clientX1: number, clientY1: number, clientX2: number, clientY2: number) => {
    const pinch = pinchRef.current;
    if (!pinch) return;
    const dist = Math.hypot(clientX2 - clientX1, clientY2 - clientY1);
    const ratio = dist / pinch.startDist;
    setZoom(clamp(pinch.startZoom * ratio, minZoom, MAX_ZOOM));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!naturalSize || !frameSize) return;
    try {
      // Puede fallar si el navegador no reconoce el pointerId como una sesión activa (no debería ocurrir con eventos reales)
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignorar: no es crítico, solo evita que el arrastre se corte si el puntero sale del overlay
    }
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      const { Rw, Rh } = getRwRh();
      panRef.current = {
        startX: e.clientX, startY: e.clientY,
        cropX: xRef.current, cropY: yRef.current,
        zoom: zoomRef.current, rotation: rotationRef.current,
        Rw, Rh,
      };
      pinchRef.current = null;
    } else if (pointersRef.current.size === 2) {
      panRef.current = null;
      const pts = Array.from(pointersRef.current.values());
      pinchRef.current = {
        startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        startZoom: zoomRef.current,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1 && panRef.current) {
      applyPan(e.clientX, e.clientY);
    } else if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      applyPinch(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size === 1) {
      // Volver a anclar el pan al puntero restante para evitar un salto
      const [remaining] = Array.from(pointersRef.current.entries());
      const { Rw, Rh } = getRwRh();
      panRef.current = {
        startX: remaining[1].x, startY: remaining[1].y,
        cropX: xRef.current, cropY: yRef.current,
        zoom: zoomRef.current, rotation: rotationRef.current,
        Rw, Rh,
      };
      pinchRef.current = null;
    } else if (pointersRef.current.size === 0) {
      panRef.current = null;
      pinchRef.current = null;
    }
  };

  const handleSave = () => {
    onSave({
      x: parseFloat(x.toFixed(2)),
      y: parseFloat(y.toFixed(2)),
      zoom: parseFloat(zoom.toFixed(2)),
      rotation,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div
        ref={modalRef}
        className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABECERA */}
        <div ref={headerRef} className="px-5 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-900 text-white rounded-xl shadow-md">
              <Search className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* ÁREA DE RECORTE */}
        <div ref={areaRef} className="p-4 sm:px-8 sm:py-5 bg-gray-50 flex items-center justify-center shrink-0">
          {imageSrc && naturalSize && frameSize ? (
            <div
              className="relative shadow-xl rounded-lg overflow-hidden bg-white border border-gray-100 select-none"
              style={{ width: `${frameSize.w}px`, height: `${frameSize.h}px` }}
            >
              <ImageCropper src={imageSrc} position={{ x, y, zoom, rotation }} alt="Vista previa de recorte" />
              <div
                className="absolute inset-0 cursor-move touch-none"
                style={{ touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
              />
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center text-center text-gray-400 min-h-[160px]"
              style={frameSize ? { height: `${frameSize.h}px` } : undefined}
            >
              <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
              Cargando imagen...
            </div>
          )}
        </div>

        {/* BARRA DE HERRAMIENTAS */}
        <div ref={toolbarRef} className="px-4 sm:px-6 py-3 bg-white border-t border-gray-100 shrink-0">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {/* Zoom */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => { setZoom(minZoom); centerBoth(); }}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-2 font-medium text-xs shrink-0"
                title="Ver la foto completa y centrada (puede dejar partes en blanco)"
              >
                <Maximize className="w-4 h-4" /> Foto completa
              </button>

              <div className="flex-1 flex items-center gap-3 w-full">
                <span className="text-xs font-bold text-gray-400">−</span>
                <input
                  type="range"
                  min={minZoom}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(clamp(Number(e.target.value), minZoom, MAX_ZOOM))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
                <span className="text-xs font-bold text-gray-400">+</span>
              </div>

              <button
                onClick={() => { setZoom(1); centerBoth(); }}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-2 font-medium text-xs shrink-0"
                title="Cubrir todo el marco con la foto centrada"
              >
                <ZoomIn className="w-4 h-4" /> Cubrir marco
              </button>
            </div>

            {/* Rotación */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setRotation(r => r - 90)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-2 font-medium text-xs shrink-0"
                title="Rotar 90º Izquierda"
              >
                <RotateCcw className="w-4 h-4" /> -90º
              </button>

              <div className="flex-1 flex items-center gap-3 w-full">
                <span className="text-xs font-bold text-gray-400">-180º</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
                <span className="text-xs font-bold text-gray-400">+180º</span>
              </div>

              <button
                onClick={() => setRotation(r => r + 90)}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-2 font-medium text-xs shrink-0"
                title="Rotar 90º Derecha"
              >
                +90º <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Centrado */}
            <div className="md:col-span-2 flex items-center justify-center gap-3">
              <button
                onClick={centerHorizontal}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-2 font-medium text-xs"
                title="Centrar la foto horizontalmente en el marco"
              >
                <AlignCenterVertical className="w-4 h-4" /> Centrar horizontal
              </button>
              <button
                onClick={centerVertical}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-2 font-medium text-xs"
                title="Centrar la foto verticalmente en el marco"
              >
                <AlignCenterHorizontal className="w-4 h-4" /> Centrar vertical
              </button>
            </div>
          </div>
        </div>

        {/* PIE DE MODAL (GUARDAR/CANCELAR) */}
        <div ref={footerRef} className="px-5 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-all text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!naturalSize}
            className="px-8 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-all shadow-md hover:shadow-xl disabled:bg-gray-300 disabled:shadow-none text-sm"
          >
            Aplicar Recorte
          </button>
        </div>
      </div>
    </div>
  );
}
