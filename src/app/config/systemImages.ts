/**
 * Catálogo de las imágenes propias del sistema (las que NO son fotos de un
 * pedido): carrusel de la portada, tarjetas de producto, muestras de materiales…
 *
 * Cada entrada declara su imagen por defecto —la que viaja en el bundle— y las
 * administradoras pueden sustituirla desde el panel sin tocar código: la URL
 * elegida se guarda en `settings/system_images` y `SystemImagesContext` la
 * antepone al valor por defecto en toda la app.
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

/** Vite devuelve las claves del glob sin orden garantizado; se ordenan por ruta para que la galería sea estable. */
const globToUrls = (glob: Record<string, unknown>): string[] =>
  Object.keys(glob)
    .sort()
    .map(key => (glob[key] as { default: string }).default);

export const DEFAULT_CLIENTES_IMAGES = globToUrls(clientesGlob);
export const DEFAULT_PAPEL_IMAGES = globToUrls(papelGlob);
export const DEFAULT_TELA_IMAGES = globToUrls(telaGlob);

/** Grupos con los que se ordena el panel de administración. */
export type SystemImageGroup = 'Portada' | 'Productos en la portada' | 'Creador' | 'Galerías de muestra';

export interface SystemImageSlot {
  /** Clave estable: es la que se guarda en Firestore, no se debe renombrar. */
  id: string;
  group: SystemImageGroup;
  label: string;
  /** Dónde se ve, para que la administradora sepa qué está cambiando. */
  hint: string;
  /** Proporción con la que se pinta la vista previa (CSS `aspect-ratio`). */
  aspect: string;
  defaultUrl: string;
}

export interface SystemImageGallery {
  id: string;
  group: SystemImageGroup;
  label: string;
  hint: string;
  aspect: string;
  defaultUrls: string[];
}

export const SYSTEM_IMAGE_SLOTS = [
  {
    id: 'landing.hero.1',
    group: 'Portada',
    label: 'Carrusel — imagen 1',
    hint: 'Primera diapositiva del carrusel de la página de inicio.',
    aspect: '16 / 9',
    defaultUrl: heroSlide1,
  },
  {
    id: 'landing.hero.2',
    group: 'Portada',
    label: 'Carrusel — imagen 2',
    hint: 'Segunda diapositiva del carrusel de la página de inicio.',
    aspect: '16 / 9',
    defaultUrl: heroSlide2,
  },
  {
    id: 'landing.hero.3',
    group: 'Portada',
    label: 'Carrusel — imagen 3',
    hint: 'Tercera diapositiva del carrusel de la página de inicio.',
    aspect: '16 / 9',
    defaultUrl: heroSlide3,
  },
  {
    id: 'landing.hero.4',
    group: 'Portada',
    label: 'Carrusel — imagen 4',
    hint: 'Cuarta diapositiva del carrusel de la página de inicio.',
    aspect: '16 / 9',
    defaultUrl: heroSlide4,
  },
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
    defaultUrls: DEFAULT_CLIENTES_IMAGES,
  },
  {
    id: 'samples.papel',
    group: 'Galerías de muestra',
    label: 'Carátula en pasta dura con foto',
    hint: 'Muestras del estilo en papel, en el detalle del álbum.',
    aspect: '1 / 1',
    defaultUrls: DEFAULT_PAPEL_IMAGES,
  },
  {
    id: 'samples.tela',
    group: 'Galerías de muestra',
    label: 'Carátula en tela',
    hint: 'Muestras del estilo en tela, en el detalle del álbum.',
    aspect: '1 / 1',
    defaultUrls: DEFAULT_TELA_IMAGES,
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

/** Documento de Firestore donde viven las sustituciones. */
export const SYSTEM_IMAGES_DOC = { collection: 'settings', id: 'system_images' } as const;

/** Carpeta de Storage donde se suben las imágenes nuevas. */
export const SYSTEM_IMAGES_STORAGE_PREFIX = 'system_images';

/** Formatos aceptados y tamaño máximo por archivo (los assets del bundle rondan 1-2 MB). */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
