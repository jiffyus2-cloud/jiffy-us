import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { AlertCircle, Check, Images, Loader2, RotateCcw, Trash2, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  SYSTEM_IMAGE_SLOTS,
  SYSTEM_IMAGE_GALLERIES,
  SYSTEM_IMAGE_GROUPS,
  SYSTEM_IMAGES_DOC,
  SYSTEM_IMAGES_STORAGE_PREFIX,
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from '../config/systemImages';
import { useSystemImages } from '../context/SystemImagesContext';

/**
 * Panel para cambiar las imágenes propias del sistema (carrusel, tarjetas de
 * producto, muestras de materiales) sin tocar código ni volver a desplegar.
 *
 * Cada cambio sube el archivo a Storage y guarda su URL en
 * `settings/system_images`; como el resto de la app escucha ese documento en
 * vivo, la imagen nueva se ve al instante en todas las sesiones abiertas.
 * «Restaurar original» borra la sustitución y devuelve el asset del bundle, así
 * que ningún cambio es irreversible.
 */

interface SystemImagesSectionProps {
  /** Correo de quien está editando; se guarda junto al cambio para poder auditarlo. */
  adminEmail: string | null;
}

const extensionFor = (file: File) => {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
};

const describeSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function SystemImagesSection({ adminEmail }: SystemImagesSectionProps) {
  const { images, galleries, loaded, error } = useSystemImages();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const announce = (tone: 'ok' | 'error', text: string) => {
    setFeedback({ tone, text });
    if (tone === 'ok') setTimeout(() => setFeedback(null), 4000);
  };

  /** Devuelve el motivo del rechazo, o null si el archivo sirve. */
  const rejectionReason = (file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return `«${file.name}» no es JPG, PNG ni WEBP.`;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return `«${file.name}» pesa ${describeSize(file.size)}; el máximo son ${describeSize(MAX_IMAGE_BYTES)}.`;
    }
    return null;
  };

  const uploadOne = async (file: File, id: string): Promise<string> => {
    const path = `${SYSTEM_IMAGES_STORAGE_PREFIX}/${id}/${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 7)}.${extensionFor(file)}`;
    const result = await uploadBytes(storageRef(storage, path), file);
    return getDownloadURL(result.ref);
  };

  /**
   * Escribe el documento entero (no `merge`) para poder QUITAR claves: restaurar
   * una imagen original es justamente borrar su entrada, y un merge nunca borra.
   * Los mapas se construyen sobre lo último que ha llegado por el listener, así
   * que la ventana para pisar el cambio de otra administradora es mínima.
   */
  const persist = async (
    nextImages: Record<string, string>,
    nextGalleries: Record<string, string[]>
  ) => {
    await setDoc(doc(db, SYSTEM_IMAGES_DOC.collection, SYSTEM_IMAGES_DOC.id), {
      images: nextImages,
      galleries: nextGalleries,
      updatedAt: serverTimestamp(),
      updatedBy: adminEmail ?? 'desconocido',
    });
  };

  const handleSlotUpload = async (slotId: string, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reason = rejectionReason(file);
    if (reason) { announce('error', reason); return; }

    setBusyId(slotId);
    setFeedback(null);
    try {
      const url = await uploadOne(file, slotId);
      await persist({ ...images, [slotId]: url }, galleries);
      announce('ok', 'Imagen actualizada. Ya se ve en la tienda.');
    } catch (e: any) {
      console.error('[Imágenes del sistema] Fallo al subir', slotId, e);
      announce('error', `No pudimos guardar la imagen: ${e?.message || 'error desconocido'}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleSlotReset = async (slotId: string) => {
    setBusyId(slotId);
    try {
      const next = { ...images };
      delete next[slotId];
      await persist(next, galleries);
      announce('ok', 'Imagen original restaurada.');
    } catch (e: any) {
      console.error('[Imágenes del sistema] Fallo al restaurar', slotId, e);
      announce('error', `No pudimos restaurar la imagen: ${e?.message || 'error desconocido'}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleGalleryAdd = async (galleryId: string, current: string[], files: FileList | null) => {
    const chosen = Array.from(files ?? []);
    if (chosen.length === 0) return;
    const rejected = chosen.map(rejectionReason).filter(Boolean) as string[];
    const valid = chosen.filter(f => !rejectionReason(f));
    if (valid.length === 0) { announce('error', rejected.join(' ')); return; }

    setBusyId(galleryId);
    setFeedback(null);
    try {
      const urls: string[] = [];
      // En serie: subir 20 fotos a la vez en un móvil agota la memoria y no gana tiempo real.
      for (const file of valid) urls.push(await uploadOne(file, galleryId));
      await persist(images, { ...galleries, [galleryId]: [...current, ...urls] });
      announce(
        rejected.length > 0 ? 'error' : 'ok',
        rejected.length > 0
          ? `Añadimos ${urls.length} imagen(es). No se pudieron usar: ${rejected.join(' ')}`
          : `Añadimos ${urls.length} imagen(es) a la galería.`
      );
    } catch (e: any) {
      console.error('[Imágenes del sistema] Fallo al añadir a', galleryId, e);
      announce('error', `No pudimos añadir las imágenes: ${e?.message || 'error desconocido'}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleGalleryChange = async (galleryId: string, nextUrls: string[], message: string) => {
    setBusyId(galleryId);
    try {
      await persist(images, { ...galleries, [galleryId]: nextUrls });
      announce('ok', message);
    } catch (e: any) {
      console.error('[Imágenes del sistema] Fallo al actualizar', galleryId, e);
      announce('error', `No pudimos guardar el cambio: ${e?.message || 'error desconocido'}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleGalleryReset = async (galleryId: string) => {
    setBusyId(galleryId);
    try {
      const next = { ...galleries };
      delete next[galleryId];
      await persist(images, next);
      announce('ok', 'Galería original restaurada.');
    } catch (e: any) {
      console.error('[Imágenes del sistema] Fallo al restaurar', galleryId, e);
      announce('error', `No pudimos restaurar la galería: ${e?.message || 'error desconocido'}`);
    } finally {
      setBusyId(null);
    }
  };

  const groupsWithContent = SYSTEM_IMAGE_GROUPS.filter(
    group =>
      SYSTEM_IMAGE_SLOTS.some(s => s.group === group) ||
      SYSTEM_IMAGE_GALLERIES.some(g => g.group === group)
  );

  return (
    <div className="bg-white rounded-b-xl rounded-tr-xl border border-gray-200 p-6 space-y-8">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <Images className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Imágenes de la tienda</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Cambia las fotos propias del sistema —carrusel, tarjetas de producto y muestras de
            materiales— sin tocar el código. Los cambios se ven al instante en la tienda, y
            «Restaurar original» siempre devuelve la imagen que trae la app.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            feedback.tone === 'ok'
              ? 'bg-green-50 border-green-300 text-green-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {feedback.tone === 'ok' ? (
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            No pudimos leer las imágenes guardadas ({error}). Se están mostrando las originales.
          </span>
        </div>
      )}

      {!loaded ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando imágenes…
        </div>
      ) : (
        groupsWithContent.map(group => (
          <section key={group} className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">{group}</h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SYSTEM_IMAGE_SLOTS.filter(slot => slot.group === group).map(slot => {
                const custom = images[slot.id];
                const isBusy = busyId === slot.id;
                return (
                  <div key={slot.id} className="border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                    {/* La imagen va posicionada: si solo lleva h-full, su alto intrínseco
                        gana al aspect-ratio y las tarjetas de la fila salen desparejas. */}
                    <div className="bg-gray-50 relative overflow-hidden" style={{ aspectRatio: slot.aspect }}>
                      <img
                        src={custom || slot.defaultUrl}
                        alt={slot.label}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {isBusy && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                      )}
                      <span
                        className={`absolute top-2 left-2 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          custom ? 'bg-black text-white' : 'bg-white/90 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {custom ? 'Personalizada' : 'Original'}
                      </span>
                    </div>

                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <p className="font-bold text-sm">{slot.label}</p>
                      <p className="text-xs text-gray-500 flex-1">{slot.hint}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <label
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            isBusy ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Cambiar
                          <input
                            type="file"
                            accept={ACCEPTED_IMAGE_TYPES.join(',')}
                            className="hidden"
                            disabled={isBusy}
                            onChange={e => {
                              void handleSlotUpload(slot.id, e.target.files);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        {custom && (
                          <button
                            onClick={() => void handleSlotReset(slot.id)}
                            disabled={isBusy}
                            title="Restaurar la imagen original"
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Original
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {SYSTEM_IMAGE_GALLERIES.filter(gallery => gallery.group === group).map(gallery => {
              const stored = galleries[gallery.id];
              const current = Array.isArray(stored) ? stored : gallery.defaultUrls;
              const isCustom = Array.isArray(stored);
              const isBusy = busyId === gallery.id;

              return (
                <div key={gallery.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm flex items-center gap-2">
                        {gallery.label}
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isCustom ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {isCustom ? 'Personalizada' : 'Original'}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {gallery.hint} · {current.length} imagen(es)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          isBusy ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'
                        }`}
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        Añadir imágenes
                        <input
                          type="file"
                          multiple
                          accept={ACCEPTED_IMAGE_TYPES.join(',')}
                          className="hidden"
                          disabled={isBusy}
                          onChange={e => {
                            void handleGalleryAdd(gallery.id, current, e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {isCustom && (
                        <button
                          onClick={() => void handleGalleryReset(gallery.id)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restaurar galería
                        </button>
                      )}
                    </div>
                  </div>

                  {current.length === 0 ? (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-4 text-center">
                      La galería está vacía: en la tienda no se mostrará ninguna imagen.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      {current.map((url, index) => (
                        <div key={`${url}-${index}`} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 relative overflow-hidden" style={{ aspectRatio: gallery.aspect }}>
                            <img
                              src={url}
                              alt={`${gallery.label} ${index + 1}`}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex items-center justify-between px-1 py-1">
                            <button
                              onClick={() => {
                                const next = [...current];
                                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                void handleGalleryChange(gallery.id, next, 'Orden actualizado.');
                              }}
                              disabled={index === 0 || isBusy}
                              title="Mover antes"
                              className="p-1 text-gray-500 hover:text-black disabled:opacity-30"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                void handleGalleryChange(
                                  gallery.id,
                                  current.filter((_, i) => i !== index),
                                  'Imagen quitada de la galería.'
                                )
                              }
                              disabled={isBusy}
                              title="Quitar de la galería"
                              className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                const next = [...current];
                                [next[index], next[index + 1]] = [next[index + 1], next[index]];
                                void handleGalleryChange(gallery.id, next, 'Orden actualizado.');
                              }}
                              disabled={index === current.length - 1 || isBusy}
                              title="Mover después"
                              className="p-1 text-gray-500 hover:text-black disabled:opacity-30"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
