import { auth } from '../lib/firebase';
import type { StoragePolicy } from '../app/utils/storagePolicyState';

/**
 * Cliente del módulo `storage/*` del backend (gestión de almacenamiento).
 *
 * Todo lo que hay aquí es solo para el dueño: el backend comprueba el ID token
 * de Firebase y rechaza a cualquier otro correo. Recorrer el bucket y borrar en
 * nombre de otros usuarios no se puede hacer desde el navegador, por eso pasa
 * por el servidor.
 */

export interface ProjectUsage {
  orderId: string;
  userId: string;
  bytes: number;
  files: number;
  status: string | null;
  productType: string | null;
  productName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string | null;
  lastEditedAt: string | null;
  lastFileAt: string | null;
  /** Otros pedidos vivos que usan las fotos de esta carpeta: mientras haya alguno no se borra. */
  sharedWith: string[];
}

export interface UserUsage {
  userId: string;
  name: string | null;
  email: string | null;
  bytes: number;
  files: number;
  projects: number;
  drafts: number;
}

interface Usage {
  bytes: number;
  files: number;
}

export interface CleanupSummary {
  at: string;
  dryRun: boolean;
  trigger: string;
  retentionDays: number;
  cutoff: string;
  appliesFrom: string | null;
  expiredDrafts: { count: number; bytes: number };
  orphans: { count: number; bytes: number };
  errors: string[];
}

export interface CleanupResult extends CleanupSummary {
  expiredDrafts: { count: number; bytes: number; items: ProjectUsage[] };
  orphans: { count: number; bytes: number; items: ProjectUsage[] };
}

export interface StorageStats {
  computedAt: string;
  fromCache: boolean;
  bucket: string;
  policy: StoragePolicy & { exists: boolean };
  totals: {
    bytes: number;
    files: number;
    capacityBytes: number;
    availableBytes: number;
    usedPercent: number;
  };
  breakdown: {
    drafts: Usage & { count: number };
    orders: Usage & { count: number };
    systemImages: Usage;
    orphans: Usage & { count: number };
    inProgress: Usage & { count: number };
    other: Usage;
  };
  expiredDrafts: { count: number; bytes: number; cutoff: string; retentionDays: number; appliesFrom: string | null };
  topProjects: ProjectUsage[];
  topUsers: UserUsage[];
  orphans: ProjectUsage[];
  lastCleanup: CleanupSummary | null;
}

export class StorageAdminError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'StorageAdminError';
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
  if (!user) throw new StorageAdminError(401, 'Inicia sesión como dueño para ver el almacenamiento.');

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
      (typeof data === 'string' ? data : null) ||
      (response.status === 403 ? 'Solo el dueño de la tienda puede ver esto.' : `El backend respondió HTTP ${response.status}`);
    throw new StorageAdminError(response.status, Array.isArray(message) ? message.join(', ') : message);
  }

  return data as T;
}

export function getStorageStats(refresh = false): Promise<StorageStats> {
  return request<StorageStats>(`/storage/stats${refresh ? '?refresh=1' : ''}`);
}

export function runStorageCleanup(options: { dryRun: boolean; expiredDrafts?: boolean; orphans?: boolean }): Promise<CleanupResult> {
  return request<CleanupResult>('/storage/cleanup', {
    method: 'POST',
    body: {
      dryRun: options.dryRun,
      expiredDrafts: options.expiredDrafts ?? true,
      // Las huérfanas tocan datos que ya existían: solo si se pide expresamente.
      orphans: options.orphans ?? false,
    },
  });
}
