export const WHATSAPP_SUPPORT_PHONE = '573234089624';
export const WHATSAPP_SUPPORT_URL = `https://wa.me/${WHATSAPP_SUPPORT_PHONE}`;

export function buildWhatsAppUrl(message?: string): string {
  if (!message) return WHATSAPP_SUPPORT_URL;
  return `${WHATSAPP_SUPPORT_URL}?text=${encodeURIComponent(message)}`;
}
