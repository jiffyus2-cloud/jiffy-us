import { useCallback, useRef, useState } from 'react';

interface PageRangeSliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

/**
 * Barra de selección para valores discretos (p. ej. páginas de 40 a 250 de 2 en 2).
 *
 * El `<input type="range">` nativo reserva el ancho del pulgar dentro de la pista,
 * así que cuando hay pocos valores posibles (40–42) el recorrido útil se concentra
 * en los extremos y casi toda la barra parece inerte. Aquí el puntero se mapea
 * sobre el ancho COMPLETO de la pista y el valor se ajusta al paso más cercano,
 * de modo que soltar en cualquier punto lleva a la posición más próxima.
 */
export function PageRangeSlider({ min, max, step, value, onChange, className = '' }: PageRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  // Posición libre del pulgar mientras se arrastra; al soltar vuelve a null y
  // el pulgar transiciona hasta la posición exacta del valor seleccionado.
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const stepCount = Math.max(1, Math.round((max - min) / step));
  const ratioOfValue = (max === min) ? 0 : (value - min) / (max - min);

  const valueFromRatio = useCallback(
    (ratio: number) => Math.min(max, min + Math.round(ratio * stepCount) * step),
    [min, max, step, stepCount]
  );

  const ratioFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // La captura mantiene el arrastre aunque el dedo salga de la barra; si el
    // navegador la rechaza (puntero ya liberado) el arrastre sigue funcionando.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* sin captura: el arrastre solo funciona dentro del control */
    }
    const ratio = ratioFromClientX(e.clientX);
    setDragRatio(ratio);
    const next = valueFromRatio(ratio);
    if (next !== value) onChange(next);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRatio === null) return;
    const ratio = ratioFromClientX(e.clientX);
    setDragRatio(ratio);
    const next = valueFromRatio(ratio);
    if (next !== value) onChange(next);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRatio === null) return;
    // Al soltar, el pulgar se ajusta a la posición discreta más cercana.
    setDragRatio(null);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* la captura ya se había liberado */
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = value - step;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = value + step;
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    if (next === null) return;
    e.preventDefault();
    const clamped = Math.min(max, Math.max(min, next));
    if (clamped !== value) onChange(clamped);
  };

  const thumbRatio = dragRatio ?? ratioOfValue;
  // Con pocos valores se dibuja una marca por cada uno para que se vea que la
  // barra tiene posiciones discretas; con rangos largos serían solo ruido.
  const showTicks = stepCount + 1 <= 12;
  const ticks = showTicks
    ? Array.from({ length: stepCount + 1 }, (_, i) => min + i * step)
    : [];

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} páginas`}
      aria-label="Cantidad de páginas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      className={`relative w-full h-11 px-3.5 flex items-center cursor-pointer touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 rounded-lg ${className}`}
    >
      {/* Pista */}
      <div ref={trackRef} className="relative w-full h-3 bg-gray-200 rounded-full">
        <div
          className={`absolute inset-y-0 left-0 bg-black rounded-full ${dragRatio === null ? 'transition-[width] duration-150' : ''}`}
          style={{ width: `${thumbRatio * 100}%` }}
        />
        {ticks.map((tickValue, i) => (
          <span
            key={tickValue}
            className={`absolute top-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              tickValue <= value ? 'bg-white/70' : 'bg-gray-400'
            }`}
            style={{ left: `${(i / stepCount) * 100}%` }}
          />
        ))}
        {/* Pulgar */}
        <div
          className={`absolute top-1/2 w-7 h-7 -translate-x-1/2 -translate-y-1/2 bg-black border-2 border-white rounded-full shadow-md pointer-events-none ${
            dragRatio === null ? 'transition-[left] duration-150' : ''
          }`}
          style={{ left: `${thumbRatio * 100}%` }}
        />
      </div>
    </div>
  );
}

export default PageRangeSlider;
