// ============================================================================
// Album Page Render
// ============================================================================
// Cómo se PINTA una página interna del álbum. Lo comparten el editor, el visor
// del pedido (checkout y dashboards) y el render del PDF de impresión, para que
// el cliente vea al revisar y al comprar exactamente la misma página que se
// imprime.
//
// Antes cada pantalla traía su propia decoración y se habían separado: el visor
// redondeaba las esquinas de la página y de cada foto y rellenaba los marcos
// vacíos con un icono gris, cosas que ni el editor enseña ni la imprenta puede
// producir —las páginas se cortan a escuadra y un marco vacío sale en blanco—.
// La geometría sale de `pageLayouts`; el contenido, de `albumPageData`.
// ============================================================================

import React from 'react';
import { Layers } from 'lucide-react';
import ImageCropper from './ImageCropper';
import { getEffectiveFontSize } from '../utils/textOverflowUtils';
import { cn } from './ui/utils';
import { getAlbumFormat } from '../utils/pageLayouts';
import type { AlbumPageSlot, PhotoCrop } from '../utils/albumPageData';
import { DEFAULT_CROP } from '../utils/albumPageData';

/** Proporción de la página, lista para `style.aspectRatio`. */
export function getPageAspectRatioCss(size?: string | null): string {
  const format = getAlbumFormat(size);
  return format === 'horizontal' ? '4/3' : format === 'vertical' ? '3/4' : '1/1';
}

/**
 * Texto de un marco sin foto.
 *
 * El tamaño va en `cqi` sobre el ancho del marco: así la misma caja se lee
 * igual en la miniatura del editor, en el visor y en el PDF, que se renderizan
 * a anchos muy distintos.
 */
export const AlbumPageTextBox: React.FC<{ textBox: any }> = ({ textBox }) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-white" style={{ containerType: 'inline-size' }}>
    <div
      style={{
        width: '90%',
        fontSize: `${getEffectiveFontSize(textBox.fontSize || 24, (textBox.text || '').length, textBox.overflowMode || 'limit') * 0.25}cqi`,
        fontFamily: textBox.fontFamily,
        color: textBox.color,
        textAlign: textBox.textAlign || 'center',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.3',
      }}
    >
      {textBox.text}
    </div>
  </div>
);

/** Contenido de un marco de solo lectura: la foto, el texto, o blanco. */
export const AlbumPageSlotContent: React.FC<{
  slot: AlbumPageSlot;
  /** El PDF sustituye `ImageCropper` por su render en canvas. */
  renderPhoto?: (photo: string, crop: PhotoCrop) => React.ReactNode;
}> = ({ slot, renderPhoto }) => (
  <div className="relative overflow-hidden bg-white flex items-center justify-center w-full h-full">
    {slot.photo ? (
      <div className="w-full h-full relative">
        {renderPhoto
          ? renderPhoto(slot.photo, slot.crop)
          : <ImageCropper src={slot.photo} position={slot.crop || DEFAULT_CROP} alt="Foto del álbum" />}
      </div>
    ) : slot.text ? (
      <AlbumPageTextBox textBox={slot.text} />
    ) : null}
  </div>
);

/**
 * Los marcos de una página, colocados sobre ella.
 *
 * `renderSlot` deja al editor meter su propio marco —arrastre, recorte,
 * botones— sin duplicar la colocación.
 */
export const AlbumPageSlots: React.FC<{
  slots: AlbumPageSlot[];
  renderSlot?: (slot: AlbumPageSlot, index: number) => React.ReactNode;
  renderPhoto?: (photo: string, crop: PhotoCrop) => React.ReactNode;
}> = ({ slots, renderSlot, renderPhoto }) => (
  <div className="relative w-full h-full">
    {slots.map((slot, index) => (
      <div
        key={index}
        className="absolute"
        style={{ left: `${slot.rect.x}%`, top: `${slot.rect.y}%`, width: `${slot.rect.w}%`, height: `${slot.rect.h}%` }}
      >
        {renderSlot ? renderSlot(slot, index) : <AlbumPageSlotContent slot={slot} renderPhoto={renderPhoto} />}
      </div>
    ))}
  </div>
);

/** La hoja: proporción del formato y esquinas a escuadra, como sale impresa. */
export const AlbumPageFrame: React.FC<
  { size?: string | null; className?: string; children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>
> = ({ size, className, children, style, ...rest }) => (
  <div
    className={cn('bg-white rounded-none shadow-sm border-2 border-gray-100 overflow-hidden w-full', className)}
    style={{ aspectRatio: getPageAspectRatioCss(size), ...style }}
    {...rest}
  >
    {children}
  </div>
);

/**
 * Las hojas del álbum que no llevan fotos: los dos interiores de las tapas y la
 * página en blanco que cierra un álbum con número impar de páginas.
 */
export const AlbumFillerPage: React.FC<{
  size?: string | null;
  kind: 'innerCover' | 'innerBackCover' | 'blank';
  className?: string;
}> = ({ size, kind, className }) => {
  const style = { aspectRatio: getPageAspectRatioCss(size) };

  if (kind === 'blank') {
    return (
      <div
        className={cn('bg-white rounded-none shadow-sm border-2 border-gray-100 overflow-hidden w-full flex items-center justify-center', className)}
        style={style}
      >
        <span className="text-gray-300 text-[10px] md:text-xs font-bold uppercase tracking-widest">En Blanco</span>
      </div>
    );
  }

  return (
    <div
      className={cn('bg-gray-100 rounded-none shadow-inner border-2 border-gray-200 overflow-hidden w-full flex items-center justify-center', className)}
      style={style}
    >
      <div className="text-gray-300 flex flex-col items-center gap-2 opacity-60">
        <Layers className="w-10 h-10 md:w-12 md:h-12" />
        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">
          {kind === 'innerCover' ? 'Reverso' : 'Reverso Final'}
        </span>
      </div>
    </div>
  );
};
