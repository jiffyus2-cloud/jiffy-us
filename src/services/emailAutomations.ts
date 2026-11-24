import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { OrderEmailEvent, OrderEmailTemplate } from './massEmailApi';

/**
 * Plantillas de los correos automáticos de pedido. Las guarda el panel en
 * `email_automations/{evento}` (solo el dueño: firestore.rules) y las lee el
 * backend al enviar; los textos por defecto viven en el backend.
 */
export async function saveOrderEmailTemplate(
  event: OrderEmailEvent,
  template: Pick<OrderEmailTemplate, 'enabled' | 'subject' | 'body' | 'format'>,
  updatedBy: string,
): Promise<void> {
  if (!template.subject.trim()) throw new Error('Escribe un asunto.');
  if (!template.body.trim()) throw new Error('Escribe el contenido del correo.');
  await setDoc(doc(db, 'email_automations', event), {
    enabled: template.enabled,
    subject: template.subject,
    body: template.body,
    format: template.format,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}
