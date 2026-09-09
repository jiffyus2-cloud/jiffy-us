import React, { useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { AlertCircle, Check, Images, Loader2, Plus, Trash2, Upload, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import {
  SYSTEM_IMAGE_SLOTS,
  SYSTEM_IMAGE_GALLERIES,
  SYSTEM_IMAGE_GROUPS,
  SYSTEM_IMAGES_DOC,
  SYSTEM_IMAGES_STORAGE_PREFIX,
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  CAROUSEL_ASPECT,
  resolveImageRef,
  isUploadedRef,
  type CarouselSlide,
} from '../config/systemImages';
import { useSystemImages, useCarouselSlideRefs } from '../context/SystemImagesContext';

/**
 * Panel para cambiar las imágenes de la tienda sin tocar código ni volver a
 * desplegar: carrusel de la portada (imagen y textos), tarjetas de producto y
 * galerías de muestra.
 *
 * Las imágenes que trae la app son solo el punto de partida: cuando se sube una
 * nueva, sustituye a la anterior y la anterior se borra de Storage. No se guarda
 * copia ni hay «volver a la original», que es justo lo que se pidió.
 *
 * Cada cambio se guarda en `settings/system_images`; como el resto de la app
 * escucha ese documento en vivo, se ve al instante en todas las sesiones.
 */

interface SystemImagesSectionProps {
  /** Correo de quien está editando; se guarda junto al cambio para poder auditarlo. */
  adminEmail: string | null;
}

interface SlideTexts {
  title: string;
  description: string;
  cta: string;
}

const extensionFor = (file: File) => {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
};

const describeSize = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const newSlideId = () =>
  `slide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export default function SystemImagesSection({ adminEmail }: SystemImagesSectionProps) {
  const { images, galleries, carousel, loaded, error } = useSystemImages();
  const slides = useCarouselSlideRefs();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  /** Textos del carrusel en edición; solo llegan a Firestore al pulsar «Guardar textos». */
  const [textDrafts, setTextDrafts] = useState<Record<string, SlideTexts>>({});

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
   * Borra de Storage una imagen que ya no usa nadie. Solo aplica a las subidas
   * desde aquí: las iniciales viven en el bundle y no se tocan. Es de mejor
   * esfuerzo — si falla, el cambio ya está guardado y lo único que queda es un
   * archivo huérfano.
   */
  const discardStored = async (ref: string | null | undefined) => {
    if (!isUploadedRef(ref)) return;
    try {
      await deleteObject(storageRef(storage, ref as string));
    } catch (e) {
      console.warn('[Imágenes del sistema] No se pudo borrar el archivo anterior:', e);
    }
  };

  /**
   * Escribe el documento entero (sin `merge`) para poder QUITAR claves — borrar
   * una diapositiva o vaciar una galería es justamente eso, y un merge nunca
   * borra. Los mapas se construyen sobre lo último que ha llegado por el
   * listener, así que la ventana para pisar el cambio de otra sesión es mínima.
   */
  const persist = async (next: {
    images?: Record<string, string>;
    galleries?: Record<string, string[]>;
    carousel?: CarouselSlide[];
  }) => {
    await setDoc(doc(db, SYSTEM_IMAGES_DOC.collection, SYSTEM_IMAGES_DOC.id), {
      images: next.images ?? images,
      galleries: next.galleries ?? galleries,
      // `carousel` puede no existir todavía: entonces se guarda el inicial tal cual,
      // que es el estado que la tienda está mostrando en ese momento.
      carousel: next.carousel ?? carousel ?? slides,
      updatedAt: serverTimestamp(),
      updatedBy: adminEmail ?? 'desconocido',
    });
  };

  const run = async (id: string, work: () => Promise<void>, okMessage: string, errorPrefix: string) => {
    setBusyId(id);
    setFeedback(null);
    try {
      await work();
      announce('ok', okMessage);
    } catch (e: any) {
      console.error(`[Imágenes del sistema] ${errorPrefix}`, id, e);
      announce('error', `${errorPrefix}: ${e?.message || 'error desconocido'}`);
    } finally {
      setBusyId(null);
    }
  };

  // ── Imágenes sueltas ───────────────────────────────────────────────────────

  const handleSlotUpload = (slotId: string, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reason = rejectionReason(file);
    if (reason) { announce('error', reason); return; }

    void run(
      slotId,
      async () => {
        const previous = images[slotId];
        const url = await uploadOne(file, slotId);
        await persist({ images: { ...images, [slotId]: url } });
        await discardStored(previous);
      },
      'Imagen actualizada. Ya se ve en la tienda.',
      'No pudimos guardar la imagen'
    );
  };

  // ── Carrusel ───────────────────────────────────────────────────────────────

  const textsOf = (slide: CarouselSlide): SlideTexts =>
    textDrafts[slide.id] ?? {
      title: slide.title,
      description: slide.description,
      cta: slide.cta,
    };

  const hasTextChanges = slides.some(slide => {
    const draft = textDrafts[slide.id];
    return (
      !!draft &&
      (draft.title !== slide.title ||
        draft.description !== slide.description ||
        draft.cta !== slide.cta)
    );
  });

  const updateDraft = (slide: CarouselSlide, field: keyof SlideTexts, value: string) => {
    setTextDrafts(prev => ({ ...prev, [slide.id]: { ...textsOf(slide), [field]: value } }));
  };

  const handleSaveTexts = () =>
    void run(
      'carousel-texts',
      async () => {
        await persist({ carousel: slides.map(slide => ({ ...slide, ...textsOf(slide) })) });
        setTextDrafts({});
      },
      'Textos del carrusel guardados.',
      'No pudimos guardar los textos'
    );

  const handleSlideImage = (slide: CarouselSlide, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reason = rejectionReason(file);
    if (reason) { announce('error', reason); return; }

    void run(
      slide.id,
      async () => {
        const url = await uploadOne(file, `carousel/${slide.id}`);
        await persist({
          carousel: slides.map(s => (s.id === slide.id ? { ...s, ...textsOf(s), ref: url } : s)),
        });
        await discardStored(slide.ref);
      },
      'Imagen de la diapositiva actualizada.',
      'No pudimos cambiar la imagen'
    );
  };

  const handleSlideAdd = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reason = rejectionReason(file);
    if (reason) { announce('error', reason); return; }

    void run(
      'carousel-add',
      async () => {
        const id = newSlideId();
        const url = await uploadOne(file, `carousel/${id}`);
        const nueva: CarouselSlide = {
          id,
          ref: url,
          title: '',
          description: '',
          cta: 'Vamos a Diseñar',
        };
        await persist({ carousel: [...slides.map(s => ({ ...s, ...textsOf(s) })), nueva] });
      },
      'Diapositiva añadida. Escribe sus textos y guarda.',
      'No pudimos añadir la diapositiva'
    );
  };

  const handleSlideRemove = (slide: CarouselSlide) =>
    void run(
      slide.id,
      async () => {
        await persist({
          carousel: slides.filter(s => s.id !== slide.id).map(s => ({ ...s, ...textsOf(s) })),
        });
        await discardStored(slide.ref);
        setTextDrafts(prev => {
          const next = { ...prev };
          delete next[slide.id];
          return next;
        });
      },
      'Diapositiva eliminada.',
      'No pudimos eliminar la diapositiva'
    );

  const handleSlideMove = (index: number, direction: -1 | 1) => {
    const next = slides.map(s => ({ ...s, ...textsOf(s) }));
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    void run('carousel-order', () => persist({ carousel: next }), 'Orden del carrusel actualizado.', 'No pudimos reordenar');
  };

  // ── Galerías ───────────────────────────────────────────────────────────────

  const handleGalleryAdd = (galleryId: string, current: string[], files: FileList | null) => {
    const chosen = Array.from(files ?? []);
    if (chosen.length === 0) return;
    const rejected = chosen.map(rejectionReason).filter(Boolean) as string[];
    const valid = chosen.filter(f => !rejectionReason(f));
    if (valid.length === 0) { announce('error', rejected.join(' ')); return; }

    void run(
      galleryId,
      async () => {
        const urls: string[] = [];
        // En serie: subir 20 fotos a la vez agota la memoria del navegador y no gana tiempo real.
        for (const file of valid) urls.push(await uploadOne(file, galleryId));
        await persist({ galleries: { ...galleries, [galleryId]: [...current, ...urls] } });
        if (rejected.length > 0) {
          throw new Error(`se añadieron ${urls.length}, pero ${rejected.join(' ')}`);
        }
      },
      'Imágenes añadidas a la galería.',
      'No pudimos añadir todas las imágenes'
    );
  };

  const handleGalleryRemove = (galleryId: string, current: string[], index: number) =>
    void run(
      galleryId,
      async () => {
        const removed = current[index];
        await persist({
          galleries: { ...galleries, [galleryId]: current.filter((_, i) => i !== index) },
        });
        await discardStored(removed);
      },
      'Imagen quitada de la galería.',
      'No pudimos quitar la imagen'
    );

  const handleGalleryMove = (galleryId: string, current: string[], index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    void run(
      galleryId,
      () => persist({ galleries: { ...galleries, [galleryId]: next } }),
      'Orden actualizado.',
      'No pudimos reordenar'
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const groupsWithContent = SYSTEM_IMAGE_GROUPS.filter(
    group =>
      group === 'Portada' ||
      SYSTEM_IMAGE_SLOTS.some(s => s.group === group) ||
      SYSTEM_IMAGE_GALLERIES.some(g => g.group === group)
  );

  const uploadButtonClass = (isBusy: boolean) =>
    `inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors ${
      isBusy ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'
    }`;

  return (
    <div className="bg-white rounded-b-xl rounded-tr-xl border border-gray-200 p-6 space-y-8">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <Images className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Imágenes de la tienda</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Cambia las fotos de la tienda —carrusel de la portada, tarjetas de producto y muestras
            de materiales— sin tocar el código. Al subir una imagen nueva sustituye a la anterior y
            se ve al instante en la tienda; la anterior se borra, así que ten a mano la que quieras
            conservar.
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
            No pudimos leer las imágenes guardadas ({error}). Se están mostrando las iniciales.
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

            {/* ── CARRUSEL: imagen + textos de cada diapositiva ── */}
            {group === 'Portada' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-gray-500">
                    {slides.length} diapositiva(s). Se muestran en este orden, cambiando solas cada
                    10 segundos.
                  </p>
                  <div className="flex items-center gap-2">
                    <label className={uploadButtonClass(busyId === 'carousel-add')}>
                      {busyId === 'carousel-add' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Añadir diapositiva
                      <input
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES.join(',')}
                        className="hidden"
                        disabled={busyId === 'carousel-add'}
                        onChange={e => {
                          handleSlideAdd(e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      onClick={handleSaveTexts}
                      disabled={!hasTextChanges || busyId === 'carousel-texts'}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400"
                    >
                      {busyId === 'carousel-texts' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Guardar textos
                    </button>
                  </div>
                </div>

                {slides.length === 0 ? (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-4 text-center">
                    No hay diapositivas: la portada se muestra sin carrusel.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {slides.map((slide, index) => {
                      const texts = textsOf(slide);
                      const isBusy = busyId === slide.id;
                      return (
                        <div
                          key={slide.id}
                          className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row gap-4"
                        >
                          <div className="md:w-64 shrink-0 space-y-2">
                            {/* La imagen va posicionada: si solo lleva h-full, su alto intrínseco
                                gana al aspect-ratio y las tarjetas salen desparejas. */}
                            <div
                              className="bg-gray-50 relative overflow-hidden rounded-lg"
                              style={{ aspectRatio: CAROUSEL_ASPECT }}
                            >
                              <img
                                src={resolveImageRef(slide.ref)}
                                alt={texts.title || `Diapositiva ${index + 1}`}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              {isBusy && (
                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                  <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                              )}
                            </div>
                            <label className={`${uploadButtonClass(isBusy)} w-full`}>
                              <Upload className="w-3.5 h-3.5" />
                              Cambiar imagen
                              <input
                                type="file"
                                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                                className="hidden"
                                disabled={isBusy}
                                onChange={e => {
                                  handleSlideImage(slide, e.target.files);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-gray-400">
                                Diapositiva {index + 1}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleSlideMove(index, -1)}
                                  disabled={index === 0 || !!busyId}
                                  title="Mover antes"
                                  className="p-1.5 text-gray-500 hover:text-black disabled:opacity-30"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleSlideMove(index, 1)}
                                  disabled={index === slides.length - 1 || !!busyId}
                                  title="Mover después"
                                  className="p-1.5 text-gray-500 hover:text-black disabled:opacity-30"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleSlideRemove(slide)}
                                  disabled={!!busyId}
                                  title="Eliminar diapositiva"
                                  className="p-1.5 text-red-500 hover:text-red-700 disabled:opacity-30"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <label className="block">
                              <span className="text-xs font-bold text-gray-500">Título</span>
                              <input
                                value={texts.title}
                                onChange={e => updateDraft(slide, 'title', e.target.value)}
                                placeholder="Esos momentos que no quieres olvidar"
                                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-bold text-gray-500">Descripción</span>
                              <input
                                value={texts.description}
                                onChange={e => updateDraft(slide, 'description', e.target.value)}
                                placeholder="Cada photobook es un pedacito de tu historia"
                                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-bold text-gray-500">Texto del botón</span>
                              <input
                                value={texts.cta}
                                onChange={e => updateDraft(slide, 'cta', e.target.value)}
                                placeholder="Vamos a Diseñar"
                                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── IMÁGENES SUELTAS ── */}
            {SYSTEM_IMAGE_SLOTS.some(slot => slot.group === group) && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SYSTEM_IMAGE_SLOTS.filter(slot => slot.group === group).map(slot => {
                  const isBusy = busyId === slot.id;
                  return (
                    <div key={slot.id} className="border border-gray-200 rounded-xl overflow-hidden flex flex-col">
                      <div className="bg-gray-50 relative overflow-hidden" style={{ aspectRatio: slot.aspect }}>
                        <img
                          src={resolveImageRef(images[slot.id]) || slot.defaultUrl}
                          alt={slot.label}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {isBusy && (
                          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                        )}
                      </div>

                      <div className="p-4 flex flex-col gap-2 flex-1">
                        <p className="font-bold text-sm">{slot.label}</p>
                        <p className="text-xs text-gray-500 flex-1">{slot.hint}</p>
                        <label className={`${uploadButtonClass(isBusy)} w-full mt-1`}>
                          <Upload className="w-3.5 h-3.5" />
                          Cambiar imagen
                          <input
                            type="file"
                            accept={ACCEPTED_IMAGE_TYPES.join(',')}
                            className="hidden"
                            disabled={isBusy}
                            onChange={e => {
                              handleSlotUpload(slot.id, e.target.files);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── GALERÍAS ── */}
            {SYSTEM_IMAGE_GALLERIES.filter(gallery => gallery.group === group).map(gallery => {
              const stored = galleries[gallery.id];
              const current = Array.isArray(stored) ? stored : [...gallery.defaultRefs];
              const isBusy = busyId === gallery.id;

              return (
                <div key={gallery.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm">{gallery.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {gallery.hint} · {current.length} imagen(es)
                      </p>
                    </div>
                    <label className={uploadButtonClass(isBusy)}>
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Añadir imágenes
                      <input
                        type="file"
                        multiple
                        accept={ACCEPTED_IMAGE_TYPES.join(',')}
                        className="hidden"
                        disabled={isBusy}
                        onChange={e => {
                          handleGalleryAdd(gallery.id, current, e.target.files);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {current.length === 0 ? (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-4 text-center">
                      La galería está vacía: en la tienda no se mostrará ninguna imagen.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      {current.map((ref, index) => (
                        <div key={`${ref}-${index}`} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div
                            className="bg-gray-50 relative overflow-hidden"
                            style={{ aspectRatio: gallery.aspect }}
                          >
                            <img
                              src={resolveImageRef(ref)}
                              alt={`${gallery.label} ${index + 1}`}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex items-center justify-between px-1 py-1">
                            <button
                              onClick={() => handleGalleryMove(gallery.id, current, index, -1)}
                              disabled={index === 0 || isBusy}
                              title="Mover antes"
                              className="p-1 text-gray-500 hover:text-black disabled:opacity-30"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleGalleryRemove(gallery.id, current, index)}
                              disabled={isBusy}
                              title="Quitar de la galería"
                              className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleGalleryMove(gallery.id, current, index, 1)}
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
