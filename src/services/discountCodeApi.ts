import { auth } from '../lib/firebase';

/**
 * Validación de códigos de descuento contra el backend.
 *
 * La comprobación NO se hace aquí: el navegador puede mentir sobre cuántas veces
 * ha usado un código o sobre de quién es la compra. El servidor lee el código,
 * cuenta los canjes de este cliente y devuelve el descuento que corresponde; el
 * checkout solo pinta la respuesta.
 */

export interface AppliedDiscount {
  code: string;
  /** Descuento en COP, ya calculado y topado al subtotal por el servidor. */
  discount: number;
  kind: 'percentage' | 'amount';
  value: number;
}

export type ValidateResult =
  | { ok: true; applied: AppliedDiscount }
  | { ok: false; reason: string };

function backendUrl(): string {
  return (
    import.meta.env.VITE_BACKEND_URL ||
    'https://jiffy-backend-938778636106.europe-west1.run.app'
  );
}

export async function validateDiscountCode(code: string, subtotal: number): Promise<ValidateResult> {
  try {
    // El token viaja si hay sesión: es lo que permite aplicar el límite por
    // cliente. Sin sesión, el servidor rechaza los códigos que lo tengan.
    const idToken = await auth.currentUser?.getIdToken().catch(() => null);

    const response = await fetch(`${backendUrl()}/discounts/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({ code, subtotal }),
    });

    if (!response.ok) {
      return { ok: false, reason: 'No pudimos validar el código. Inténtalo de nuevo.' };
    }

    const data = await response.json();
    if (!data?.ok) {
      return { ok: false, reason: data?.reason || 'Ese código no se puede usar.' };
    }

    return {
      ok: true,
      applied: {
        code: data.code,
        discount: Number(data.discount) || 0,
        kind: data.kind === 'amount' ? 'amount' : 'percentage',
        value: Number(data.value) || 0,
      },
    };
  } catch (error) {
    console.error('[Códigos] No se pudo contactar con el backend:', error);
    return { ok: false, reason: 'No pudimos validar el código. Revisa tu conexión.' };
  }
}
