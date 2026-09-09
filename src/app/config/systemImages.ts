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

// Creador (elige tu producto)
import creatorAlbum from '../../assets/Album2.jpeg';
import creatorCalendar from '../../assets/ec28dc812bed68927d47becc060a8091e563d836.png';

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

/**
 * Lo que necesita saber quien sube la imagen. Todas se pintan con
 * `object-cover`, es decir, la web las RECORTA para llenar su hueco: el recorte
 * cambia con el ancho de la pantalla, así que lo que quede fuera del centro
 * puede desaparecer en móvil.
 */
export interface ImageSpec {
  /** Tamaño recomendado del archivo. */
  size: string;
  /** Dónde tiene que quedar el contenido para que el recorte no se lo lleve. */
  safeZone: string;
}

/** Instrucciones del carrusel: valen para todas las diapositivas. */
export const CAROUSEL_SPEC: ImageSpec = {
  size: '2400 × 1350 px (16:9), JPG de menos de 8 MB.',
  safeZone:
    'Ocupa todo el ancho y el 60% del alto de la pantalla, así que el recorte cambia mucho: ' +
    'en escritorio se ve una franja muy ancha y en móvil una mucho más estrecha y alta. ' +
    'Deja lo importante dentro del 60% central de la foto y no pegues nada a los bordes. ' +
    'Ten en cuenta también que el tercio inferior queda bajo el degradado con el título, la ' +
    'descripción y el botón.',
};

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
  /** Qué tamaño necesita y dónde debe quedar el contenido. */
  spec: ImageSpec;
}

export interface SystemImageGallery {
  id: string;
  group: SystemImageGroup;
  label: string;
  hint: string;
  aspect: string;
  /** Referencias `initial:` a las imágenes con las que arranca la galería. */
  defaultRefs: string[];
  /** Qué tamaño necesita y dónde debe quedar el contenido. */
  spec: ImageSpec;
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

const LANDING_CARD_SPEC: ImageSpec = {
  size: '1600 × 1200 px (4:3), JPG.',
  safeZone:
    'Se recorta a una franja apaisada de 288 px de alto que en móvil ocupa todo el ancho y en ' +
    'escritorio un tercio: centra el producto y déjale aire arriba y abajo. En la esquina ' +
    'inferior izquierda van el nombre y el botón «Más», así que evita poner ahí nada importante.',
};

const SQUARE_CARD_SPEC: ImageSpec = {
  size: '1200 × 1200 px (cuadrada), JPG o PNG.',
  safeZone:
    'Se ve cuadrada y completa, sin recorte lateral: centra el producto y deja un margen de ' +
    'alrededor del 10% por cada lado para que no toque los bordes de la tarjeta.',
};

const MASCOT_SPEC: ImageSpec = {
  size: '600 × 600 px (cuadrada), PNG con fondo transparente.',
  safeZone:
    'Se pinta pequeña (112 px) y entera, sin recortar: centra el dibujo y deja un 10% de ' +
    'margen alrededor. El fondo tiene que ser transparente, no blanco.',
};

const GALLERY_SPEC: ImageSpec = {
  size: '1200 × 1200 px (cuadrada), JPG.',
  safeZone:
    'Se recorta a un cuadrado: centra la muestra del material y evita texto o detalles cerca ' +
    'de los bordes, porque son lo primero que se pierde al recortar.',
};

export const SYSTEM_IMAGE_SLOTS = [
  {
    id: 'landing.product.album',
    group: 'Productos en la portada',
    label: 'Álbumes de fotos',
    hint: 'Tarjeta de álbumes en «Nuestros Productos».',
    aspect: '4 / 3',
    defaultUrl: landingAlbum,
    spec: LANDING_CARD_SPEC,
  },
  {
    id: 'landing.product.calendar',
    group: 'Productos en la portada',
    label: 'Calendarios',
    hint: 'Tarjeta de calendarios en «Nuestros Productos».',
    aspect: '4 / 3',
    defaultUrl: landingCalendar,
    spec: LANDING_CARD_SPEC,
  },
  {
    id: 'creator.product.album',
    group: 'Creador',
    label: 'Álbum de fotos',
    hint: 'Tarjeta de álbum en la pantalla «Elige Tu Producto».',
    aspect: '1 / 1',
    defaultUrl: creatorAlbum,
    spec: SQUARE_CARD_SPEC,
  },
  {
    id: 'creator.product.calendar',
    group: 'Creador',
    label: 'Calendario de fotos',
    hint: 'Tarjeta de calendario en la pantalla «Elige Tu Producto».',
    aspect: '1 / 1',
    defaultUrl: creatorCalendar,
    spec: SQUARE_CARD_SPEC,
  },
  {
    id: 'organizer.upload.mascot',
    group: 'Creador',
    label: 'Ilustración de «subir fotos»',
    hint: 'Imagen grande del botón para seleccionar fotos del álbum.',
    aspect: '1 / 1',
    defaultUrl: organizerMascot,
    spec: MASCOT_SPEC,
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
    spec: GALLERY_SPEC,
  },
  {
    id: 'samples.papel',
    group: 'Galerías de muestra',
    label: 'Carátula en pasta dura con foto',
    hint: 'Muestras del estilo en papel, en el detalle del álbum.',
    aspect: '1 / 1',
    defaultRefs: DEFAULT_PAPEL_REFS,
    spec: GALLERY_SPEC,
  },
  {
    id: 'samples.tela',
    group: 'Galerías de muestra',
    label: 'Carátula en tela',
    hint: 'Muestras del estilo en tela, en el detalle del álbum.',
    aspect: '1 / 1',
    defaultRefs: DEFAULT_TELA_REFS,
    spec: GALLERY_SPEC,
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
