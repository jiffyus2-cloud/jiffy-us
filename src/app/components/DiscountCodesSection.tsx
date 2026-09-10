import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  Pencil,
  Plus,
  Ticket,
  Trash2,
  X,
} from 'lucide-react';
import {
  subscribeToDiscountCodes,
  saveDiscountCode,
  deleteDiscountCode,
} from '../../services/discountCodeService';
import {
  EMPTY_DISCOUNT_CODE,
  describeDiscount,
  describeLimits,
  getCodeStatus,
  normalizeCode,
  todayISO,
  validateCodeForm,
  type DiscountCode,
  type DiscountCodeStatus,
} from '../utils/discountCodes';

/**
 * Gestión de códigos de descuento.
 *
 * Cada código vive en su propio documento de Firestore, con el propio código
 * como id. El panel crea, edita, activa y borra; el contador de usos es de solo
 * lectura porque lo lleva el canje, no la administración.
 */

interface DiscountCodesSectionProps {
  /** Correo de quien edita; se guarda junto al código para poder auditarlo. */
  adminEmail: string | null;
}

const STATUS_STYLES: Record<DiscountCodeStatus, { label: string; className: string }> = {
  active: { label: 'Activo', className: 'bg-green-100 text-green-800 border-green-200' },
  inactive: { label: 'Desactivado', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  expired: { label: 'Vencido', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  exhausted: { label: 'Agotado', className: 'bg-red-100 text-red-800 border-red-200' },
};

const fieldClass =
  'w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black';

export default function DiscountCodesSection({ adminEmail }: DiscountCodesSectionProps) {
  const [codes, setCodes] = useState<DiscountCode[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  /** Formulario abierto: `null` = cerrado; con `originalCode` = editando uno existente. */
  const [draft, setDraft] = useState<DiscountCode | null>(null);
  const [originalCode, setOriginalCode] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToDiscountCodes(
      next => { setCodes(next); setLoadError(null); },
      message => { setLoadError(message); setCodes([]); }
    );
    return () => unsubscribe();
  }, []);

  const announce = (tone: 'ok' | 'error', text: string) => {
    setFeedback({ tone, text });
    if (tone === 'ok') setTimeout(() => setFeedback(null), 4000);
  };

  const problems = useMemo(() => (draft ? validateCodeForm(draft) : []), [draft]);

  const isDuplicate = useMemo(() => {
    if (!draft || !codes) return false;
    const id = normalizeCode(draft.code);
    // Al editar, el propio código no cuenta como duplicado de sí mismo.
    return codes.some(c => c.code === id && c.code !== originalCode);
  }, [draft, codes, originalCode]);

  const openNew = () => {
    setDraft({ ...EMPTY_DISCOUNT_CODE });
    setOriginalCode(null);
    setFeedback(null);
  };

  const openEdit = (code: DiscountCode) => {
    setDraft({ ...code });
    setOriginalCode(code.code);
    setFeedback(null);
  };

  const closeForm = () => {
    setDraft(null);
    setOriginalCode(null);
  };

  const handleSave = async () => {
    if (!draft || problems.length > 0 || isDuplicate) return;
    setIsSaving(true);
    try {
      const normalized = { ...draft, code: normalizeCode(draft.code) };
      await saveDiscountCode(normalized, adminEmail);
      // Renombrar un código significa crear otro: se borra el anterior para no
      // dejar dos códigos vivos con las mismas condiciones.
      if (originalCode && originalCode !== normalized.code) {
        await deleteDiscountCode(originalCode);
      }
      closeForm();
      announce('ok', `Código ${normalized.code} guardado.`);
    } catch (e: any) {
      console.error('[Códigos] Error al guardar:', e);
      announce('error', `No pudimos guardar el código: ${e?.message || 'error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (code: DiscountCode) => {
    setBusyCode(code.code);
    try {
      await saveDiscountCode({ ...code, active: !code.active }, adminEmail);
      announce('ok', code.active ? `${code.code} desactivado.` : `${code.code} activado.`);
    } catch (e: any) {
      console.error('[Códigos] Error al cambiar el estado:', e);
      announce('error', `No pudimos cambiar el estado: ${e?.message || 'error desconocido'}`);
    } finally {
      setBusyCode(null);
    }
  };

  const handleDelete = async (code: DiscountCode) => {
    const warning =
      code.uses > 0
        ? `${code.code} ya se usó ${code.uses} vez/veces. Si lo borras, esos pedidos se quedan sin el código de referencia. ¿Borrarlo igualmente?`
        : `¿Borrar el código ${code.code}?`;
    if (!window.confirm(warning)) return;

    setBusyCode(code.code);
    try {
      await deleteDiscountCode(code.code);
      announce('ok', `Código ${code.code} borrado.`);
    } catch (e: any) {
      console.error('[Códigos] Error al borrar:', e);
      announce('error', `No pudimos borrar el código: ${e?.message || 'error desconocido'}`);
    } finally {
      setBusyCode(null);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      announce('ok', `${code} copiado al portapapeles.`);
    } catch {
      announce('error', 'El navegador no dejó copiar; selecciona el código a mano.');
    }
  };

  const patch = (changes: Partial<DiscountCode>) =>
    setDraft(prev => (prev ? { ...prev, ...changes } : prev));

  return (
    <div className="bg-white rounded-b-xl rounded-tr-xl border border-gray-200 p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Códigos de descuento</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-2xl">
              Crea códigos con su descuento, su fecha límite y sus topes de uso. El contador de
              usos lo lleva la tienda: aquí solo se consulta.
            </p>
          </div>
        </div>
        {!draft && (
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            Nuevo código
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            feedback.tone === 'ok'
              ? 'bg-green-50 border-green-300 text-green-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {feedback.tone === 'ok' ? (
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {loadError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>No pudimos cargar los códigos ({loadError}).</span>
        </div>
      )}

      {/* ── FORMULARIO ── */}
      {draft && (
        <div className="border-2 border-black rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">
              {originalCode ? `Editar ${originalCode}` : 'Nuevo código'}
            </h3>
            <button onClick={closeForm} className="text-gray-400 hover:text-black" title="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold text-gray-700">Código</span>
              <input
                value={draft.code}
                onChange={e => patch({ code: normalizeCode(e.target.value) })}
                placeholder="BIENVENIDO20"
                className={`${fieldClass} font-mono tracking-wide`}
              />
              <span className="text-[11px] text-gray-500">
                Se guarda en mayúsculas y sin espacios ni acentos.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-gray-700">Tipo</span>
                <select
                  value={draft.kind}
                  onChange={e => patch({ kind: e.target.value as DiscountCode['kind'] })}
                  className={fieldClass}
                >
                  <option value="percentage">Porcentaje</option>
                  <option value="amount">Monto fijo (COP)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-700">
                  {draft.kind === 'percentage' ? 'Porcentaje (%)' : 'Monto (COP)'}
                </span>
                <input
                  type="number"
                  min={0}
                  value={draft.value}
                  onChange={e => patch({ value: Number(e.target.value) })}
                  className={fieldClass}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-bold text-gray-700">Fecha límite para redimir</span>
              <input
                type="date"
                min={todayISO()}
                value={draft.expiresOn}
                onChange={e => patch({ expiresOn: e.target.value })}
                className={fieldClass}
              />
              <span className="text-[11px] text-gray-500">
                Déjala vacía si el código no vence. Vale hasta el final de ese día.
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-gray-700">Usos totales</span>
                <input
                  type="number"
                  min={0}
                  value={draft.maxUses}
                  onChange={e => patch({ maxUses: Number(e.target.value) })}
                  className={fieldClass}
                />
                <span className="text-[11px] text-gray-500">0 = sin límite.</span>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-gray-700">Usos por cliente</span>
                <input
                  type="number"
                  min={0}
                  value={draft.maxUsesPerUser}
                  onChange={e => patch({ maxUsesPerUser: Number(e.target.value) })}
                  className={fieldClass}
                />
                <span className="text-[11px] text-gray-500">0 = sin límite.</span>
              </label>
            </div>

            <label className="block md:col-span-2">
              <span className="text-xs font-bold text-gray-700">Nota interna (opcional)</span>
              <input
                value={draft.notes}
                onChange={e => patch({ notes: e.target.value })}
                placeholder="Campaña de diciembre, influencer, etc."
                className={fieldClass}
              />
            </label>

            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={e => patch({ active: e.target.checked })}
                className="w-4 h-4 accent-black"
              />
              <span className="text-sm">Activo (se puede redimir)</span>
            </label>
          </div>

          {(problems.length > 0 || isDuplicate) && (
            <ul className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
              {isDuplicate && <li>Ya existe un código con ese nombre.</li>}
              {problems.map(problem => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleSave()}
              disabled={isSaving || problems.length > 0 || isDuplicate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Guardar código
            </button>
            <button
              onClick={closeForm}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── LISTA ── */}
      {codes === null ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando códigos…
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl py-10">
          Todavía no hay códigos de descuento.
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map(code => {
            const status = getCodeStatus(code);
            const style = STATUS_STYLES[status];
            const isBusy = busyCode === code.code;

            return (
              <div
                key={code.code}
                className="border border-gray-200 rounded-xl p-4 flex flex-wrap items-center gap-4"
              >
                <div className="min-w-[190px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold tracking-wide">{code.code}</span>
                    <button
                      onClick={() => void copyCode(code.code)}
                      title="Copiar código"
                      className="text-gray-400 hover:text-black"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${style.className}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5">{describeDiscount(code)}</p>
                </div>

                <div className="flex-1 min-w-[220px] text-xs text-gray-600 space-y-0.5">
                  <p>
                    <span className="font-bold text-gray-700">Vence: </span>
                    {code.expiresOn ? code.expiresOn : 'sin fecha límite'}
                  </p>
                  <p>
                    <span className="font-bold text-gray-700">Usos: </span>
                    {describeLimits(code)}
                  </p>
                  {code.notes && <p className="text-gray-500 italic">{code.notes}</p>}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => void handleToggleActive(code)}
                    disabled={isBusy}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {code.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => openEdit(code)}
                    disabled={isBusy}
                    title="Editar"
                    className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => void handleDelete(code)}
                    disabled={isBusy}
                    title="Borrar"
                    className="p-2 rounded-lg border border-gray-300 text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-500 border-t border-gray-100 pt-4">
        <span className="font-bold">Pendiente:</span> el checkout todavía no pide el código, así que
        el contador de usos se queda en cero. Las condiciones que definas aquí ya son las que
        aplicará cuando se conecte.
      </p>
    </div>
  );
}
