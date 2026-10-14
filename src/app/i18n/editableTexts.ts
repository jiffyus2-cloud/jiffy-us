// ============================================================================
// Editable Texts
// ============================================================================
// Qué textos salen en el panel "Textos de la Tienda": todos los del
// diccionario. Se distinguen dos tipos para poder filtrarlos:
// - Largos: descripciones, párrafos informativos, avisos, alertas y las
//   preguntas frecuentes.
// - Cortos: títulos de sección, subtítulos, botones y etiquetas.
// ============================================================================

import { DEFAULT_TEXTS } from './translations';

/** Por debajo de esto es un título, un botón o una etiqueta, no un texto informativo. */
export const LONG_TEXT_MIN_LENGTH = 40;

export type TextKind = 'short' | 'long';

export function kindOf(key: string, value: string): TextKind {
  return key.startsWith('faq.') || value.length >= LONG_TEXT_MIN_LENGTH ? 'long' : 'short';
}

/** Sección del panel según el prefijo de la clave. */
const GROUPS: Array<{ prefix: string; label: string }> = [
  { prefix: 'nav.', label: 'Menú superior' },
  { prefix: 'landing.', label: 'Página de inicio' },
  { prefix: 'faq.', label: 'Preguntas frecuentes' },
  { prefix: 'footer.', label: 'Pie de página' },
  { prefix: 'product.', label: 'Elige tu producto' },
  { prefix: 'details.', label: 'Ficha de producto' },
  { prefix: 'customAlbum.', label: 'Álbum Personalizado' },
  { prefix: 'step.', label: 'Pasos de la creación' },
  { prefix: 'albumSetup.', label: 'Configurar álbum' },
  { prefix: 'album.', label: 'Configurar álbum' },
  { prefix: 'cover.', label: 'Editor de portada' },
  { prefix: 'calendarSetup.', label: 'Calendario' },
  { prefix: 'calendarOrg.', label: 'Calendario' },
  { prefix: 'calendar.', label: 'Calendario' },
  { prefix: 'photos.', label: 'Subir fotos' },
  { prefix: 'organizer.', label: 'Editor del álbum' },
  { prefix: 'creator.', label: 'Guardado del diseño' },
  { prefix: 'draft.', label: 'Borradores' },
  { prefix: 'checkout.', label: 'Pago' },
  { prefix: 'success.', label: 'Pago completado' },
  { prefix: 'install.', label: 'Instalar la app' },
  { prefix: 'dashboard.', label: 'Mi cuenta' },
  { prefix: 'account.', label: 'Mi cuenta' },
  { prefix: 'status.', label: 'Estados del pedido' },
  { prefix: 'orderView.', label: 'Detalle del pedido' },
  { prefix: 'auth.', label: 'Inicio de sesión y registro' },
  { prefix: 'error.', label: 'Mensajes de error' },
  { prefix: 'support.', label: 'Soporte' },
  { prefix: 'common.', label: 'Comunes' },
];

export function groupOf(key: string): string {
  return GROUPS.find(g => key.startsWith(g.prefix))?.label ?? 'Otros';
}

/** Orden de las secciones en el panel: el de la lista de arriba. */
export const GROUP_ORDER: string[] = [...new Set([...GROUPS.map(g => g.label), 'Otros'])];

export interface EditableText {
  key: string;
  /** Texto del código (el que se usa si no se ha cambiado nada). */
  defaultValue: string;
  group: string;
  kind: TextKind;
}

/** Textos editables en español, en el orden en que aparecen en el código. */
export const EDITABLE_TEXTS: EditableText[] = Object.entries(DEFAULT_TEXTS.es).map(
  ([key, defaultValue]) => ({ key, defaultValue, group: groupOf(key), kind: kindOf(key, defaultValue) })
);
