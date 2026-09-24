import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AlertCircle, Check, FileText, Loader2, RotateCcw, Save, Search, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { EDITABLE_TEXTS, GROUP_ORDER } from '../i18n/editableTexts';
import {
  SYSTEM_TEXTS_DOC,
  mapToEntries,
  placeholdersOf,
  validateEditedText,
} from '../utils/systemTexts';

/**
 * Panel para cambiar los textos grandes de la tienda —descripciones, avisos,
 * mensajes de error, preguntas frecuentes…— sin tocar el código.
 *
 * Los cambios se acumulan aquí y se guardan todos juntos en
 * `settings/system_texts`; la app escucha ese documento en vivo, así que se ven
 * al instante en todas las sesiones. Un texto que vuelve a ser igual al original
 * se quita del documento, de modo que si el texto del código cambia más
 * adelante, ese nuevo texto es el que se ve.
 */

interface SystemTextsSectionProps {
  /** Correo de quien está editando; se guarda junto al cambio para poder auditarlo. */
  adminEmail: string | null;
}

const normalize = (s: string) => s.replace(/\r\n/g, '\n');

/** Caja de texto que crece con su contenido (en móvil un texto largo ocupa muchas líneas). */
function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [props.value]);
  return <textarea ref={ref} rows={2} {...props} />;
}

export default function SystemTextsSection({ adminEmail }: SystemTextsSectionProps) {
  const { textOverrides, textOverridesLoaded } = useLanguage();
  const saved = textOverrides.es;

  /** Textos en edición que aún no se han guardado. */
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string>('');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const announce = (tone: 'ok' | 'error', text: string) => {
    setFeedback({ tone, text });
    if (tone === 'ok') setTimeout(() => setFeedback(null), 4000);
  };

  const currentOf = (key: string, defaultValue: string) => drafts[key] ?? saved[key] ?? defaultValue;

  // Cambios reales respecto a lo guardado (un borrador que vuelve al valor
  // guardado deja de contar).
  const pending = useMemo(
    () =>
      EDITABLE_TEXTS.filter(({ key, defaultValue }) => {
        if (!(key in drafts)) return false;
        return normalize(drafts[key]) !== normalize(saved[key] ?? defaultValue);
      }),
    [drafts, saved]
  );

  const problemsByKey = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const { key, defaultValue } of pending) {
      const problems = validateEditedText(defaultValue, drafts[key]);
      if (problems.length) out[key] = problems;
    }
    return out;
  }, [pending, drafts]);
  const hasProblems = Object.keys(problemsByKey).length > 0;

  const groups = useMemo(
    () => GROUP_ORDER.filter(g => EDITABLE_TEXTS.some(t => t.group === g)),
    []
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EDITABLE_TEXTS.filter(t => {
      if (group && t.group !== group) return false;
      const current = currentOf(t.key, t.defaultValue);
      if (onlyChanged && !(t.key in saved) && !(t.key in drafts)) return false;
      if (!q) return true;
      return (
        current.toLowerCase().includes(q) ||
        t.defaultValue.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, group, onlyChanged, drafts, saved]);

  const setDraft = (key: string, value: string) => setDrafts(prev => ({ ...prev, [key]: value }));

  const discardAll = () => setDrafts({});

  const saveAll = async () => {
    if (pending.length === 0 || hasProblems) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const nextEs = { ...saved };
      for (const { key, defaultValue } of pending) {
        const value = normalize(drafts[key]);
        // Igual que el original: no se guarda, así manda siempre el del código.
        if (value.trim() === normalize(defaultValue).trim()) delete nextEs[key];
        else nextEs[key] = value;
      }
      // Documento entero (sin merge) para poder QUITAR textos restablecidos.
      await setDoc(doc(db, SYSTEM_TEXTS_DOC.collection, SYSTEM_TEXTS_DOC.id), {
        es: mapToEntries(nextEs),
        en: mapToEntries(textOverrides.en),
        updatedAt: serverTimestamp(),
        updatedBy: adminEmail ?? 'desconocido',
      });
      setDrafts({});
      announce('ok', `${pending.length} texto(s) guardado(s). Ya se ven en la tienda.`);
    } catch (e: any) {
      console.error('[Textos de la tienda] No se pudo guardar', e);
      announce('error', `No pudimos guardar los textos: ${e?.message || 'error desconocido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const changedCount = EDITABLE_TEXTS.filter(t => t.key in saved).length;

  return (
    <div className="bg-white rounded-b-xl rounded-tr-xl border border-gray-200 p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Textos de la tienda</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Cambia los textos informativos de la tienda —descripciones, avisos, mensajes de error y
            preguntas frecuentes— sin tocar el código. Los cambios se guardan todos juntos y se ven al
            instante. Siempre puedes volver al texto original.
          </p>
          <ul className="text-xs text-gray-500 mt-2 space-y-0.5 list-disc pl-4">
            <li>
              Lo que va entre llaves, como <code className="bg-gray-100 px-1 rounded">{'{count}'}</code>, lo
              rellena la tienda con un dato real: puedes moverlo, pero no borrarlo.
            </li>
            <li>
              <code className="bg-gray-100 px-1 rounded">**así**</code> sale en negrilla, y en las respuestas
              de las preguntas frecuentes cada línea que empieza por{' '}
              <code className="bg-gray-100 px-1 rounded">- </code> es un punto de una lista.
            </li>
          </ul>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            feedback.tone === 'ok'
              ? 'bg-green-50 border-green-300 text-green-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {feedback.tone === 'ok' ? <Check className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar un texto…"
            className="w-full pl-9 pr-9 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black" aria-label="Limpiar búsqueda">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={group}
          onChange={e => setGroup(e.target.value)}
          className="py-2.5 px-3 border-2 border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-black"
        >
          <option value="">Todas las secciones</option>
          {groups.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700 px-1 cursor-pointer select-none">
          <input type="checkbox" checked={onlyChanged} onChange={e => setOnlyChanged(e.target.checked)} className="w-4 h-4 accent-black" />
          Solo modificados ({changedCount})
        </label>
      </div>

      {!textOverridesLoaded ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando textos…
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-8 text-center">Ningún texto coincide con la búsqueda.</p>
      ) : (
        groups
          .filter(g => visible.some(t => t.group === g))
          .map(g => (
            <section key={g} className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400">{g}</h3>
              {visible.filter(t => t.group === g).map(({ key, defaultValue }) => {
                const value = currentOf(key, defaultValue);
                const isSavedChange = key in saved;
                const isPending = pending.some(p => p.key === key);
                const differsFromDefault = normalize(value) !== normalize(defaultValue);
                const problems = problemsByKey[key];
                const vars = placeholdersOf(defaultValue);
                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-3 space-y-2 ${problems ? 'border-red-300 bg-red-50/40' : isPending ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200'}`}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <code className="text-gray-400">{key}</code>
                      {isPending ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Sin guardar</span>
                      ) : isSavedChange ? (
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">Modificado</span>
                      ) : null}
                      {vars.length > 0 && (
                        <span className="text-gray-500">
                          Variables: {vars.map(v => <code key={v} className="bg-gray-100 px-1 rounded mr-1">{`{${v}}`}</code>)}
                        </span>
                      )}
                      {differsFromDefault && (
                        <button
                          onClick={() => setDraft(key, defaultValue)}
                          className="ml-auto inline-flex items-center gap-1 text-gray-500 hover:text-black font-medium"
                          title="Volver al texto original"
                        >
                          <RotateCcw className="w-3 h-3" /> Restablecer original
                        </button>
                      )}
                    </div>
                    <AutoTextarea
                      value={value}
                      onChange={e => setDraft(key, e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-black resize-none overflow-hidden bg-white"
                    />
                    {differsFromDefault && (
                      <p className="text-[11px] text-gray-400">
                        <span className="font-semibold">Original:</span> {defaultValue}
                      </p>
                    )}
                    {problems && (
                      <ul className="text-xs text-red-700 space-y-0.5">
                        {problems.map(p => <li key={p} className="flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />{p}</li>)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </section>
          ))
      )}

      {/* Barra de cambios pendientes: fija abajo mientras haya algo sin guardar */}
      {pending.length > 0 && (
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-lg">
          <span className="text-sm font-medium">
            {pending.length} texto(s) sin guardar
            {hasProblems && <span className="text-red-600"> · corrige los marcados en rojo</span>}
          </span>
          <div className="flex gap-2">
            <button
              onClick={discardAll}
              disabled={isSaving}
              className="text-xs font-bold px-3 py-2 rounded-lg border-2 border-gray-200 text-gray-600 hover:border-gray-400 disabled:opacity-50"
            >
              Descartar
            </button>
            <button
              onClick={() => void saveAll()}
              disabled={isSaving || hasProblems}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar cambios
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
