import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import type { EmailBodyFormat } from '../../services/massEmailApi';
import { altFromFileName, imageSnippet, insertOnOwnLine, uploadEmailImage } from '../utils/emailImage';

/**
 * Botón «Imagen» de los editores de correo (campañas y automáticos de pedido):
 * sube la imagen a Storage y la inserta en su propia línea donde está el cursor.
 */
const EmailImageButton: React.FC<{
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  format: EmailBodyFormat;
  setBody: React.Dispatch<React.SetStateAction<string>>;
  onError: (message: string) => void;
}> = ({ textareaRef, format, setBody, onError }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    // Posición del cursor al elegir la imagen (el diálogo de archivos le quita el foco).
    const el = textareaRef.current;
    const start = el?.selectionStart ?? el?.value.length ?? 0;
    const end = el?.selectionEnd ?? start;
    try {
      const url = await uploadEmailImage(file);
      const snippet = imageSnippet(url, altFromFileName(file.name), format);
      let cursor = 0;
      setBody(prev => {
        const next = insertOnOwnLine(prev, Math.min(start, prev.length), Math.min(end, prev.length), snippet);
        cursor = next.cursor;
        return next.text;
      });
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(cursor, cursor);
      });
    } catch (e: any) {
      onError(`No se pudo subir la imagen: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        title="Subir una imagen e insertarla donde está el cursor"
      >
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
        {uploading ? 'Subiendo…' : 'Imagen'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleFile(file);
        }}
      />
    </>
  );
};

export default EmailImageButton;
