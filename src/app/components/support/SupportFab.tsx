import { useLocation } from 'react-router';
import { useLanguage } from '../../context/LanguageContext';
import { WHATSAPP_SUPPORT_URL } from '../../config/contact';
import { WhatsAppIcon } from './WhatsAppIcon';

/**
 * Botón flotante de soporte por WhatsApp, visible en toda la app.
 *
 * Antes el único acceso a soporte vivía en la cabecera, que NO se pinta en
 * `/create`: justo el proceso donde el usuario se atasca (elegir fotos,
 * maquetar, pagar) era el único sitio sin forma de pedir ayuda. Y en móvil
 * estaba escondido dentro del menú hamburguesa.
 *
 * El z-index va por encima de las pantallas de carga y los modales del
 * organizador (que llegan a z-[300]) a propósito: si la app se queda esperando
 * al carrete de iOS, ese es exactamente el momento en el que hace falta el
 * botón. Se sitúa abajo a la derecha, por debajo de los avisos flotantes del
 * editor (bottom-20 y bottom-36), así que no tapa ninguno.
 */

/** Rutas donde el botón no aporta y además chocaría con el panel fijo del panel de administración. */
const HIDDEN_PATHS = ['/owner-dashboard'];

export function SupportFab() {
  const { t } = useLanguage();
  const { pathname } = useLocation();

  if (HIDDEN_PATHS.includes(pathname)) return null;

  const label = t('support.whatsapp');

  return (
    <a
      href={WHATSAPP_SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="fixed right-4 z-[400] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
