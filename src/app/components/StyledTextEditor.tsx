// ============================================================================
// Styled Text Editor
// ============================================================================
// Editor de las cajas de texto con negrilla e itálica POR CARÁCTER.
//
// Un <textarea> no puede mostrar estilos mezclados, así que es un
// `contenteditable`. Para no pelearse con el HTML que cada navegador genera al
// escribir, el DOM NO es la fuente de verdad: tras cada cambio se lee solo el
// texto plano, se recalculan los estilos con `marksAfterEdit` (lo escrito hereda
// el estilo de al lado) y, si el DOM no coincide con lo que tocaría pintar, se
// repinta y se devuelve el cursor a su sitio. Enter, pegar y soltar se hacen a
// mano para que nunca entre HTML ajeno.
//
// Mientras hay una composición abierta (teclados de móvil, acentos, IME) no se
// repinta: hacerlo rompe la palabra que se está escribiendo. Se sincroniza al
// cerrarla.
// ============================================================================

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import {
  markAt,
  markStyle,
  marksAfterEdit,
  normalizeMarks,
  rangeHasMark,
  segmentText,
  setMarkInRange,
  MARK_BOLD,
  MARK_ITALIC,
} from '../utils/textMarks';

/** Texto de una caja pintado con sus estilos por carácter. */
export const StyledTextRuns: React.FC<{ text: string; marks?: string }> = ({ text, marks }) => (
  <>
    {segmentText(text, marks).map((seg, i) =>
      seg.mark ? <span key={i} style={markStyle(seg.mark)}>{seg.text}</span> : <React.Fragment key={i}>{seg.text}</React.Fragment>
    )}
  </>
);

// ── DOM <-> texto plano ──────────────────────────────────────────────────────

const isBlock = (n: Node) => n.nodeName === 'DIV' || n.nodeName === 'P';
const isTrailingBr = (n: Node) => n.nodeName === 'BR' && (n as HTMLElement).dataset.trailing === '1';

/**
 * Recorre el editor en orden. Cada texto cuenta sus caracteres; un <br> cuenta
 * como salto de línea (salvo el de relleno que ponemos al final) y un bloque que
 * no va al principio también, por si algún navegador los mete.
 * `stopAt` corta el recorrido en un punto (nodo, offset) y devuelve su índice.
 */
function walk(root: HTMLElement, stopAt?: { node: Node; offset: number }): { text: string; index: number } {
  let text = '';
  let index = -1;
  const visit = (n: Node): boolean => {
    if (stopAt && n === stopAt.node && n.nodeType === Node.TEXT_NODE) {
      index = text.length + stopAt.offset;
      return true;
    }
    if (n.nodeType === Node.TEXT_NODE) {
      text += (n as Text).data;
      return false;
    }
    if (n.nodeName === 'BR') {
      if (!isTrailingBr(n)) text += '\n';
      return false;
    }
    if (n !== root && isBlock(n) && text.length > 0 && !text.endsWith('\n')) text += '\n';
    const children = n.childNodes;
    for (let i = 0; i < children.length; i++) {
      if (stopAt && n === stopAt.node && i === stopAt.offset) {
        index = text.length;
        return true;
      }
      if (visit(children[i])) return true;
    }
    if (stopAt && n === stopAt.node) {
      index = text.length;
      return true;
    }
    return false;
  };
  visit(root);
  return { text, index };
}

const readText = (root: HTMLElement) => walk(root).text;

function getSelectionOffsets(root: HTMLElement): { start: number; end: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const start = walk(root, { node: range.startContainer, offset: range.startOffset }).index;
  const end = walk(root, { node: range.endContainer, offset: range.endOffset }).index;
  if (start < 0 || end < 0) return null;
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

/** Punto (nodo de texto, offset) para un índice. Tras `paint` solo hay spans de texto. */
function pointAt(root: HTMLElement, index: number): { node: Node; offset: number } {
  // Justo después de un salto de línea final: Chrome lleva el cursor puesto al
  // final del texto ("…\n|") a la línea de arriba, así que se ancla antes del
  // <br> de relleno, que sí queda en la línea nueva.
  const lastChild = root.lastChild;
  if (lastChild && isTrailingBr(lastChild) && index >= readText(root).length) {
    return { node: root, offset: root.childNodes.length - 1 };
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let count = 0;
  let last: Text | null = null;
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    if (index <= count + n.data.length) return { node: n, offset: index - count };
    count += n.data.length;
    last = n;
  }
  return last ? { node: last, offset: last.data.length } : { node: root, offset: 0 };
}

function setSelectionOffsets(root: HTMLElement, start: number, end: number) {
  const sel = window.getSelection();
  if (!sel) return;
  const a = pointAt(root, start);
  const b = pointAt(root, end);
  const range = document.createRange();
  range.setStart(a.node, a.offset);
  range.setEnd(b.node, b.offset);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** HTML canónico de un texto con estilos: un <span> por trozo. */
function buildFragment(text: string, marks: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const seg of segmentText(text, marks)) {
    const span = document.createElement('span');
    span.dataset.m = String(seg.mark);
    const st = markStyle(seg.mark);
    span.style.fontWeight = st.fontWeight;
    span.style.fontStyle = st.fontStyle;
    span.textContent = seg.text;
    frag.appendChild(span);
  }
  // Un salto de línea al final no ocupa línea visible sin algo detrás.
  if (text.endsWith('\n')) {
    const br = document.createElement('br');
    br.dataset.trailing = '1';
    frag.appendChild(br);
  }
  return frag;
}

function canonicalHtml(text: string, marks: string): string {
  const div = document.createElement('div');
  div.appendChild(buildFragment(text, marks));
  return div.innerHTML;
}

function paint(root: HTMLElement, text: string, marks: string) {
  root.replaceChildren(buildFragment(text, marks));
}

// ── Borrado ──────────────────────────────────────────────────────────────────

const graphemes = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;

/** Límites de carácter visible (un emoji o una letra con tilde combinada es uno). */
function prevBoundary(t: string, i: number): number {
  if (i <= 0) return 0;
  if (graphemes) {
    let last = 0;
    for (const s of graphemes.segment(t)) {
      if (s.index >= i) break;
      last = s.index;
    }
    return last;
  }
  const low = t.charCodeAt(i - 1);
  return i >= 2 && low >= 0xdc00 && low <= 0xdfff ? i - 2 : i - 1;
}

function nextBoundary(t: string, i: number): number {
  if (i >= t.length) return t.length;
  if (graphemes) {
    for (const s of graphemes.segment(t)) {
      if (s.index > i) return s.index;
    }
    return t.length;
  }
  const high = t.charCodeAt(i);
  return high >= 0xd800 && high <= 0xdbff ? i + 2 : i + 1;
}

/** Tramo que borra cada tipo de `beforeinput`; null si no hay nada que borrar. */
function deletionRange(
  t: string,
  sel: { start: number; end: number },
  inputType: string
): { start: number; end: number } | null {
  if (sel.start !== sel.end) return sel;
  const i = sel.start;
  let start = i;
  let end = i;
  switch (inputType) {
    case 'deleteContentForward':
      end = nextBoundary(t, i);
      break;
    case 'deleteWordBackward':
      while (start > 0 && /\s/.test(t[start - 1])) start--;
      while (start > 0 && !/\s/.test(t[start - 1])) start--;
      break;
    case 'deleteWordForward':
      while (end < t.length && /\s/.test(t[end])) end++;
      while (end < t.length && !/\s/.test(t[end])) end++;
      break;
    case 'deleteSoftLineBackward':
    case 'deleteHardLineBackward':
      start = t.lastIndexOf('\n', i - 1) + 1;
      if (start === i) start = Math.max(0, i - 1);
      break;
    case 'deleteSoftLineForward':
    case 'deleteHardLineForward': {
      const nl = t.indexOf('\n', i);
      end = nl === -1 ? t.length : nl === i ? i + 1 : nl;
      break;
    }
    default:
      start = prevBoundary(t, i);
  }
  return start === end ? null : { start, end };
}

// ── Componente ───────────────────────────────────────────────────────────────

export interface StyledTextEditorHandle {
  /** Pone o quita negrilla/itálica en la selección (o para lo próximo que se escriba). */
  toggle: (bit: number) => void;
}

interface StyledTextEditorProps {
  text: string;
  marks?: string;
  maxLength: number;
  placeholder?: string;
  /** Tipografía, tamaño, color y alineación de la caja. */
  style: React.CSSProperties;
  onChange: (text: string, marks: string) => void;
  /** Estilo que tiene ahora la selección o el cursor, para iluminar los botones. */
  onActiveMarkChange?: (mark: number) => void;
  autoFocus?: boolean;
}

function supportsPlaintextOnly(): boolean {
  try {
    const el = document.createElement('div');
    el.contentEditable = 'plaintext-only';
    return el.contentEditable === 'plaintext-only';
  } catch {
    return false;
  }
}

export const StyledTextEditor = forwardRef<StyledTextEditorHandle, StyledTextEditorProps>(function StyledTextEditor(
  { text, marks, maxLength, placeholder, style, onChange, onActiveMarkChange, autoFocus },
  ref
) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Último estado que conoce el editor (lo que emitió o lo que le llegó por props).
  const modelRef = useRef({ text, marks: normalizeMarks(text, marks) });
  const selRef = useRef<{ start: number; end: number } | null>(null);
  // Negrilla/itálica activadas con el cursor sin selección: se aplica a lo
  // próximo que se escriba en ESA posición.
  const pendingRef = useRef<{ mark: number; at: number } | null>(null);
  const composingRef = useRef(false);
  const lastActiveRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onActiveRef = useRef(onActiveMarkChange);
  onActiveRef.current = onActiveMarkChange;
  const maxRef = useRef(maxLength);
  maxRef.current = maxLength;

  const reportActive = useCallback(() => {
    const { marks: m } = modelRef.current;
    const sel = selRef.current;
    let mark = 0;
    if (sel && sel.start !== sel.end) {
      if (rangeHasMark(m, sel.start, sel.end, MARK_BOLD)) mark |= MARK_BOLD;
      if (rangeHasMark(m, sel.start, sel.end, MARK_ITALIC)) mark |= MARK_ITALIC;
    } else {
      const caret = sel ? sel.start : modelRef.current.text.length;
      const pending = pendingRef.current;
      mark = pending && pending.at === caret ? pending.mark : caret > 0 ? markAt(m, caret - 1) : markAt(m, 0);
    }
    if (lastActiveRef.current !== mark) {
      lastActiveRef.current = mark;
      onActiveRef.current?.(mark);
    }
  }, []);

  /** Guarda un estado nuevo, lo emite y repinta con el cursor en `sel`. */
  const commit = useCallback((nextText: string, nextMarks: string, sel: { start: number; end: number } | null) => {
    const root = rootRef.current;
    modelRef.current = { text: nextText, marks: normalizeMarks(nextText, nextMarks) };
    onChangeRef.current(modelRef.current.text, modelRef.current.marks);
    if (root && !composingRef.current && root.innerHTML !== canonicalHtml(modelRef.current.text, modelRef.current.marks)) {
      paint(root, modelRef.current.text, modelRef.current.marks);
      if (sel && document.activeElement === root) {
        const clamp = (i: number) => Math.min(i, modelRef.current.text.length);
        setSelectionOffsets(root, clamp(sel.start), clamp(sel.end));
      }
    }
    if (sel) selRef.current = sel;
    reportActive();
  }, [reportActive]);

  /** Sustituye la selección por `str` (Enter, pegar). */
  const replaceSelection = useCallback((str: string, range?: { start: number; end: number }) => {
    const root = rootRef.current;
    if (!root) return;
    const { text: t, marks: m } = modelRef.current;
    const sel = range ?? getSelectionOffsets(root) ?? selRef.current ?? { start: t.length, end: t.length };
    const room = maxRef.current - (t.length - (sel.end - sel.start));
    const piece = str.slice(0, Math.max(0, room));
    if (!piece && sel.start === sel.end) return;
    const next = t.slice(0, sel.start) + piece + t.slice(sel.end);
    const pending = pendingRef.current && pendingRef.current.at === sel.start ? pendingRef.current.mark : undefined;
    pendingRef.current = null;
    const caret = sel.start + piece.length;
    commit(next, marksAfterEdit(t, m, next, pending), { start: caret, end: caret });
    // `commit` solo repinta si hace falta; el cursor hay que ponerlo siempre.
    setSelectionOffsets(root, caret, caret);
  }, [commit]);
  const replaceSelectionRef = useRef(replaceSelection);
  replaceSelectionRef.current = replaceSelection;

  // Sincroniza tras escribir o borrar a mano.
  const syncFromDom = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const { text: t, marks: m } = modelRef.current;
    let next = readText(root);
    const sel = getSelectionOffsets(root);
    const pending = pendingRef.current && sel && pendingRef.current.at === sel.start - (next.length - t.length)
      ? pendingRef.current.mark
      : undefined;
    let nextMarks = marksAfterEdit(t, m, next, pending);
    if (next.length > maxRef.current) {
      next = next.slice(0, maxRef.current);
      nextMarks = normalizeMarks(next, nextMarks);
    }
    if (next !== t) pendingRef.current = null;
    commit(next, nextMarks, sel);
  }, [commit]);

  const toggle = useCallback((bit: number) => {
    const root = rootRef.current;
    if (!root) return;
    const { text: t, marks: m } = modelRef.current;
    const sel = (document.activeElement === root ? getSelectionOffsets(root) : null) ?? selRef.current;
    if (!sel) {
      // Nunca se tocó el editor: se aplica a todo el texto.
      if (!t) return;
      commit(t, setMarkInRange(t, m, 0, t.length, bit, !rangeHasMark(m, 0, t.length, bit)), null);
      return;
    }
    root.focus();
    if (sel.start === sel.end) {
      const base = pendingRef.current && pendingRef.current.at === sel.start
        ? pendingRef.current.mark
        : sel.start > 0 ? markAt(m, sel.start - 1) : markAt(m, 0);
      pendingRef.current = { mark: base ^ bit, at: sel.start };
      setSelectionOffsets(root, sel.start, sel.end);
      selRef.current = sel;
      reportActive();
      return;
    }
    const on = !rangeHasMark(m, sel.start, sel.end, bit);
    commit(t, setMarkInRange(t, m, sel.start, sel.end, bit, on), sel);
    setSelectionOffsets(root, sel.start, sel.end);
  }, [commit, reportActive]);

  useImperativeHandle(ref, () => ({ toggle }), [toggle]);

  // Pintado inicial y cambios que llegan de fuera (p. ej. el recorte al bajar
  // el límite de caracteres al cambiar el tamaño de letra).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const incoming = { text, marks: normalizeMarks(text, marks) };
    const model = modelRef.current;
    const first = root.childNodes.length === 0 && text.length > 0;
    if (first || incoming.text !== model.text || incoming.marks !== model.marks) {
      modelRef.current = incoming;
      if (!composingRef.current) paint(root, incoming.text, incoming.marks);
      reportActive();
    }
  }, [text, marks, reportActive]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.contentEditable = supportsPlaintextOnly() ? 'plaintext-only' : 'true';
    paint(root, modelRef.current.text, modelRef.current.marks);
    if (autoFocus) {
      root.focus();
      const end = modelRef.current.text.length;
      setSelectionOffsets(root, end, end);
    }

    const onSelectionChange = () => {
      const sel = getSelectionOffsets(root);
      if (!sel) return;
      const prev = selRef.current;
      selRef.current = sel;
      // Mover el cursor a otro sitio cancela el estilo pendiente (pero no el
      // movimiento que provoca la propia escritura, que se resuelve en onInput).
      if (pendingRef.current && readText(root) === modelRef.current.text && (sel.start !== sel.end || sel.start !== pendingRef.current.at)) {
        if (!prev || prev.start !== sel.start || prev.end !== sel.end) pendingRef.current = null;
      }
      reportActive();
    };
    // Límite de caracteres antes de que el texto entre.
    const onBeforeInput = (e: InputEvent) => {
      if (composingRef.current) return;
      // Borrar se hace siempre a mano: Chrome, al vaciar el final de una línea,
      // mete un "\n" de más para conservarla, y a veces quita el <br> de relleno
      // en vez del "\n" real. Así el texto nunca se desvía del modelo.
      if (e.inputType.startsWith('delete') && e.inputType !== 'deleteByDrag') {
        const sel = getSelectionOffsets(root);
        if (!sel) return;
        const range = deletionRange(modelRef.current.text, sel, e.inputType);
        e.preventDefault();
        if (range) replaceSelectionRef.current('', range);
        return;
      }
      if (!e.inputType.startsWith('insert')) return;
      const sel = getSelectionOffsets(root);
      const selected = sel ? sel.end - sel.start : 0;
      const incoming = e.data?.length ?? 1;
      if (modelRef.current.text.length - selected + incoming > maxRef.current) {
        e.preventDefault();
        // Una sugerencia del teclado o un bloque largo entra hasta donde quepa.
        if (e.data) replaceSelectionRef.current(e.data);
      }
    };
    document.addEventListener('selectionchange', onSelectionChange);
    root.addEventListener('beforeinput', onBeforeInput);
    reportActive();
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      root.removeEventListener('beforeinput', onBeforeInput);
    };
    // Solo al montar: el resto de cambios entran por el efecto de arriba.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    outline: 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    ...style,
  };

  return (
    <div className="relative" style={{ width: '90%', height: '90%' }}>
      {!text && placeholder && (
        <div aria-hidden className="absolute inset-0 pointer-events-none opacity-40" style={{ ...baseStyle, overflowY: 'hidden' }}>
          {placeholder}
        </div>
      )}
      <div
        ref={rootRef}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        suppressContentEditableWarning
        spellCheck
        style={baseStyle}
        onInput={() => { if (!composingRef.current) syncFromDom(); }}
        onCompositionStart={() => { composingRef.current = true; }}
        onCompositionEnd={() => { composingRef.current = false; syncFromDom(); }}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            replaceSelection('\n');
            return;
          }
          if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'b' || e.key === 'B' || e.key === 'i' || e.key === 'I')) {
            e.preventDefault();
            toggle(e.key.toLowerCase() === 'b' ? MARK_BOLD : MARK_ITALIC);
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          replaceSelection(e.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n'));
        }}
        onDrop={(e) => e.preventDefault()}
      />
    </div>
  );
});
