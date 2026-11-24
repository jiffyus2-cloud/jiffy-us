import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle, CheckCircle2, Eye, FlaskConical, Loader2, RefreshCw, Save, X,
  CreditCard, Factory, Truck, PackageCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  EmailBodyFormat, ORDER_EMAIL_EVENTS, OrderEmailEvent, OrderEmailLogEntry, OrderEmailTemplate, RenderedEmail,
  getOrderEmailTemplates, listOrderEmailLog, previewOrderEmail, sendOrderEmailTest,
} from '../../services/massEmailApi';
import { saveOrderEmailTemplate } from '../../services/emailAutomations';

/**
 * Sub-pestaña «Automáticos» de Correos: un correo por cada paso del pedido.
 * Pagado lo dispara el backend al confirmar el pago (Stripe o Nequi); los demás,
 * el tablero de pedidos al mover la tarjeta. Cada pedido recibe cada correo una
 * sola vez.
 */

export const EVENT_INFO: Record<OrderEmailEvent, { label: string; when: string; icon: React.ReactNode; color: string }> = {
  paid:          { label: 'Compra confirmada', when: 'Cuando se confirma el pago del pedido.', icon: <CreditCard className="w-4 h-4" />, color: 'bg-green-100 text-green-700' },
  en_produccion: { label: 'En producción',     when: 'Cuando pasas el pedido a «En Producción».', icon: <Factory className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
  enviado:       { label: 'En camino',          when: 'Cuando marcas el pedido como «Enviado».', icon: <Truck className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
  entregado:     { label: 'Entregado',          when: 'Cuando marcas el pedido como «Entregado».', icon: <PackageCheck className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700' },
};

function formatDateTime(iso: string): string {
  try { return format(new Date(iso), 'dd MMM yyyy, HH:mm', { locale: es }); } catch { return '—'; }
}

const AutomationCard: React.FC<{
  event: OrderEmailEvent;
  saved: OrderEmailTemplate;
  adminEmail?: string;
  onSaved: (t: OrderEmailTemplate) => void;
}> = ({ event, saved, adminEmail, onSaved }) => {
  const info = EVENT_INFO[event];
  const [enabled, setEnabled] = useState(saved.enabled);
  const [subject, setSubject] = useState(saved.subject);
  const [body, setBody] = useState(saved.body);
  const [bodyFormat, setBodyFormat] = useState<EmailBodyFormat>(saved.format);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'' | 'save' | 'test' | 'preview'>('');
  const [preview, setPreview] = useState<RenderedEmail | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const dirty = enabled !== saved.enabled || subject !== saved.subject || body !== saved.body || bodyFormat !== saved.format;
  const draft = { subject: subject.trim(), body, format: bodyFormat };

  const save = async (nextEnabled = enabled) => {
    setBusy('save'); setMessage(null);
    try {
      const t = { enabled: nextEnabled, subject: subject.trim(), body, format: bodyFormat };
      await saveOrderEmailTemplate(event, t, adminEmail ?? '');
      setEnabled(nextEnabled);
      onSaved({ ...t, customized: true });
      setMessage({ kind: 'ok', text: nextEnabled ? 'Guardado. Este correo está activado.' : 'Guardado. Este correo está desactivado.' });
    } catch (e: any) {
      setMessage({ kind: 'error', text: `No se pudo guardar: ${e.message}` });
    } finally { setBusy(''); }
  };

  const showPreview = async () => {
    setBusy('preview'); setMessage(null);
    try { setPreview(await previewOrderEmail(event, draft)); }
    catch (e: any) { setMessage({ kind: 'error', text: e.message }); }
    finally { setBusy(''); }
  };

  const test = async () => {
    if (!adminEmail) return;
    setBusy('test'); setMessage(null);
    try {
      const r = await sendOrderEmailTest(event, draft, adminEmail);
      setMessage(r.ok ? { kind: 'ok', text: `Prueba enviada a ${r.to} con un pedido de ejemplo.` } : { kind: 'error', text: `No se pudo enviar la prueba: ${r.error}` });
    } catch (e: any) { setMessage({ kind: 'error', text: e.message }); }
    finally { setBusy(''); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <span className={`p-2 rounded-xl ${info.color}`}>{info.icon}</span>
        <button className="flex-1 min-w-0 text-left" onClick={() => setOpen(o => !o)}>
          <p className="font-bold text-gray-900 text-sm">{info.label}</p>
          <p className="text-xs text-gray-500 truncate">{info.when}</p>
        </button>
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer select-none">
          <span className="hidden sm:inline">{saved.enabled ? 'Activado' : 'Desactivado'}</span>
          <input
            type="checkbox"
            role="switch"
            checked={saved.enabled}
            disabled={busy !== ''}
            onChange={e => void save(e.target.checked)}
            className="sr-only peer"
            aria-label={`Activar correo «${info.label}»`}
          />
          <span className="relative w-10 h-6 rounded-full bg-gray-200 peer-checked:bg-green-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4" />
        </label>
        <button onClick={() => setOpen(o => !o)} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50">
          {open ? 'Cerrar' : 'Editar'}
        </button>
      </div>

      {message && !open && (
        <p className={`px-4 pb-3 text-xs ${message.kind === 'ok' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
      )}

      {open && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          {!saved.customized && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">Este es el texto sugerido. Cámbialo a tu gusto y guárdalo.</p>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Asunto</label>
            <input
              value={subject}
              maxLength={200}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Contenido</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                {(['text', 'html'] as EmailBodyFormat[]).map(f => (
                  <button key={f} onClick={() => setBodyFormat(f)} className={`px-3 py-1 ${bodyFormat === f ? 'bg-black text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    {f === 'text' ? 'Texto' : 'HTML'}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={10}
              className={`w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 ${bodyFormat === 'html' ? 'font-mono text-xs' : ''}`}
            />
            <p className="text-xs text-gray-400 mt-1">
              Variables: <span className="font-mono">{'{{nombre}}'}</span> (nombre del cliente), <span className="font-mono">{'{{pedido}}'}</span> (código, ej. #A1B2C3D4),{' '}
              <span className="font-mono">{'{{producto}}'}</span> y <span className="font-mono">{'{{enlace}}'}</span> (página «Mis pedidos»).
              Para una imagen, una línea <span className="font-mono">![descripción](enlace)</span>.
            </p>
          </div>

          {message && (
            <div className={`rounded-xl border p-3 text-xs flex items-start gap-2 ${message.kind === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {message.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span className="flex-1">{message.text}</span>
              <button onClick={() => setMessage(null)}><X className="w-3.5 h-3.5 opacity-60" /></button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void save()}
              disabled={busy !== '' || !dirty || !subject.trim() || !body.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-black text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
            </button>
            <button
              onClick={() => void showPreview()}
              disabled={busy !== '' || !subject.trim() || !body.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'preview' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Vista previa
            </button>
            <button
              onClick={() => void test()}
              disabled={busy !== '' || !adminEmail || !subject.trim() || !body.trim()}
              title={adminEmail ? `Enviar una prueba a ${adminEmail}` : undefined}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              {busy === 'test' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />} Probar en mi correo
            </button>
            {dirty && <span className="self-center text-xs text-orange-600">Cambios sin guardar</span>}
          </div>

          {preview && (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 text-sm flex items-center gap-2">
                <span className="text-gray-400">Asunto:</span><span className="font-semibold flex-1 truncate">{preview.subject}</span>
                <button onClick={() => setPreview(null)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <iframe title={`Vista previa: ${info.label}`} sandbox="" srcDoc={preview.html} className="w-full h-[420px] border-0" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const OrderEmailAutomationsSection: React.FC<{ adminEmail?: string }> = ({ adminEmail }) => {
  const [templates, setTemplates] = useState<Record<OrderEmailEvent, OrderEmailTemplate> | null>(null);
  const [error, setError] = useState('');
  const [log, setLog] = useState<OrderEmailLogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);
  const [logError, setLogError] = useState('');

  const loadLog = useCallback(() => {
    setLogLoading(true); setLogError('');
    listOrderEmailLog().then(setLog).catch(e => setLogError(e.message)).finally(() => setLogLoading(false));
  }, []);

  useEffect(() => {
    getOrderEmailTemplates().then(setTemplates).catch(e => setError(e.message));
    loadLog();
  }, [loadLog]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Correos automáticos de pedido</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Se envían solos al cliente en cada paso de su pedido, una sola vez por pedido. Llegan aunque el cliente se haya dado de baja
          de las campañas, porque son avisos de su compra. Actívalos cuando tengas el texto listo.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600 flex items-start gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>
      ) : !templates ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : (
        <div className="space-y-3">
          {ORDER_EMAIL_EVENTS.map(event => (
            <AutomationCard
              key={event}
              event={event}
              saved={templates[event]}
              adminEmail={adminEmail}
              onSaved={t => setTemplates(prev => prev ? { ...prev, [event]: t } : prev)}
            />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Últimos correos automáticos</h3>
          <button onClick={loadLog} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50" title="Actualizar">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${logLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {logError ? (
          <p className="text-sm text-red-600">{logError}</p>
        ) : log.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">{logLoading ? 'Cargando…' : 'Todavía no se ha enviado ningún correo automático.'}</p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="bg-gray-50/70">
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-400 uppercase">Fecha</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-400 uppercase">Correo</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-400 uppercase">Pedido</th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-gray-400 uppercase hidden md:table-cell">Para</th>
                  <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-400 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {log.map(entry => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{formatDateTime(entry.updatedAt || entry.createdAt)}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{EVENT_INFO[entry.event]?.label ?? entry.event}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">#{entry.orderId.slice(0, 8).toUpperCase()}</td>
                    <td className="px-4 py-2.5 text-gray-600 hidden md:table-cell">{entry.to}</td>
                    <td className="px-4 py-2.5 text-right">
                      {entry.state === 'sent'
                        ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">Enviado</span>
                        : entry.state === 'failed'
                          ? <span title={entry.error ?? ''} className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">Falló</span>
                          : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Enviando</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderEmailAutomationsSection;
