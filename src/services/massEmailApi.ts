import { auth } from '../lib/firebase';

/**
 * Cliente del módulo `email/*` del backend (correos masivos a usuarios).
 *
 * Solo para el dueño: el backend comprueba el ID token de Firebase. La clave del
 * proveedor de correo vive en el backend y el navegador nunca la ve.
 */

export type EmailSegment = 'all' | 'with_orders' | 'without_orders';
export type EmailBodyFormat = 'text' | 'html';

export const SEGMENT_LABELS: Record<EmailSegment, string> = {
  all: 'Todos los usuarios',
  with_orders: 'Con pedidos',
  without_orders: 'Sin pedidos',
};

export interface EmailDraft {
  subject: string;
  body: string;
  format: EmailBodyFormat;
}

export interface EmailStatus {
  provider: string;
  from: string | null;
  replyTo: string | null;
  postalAddress: string | null;
  missing: string[];
  ready: boolean;
}

export interface EmailAudience {
  segment: EmailSegment;
  totalUsers: number;
  inSegment: number;
  optedOut: number;
  invalidEmail: number;
  duplicates: number;
  recipients: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  to: string;
  ok: boolean;
  id?: string;
  error?: string;
}

export interface EmailCampaign {
  id: string;
  subject: string;
  body: string;
  format: EmailBodyFormat;
  segment: EmailSegment;
  status: 'sending' | 'sent' | 'partial' | 'failed';
  recipients: number;
  sent: number;
  failed: number;
  skippedOptOut: number;
  skippedInvalid: number;
  provider: string;
  createdBy: string;
  createdAt: string;
  finishedAt: string | null;
  failures: Array<{ email: string; error: string }>;
}

export class MassEmailError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'MassEmailError';
  }
}

function backendUrl(): string {
  return (
    import.meta.env.VITE_BACKEND_URL ||
    'https://jiffy-backend-938778636106.europe-west1.run.app'
  );
}

async function request<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new MassEmailError(401, 'Inicia sesión como dueño para enviar correos.');

  const idToken = await user.getIdToken();
  const response = await fetch(`${backendUrl()}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });

  const text = await response.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!response.ok) {
    const message =
      data?.message ||
      (response.status === 404 ? 'El backend todavía no tiene el módulo de correos desplegado.' : null) ||
      (response.status === 403 ? 'Solo el dueño de la tienda puede hacer esto.' : `El backend respondió HTTP ${response.status}`);
    throw new MassEmailError(response.status, Array.isArray(message) ? message.join(', ') : message);
  }

  return data as T;
}

export function getEmailStatus(): Promise<EmailStatus> {
  return request<EmailStatus>('/email/status');
}

export function getEmailAudience(segment: EmailSegment): Promise<EmailAudience> {
  return request<EmailAudience>('/email/audience', { method: 'POST', body: { segment } });
}

export function previewEmail(draft: EmailDraft): Promise<RenderedEmail> {
  return request<RenderedEmail>('/email/preview', { method: 'POST', body: draft });
}

export function sendTestEmail(draft: EmailDraft, to: string): Promise<SendResult> {
  return request<SendResult>('/email/test', { method: 'POST', body: { ...draft, to } });
}

/** `campaignId` lo genera el panel: si la petición se repite, el backend no envía dos veces. */
export function sendCampaign(draft: EmailDraft, segment: EmailSegment, campaignId: string): Promise<EmailCampaign> {
  return request<EmailCampaign>('/email/campaigns', { method: 'POST', body: { ...draft, segment, campaignId } });
}

export function listCampaigns(): Promise<EmailCampaign[]> {
  return request<EmailCampaign[]>('/email/campaigns');
}

export function newCampaignId(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().replace(/-/g, '')
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `c_${random}`.slice(0, 40);
}
