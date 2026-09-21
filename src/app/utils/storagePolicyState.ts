/**
 * Política de almacenamiento: cuántos borradores puede tener a la vez un
 * cliente, cuánto tiempo sobreviven sin editarse y contra qué capacidad se
 * calcula el "disponible" del panel.
 *
 * MISMA FILOSOFÍA que `storeConfigState`: lo que hay aquí es el ESTADO INICIAL,
 * el que rige mientras nadie haya guardado nada. En cuanto el dueño guarda
 * desde "Gestión de almacenamiento", manda el documento
 * `settings/storage_policy` y el código deja de opinar. La app NUNCA escribe
 * estos iniciales en Firestore.
 *
 * El backend (`jiffy-backend/src/storage/storage-policy.ts`) tiene una copia
 * idéntica de los iniciales: la limpieza automática lee el mismo documento.
 */

export interface StoragePolicy {
  /** Borradores simultáneos que puede tener un mismo usuario. */
  maxDraftsPerUser: number;
  /** Días desde la última edición tras los cuales un borrador se borra solo. */
  draftRetentionDays: number;
  /**
   * Capacidad de referencia del bucket, en GB. Cloud Storage no tiene tope real
   * (es pago por uso): el panel calcula "disponible" contra esta cifra.
   */
  storageCapacityGb: number;
  /**
   * Fecha (ISO) desde la que rige la caducidad. La fija el panel la primera vez
   * que el dueño guarda la política. Solo vencen los borradores CREADOS después
   * de esta fecha: los que ya existían no se tocan nunca, y sin fecha no vence
   * ninguno. Copia idéntica de la regla en el backend.
   */
  retentionAppliesFrom: string | null;
}

export const STORAGE_POLICY_DOC_ID = 'storage_policy';

export const INITIAL_STORAGE_POLICY: StoragePolicy = {
  maxDraftsPerUser: 5,
  draftRetentionDays: 90,
  storageCapacityGb: 5,
  retentionAppliesFrom: null,
};

export const STORAGE_POLICY_LIMITS = {
  maxDraftsPerUser: { min: 1, max: 100 },
  draftRetentionDays: { min: 1, max: 3650 },
  storageCapacityGb: { min: 0.1, max: 100000 },
} as const;

function positiveInt(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

function positiveNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : fallback;
}

function isoOrNull(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}

/**
 * Combina lo guardado con el inicial. Lo guardado manda siempre que sea un
 * valor válido; el inicial solo rellena lo que el documento no tiene (por
 * ejemplo, una clave nueva que añade una versión posterior del código).
 */
export function mergeStoragePolicy(
  stored: Partial<Record<keyof StoragePolicy, unknown>> | null | undefined,
  initial: StoragePolicy = INITIAL_STORAGE_POLICY
): StoragePolicy {
  const data = stored ?? {};
  return {
    maxDraftsPerUser: positiveInt(data.maxDraftsPerUser, initial.maxDraftsPerUser),
    draftRetentionDays: positiveInt(data.draftRetentionDays, initial.draftRetentionDays),
    storageCapacityGb: positiveNumber(data.storageCapacityGb, initial.storageCapacityGb),
    retentionAppliesFrom: isoOrNull(data.retentionAppliesFrom),
  };
}

/** Se queda solo con lo que se guarda (sin banderas de carga ni metadatos). */
export function pickStoragePolicy(value: StoragePolicy): StoragePolicy {
  return {
    maxDraftsPerUser: value.maxDraftsPerUser,
    draftRetentionDays: value.draftRetentionDays,
    storageCapacityGb: value.storageCapacityGb,
    retentionAppliesFrom: value.retentionAppliesFrom ?? null,
  };
}

/** Errores de validación del formulario del panel, por campo. Vacío = válido. */
export function validateStoragePolicy(value: StoragePolicy): Partial<Record<keyof StoragePolicy, string>> {
  const errors: Partial<Record<keyof StoragePolicy, string>> = {};
  const { maxDraftsPerUser, draftRetentionDays, storageCapacityGb } = STORAGE_POLICY_LIMITS;

  if (!Number.isInteger(value.maxDraftsPerUser) || value.maxDraftsPerUser < maxDraftsPerUser.min || value.maxDraftsPerUser > maxDraftsPerUser.max) {
    errors.maxDraftsPerUser = `Debe ser un entero entre ${maxDraftsPerUser.min} y ${maxDraftsPerUser.max}.`;
  }
  if (!Number.isInteger(value.draftRetentionDays) || value.draftRetentionDays < draftRetentionDays.min || value.draftRetentionDays > draftRetentionDays.max) {
    errors.draftRetentionDays = `Debe ser un entero entre ${draftRetentionDays.min} y ${draftRetentionDays.max} días.`;
  }
  if (!Number.isFinite(value.storageCapacityGb) || value.storageCapacityGb < storageCapacityGb.min || value.storageCapacityGb > storageCapacityGb.max) {
    errors.storageCapacityGb = `Debe ser un número entre ${storageCapacityGb.min} y ${storageCapacityGb.max} GB.`;
  }
  return errors;
}

/** Bytes → "1,2 GB" / "340 MB" / "12 KB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  const decimals = exponent === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${units[exponent]}`;
}
