import React, { useEffect, useRef, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import {
  AlertCircle, AlertTriangle, CheckCircle2, Clock, Database, FolderX, HardDrive,
  Eraser, Layers, Loader2, RefreshCw, Save, Users as UsersIcon,
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { useStoragePolicy } from '../../hooks/useStoragePolicy';
import {
  STORAGE_POLICY_DOC_ID,
  STORAGE_POLICY_LIMITS,
  formatBytes,
  pickStoragePolicy,
  validateStoragePolicy,
  type StoragePolicy,
} from '../utils/storagePolicyState';
import {
  getStorageStats,
  runStorageCleanup,
  type CleanupResult,
  type ProjectUsage,
  type StorageStats,
} from '../../services/storageAdminApi';

/**
 * Pestaña "Gestión de almacenamiento" del panel del dueño.
 *
 * Dos controladores (borradores simultáneos por usuario y días de retención) que
 * se guardan en `settings/storage_policy`, y un panel informativo con el uso del
 * bucket que calcula el backend (`GET /storage/stats`). La limpieza de
 * borradores vencidos se puede lanzar desde aquí o dejarla programada
 * (`POST /storage/cleanup`, ver README del backend).
 */

interface Props {
  adminEmail: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** 46.2 → "46,2" (misma coma decimal que formatBytes). */
function formatPercent(value: number): string {
  return value.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor((Date.now() - ms) / 86_400_000));
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  saved_draft: 'Borrador guardado',
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  mock_paid: 'Pagado',
  en_produccion: 'En producción',
  enviado: 'Enviado',
  entregado: 'Entregado',
  custom_pendiente: 'Álbum personalizado',
};

function statusLabel(status: string | null): string {
  if (status === null) return 'Sin pedido (huérfana)';
  return STATUS_LABELS[status] ?? status;
}

/** Orden fijo y paleta validada (6 series, sin ciclar). */
const BREAKDOWN_SERIES = [
  { key: 'drafts', label: 'Borradores', color: 'bg-indigo-600' },
  { key: 'orders', label: 'Pedidos', color: 'bg-amber-600' },
  { key: 'systemImages', label: 'Imágenes de la tienda', color: 'bg-sky-600' },
  { key: 'orphans', label: 'Carpetas huérfanas', color: 'bg-rose-600' },
  { key: 'inProgress', label: 'Subidas en curso', color: 'bg-violet-600' },
  { key: 'other', label: 'Otros', color: 'bg-emerald-600' },
] as const;

// ── Sub-componentes ───────────────────────────────────────────────────────────

const StatTile: React.FC<{ label: string; value: string; hint?: string; icon: React.ReactNode }> = ({ label, value, hint, icon }) => (
  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
      {icon}
      {label}
    </div>
    <div className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
    {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
  </div>
);

const NumberField: React.FC<{
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  min: number;
  max: number;
  step?: number;
  error?: string;
  current: number;
}> = ({ id, label, description, value, onChange, unit, min, max, step = 1, error, current }) => (
  <div className="p-5 border border-gray-200 rounded-xl">
    <label htmlFor={id} className="block text-sm font-bold text-gray-900">{label}</label>
    <p className="mt-1 text-xs text-gray-500 leading-relaxed">{description}</p>
    <div className="mt-4 flex items-center gap-3">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-32 px-3 py-2 border rounded-lg text-lg font-bold text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-black ${error ? 'border-red-400' : 'border-gray-300'}`}
      />
      <span className="text-sm font-semibold text-gray-600">{unit}</span>
    </div>
    <div className="mt-2 text-xs text-gray-400">
      Vigente ahora: <span className="font-bold text-gray-700 tabular-nums">{current}</span> {unit}
    </div>
    {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
  </div>
);

const ProjectsTable: React.FC<{ projects: ProjectUsage[]; emptyText: string; showStatus?: boolean }> = ({ projects, emptyText, showStatus = true }) => {
  if (projects.length === 0) {
    return <p className="px-5 py-6 text-sm text-gray-400 text-center">{emptyText}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead>
          <tr className="bg-gray-50/70">
            <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Proyecto</th>
            <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Cliente</th>
            {showStatus && <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Estado</th>}
            <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Última edición</th>
            <th className="px-5 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Archivos</th>
            <th className="px-5 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Tamaño</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {projects.map(project => (
            <tr key={`${project.userId}/${project.orderId}`} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-3">
                <div className="font-mono text-xs text-gray-900">{project.orderId}</div>
                <div className="text-xs text-gray-500">{project.productName || project.productType || '—'}</div>
                {project.sharedWith?.length > 0 && (
                  <div className="text-[10px] font-semibold text-amber-700" title={project.sharedWith.join(', ')}>
                    Fotos compartidas con {project.sharedWith.length} pedido(s): al borrarse se mueven a ese pedido
                  </div>
                )}
              </td>
              <td className="px-5 py-3 hidden md:table-cell">
                <div className="text-sm text-gray-900">{project.customerName || '—'}</div>
                <div className="text-xs text-gray-500">{project.customerEmail || project.userId}</div>
              </td>
              {showStatus && (
                <td className="px-5 py-3 hidden sm:table-cell text-xs text-gray-700">{statusLabel(project.status)}</td>
              )}
              <td className="px-5 py-3 hidden lg:table-cell text-xs text-gray-500">
                {formatDate(project.lastEditedAt ?? project.lastFileAt)}
                {daysSince(project.lastEditedAt ?? project.lastFileAt) !== null && (
                  <span className="text-gray-400"> · hace {daysSince(project.lastEditedAt ?? project.lastFileAt)} d</span>
                )}
              </td>
              <td className="px-5 py-3 text-right text-sm text-gray-700 tabular-nums">{project.files}</td>
              <td className="px-5 py-3 text-right text-sm font-bold text-gray-900 tabular-nums">{formatBytes(project.bytes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

const StorageManagementSection: React.FC<Props> = ({ adminEmail }) => {
  const policy = useStoragePolicy();

  // Formulario: strings para permitir borrar y reescribir sin que el input salte.
  const [form, setForm] = useState({ maxDraftsPerUser: '', draftRetentionDays: '', storageCapacityGb: '' });
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policySaved, setPolicySaved] = useState(false);
  const [policyChangedElsewhere, setPolicyChangedElsewhere] = useState(false);
  const hasSeeded = useRef(false);
  const lastRemote = useRef<StoragePolicy | null>(null);

  // Sembramos el formulario UNA vez, al pasar de "no cargado" a "cargado".
  useEffect(() => {
    if (!policy.loaded) return;
    const remote = pickStoragePolicy(policy);
    if (!hasSeeded.current) {
      hasSeeded.current = true;
      setForm({
        maxDraftsPerUser: String(remote.maxDraftsPerUser),
        draftRetentionDays: String(remote.draftRetentionDays),
        storageCapacityGb: String(remote.storageCapacityGb),
      });
      lastRemote.current = remote;
      return;
    }
    if (lastRemote.current && JSON.stringify(lastRemote.current) !== JSON.stringify(remote)) {
      setPolicyChangedElsewhere(true);
    }
    lastRemote.current = remote;
  }, [policy.loaded, policy.maxDraftsPerUser, policy.draftRetentionDays, policy.storageCapacityGb]);

  const parsedForm: StoragePolicy = {
    maxDraftsPerUser: Number(form.maxDraftsPerUser),
    draftRetentionDays: Number(form.draftRetentionDays),
    storageCapacityGb: Number(form.storageCapacityGb),
    retentionAppliesFrom: policy.retentionAppliesFrom,
  };
  const formErrors = validateStoragePolicy(parsedForm);
  const formIsDirty =
    parsedForm.maxDraftsPerUser !== policy.maxDraftsPerUser ||
    parsedForm.draftRetentionDays !== policy.draftRetentionDays ||
    parsedForm.storageCapacityGb !== policy.storageCapacityGb;

  const handleSavePolicy = async () => {
    if (!policy.loaded) {
      alert('La política aún se está cargando. Espera un momento e intenta de nuevo.');
      return;
    }
    if (Object.keys(formErrors).length > 0) return;
    setIsSavingPolicy(true);
    try {
      // Sin merge: el documento ES la política vigente.
      await setDoc(doc(db, 'settings', STORAGE_POLICY_DOC_ID), {
        ...pickStoragePolicy(parsedForm),
        // Se fija UNA sola vez. Los borradores creados antes de esta fecha nunca
        // caducan: es la garantía de que activar la regla no borra nada existente.
        retentionAppliesFrom: policy.retentionAppliesFrom ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: adminEmail ?? null,
      });
      lastRemote.current = pickStoragePolicy(parsedForm);
      setPolicyChangedElsewhere(false);
      setPolicySaved(true);
      setTimeout(() => setPolicySaved(false), 3000);
    } catch (error) {
      console.error('Error al guardar settings/storage_policy:', error);
      alert('No se pudo guardar la política de almacenamiento.');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const reloadFromRemote = () => {
    const remote = pickStoragePolicy(policy);
    setForm({
      maxDraftsPerUser: String(remote.maxDraftsPerUser),
      draftRetentionDays: String(remote.draftRetentionDays),
      storageCapacityGb: String(remote.storageCapacityGb),
    });
    lastRemote.current = remote;
    setPolicyChangedElsewhere(false);
  };

  // ── Estadísticas ──────────────────────────────────────────────────────────
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const loadStats = async (refresh: boolean) => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      setStats(await getStorageStats(refresh));
    } catch (error: any) {
      setStatsError(error?.message ?? 'No se pudo consultar el almacenamiento.');
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadStats(false);
  }, []);

  // ── Limpieza ──────────────────────────────────────────────────────────────
  const [cleanupBusy, setCleanupBusy] = useState<'dry' | 'run' | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  // Las carpetas huérfanas son datos que ya existían: solo se borran si el dueño lo marca.
  const [includeOrphans, setIncludeOrphans] = useState(false);

  const runCleanup = async (dryRun: boolean) => {
    if (!dryRun) {
      const expired = cleanupResult?.dryRun ? cleanupResult.expiredDrafts.count : stats?.expiredDrafts.count ?? 0;
      const orphans = includeOrphans ? (cleanupResult?.dryRun ? cleanupResult.orphans.count : stats?.breakdown.orphans.count ?? 0) : 0;
      const ok = window.confirm(
        `Se borrarán de forma definitiva ${expired} borrador(es) creados después de activar la caducidad y sin editar ` +
          `desde hace más de ${policy.draftRetentionDays} días` +
          (includeOrphans ? ` y ${orphans} carpeta(s) huérfana(s) de Storage` : '') +
          '. Los clientes no podrán recuperarlos. ¿Continuar?'
      );
      if (!ok) return;
    }
    setCleanupBusy(dryRun ? 'dry' : 'run');
    setCleanupError(null);
    try {
      const result = await runStorageCleanup({ dryRun, orphans: includeOrphans });
      setCleanupResult(result);
      if (!dryRun) await loadStats(true);
    } catch (error: any) {
      setCleanupError(error?.message ?? 'La limpieza falló.');
    } finally {
      setCleanupBusy(null);
    }
  };

  const totals = stats?.totals;
  const usedPercent = totals ? Math.min(100, totals.usedPercent) : 0;
  const meterTone = usedPercent >= 90 ? 'bg-rose-600' : usedPercent >= 75 ? 'bg-amber-600' : 'bg-indigo-600';

  return (
    <div className="space-y-8">
      {/* ── Avisos de estado de la política ─────────────────────────────── */}
      {!policy.loaded && !policy.error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando la política de almacenamiento desde el servidor...
        </div>
      )}
      {policy.error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <AlertCircle className="w-4 h-4" />
          No se pudo cargar la política ({policy.error}). Verifica tu conexión antes de intentar guardar.
        </div>
      )}
      {policy.loaded && !policy.exists && (
        <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-medium">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Todavía no hay ninguna política guardada: la tienda está usando los valores iniciales del
            sistema ({policy.maxDraftsPerUser} borradores, {policy.draftRetentionDays} días). En cuanto guardes,
            estos valores quedarán fijados y dejarán de depender del código.
          </span>
        </div>
      )}
      {policyChangedElsewhere && (
        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-medium">
          <span>La política cambió en otra sesión. Puedes cargar los valores más recientes (perderás tus ediciones sin guardar).</span>
          <button onClick={reloadFromRemote} className="whitespace-nowrap px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors">
            Cargar cambios
          </button>
        </div>
      )}

      {/* ── Controladores ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
          <Layers className="w-6 h-6 text-indigo-500" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Políticas de borradores</h2>
            <p className="text-sm text-gray-500">
              Rigen para todos los clientes. Última modificación: {formatDate(policy.updatedAt)}
              {policy.updatedBy ? ` por ${policy.updatedBy}` : ''}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NumberField
            id="storage-max-drafts"
            label="Borradores simultáneos por usuario"
            description="Cuántos proyectos sin pagar puede tener guardados un mismo cliente a la vez. Al llegar al tope, el editor le pide borrar uno antes de crear otro; los borradores que ya existan por encima del tope no se tocan."
            value={form.maxDraftsPerUser}
            onChange={v => setForm(f => ({ ...f, maxDraftsPerUser: v }))}
            unit="borradores"
            min={STORAGE_POLICY_LIMITS.maxDraftsPerUser.min}
            max={STORAGE_POLICY_LIMITS.maxDraftsPerUser.max}
            error={formErrors.maxDraftsPerUser}
            current={policy.maxDraftsPerUser}
          />
          <NumberField
            id="storage-retention-days"
            label="Días de retención sin editar"
            description="Un borrador que lleve más de este tiempo sin ninguna edición se borra automáticamente junto con sus fotos. Cuenta desde la última vez que el cliente lo guardó. Solo aplica a borradores creados después de activar la regla; los que ya existían no se borran nunca solos."
            value={form.draftRetentionDays}
            onChange={v => setForm(f => ({ ...f, draftRetentionDays: v }))}
            unit="días"
            min={STORAGE_POLICY_LIMITS.draftRetentionDays.min}
            max={STORAGE_POLICY_LIMITS.draftRetentionDays.max}
            error={formErrors.draftRetentionDays}
            current={policy.draftRetentionDays}
          />
        </div>

        <div className={`mt-6 flex items-start gap-2 px-4 py-3 rounded-xl text-sm border ${policy.retentionAppliesFrom ? 'bg-gray-50 border-gray-200 text-gray-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <Clock className="w-4 h-4 mt-0.5 shrink-0" />
          {policy.retentionAppliesFrom ? (
            <span>
              Caducidad activa desde el <strong>{formatDate(policy.retentionAppliesFrom)}</strong>: solo vencen los borradores
              creados a partir de esa fecha. Los anteriores se conservan siempre.
            </span>
          ) : (
            <span>
              La caducidad <strong>todavía no está activa</strong>. Se activará al guardar la política, y solo alcanzará a
              los borradores creados a partir de ese momento: ninguno de los actuales se borrará solo.
            </span>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-500">
            {policySaved ? (
              <span className="inline-flex items-center gap-1.5 text-green-700 font-semibold"><CheckCircle2 className="w-4 h-4" /> Política guardada. Ya rige en toda la tienda.</span>
            ) : formIsDirty ? (
              'Hay cambios sin guardar.'
            ) : (
              'Sin cambios pendientes.'
            )}
          </div>
          <button
            onClick={handleSavePolicy}
            disabled={isSavingPolicy || !policy.loaded || !formIsDirty || Object.keys(formErrors).length > 0}
            className="flex items-center gap-2 px-8 py-3 bg-black hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            {isSavingPolicy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Guardar política
          </button>
        </div>
      </div>

      {/* ── Panel informativo ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-6 h-6 text-indigo-500" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Uso del almacenamiento</h2>
              <p className="text-sm text-gray-500">
                {stats
                  ? `Bucket ${stats.bucket} · calculado ${formatDate(stats.computedAt)}${stats.fromCache ? ' (en caché)' : ''}`
                  : 'Fotos de pedidos e imágenes de la tienda en Cloud Storage.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => loadStats(true)}
            disabled={statsLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {statsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Recalcular
          </button>
        </div>

        {statsError && (
          <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {statsError}
          </div>
        )}

        {!stats && statsLoading && (
          <div className="flex items-center gap-2 py-10 justify-center text-gray-500 text-sm">
            <Loader2 className="w-5 h-5 animate-spin" />
            Recorriendo el bucket... con muchas fotos puede tardar un momento.
          </div>
        )}

        {stats && totals && (
          <div className="space-y-8">
            {/* Medidor usado / disponible */}
            <div>
              <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
                <div>
                  <span className="text-3xl font-bold text-gray-900 tabular-nums">{formatBytes(totals.bytes)}</span>
                  <span className="text-sm text-gray-500"> usados de {formatBytes(totals.capacityBytes)}</span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900 tabular-nums">{formatBytes(totals.availableBytes)}</span> disponibles
                  <span className="text-gray-400"> · {formatPercent(usedPercent)} %</span>
                </div>
              </div>
              <div
                className="h-3 w-full bg-gray-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(usedPercent)}
                aria-label="Almacenamiento usado"
              >
                <div className={`h-full rounded-full ${meterTone} transition-all`} style={{ width: `${usedPercent}%` }} />
              </div>
              {usedPercent >= 75 && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {usedPercent >= 90 ? 'Queda menos del 10 % de la capacidad de referencia.' : 'Más del 75 % de la capacidad de referencia en uso.'}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <label htmlFor="storage-capacity" className="font-semibold text-gray-700">Capacidad de referencia:</label>
                <input
                  id="storage-capacity"
                  type="number"
                  inputMode="decimal"
                  min={STORAGE_POLICY_LIMITS.storageCapacityGb.min}
                  max={STORAGE_POLICY_LIMITS.storageCapacityGb.max}
                  step={0.5}
                  value={form.storageCapacityGb}
                  onChange={e => setForm(f => ({ ...f, storageCapacityGb: e.target.value }))}
                  className={`w-24 px-2 py-1 border rounded-lg text-sm font-bold text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-black ${formErrors.storageCapacityGb ? 'border-red-400' : 'border-gray-300'}`}
                />
                <span>GB</span>
                <span className="text-gray-400">
                  Cloud Storage no tiene tope fijo (es pago por uso); el "disponible" se calcula contra esta cifra. Se guarda con el botón "Guardar política".
                </span>
              </div>
              {formErrors.storageCapacityGb && <p className="mt-1 text-xs font-semibold text-red-600">{formErrors.storageCapacityGb}</p>}
            </div>

            {/* Tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile
                icon={<Database className="w-3.5 h-3.5" />}
                label="Archivos"
                value={totals.files.toLocaleString('es-CO')}
                hint={`${stats.breakdown.drafts.count + stats.breakdown.orders.count} proyectos con pedido`}
              />
              <StatTile
                icon={<Layers className="w-3.5 h-3.5" />}
                label="Borradores"
                value={formatBytes(stats.breakdown.drafts.bytes)}
                hint={`${stats.breakdown.drafts.count} borradores · ${stats.breakdown.drafts.files} archivos`}
              />
              <StatTile
                icon={<Clock className="w-3.5 h-3.5" />}
                label="Vencidos"
                value={formatBytes(stats.expiredDrafts.bytes)}
                hint={`${stats.expiredDrafts.count} sin editar desde hace > ${stats.expiredDrafts.retentionDays} d`}
              />
              <StatTile
                icon={<FolderX className="w-3.5 h-3.5" />}
                label="Carpetas huérfanas"
                value={formatBytes(stats.breakdown.orphans.bytes)}
                hint={`${stats.breakdown.orphans.count} carpetas sin pedido en Firestore`}
              />
            </div>

            {/* Desglose */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Desglose por tipo</h3>
              <div className="flex h-4 w-full rounded-full overflow-hidden bg-gray-100 gap-[2px]" aria-hidden="true">
                {BREAKDOWN_SERIES.map(series => {
                  const bytes = stats.breakdown[series.key].bytes;
                  const pct = totals.bytes > 0 ? (bytes / totals.bytes) * 100 : 0;
                  if (pct <= 0) return null;
                  return <div key={series.key} className={`${series.color} h-full`} style={{ width: `${pct}%` }} title={`${series.label}: ${formatBytes(bytes)}`} />;
                })}
              </div>
              <ul className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                {BREAKDOWN_SERIES.map(series => {
                  const item = stats.breakdown[series.key];
                  const pct = totals.bytes > 0 ? (item.bytes / totals.bytes) * 100 : 0;
                  return (
                    <li key={series.key} className="flex items-center gap-2 text-gray-700">
                      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${series.color}`} />
                      <span className="flex-1">{series.label}</span>
                      <span className="font-bold text-gray-900 tabular-nums">{formatBytes(item.bytes)}</span>
                      <span className="text-gray-400 tabular-nums w-12 text-right">{formatPercent(pct)} %</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Top consumidores */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-900">Proyectos que más ocupan</h3>
                </div>
                <ProjectsTable projects={stats.topProjects} emptyText="No hay fotos de pedidos en el bucket." />
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-gray-50/70 border-b border-gray-100 flex items-center gap-2">
                  <UsersIcon className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-bold text-gray-900">Usuarios que más ocupan</h3>
                </div>
                {stats.topUsers.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-gray-400 text-center">Sin datos.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead>
                        <tr className="bg-gray-50/70">
                          <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Usuario</th>
                          <th className="px-5 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Proyectos</th>
                          <th className="px-5 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Borradores</th>
                          <th className="px-5 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Archivos</th>
                          <th className="px-5 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Tamaño</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stats.topUsers.map(user => (
                          <tr key={user.userId} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="text-sm text-gray-900">{user.name || '—'}</div>
                              <div className="text-xs text-gray-500">{user.email || user.userId}</div>
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-gray-700 tabular-nums">{user.projects}</td>
                            <td className="px-5 py-3 text-right text-sm text-gray-700 tabular-nums hidden sm:table-cell">
                              {user.drafts}
                              {user.drafts > policy.maxDraftsPerUser && (
                                <span className="ml-1 text-[10px] font-bold text-amber-700" title="Por encima del límite vigente">▲</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-gray-700 tabular-nums hidden md:table-cell">{user.files}</td>
                            <td className="px-5 py-3 text-right text-sm font-bold text-gray-900 tabular-nums">{formatBytes(user.bytes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Limpieza */}
            <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/50">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Eraser className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Limpieza automática</h3>
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed max-w-2xl">
                      Borra los borradores sin editar desde hace más de <strong>{stats.expiredDrafts.retentionDays} días</strong> (corte:
                      {' '}{formatDate(stats.expiredDrafts.cutoff)})
                      {stats.expiredDrafts.appliesFrom
                        ? <> y creados después del {formatDate(stats.expiredDrafts.appliesFrom)}.</>
                        : <>. <strong>La caducidad aún no está activa</strong> (guarda la política para activarla), así que no vence ninguno.</>}
                      {' '}Ahora mismo aplicaría a <strong>{stats.expiredDrafts.count} borrador(es)</strong> ({formatBytes(stats.expiredDrafts.bytes)}).
                      Hay además <strong>{stats.breakdown.orphans.count} carpeta(s) huérfana(s)</strong> ({formatBytes(stats.breakdown.orphans.bytes)}) sin pedido en Firestore,
                      que solo se borran si marcas la casilla.
                    </p>
                    <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeOrphans}
                        onChange={e => setIncludeOrphans(e.target.checked)}
                        className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                      />
                      Incluir carpetas huérfanas en esta limpieza
                    </label>
                    <p className="mt-1 text-xs text-gray-400">
                      Última limpieza: {stats.lastCleanup
                        ? `${formatDate(stats.lastCleanup.at)} (${stats.lastCleanup.trigger === 'scheduler' ? 'programada' : 'desde el panel'}) · ${stats.lastCleanup.expiredDrafts.count} borradores y ${stats.lastCleanup.orphans.count} carpetas, ${formatBytes(stats.lastCleanup.expiredDrafts.bytes + stats.lastCleanup.orphans.bytes)} liberados`
                        : 'nunca'}.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runCleanup(true)}
                    disabled={cleanupBusy !== null}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {cleanupBusy === 'dry' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Simular
                  </button>
                  <button
                    onClick={() => runCleanup(false)}
                    disabled={cleanupBusy !== null || (stats.expiredDrafts.count === 0 && (!includeOrphans || stats.breakdown.orphans.count === 0))}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
                  >
                    {cleanupBusy === 'run' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
                    Ejecutar limpieza ahora
                  </button>
                </div>
              </div>

              {cleanupError && (
                <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {cleanupError}
                </div>
              )}

              {cleanupResult && (
                <div className="mt-4 space-y-3">
                  <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${cleanupResult.dryRun ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                    {cleanupResult.dryRun ? 'Simulación: ' : 'Limpieza ejecutada: '}
                    {cleanupResult.expiredDrafts.count} borrador(es) ({formatBytes(cleanupResult.expiredDrafts.bytes)}) y
                    {' '}{cleanupResult.orphans.count} carpeta(s) huérfana(s) ({formatBytes(cleanupResult.orphans.bytes)})
                    {cleanupResult.dryRun ? ' se borrarían.' : ' borrados.'}
                    {cleanupResult.movedFiles > 0 && ` ${cleanupResult.movedFiles} foto(s) se movieron al pedido que las usa.`}
                    {cleanupResult.errors.length > 0 && ` ${cleanupResult.errors.length} error(es): ${cleanupResult.errors.slice(0, 3).join('; ')}`}
                  </div>
                  {cleanupResult.expiredDrafts.items.length > 0 && (
                    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                      <div className="px-5 py-2 bg-gray-50/70 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Borradores {cleanupResult.dryRun ? 'que se borrarían' : 'borrados'}
                      </div>
                      <ProjectsTable projects={cleanupResult.expiredDrafts.items} emptyText="" />
                    </div>
                  )}
                  {cleanupResult.orphans.items.length > 0 && (
                    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                      <div className="px-5 py-2 bg-gray-50/70 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Carpetas huérfanas {cleanupResult.dryRun ? 'que se borrarían' : 'borradas'}
                      </div>
                      <ProjectsTable projects={cleanupResult.orphans.items} emptyText="" showStatus={false} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorageManagementSection;
