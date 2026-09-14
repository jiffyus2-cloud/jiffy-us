import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Bot, Check, CheckCircle2, Clock, DollarSign, Info, Loader2,
  RefreshCw, ShieldCheck, Sparkles, X, XCircle,
} from 'lucide-react';
import {
  ONECLIC_TEST_AGENT_ID,
  OneclicProposal,
  OneclicRequestError,
  OneclicStatus,
  OneclicVerifyReport,
  describeOneclicError,
  getOneclicStatus,
  requestOneclicProposal,
  verifyOneclicConnection,
} from '../../../services/oneclicApi';

/**
 * Panel de la conexión con 1clic.ai (módulo aislado).
 *
 * Es la "acción" que 1clic califica desde la plataforma: el dueño pide una
 * propuesta a un agente, la ve con su coste al lado y decide. Nada se escribe
 * en la tienda desde aquí — la respuesta del agente es una propuesta y se queda
 * en propuesta hasta que una persona la aprueba.
 *
 * ATTESTATIONS apunta a las líneas de este archivo que demuestran las dos
 * reglas que 1clic no puede observar por red. Los marcadores `@1clic:` de esas
 * líneas están cubiertos por OneclicPanel.attestations.test.ts para que un
 * cambio de formato no deje la atestación apuntando a otra cosa.
 */
export const ONECLIC_PANEL_FILE = 'src/app/components/oneclic/OneclicPanel.tsx';
export const ATTESTATIONS = {
  cost_visible: { file: ONECLIC_PANEL_FILE, line: 287 },
  proposal_only: { file: ONECLIC_PANEL_FILE, line: 305 },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATE_LABELS: Record<string, string> = {
  draft: 'Borrador', waiting: 'Esperando al agente', wiring: 'Cableando',
  conformance: 'En prueba de conformidad', merge_pending: 'Pendiente de merge',
  confirming: 'Confirmando', live: 'En producción', paused: 'Pausada',
  stopped: 'Detenida', revoked: 'Revocada', expired: 'Caducada', failed: 'Fallida',
};

const WAITING_LABELS: Record<string, string> = {
  authorization: 'tu autorización', scope_request: 'una petición de alcance',
  wallet_empty: 'saldo en la cartera', risk_acceptance: 'aceptar el riesgo',
  assign_agent: 'que asignes un agente', question: 'una respuesta tuya', merge: 'el merge',
};

function formatUsd(value: number): string {
  return `$${(Number(value) || 0).toFixed(4)} USD`;
}

function formatMs(value: number | null): string {
  if (value == null) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${value} ms`;
}

const ErrorBox: React.FC<{ error: unknown }> = ({ error }) => {
  const info = describeOneclicError(error);
  const tone = info.isExpected ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-700';
  return (
    <div className={`flex gap-3 p-4 border rounded-xl text-sm ${tone}`}>
      {info.isExpected ? <Info className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
      <div>
        <p className="font-semibold">{info.title}</p>
        <p className="mt-0.5 opacity-90">{info.detail}</p>
      </div>
    </div>
  );
};

// ── Estado de la conexión ─────────────────────────────────────────────────────

const StatusCard: React.FC<{
  status: OneclicStatus | null;
  loading: boolean;
  error: unknown;
  onReload: () => void;
}> = ({ status, loading, error, onReload }) => {
  const envelope = status?.status ?? null;
  const state = envelope?.state ?? null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <Bot className="w-4 h-4" /> Conexión 1clic.ai
        </h3>
        <button onClick={onReload} title="Recargar" className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? <div className="mb-4"><ErrorBox error={error} /></div> : null}

      {status && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Clave en el servidor</p>
              <p className={`mt-1 font-semibold ${status.configured.api_key ? 'text-green-700' : 'text-amber-700'}`}>
                {status.configured.api_key ? 'Instalada' : `Falta ${status.env_vars.api_key}`}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Id de conexión</p>
              <p className={`mt-1 font-semibold ${status.configured.connection_id ? 'text-green-700' : 'text-amber-700'}`}>
                {status.configured.connection_id ? 'Configurado' : `Falta ${status.env_vars.connection_id}`}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Estado en 1clic</p>
              <p className="mt-1 font-semibold text-gray-900">{state ? (STATE_LABELS[state] ?? state) : '—'}</p>
            </div>
          </div>

          {envelope?.waiting_on && (
            <div className="flex gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
              <p>
                1clic espera {WAITING_LABELS[envelope.waiting_on.kind] ?? envelope.waiting_on.kind}.{' '}
                {envelope.waiting_on.url && (
                  <a href={envelope.waiting_on.url} target="_blank" rel="noreferrer" className="underline font-semibold">Abrir en 1clic</a>
                )}
              </p>
            </div>
          )}

          {envelope?.conformance && (
            <p className="text-sm text-gray-600">
              Conformidad: <span className="font-semibold">{envelope.conformance.passed}/{envelope.conformance.total}</span>
              {envelope.conformance.failed?.length > 0 && <> · fallan: {envelope.conformance.failed.join(', ')}</>}
              {envelope.conformance.report_url && (
                <> · <a href={envelope.conformance.report_url} target="_blank" rel="noreferrer" className="underline">informe</a></>
              )}
            </p>
          )}

          {status.error && (
            <ErrorBox error={new OneclicRequestError(0, status.error.code, status.error.message, status.error.remediation ?? null)} />
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Agentes que esta clave puede ejecutar</p>
            {status.agents.length === 0 ? (
              <div className="flex gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Ningún agente asignado todavía. No es un error: hasta que asignes uno en 1clic, los runs reales
                  responden <code>403 agent_not_allowed</code>. Mientras tanto puedes probar con el agente de prueba (en seco, $0).
                  {status.assign_url && (
                    <> <a href={status.assign_url} target="_blank" rel="noreferrer" className="underline font-semibold">Asignar agente</a></>
                  )}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {status.agents.map(agent => (
                  <li key={agent.id ?? agent.address} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 text-sm">
                    <div>
                      <p className="font-semibold text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{agent.address}{agent.description ? ` · ${agent.description}` : ''}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${agent.runnable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {agent.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Propuesta ─────────────────────────────────────────────────────────────────

const ProposalCard: React.FC<{ status: OneclicStatus | null }> = ({ status }) => {
  const agentOptions = useMemo(() => {
    const assigned = (status?.agents ?? []).filter(a => a.id).map(a => ({ id: a.id as string, name: a.name, runnable: a.runnable }));
    return [{ id: ONECLIC_TEST_AGENT_ID, name: 'Agente de prueba de 1clic (en seco, $0)', runnable: true }, ...assigned];
  }, [status]);

  const [agentId, setAgentId] = useState(ONECLIC_TEST_AGENT_ID);
  const [recordId, setRecordId] = useState('');
  const [message, setMessage] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [proposal, setProposal] = useState<OneclicProposal | null>(null);
  const [decision, setDecision] = useState<'approved' | 'discarded' | null>(null);

  const isTestAgent = agentId === ONECLIC_TEST_AGENT_ID;
  const canSubmit = !loading && message.trim().length > 0 && recordId.trim().length > 0 && Boolean(status?.configured.api_key);

  const submit = async () => {
    setLoading(true);
    setError(null);
    setProposal(null);
    setDecision(null);
    try {
      setProposal(await requestOneclicProposal({
        agentId,
        message: message.trim(),
        recordId: recordId.trim(),
        mode: isTestAgent || dryRun ? 'dry_run' : 'default',
      }));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4" /> Pedir una propuesta
      </h3>
      <p className="text-sm text-gray-500 mb-5">
        El agente responde con una propuesta. Aquí no se cambia nada de la tienda: la lees, ves lo que costó y decides.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Agente</label>
          <select
            value={agentId}
            onChange={e => setAgentId(e.target.value)}
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-black outline-none"
          >
            {agentOptions.map(a => (
              <option key={a.id} value={a.id} disabled={!a.runnable}>{a.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Registro (p. ej. id de pedido)</label>
          <input
            value={recordId}
            onChange={e => setRecordId(e.target.value)}
            placeholder="ej. ORD-2026-0142"
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none"
          />
        </div>
      </div>

      <div className="space-y-1.5 mb-4">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Qué le pides</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          placeholder="ej. Propón un mensaje para avisar a la clienta de que su álbum sale mañana."
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none resize-y"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-5">
        <label className={`flex items-center gap-2 text-sm ${isTestAgent ? 'text-gray-400' : 'text-gray-700'}`}>
          <input type="checkbox" checked={isTestAgent || dryRun} disabled={isTestAgent} onChange={e => setDryRun(e.target.checked)} />
          En seco (no cobra, no recuerda)
        </label>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Pidiendo…' : 'Pedir propuesta'}
        </button>
      </div>

      {error ? <ErrorBox error={error} /> : null}

      {proposal && (
        <div className="border-2 border-dashed border-purple-200 rounded-2xl p-5 bg-purple-50/40 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Propuesta de {proposal.agent.name}{proposal.dry_run ? ' · en seco' : ''}{proposal.deduplicated ? ' · repetida (misma clave de idempotencia)' : ''}
            </p>
            {/* @1clic:cost_visible — coste y duración del run, al lado de la propuesta */}
            <p className="flex items-center gap-3 text-xs font-mono text-gray-600">
              <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />{formatUsd(proposal.cost_usd)}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatMs(proposal.duration_ms)}</span>
            </p>
          </div>

          {proposal.summary && <p className="text-sm font-semibold text-gray-900">{proposal.summary}</p>}
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">{proposal.proposal}</pre>
          {proposal.actions.length > 0 && (
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {proposal.actions.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          )}
          {proposal.typed_response && !proposal.typed_response.valid && (
            <p className="text-xs text-amber-700">La respuesta no cumplió el esquema pedido; se muestra tal cual llegó.</p>
          )}

          {/* @1clic:proposal_only — nada se escribe en la tienda: la propuesta espera a que una persona la apruebe o la descarte */}
          {decision === null ? (
            <div className="flex items-center gap-2 pt-2 border-t border-purple-100">
              <button onClick={() => setDecision('approved')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-green-600 text-white hover:bg-green-700">
                <Check className="w-3.5 h-3.5" /> Aprobar propuesta
              </button>
              <button onClick={() => setDecision('discarded')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-300 bg-white hover:bg-gray-50">
                <X className="w-3.5 h-3.5" /> Descartar
              </button>
              <span className="text-xs text-gray-500 ml-2">Aprobar solo la marca como aceptada; aplicarla sigue siendo un paso manual.</span>
            </div>
          ) : (
            <p className={`text-xs font-semibold pt-2 border-t border-purple-100 ${decision === 'approved' ? 'text-green-700' : 'text-gray-500'}`}>
              {decision === 'approved' ? 'Propuesta aprobada por ti. Aplícala a mano cuando quieras.' : 'Propuesta descartada.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Verificación (paso D) ─────────────────────────────────────────────────────

const VerifyCard: React.FC<{ enabled: boolean }> = ({ enabled }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [report, setReport] = useState<OneclicVerifyReport | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      setReport(await verifyOneclicConnection(ATTESTATIONS));
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Verificar la conexión
        </h3>
        <button
          onClick={run}
          disabled={!enabled || loading}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {loading ? 'Verificando… (puede tardar un minuto)' : 'Verificar ahora'}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        1clic califica la plataforma, no una terminal: el servidor abre una sesión de conformidad, ejercita la integración
        contra el agente de prueba (en seco) y pide la nota de las nueve comprobaciones.
      </p>

      {error ? <ErrorBox error={error} /> : null}

      {report && (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-xl border text-sm ${report.grade.can_go_live ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            {report.grade.can_go_live ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <p>
              <span className="font-bold">{report.grade.score}</span> · sesión {report.session.ref}
              {report.grade.can_go_live ? ' · lista para producción' : ` · ${report.grade.blocked} por corregir a mano`}
              {report.grade.next && <> · siguiente: {report.grade.next}</>}
            </p>
          </div>

          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
            {report.grade.checks.map(check => (
              <li key={check.id} className="flex gap-3 p-3 text-sm">
                {check.status === 'pass'
                  ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{check.n}. {check.name} <span className="text-[10px] uppercase text-gray-400 ml-1">{check.kind}</span></p>
                  <p className="text-gray-600">{check.detail}</p>
                  {check.evidence && <p className="text-xs font-mono text-gray-500">{check.evidence}</p>}
                  {check.remediation && check.status !== 'pass' && <p className="text-xs text-amber-700 mt-1">{check.remediation}</p>}
                </div>
              </li>
            ))}
          </ul>

          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer font-semibold">Detalle del ejercicio</summary>
            <ul className="mt-2 space-y-1 font-mono">
              {report.exercise.map((step, i) => (
                <li key={i}>{step.ok ? '✔' : '✖'} {step.step}: {step.detail}</li>
              ))}
            </ul>
            {report.session.instructions.length > 0 && (
              <ol className="mt-3 list-decimal list-inside space-y-1">
                {report.session.instructions.map((line, i) => <li key={i}>{line}</li>)}
              </ol>
            )}
          </details>
        </div>
      )}
    </div>
  );
};

// ── Panel ─────────────────────────────────────────────────────────────────────

const OneclicPanel: React.FC = () => {
  const [status, setStatus] = useState<OneclicStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await getOneclicStatus());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ready = Boolean(status?.configured.api_key && status?.configured.connection_id);

  return (
    <div className="space-y-6">
      <StatusCard status={status} loading={loading} error={error} onReload={load} />
      <ProposalCard status={status} />
      <VerifyCard enabled={ready} />
    </div>
  );
};

export default OneclicPanel;
