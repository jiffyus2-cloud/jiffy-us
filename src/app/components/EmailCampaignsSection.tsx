import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail, Send, Loader2, RefreshCw, AlertCircle, CheckCircle2, X, Eye, Users,
  ChevronDown, ChevronRight, FlaskConical, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  EmailAudience, EmailBodyFormat, EmailCampaign, EmailSegment, EmailStatus, RenderedEmail,
  SEGMENT_LABELS, getEmailAudience, getEmailStatus, listCampaigns, newCampaignId,
  previewEmail, sendCampaign, sendTestEmail,
} from '../../services/massEmailApi';

/**
 * Pestaña "Correos" del panel del dueño: campañas de correo a los usuarios
 * registrados. El envío lo hace el backend (`/email/*`) con el proveedor
 * transaccional; cada correo lleva su enlace de baja y quien se da de baja
 * (`users/{uid}.emailOptOut`) queda fuera de los siguientes envíos.
 */

const SEGMENTS: EmailSegment[] = ['all', 'with_orders', 'without_orders'];

const STATUS_BADGE: Record<EmailCampaign['status'], { label: string; color: string }> = {
  sending: { label: 'Enviando',  color: 'bg-blue-100 text-blue-800' },
  sent:    { label: 'Enviada',   color: 'bg-green-100 text-green-800' },
  partial: { label: 'Parcial',   color: 'bg-orange-100 text-orange-800' },
  failed:  { label: 'Fallida',   color: 'bg-red-100 text-red-800' },
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return format(new Date(iso), "dd MMM yyyy, HH:mm", { locale: es });
  } catch {
    return '—';
  }
}

function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('es-CO')} ${n === 1 ? one : many}`;
}

// ─── Modal: confirmación del envío masivo ─────────────────────────────────────

const ConfirmSendModal: React.FC<{
  subject: string;
  segment: EmailSegment;
  onClose: () => void;
  onConfirm: () => void;
  sending: boolean;
}> = ({ subject, segment, onClose, onConfirm, sending }) => {
  const [audience, setAudience] = useState<EmailAudience | null>(null);
  const [error, setError] = useState('');

  // El recuento se pide de nuevo al abrir: es el que se va a usar de verdad.
  useEffect(() => {
    getEmailAudience(segment).then(setAudience).catch(e => setError(e.message));
  }, [segment]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-gray-900">Confirmar envío masivo</h3>
          <button onClick={onClose} disabled={sending} className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-50">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {error ? (
          <p className="text-sm text-red-600 flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>
        ) : !audience ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Vas a enviar <span className="font-semibold text-gray-900">«{subject}»</span> a:
            </p>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{audience.recipients.toLocaleString('es-CO')}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">destinatarios · {SEGMENT_LABELS[segment]}</p>
            </div>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>{plural(audience.optedOut, 'usuario dado de baja queda', 'usuarios dados de baja quedan')} fuera.</li>
              {audience.invalidEmail > 0 && <li>{plural(audience.invalidEmail, 'usuario sin correo válido', 'usuarios sin correo válido')}.</li>}
              {audience.duplicates > 0 && <li>{plural(audience.duplicates, 'correo repetido se envía', 'correos repetidos se envían')} una sola vez.</li>}
            </ul>
            <p className="text-xs text-gray-500">Esta acción no se puede deshacer.</p>
          </>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} disabled={sending} className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={sending || !audience || audience.recipients === 0}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Enviando…' : audience ? `Enviar a ${audience.recipients.toLocaleString('es-CO')}` : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Historial ────────────────────────────────────────────────────────────────

const CampaignRow: React.FC<{ campaign: EmailCampaign }> = ({ campaign }) => {
  const [open, setOpen] = useState(false);
  const badge = STATUS_BADGE[campaign.status] ?? STATUS_BADGE.failed;
  return (
    <>
      <tr className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setOpen(o => !o)}>
        <td className="px-5 py-3 text-sm text-gray-500 whitespace-nowrap">
          <span className="inline-flex items-center gap-1">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {formatDateTime(campaign.createdAt)}
          </span>
        </td>
        <td className="px-5 py-3 text-sm font-semibold text-gray-900">{campaign.subject}</td>
        <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell">{SEGMENT_LABELS[campaign.segment] ?? campaign.segment}</td>
        <td className="px-5 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
          {campaign.sent.toLocaleString('es-CO')} / {campaign.recipients.toLocaleString('es-CO')}
          {campaign.failed > 0 && <span className="text-red-600"> · {campaign.failed} fallidos</span>}
        </td>
        <td className="px-5 py-3 text-right">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}>{badge.label}</span>
        </td>
      </tr>
      {open && (
        <tr className="bg-gray-50/50">
          <td colSpan={5} className="px-5 py-4 text-xs text-gray-600 space-y-2">
            <p>
              Enviada por <span className="font-semibold">{campaign.createdBy || '—'}</span> · terminó {formatDateTime(campaign.finishedAt)} ·
              vía {campaign.provider} · {campaign.skippedOptOut} bajas excluidas · {campaign.skippedInvalid} sin correo válido
            </p>
            {campaign.failures.length > 0 && (
              <div>
                <p className="font-semibold text-red-700 mb-1">Fallos{campaign.failed > campaign.failures.length ? ` (primeros ${campaign.failures.length} de ${campaign.failed})` : ''}:</p>
                <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                  {campaign.failures.map((f, i) => <li key={i}><span className="font-mono">{f.email}</span> — {f.error}</li>)}
                </ul>
              </div>
            )}
            <pre className="whitespace-pre-wrap font-sans bg-white border border-gray-100 rounded-lg p-3 max-h-48 overflow-y-auto">{campaign.body}</pre>
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Sección principal ────────────────────────────────────────────────────────

const EmailCampaignsSection: React.FC<{ adminEmail?: string }> = ({ adminEmail }) => {
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [statusError, setStatusError] = useState('');

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [bodyFormat, setBodyFormat] = useState<EmailBodyFormat>('text');
  const [segment, setSegment] = useState<EmailSegment>('all');

  const [audience, setAudience] = useState<EmailAudience | null>(null);
  const [audienceError, setAudienceError] = useState('');

  const [preview, setPreview] = useState<RenderedEmail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [testTo, setTestTo] = useState(adminEmail ?? '');
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const campaignIdRef = useRef<string>(newCampaignId());

  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignsError, setCampaignsError] = useState('');

  const draft = { subject: subject.trim(), body, format: bodyFormat };
  const draftReady = draft.subject.length > 0 && body.trim().length > 0;
  const ready = status?.ready === true;

  const loadStatus = useCallback(() => {
    setStatusError('');
    getEmailStatus().then(setStatus).catch(e => setStatusError(e.message));
  }, []);

  const loadCampaigns = useCallback(() => {
    setLoadingCampaigns(true);
    setCampaignsError('');
    listCampaigns()
      .then(setCampaigns)
      .catch(e => setCampaignsError(e.message))
      .finally(() => setLoadingCampaigns(false));
  }, []);

  useEffect(() => { loadStatus(); loadCampaigns(); }, [loadStatus, loadCampaigns]);

  useEffect(() => { if (!testTo && adminEmail) setTestTo(adminEmail); }, [adminEmail, testTo]);

  useEffect(() => {
    setAudience(null);
    setAudienceError('');
    getEmailAudience(segment).then(setAudience).catch(e => setAudienceError(e.message));
  }, [segment]);

  // Vista previa renderizada por el backend (la misma plantilla que se envía),
  // con un pequeño retraso para no pedirla en cada tecla.
  useEffect(() => {
    if (!draftReady) { setPreview(null); setPreviewError(''); setPreviewLoading(false); return; }
    setPreviewLoading(true);
    const handle = setTimeout(() => {
      previewEmail(draft)
        .then(p => { setPreview(p); setPreviewError(''); })
        .catch(e => setPreviewError(e.message))
        .finally(() => setPreviewLoading(false));
    }, 600);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, body, bodyFormat]);

  const handleTest = async () => {
    setNotice(null);
    setTesting(true);
    try {
      const result = await sendTestEmail(draft, testTo.trim());
      setNotice(result.ok
        ? { kind: 'ok', text: `Prueba enviada a ${result.to}. Revisa la bandeja (y la carpeta de spam).` }
        : { kind: 'error', text: `No se pudo enviar la prueba: ${result.error}` });
    } catch (e: any) {
      setNotice({ kind: 'error', text: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setNotice(null);
    try {
      const campaign = await sendCampaign(draft, segment, campaignIdRef.current);
      setNotice({
        kind: campaign.failed === 0 ? 'ok' : 'error',
        text: campaign.failed === 0
          ? `Campaña enviada a ${plural(campaign.sent, 'usuario', 'usuarios')}.`
          : `Campaña terminada: ${campaign.sent} enviados y ${campaign.failed} fallidos. Revisa el historial.`,
      });
      setConfirming(false);
      setSubject('');
      setBody('');
      campaignIdRef.current = newCampaignId();
    } catch (e: any) {
      setNotice({ kind: 'error', text: e.message });
      setConfirming(false);
      // Un 409 significa que esta misma campaña ya salió: el id se renueva solo
      // si el dueño decide mandar otra.
      if (e.status !== 409) campaignIdRef.current = newCampaignId();
    } finally {
      setSending(false);
      loadCampaigns();
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Correos a Usuarios</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Envía novedades y promociones a los usuarios registrados. Cada correo incluye un enlace para darse de baja.
          </p>
        </div>
        <button
          onClick={() => { loadStatus(); loadCampaigns(); }}
          className="self-start sm:self-auto p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingCampaigns ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Configuración pendiente ── */}
      {statusError ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{statusError}</span>
        </div>
      ) : status && !status.ready ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">El envío de correos aún no está configurado.</p>
            <p className="mt-1">
              Falta en el backend: <span className="font-mono">{status.missing.join(', ')}</span>. Puedes redactar y ver la vista previa,
              pero no enviar hasta que esté configurado y el dominio remitente verificado en {status.provider}.
            </p>
          </div>
        </div>
      ) : status ? (
        <div className="rounded-xl border border-gray-100 bg-white p-3 text-xs text-gray-500 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          Se envía desde <span className="font-semibold text-gray-700">{status.from}</span> vía {status.provider}.
        </div>
      ) : null}

      {notice && (
        <div className={`rounded-xl border p-4 text-sm flex items-start gap-2 ${notice.kind === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {notice.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Editor ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Asunto</label>
            <input
              type="text"
              value={subject}
              maxLength={200}
              onChange={e => setSubject(e.target.value)}
              placeholder="Ej.: {{nombre}}, tus fotos merecen un álbum"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Contenido</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                {(['text', 'html'] as EmailBodyFormat[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setBodyFormat(f)}
                    className={`px-3 py-1 ${bodyFormat === f ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    {f === 'text' ? 'Texto' : 'HTML'}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={12}
              placeholder={bodyFormat === 'text'
                ? 'Hola {{nombre}},\n\nEscribe aquí el mensaje. Deja una línea en blanco entre párrafos.'
                : '<p>Hola {{nombre}},</p>\n<p>Escribe aquí el HTML del mensaje.</p>'}
              className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 ${bodyFormat === 'html' ? 'font-mono text-xs' : ''}`}
            />
            <p className="text-xs text-gray-400 mt-1">
              <span className="font-mono">{'{{nombre}}'}</span> se sustituye por el nombre de cada usuario. El pie con el enlace de baja se añade solo.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Destinatarios</label>
            <div className="grid grid-cols-3 gap-2">
              {SEGMENTS.map(s => (
                <button
                  key={s}
                  onClick={() => setSegment(s)}
                  className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-colors ${segment === s ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {SEGMENT_LABELS[s]}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {audienceError
                ? <span className="text-red-600">{audienceError}</span>
                : audience
                  ? <>{plural(audience.recipients, 'destinatario', 'destinatarios')} ({audience.optedOut} dados de baja excluidos)</>
                  : 'Calculando…'}
            </p>
          </div>

          {/* Prueba */}
          <div className="border-t border-gray-100 pt-4">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Envío de prueba</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={testTo}
                onChange={e => setTestTo(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <button
                onClick={handleTest}
                disabled={!ready || !draftReady || testing || !testTo.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                Probar
              </button>
            </div>
          </div>

          <button
            onClick={() => setConfirming(true)}
            disabled={!ready || !draftReady || !audience || audience.recipients === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Enviar campaña{audience ? ` a ${plural(audience.recipients, 'usuario', 'usuarios')}` : ''}
          </button>
        </div>

        {/* ── Vista previa ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[480px]">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Vista previa</span>
            {previewLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-300" />}
          </div>
          {preview && (
            <div className="px-5 py-2 border-b border-gray-100 text-sm">
              <span className="text-gray-400">Asunto: </span><span className="font-semibold text-gray-900">{preview.subject}</span>
            </div>
          )}
          {previewError ? (
            <p className="p-5 text-sm text-red-600 flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{previewError}</p>
          ) : preview ? (
            // sandbox vacío: sin scripts ni navegación desde el HTML del correo.
            <iframe title="Vista previa del correo" sandbox="" srcDoc={preview.html} className="flex-1 w-full border-0" />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <Mail className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Escribe un asunto y un contenido para ver cómo llegará (de ejemplo, a «María Fernanda»).</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Historial ── */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-900">Historial de campañas</h3>
        {campaignsError ? (
          <p className="text-sm text-red-600 flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{campaignsError}</p>
        ) : loadingCampaigns && campaigns.length === 0 ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Mail className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Todavía no se ha enviado ninguna campaña.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/70">
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Asunto</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Segmento</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Enviados</th>
                  <th className="px-5 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map(c => <CampaignRow key={c.id} campaign={c} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirming && (
        <ConfirmSendModal
          subject={draft.subject}
          segment={segment}
          sending={sending}
          onClose={() => setConfirming(false)}
          onConfirm={handleSend}
        />
      )}
    </div>
  );
};

export default EmailCampaignsSection;
