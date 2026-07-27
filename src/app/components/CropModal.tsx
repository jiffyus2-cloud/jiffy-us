import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { X, Maximize, ZoomIn, Search, Image as ImageIcon, RotateCcw, RotateCw } from 'lucide-react';
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

  const areaRef = useRef<HTMLDivElement>(null);

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

  // Medir el espacio disponible para el marco y calcular su tamaño manteniendo aspectRatio
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    const updateFrameSize = () => {
      const availW = Math.min(area.clientWidth, 640);
      const availH = area.clientHeight;
      if (availW <= 0 || availH <= 0) return;

      let frameW = availW;
      let frameH = availW / aspectRatio;
      if (frameH > availH) {
        frameH = availH;
        frameW = availH * aspectRatio;
      }
      setFrameSize({ w: frameW, h: frameH });
    };

    updateFrameSize();
    const observer = new ResizeObserver(updateFrameSize);
    observer.observe(area);
    return () => observer.disconnect();
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
        className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABECERA */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
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
        <div ref={areaRef} className="overflow-y-auto p-4 sm:p-8 bg-gray-50 flex-1 flex items-center justify-center min-h-[350px]">
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
            <div className="text-center text-gray-400 py-20">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
              Cargando imagen...
            </div>
          )}
        </div>

        {/* BARRA DE HERRAMIENTAS */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 shrink-0 space-y-4">
          {/* Zoom */}
          <div className="flex flex-col sm:flex-row items-center gap-4 max-w-2xl mx-auto">
            <button
              onClick={() => setZoom(minZoom)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-2 font-medium text-xs shrink-0"
              title="Ver la foto completa (puede dejar partes en blanco)"
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
              onClick={() => setZoom(1)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-2 font-medium text-xs shrink-0"
              title="Cubrir todo el marco"
            >
              <ZoomIn className="w-4 h-4" /> Cubrir marco
            </button>
          </div>

          {/* Rotación */}
          <div className="flex flex-col sm:flex-row items-center gap-4 max-w-2xl mx-auto">
            <button
              onClick={() => setRotation(r => r - 90)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-2 font-medium text-sm"
              title="Rotar 90º Izquierda"
            >
              <RotateCcw className="w-5 h-5" /> -90º
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
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors flex items-center gap-2 font-medium text-sm"
              title="Rotar 90º Derecha"
            >
              +90º <RotateCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PIE DE MODAL (GUARDAR/CANCELAR) */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 sticky bottom-0 z-10 shrink-0">
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
