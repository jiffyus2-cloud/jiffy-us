/**
 * Códigos de descuento: forma del dato y reglas de uso.
 *
 * La lógica vive aquí, separada de Firestore y de la interfaz, por dos razones:
 * el panel necesita saber si un código está caducado o agotado para pintarlo, y
 * el día que el checkout permita canjearlos tiene que decidir exactamente con
 * las mismas reglas. Un código que el panel muestra como válido y el checkout
 * rechaza (o al revés) es el peor de los errores posibles aquí.
 */

export type DiscountKind = 'percentage' | 'amount';

export interface DiscountCode {
  /** El código en sí, en mayúsculas y sin espacios. Es también el id del documento. */
  code: string;
  kind: DiscountKind;
  /** Porcentaje (1-100) o monto fijo en COP, según `kind`. */
  value: number;
  /** Un código inactivo no se puede canjear aunque siga en fecha. */
  active: boolean;
  /** Último día en que se puede canjear, en formato `YYYY-MM-DD`. Vacío = sin fecha límite. */
  expiresOn: string;
  /** Máximo de canjes entre todos los clientes. 0 = sin límite. */
  maxUses: number;
  /** Máximo de canjes por cliente. 0 = sin límite. */
  maxUsesPerUser: number;
  /** Canjes acumulados. Lo lleva el checkout; el panel solo lo muestra. */
  uses: number;
  /** Nota interna para la administración; el cliente nunca la ve. */
  notes: string;
}

/** Código nuevo, con los valores por defecto del formulario. */
export const EMPTY_DISCOUNT_CODE: DiscountCode = {
  code: '',
  kind: 'percentage',
  value: 10,
  active: true,
  expiresOn: '',
  maxUses: 0,
  maxUsesPerUser: 1,
  uses: 0,
  notes: '',
};

/**
 * Normaliza lo que se escribe en el formulario: mayúsculas, sin espacios ni
 * acentos y solo letras, números, guion y guion bajo. Así «bienvenido 20» y
 * «BIENVENIDO20» no acaban siendo dos códigos distintos, y el texto vale como
 * id de documento en Firestore (que prohíbe '/', entre otros).
 */
export function normalizeCode(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // marcas de acento sueltas tras NFD
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32);
}

export type DiscountCodeStatus = 'active' | 'inactive' | 'expired' | 'exhausted';

/** Fecha de hoy en `YYYY-MM-DD`, en la zona horaria del navegador. */
export function todayISO(now: Date = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * En qué estado está el código hoy. El orden importa: un código caducado Y
 * agotado se enseña como caducado, que es la razón que la administración
 * entiende primero.
 */
export function getCodeStatus(code: DiscountCode, today: string = todayISO()): DiscountCodeStatus {
  if (!code.active) return 'inactive';
  // La comparación de cadenas funciona porque el formato es YYYY-MM-DD.
  if (code.expiresOn && code.expiresOn < today) return 'expired';
  if (code.maxUses > 0 && code.uses >= code.maxUses) return 'exhausted';
  return 'active';
}

export interface RedeemContext {
  /** Cuántas veces ha canjeado ESTE código el cliente que lo intenta. */
  usesByThisUser: number;
  today?: string;
}

export type RedeemResult =
  | { ok: true; discount: number }
  | { ok: false; reason: string };

/**
 * ¿Puede este cliente canjear el código sobre este subtotal?
 *
 * Devuelve además el descuento ya calculado y topado al subtotal: un código de
 * 50.000 sobre una compra de 30.000 descuenta 30.000, nunca deja el total en
 * negativo.
 */
export function evaluateRedemption(
  code: DiscountCode,
  subtotal: number,
  context: RedeemContext
): RedeemResult {
  const today = context.today ?? todayISO();

  if (!code.active) return { ok: false, reason: 'Este código ya no está disponible.' };
  if (code.expiresOn && code.expiresOn < today) return { ok: false, reason: 'Este código ya venció.' };
  if (code.maxUses > 0 && code.uses >= code.maxUses) {
    return { ok: false, reason: 'Este código ya llegó a su límite de usos.' };
  }
  if (code.maxUsesPerUser > 0 && context.usesByThisUser >= code.maxUsesPerUser) {
    return { ok: false, reason: 'Ya usaste este código el máximo de veces permitido.' };
  }
  if (subtotal <= 0) return { ok: false, reason: 'No hay nada a lo que aplicar el descuento.' };

  const raw = code.kind === 'percentage' ? subtotal * (code.value / 100) : code.value;
  return { ok: true, discount: Math.min(Math.round(raw), subtotal) };
}

/** Qué está mal en el formulario. Vacío = se puede guardar. */
export function validateCodeForm(code: DiscountCode): string[] {
  const problems: string[] = [];

  if (code.code.length < 3) problems.push('El código necesita al menos 3 caracteres.');
  if (code.kind === 'percentage' && (code.value <= 0 || code.value > 100)) {
    problems.push('El porcentaje tiene que estar entre 1 y 100.');
  }
  if (code.kind === 'amount' && code.value <= 0) {
    problems.push('El monto del descuento tiene que ser mayor que cero.');
  }
  if (code.expiresOn && code.expiresOn < todayISO()) {
    problems.push('La fecha límite ya pasó: el código nacería vencido.');
  }
  if (code.maxUses < 0 || code.maxUsesPerUser < 0) {
    problems.push('Los límites de uso no pueden ser negativos.');
  }
  if (code.maxUses > 0 && code.maxUsesPerUser > code.maxUses) {
    problems.push('El límite por cliente no puede superar el límite total.');
  }

  return problems;
}

/** Texto corto del descuento, para la tabla del panel. */
export function describeDiscount(code: DiscountCode): string {
  return code.kind === 'percentage'
    ? `${code.value}% de descuento`
    : `$${code.value.toLocaleString('es-CO')} COP de descuento`;
}

/** Texto corto de los límites de uso, para la tabla del panel. */
export function describeLimits(code: DiscountCode): string {
  const total = code.maxUses > 0 ? `${code.uses} de ${code.maxUses} usos` : `${code.uses} usos (sin límite)`;
  const perUser = code.maxUsesPerUser > 0
    ? `máx. ${code.maxUsesPerUser} por cliente`
    : 'sin límite por cliente';
  return `${total} · ${perUser}`;
}
