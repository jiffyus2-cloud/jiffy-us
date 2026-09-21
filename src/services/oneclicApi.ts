import { auth } from '../lib/firebase';

/**
 * Cliente fino del módulo de 1clic.ai del backend (`/oneclic/*`).
 *
 * El navegador nunca habla con 1clic ni ve la clave: el backend tiene la
 * clave, aplica las reglas del contrato (idempotencia, sondeo, reintentos) y
 * aquí solo se pinta lo que devuelve. Todo va con el ID token del dueño.
 */

export interface OneclicAgent {
  id: string | null;
  address: string;
  name: string;
  description: string | null;
  status: string;
  modes: string[];
  runnable: boolean;
}

export interface OneclicStatus {
  configured: { api_key: boolean; connection_id: boolean };
  env_vars: { api_key: string; connection_id: string };
  status: {
    connection_id: string;
    state: string;
    signals?: Record<string, string | null>;
    waiting_on?: { kind: string; since: string; url: string } | null;
    conformance?: { passed: number; total: number; failed: string[]; report_url: string } | null;
    next: string;
    next_url?: string | null;
  } | null;
  agents: OneclicAgent[];
  test_agent: { address: string; modes: string[] } | null;
  agents_note: string | null;
  assign_url: string | null;
  error: { code: string; message: string; remediation?: string | null } | null;
}

export interface OneclicProposal {
  run_id: string | null;
  agent: { id: string; name: string };
  summary: string;
  proposal: string;
  actions: string[];
  cost_usd: number;
  duration_ms: number | null;
  dry_run: boolean;
  deduplicated: boolean;
  typed_response: { valid: boolean; errors?: string[] } | null;
  raw_reply: string | null;
}

export interface OneclicAttestation { file: string; line: number }

export interface OneclicVerifyReport {
  session: { session_id: string; ref: string; expires_at: string; instructions: string[] };
  exercise: { step: string; ok: boolean; detail: string }[];
  grade: {
    session_id: string;
    score: string;
    passed: number;
    failed: number;
    blocked: number;
    can_go_live: boolean;
    checks: {
      id: string; n: number; name: string; kind: 'observed' | 'attested';
      status: 'pass' | 'fail' | 'attestation_missing';
      detail: string; evidence?: string | null; remediation?: string | null;
    }[];
    next?: string;
  };
}

/** Error del backend/1clic con el sobre ya interpretado (código + qué hacer). */
export class OneclicRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly remediation: string | null = null,
    readonly retryAfter: number | null = null,
  ) {
    super(message);
    this.name = 'OneclicRequestError';
  }
}

export const ONECLIC_TEST_AGENT_ID = '1clic-test';

function backendUrl(): string {
  return (
    import.meta.env.VITE_BACKEND_URL ||
    'https://jiffy-backend-938778636106.europe-west1.run.app'
  );
}

async function request<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new OneclicRequestError(401, 'no_session', 'Inicia sesión como dueño para usar la conexión con 1clic.');

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
    // Nest envuelve HttpException({code,...}) tal cual; los guards devuelven {message}.
    const code = data?.code || (response.status === 403 ? 'not_owner' : response.status === 401 ? 'no_session' : 'http_error');
    const message = data?.message || (typeof data === 'string' ? data : `El backend respondió HTTP ${response.status}`);
    throw new OneclicRequestError(response.status, code, message, data?.remediation ?? null, data?.retry_after ?? null);
  }

  return data as T;
}

export function getOneclicStatus(): Promise<OneclicStatus> {
  return request<OneclicStatus>('/oneclic/status');
}

export function requestOneclicProposal(input: {
  agentId: string;
  message: string;
  recordId: string;
  context?: unknown;
  mode?: 'default' | 'dry_run';
}): Promise<OneclicProposal> {
  return request<OneclicProposal>('/oneclic/propose', { method: 'POST', body: input });
}

export function verifyOneclicConnection(attestations: {
  cost_visible: OneclicAttestation;
  proposal_only: OneclicAttestation;
}): Promise<OneclicVerifyReport> {
  return request<OneclicVerifyReport>('/oneclic/verify', { method: 'POST', body: { attestations } });
}

/** Texto para el dueño según el código del sobre de 1clic. */
export function describeOneclicError(error: unknown): { title: string; detail: string; isExpected: boolean } {
  if (error instanceof OneclicRequestError) {
    switch (error.code) {
      case 'agent_not_allowed':
        return {
          title: 'La clave vale; falta asignar un agente',
          detail: 'Esto no es un fallo de la integración: hasta que asignes un agente a esta conexión en 1clic, los runs reales responden 403. El agente de prueba sí funciona.',
          isExpected: true,
        };
      case 'not_configured':
        return { title: 'Falta configurar el servidor', detail: error.message, isExpected: true };
      case 'insufficient_quota':
      case 'budget_reached':
      case 'spend_cap_reached':
        return { title: 'Sin saldo o tope alcanzado', detail: `${error.message} No se reintenta hasta que lo resuelvas en 1clic.`, isExpected: false };
      case 'rate_limit_exceeded':
        return { title: 'Demasiadas peticiones', detail: error.retryAfter ? `Espera ${error.retryAfter} s y vuelve a intentarlo.` : error.message, isExpected: false };
      case 'not_owner':
        return { title: 'Solo el dueño', detail: 'Esta sección solo funciona con la cuenta de administración de la tienda.', isExpected: false };
      default:
        return { title: `Error (${error.code})`, detail: error.message, isExpected: false };
    }
  }
  return { title: 'Error de red', detail: (error as Error)?.message || 'No se pudo contactar con el backend.', isExpected: false };
}

// ── Laboratorio de orden de álbumes (solo lectura) ───────────────────────────

export interface OneclicAlbumSummary {
  id: string;
  productName: string | null;
  productType: string | null;
  customerName: string | null;
  status: string | null;
  createdAt: string | null;
  size: string | null;
  photoCount: number;
  pageCount: number;
  cover: string | null;
}

export interface OneclicPhotoMetadata {
  index: number;
  page: number;
  slot: number;
  url: string;
  takenAt: string | null;
  width: number | null;
  height: number | null;
  orientation: 'H' | 'V' | 'S' | null;
  camera: string | null;
  bytes: number | null;
  note: string | null;
}

export interface OneclicAlbumOrderProposal {
  album: OneclicAlbumSummary;
  photos: OneclicPhotoMetadata[];
  withDate: number;
  context: { cameras: Record<string, string>; format: string; photos: string[]; omitted: number };
  proposal: {
    order: number[];
    groups: { title: string; indices: number[] }[];
    rationale: string;
    repaired: boolean;
    issues: string[];
  };
  agent: { id: string; name: string };
  mode: 'default' | 'dry_run';
  run_id: string | null;
  cost_usd: number;
  duration_ms: number | null;
  dry_run: boolean;
  deduplicated: boolean;
  typed_valid: boolean | null;
  timings_ms: { metadata: number; agent: number };
}

/** Álbumes con fotos, los más recientes primero. El backend solo lee. */
export function listOneclicAlbums(): Promise<OneclicAlbumSummary[]> {
  return request<OneclicAlbumSummary[]>('/oneclic/albums');
}

/**
 * Extrae los metadatos de las fotos del álbum y pide un orden al agente.
 * Devuelve una PROPUESTA: nada se guarda en el álbum.
 */
export function organizeOneclicAlbum(
  albumId: string,
  input: { agentId: string; mode?: 'default' | 'dry_run' },
): Promise<OneclicAlbumOrderProposal> {
  return request<OneclicAlbumOrderProposal>(`/oneclic/albums/${encodeURIComponent(albumId)}/organize`, { method: 'POST', body: input });
}
