/**
 * Catálogo de las imágenes propias del sistema (las que NO son fotos de un
 * pedido): carrusel de la portada, tarjetas de producto, muestras de materiales…
 *
 * Lo que hay aquí es el ESTADO INICIAL: las imágenes con las que arranca la
 * tienda mientras la administración no cambie nada. En cuanto sube una imagen
 * nueva, esa pasa a ser la de la tienda y la inicial deja de usarse — no se
 * guarda copia ni hay forma de volver a ella desde el panel. Lo que se cambia
 * vive en `settings/system_images` y `SystemImagesContext` lo antepone.
 *
 * REFERENCIAS, NO URLS: en Firestore nunca se guarda la URL de una imagen del
 * bundle, porque Vite le pone un hash que cambia en cada despliegue y la
 * referencia guardada quedaría muerta. Las iniciales se guardan como
 * `initial:<clave>` y se resuelven aquí contra el bundle actual; las que sube la
 * administración se guardan como URL de Storage, que sí es estable.
 *
 * QUÉ NO ENTRA AQUÍ, a propósito:
 * - El logo y `justwhite.png`: se usan dentro de las capturas de html-to-image
 *   que generan los PDFs. Una imagen remota puede contaminar el lienzo o llegar
 *   tarde a la captura y devolver páginas en gris; ese camino se queda con el
 *   asset local.
 * - `Anim_IOS.mp4`: es un vídeo, no una foto.
 */

// Portada
import heroSlide1 from '../../assets/Carousel/c4.jpg';
import heroSlide2 from '../../assets/Carousel/C100164.jpg';
import heroSlide3 from '../../assets/Carousel/c8.jpg';
import heroSlide4 from '../../assets/Carousel/C100153.jpg';
import landingAlbum from '../../assets/IMG_8973.jpg';
import landingCalendar from '../../assets/Calendario.jpg';
import landingMug from '../../assets/f4da798dda5ec8fb3dfb223bc7ad323042e3d27f.png';
import landingPhotoPack from '../../assets/926a104c374871caf4fcad0882de38be9da36b8a.png';

// Creador (elige tu producto)
import creatorAlbum from '../../assets/Album2.jpeg';
import creatorCalendar from '../../assets/ec28dc812bed68927d47becc060a8091e563d836.png';
import creatorMug from '../../assets/eb118a5bec949d55aceb42319ab38162a57c22ff.png';

// Organizador de fotos
import organizerMascot from '../../assets/Jiffy2.png';

// Galerías de muestra del modal de detalle de producto (carpetas completas)
const clientesGlob = import.meta.glob('../../assets/Clientes/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', { eager: true });
const papelGlob = import.meta.glob('../../assets/Papel/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', { eager: true });
const telaGlob = import.meta.glob('../../assets/Tela/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', { eager: true });

/** Prefijo de las referencias a imágenes del bundle. */
export const INITIAL_REF_PREFIX = 'initial:';

/** clave estable (sin hash) → URL que el bundle tiene HOY. */
const INITIAL_URL_BY_KEY: Record<string, string> = {};

/** Registra una imagen inicial y devuelve su referencia estable. */
function registerInitial(key: string, url: string): string {
  INITIAL_URL_BY_KEY[key] = url;
  return `${INITIAL_REF_PREFIX}${key}`;
}

/**
 * Vite devuelve las claves del glob sin orden garantizado; se ordenan por ruta
 * para que la galería salga siempre igual. La clave es `Carpeta/archivo.jpg`.
 */
function registerFolder(glob: Record<string, unknown>, folder: string): string[] {
  return Object.keys(glob)
    .sort()
    .map(path => {
      const fileName = path.split('/').pop() as string;
      return registerInitial(`${folder}/${fileName}`, (glob[path] as { default: string }).default);
    });
}

const DEFAULT_CLIENTES_REFS = registerFolder(clientesGlob, 'Clientes');
const DEFAULT_PAPEL_REFS = registerFolder(papelGlob, 'Papel');
const DEFAULT_TELA_REFS = registerFolder(telaGlob, 'Tela');

/**
 * Traduce una referencia guardada a una URL pintable: las de Storage se
 * devuelven tal cual y las `initial:` se resuelven contra el bundle actual.
 * Devuelve '' si esa imagen inicial ya no existe en el código, para que quien
 * pinta pueda saltársela en vez de dejar un hueco roto.
 */
export function resolveImageRef(ref: string | null | undefined): string {
  if (!ref) return '';
  if (!ref.startsWith(INITIAL_REF_PREFIX)) return ref;
  return INITIAL_URL_BY_KEY[ref.slice(INITIAL_REF_PREFIX.length)] ?? '';
}

/** true si la referencia apunta a un archivo subido por la administración. */
export const isUploadedRef = (ref: string | null | undefined): boolean =>
  !!ref && !ref.startsWith(INITIAL_REF_PREFIX);

/** Grupos con los que se ordena el panel de administración. */
export type SystemImageGroup = 'Portada' | 'Productos en la portada' | 'Creador' | 'Galerías de muestra';

export interface SystemImageSlot {
  /** Clave estable: es la que se guarda en Firestore, no se debe renombrar. */
  id: string;
  group: SystemImageGroup;
  label: string;
  /** Dónde se ve, para que la administración sepa qué está cambiando. */
  hint: string;
  /** Proporción con la que se pinta la vista previa (CSS `aspect-ratio`). */
  aspect: string;
  /** Imagen con la que arranca la tienda mientras nadie suba otra. */
  defaultUrl: string;
}

export interface SystemImageGallery {
  id: string;
  group: SystemImageGroup;
  label: string;
  hint: string;
  aspect: string;
  /** Referencias `initial:` a las imágenes con las que arranca la galería. */
  defaultRefs: string[];
}

/**
 * Una diapositiva del carrusel de la portada. La imagen y los tres textos viajan
 * juntos: si se pudieran añadir imágenes sin sus textos, el carrusel enseñaría
 * diapositivas mudas.
 */
export interface CarouselSlide {
  /** Id propio de la diapositiva, para reordenar y borrar sin ambigüedad. */
  id: string;
  /** Referencia a la imagen: URL de Storage o `initial:<clave>`. */
  ref: string;
  title: string;
  description: string;
  /** Texto del botón que lleva al creador. */
  cta: string;
}

/** Carrusel con el que arranca la tienda mientras la administración no lo cambie. */
export const DEFAULT_CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    id: 'slide-1',
    ref: registerInitial('Carousel/c4.jpg', heroSlide1),
    title: 'Esos momentos que no quieres olvidar',
    description: 'Cada photobook es un pedacito de tu historia',
    cta: 'Vamos a Diseñar',
  },
  {
    id: 'slide-2',
    ref: registerInitial('Carousel/C100164.jpg', heroSlide2),
    title: 'Tus momentos en las mejores manos',
    description: 'Porque tus recuerdos merecen lo mejor',
    cta: 'Vamos a Diseñar',
  },
  {
    id: 'slide-3',
    ref: registerInitial('Carousel/c8.jpg', heroSlide3),
    title: 'Lo que más amas, siempre cerca de ti',
    description: 'Que cada día te recuerde lo que realmente importa',
    cta: 'Vamos a Diseñar',
  },
  {
    id: 'slide-4',
    ref: registerInitial('Carousel/C100153.jpg', heroSlide4),
    title: 'Recuerdos que vuelves a sentir cada vez que los miras',
    description: 'Llena tus días de momentos que amas',
    cta: 'Vamos a Diseñar',
  },
];

/** Proporción con la que se previsualiza una diapositiva en el panel. */
export const CAROUSEL_ASPECT = '16 / 9';

export const SYSTEM_IMAGE_SLOTS = [
  {
    id: 'landing.product.album',
    group: 'Productos en la portada',
    label: 'Álbumes de fotos',
    hint: 'Tarjeta de álbumes en «Nuestros Productos».',
    aspect: '1 / 1',
    defaultUrl: landingAlbum,
  },
  {
    id: 'landing.product.calendar',
    group: 'Productos en la portada',
    label: 'Calendarios',
    hint: 'Tarjeta de calendarios en «Nuestros Productos».',
    aspect: '1 / 1',
    defaultUrl: landingCalendar,
  },
  {
    id: 'landing.product.mug',
    group: 'Productos en la portada',
    label: 'Tazas',
    hint: 'Tarjeta de tazas en «Nuestros Productos» (solo si las tazas están activas).',
    aspect: '1 / 1',
    defaultUrl: landingMug,
  },
  {
    id: 'landing.product.photoPack',
    group: 'Productos en la portada',
    label: 'Paquetes de fotos',
    hint: 'Tarjeta de paquetes de fotos en «Nuestros Productos» (solo si están activos).',
    aspect: '1 / 1',
    defaultUrl: landingPhotoPack,
  },
  {
    id: 'creator.product.album',
    group: 'Creador',
    label: 'Álbum de fotos',
    hint: 'Tarjeta de álbum en la pantalla «Elige Tu Producto».',
    aspect: '1 / 1',
    defaultUrl: creatorAlbum,
  },
  {
    id: 'creator.product.calendar',
    group: 'Creador',
    label: 'Calendario de fotos',
    hint: 'Tarjeta de calendario en la pantalla «Elige Tu Producto».',
    aspect: '1 / 1',
    defaultUrl: creatorCalendar,
  },
  {
    id: 'creator.product.mug',
    group: 'Creador',
    label: 'Taza personalizada',
    hint: 'Tarjeta de taza en la pantalla «Elige Tu Producto» (solo si las tazas están activas).',
    aspect: '1 / 1',
    defaultUrl: creatorMug,
  },
  {
    id: 'organizer.upload.mascot',
    group: 'Creador',
    label: 'Ilustración de «subir fotos»',
    hint: 'Imagen grande del botón para seleccionar fotos del álbum.',
    aspect: '1 / 1',
    defaultUrl: organizerMascot,
  },
] as const satisfies readonly SystemImageSlot[];

export type SystemImageSlotId = (typeof SYSTEM_IMAGE_SLOTS)[number]['id'];

export const SYSTEM_IMAGE_GALLERIES = [
  {
    id: 'samples.clientes',
    group: 'Galerías de muestra',
    label: 'Clientes felices',
    hint: 'Carrusel de fotos de clientes dentro del detalle de cada producto.',
    aspect: '1 / 1',
    defaultRefs: DEFAULT_CLIENTES_REFS,
  },
  {
    id: 'samples.papel',
    group: 'Galerías de muestra',
    label: 'Carátula en pasta dura con foto',
    hint: 'Muestras del estilo en papel, en el detalle del álbum.',
    aspect: '1 / 1',
    defaultRefs: DEFAULT_PAPEL_REFS,
  },
  {
    id: 'samples.tela',
    group: 'Galerías de muestra',
    label: 'Carátula en tela',
    hint: 'Muestras del estilo en tela, en el detalle del álbum.',
    aspect: '1 / 1',
    defaultRefs: DEFAULT_TELA_REFS,
  },
] as const satisfies readonly SystemImageGallery[];

export type SystemImageGalleryId = (typeof SYSTEM_IMAGE_GALLERIES)[number]['id'];

/** Orden en el que se pintan los grupos en el panel. */
export const SYSTEM_IMAGE_GROUPS: SystemImageGroup[] = [
  'Portada',
  'Productos en la portada',
  'Creador',
  'Galerías de muestra',
];

/** Documento de Firestore donde vive lo que la administración ha cambiado. */
export const SYSTEM_IMAGES_DOC = { collection: 'settings', id: 'system_images' } as const;

/** Carpeta de Storage donde se suben las imágenes nuevas. */
export const SYSTEM_IMAGES_STORAGE_PREFIX = 'system_images';

/** Formatos aceptados y tamaño máximo por archivo (los assets del bundle rondan 1-2 MB). */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
