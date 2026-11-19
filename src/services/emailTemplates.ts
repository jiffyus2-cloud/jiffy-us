import {
  collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { EmailBodyFormat } from './massEmailApi';

/**
 * Plantillas de correo masivo: borradores con nombre que el dueño guarda para
 * reutilizar. Viven en `email_templates/{id}` y solo el dueño las lee y escribe
 * (firestore.rules). No intervienen en el envío: cargar una plantilla solo
 * rellena el editor.
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  format: EmailBodyFormat;
  updatedAt: Date | null;
  updatedBy: string;
}

const COLLECTION = 'email_templates';

export function newTemplateId(): string {
  return `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function templateFromDoc(id: string, data: Record<string, any>): EmailTemplate {
  const ts = data.updatedAt;
  return {
    id,
    name: String(data.name ?? '').trim() || 'Sin nombre',
    subject: String(data.subject ?? ''),
    body: String(data.body ?? ''),
    format: data.format === 'html' ? 'html' : 'text',
    updatedAt: ts instanceof Timestamp ? ts.toDate() : null,
    updatedBy: String(data.updatedBy ?? ''),
  };
}

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy('updatedAt', 'desc')));
  return snap.docs.map(d => templateFromDoc(d.id, d.data()));
}

export async function saveEmailTemplate(
  template: Pick<EmailTemplate, 'id' | 'name' | 'subject' | 'body' | 'format'>,
  updatedBy: string,
): Promise<void> {
  const name = template.name.trim();
  if (!name) throw new Error('Ponle un nombre a la plantilla.');
  await setDoc(doc(db, COLLECTION, template.id), {
    name: name.slice(0, 120),
    subject: template.subject,
    body: template.body,
    format: template.format,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
