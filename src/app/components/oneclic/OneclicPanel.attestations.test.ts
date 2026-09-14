import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Las atestaciones que mandamos a 1clic son `archivo:línea`, no una promesa,
 * y 1clic no acepta extractos de código: quien califique abrirá exactamente
 * esa línea. Por eso la línea declarada tiene que ser el CÓDIGO que demuestra
 * la regla (no el comentario que la explica), con su marcador `@1clic:` en
 * las líneas inmediatamente anteriores. Si alguien reordena el panel y las
 * líneas se mueven, este test lo dice antes de que la verificación apunte a
 * una línea que ya no demuestra nada.
 *
 * No se importa el componente (arrastraría React y lucide al entorno `node`):
 * se leen las constantes del propio archivo con una expresión regular.
 */
const FILE = 'src/app/components/oneclic/OneclicPanel.tsx';
const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const lines = source.split(/\r?\n/);

/** Cuántas líneas por encima del código puede estar el marcador. */
const MARKER_WINDOW = 3;

function declaredLine(key: 'cost_visible' | 'proposal_only'): number {
  const match = source.match(new RegExp(key + String.raw`: \{ file: ONECLIC_PANEL_FILE, line: (\d+) \}`));
  if (!match) throw new Error(`No se encontró la atestación ${key} en ${FILE}`);
  return Number(match[1]);
}

function markerAbove(key: string, line: number): boolean {
  return lines.slice(Math.max(0, line - 1 - MARKER_WINDOW), line - 1).some(l => l.includes(`@1clic:${key}`));
}

describe('atestaciones de conformidad de 1clic', () => {
  it('ONECLIC_PANEL_FILE es la ruta real del panel', () => {
    expect(source).toContain(`export const ONECLIC_PANEL_FILE = '${FILE}';`);
  });

  it.each(['cost_visible', 'proposal_only'] as const)('%s: la línea declarada es código, con su marcador justo encima', key => {
    const line = declaredLine(key);
    expect(line).toBeGreaterThan(0);
    expect(lines[line - 1]).not.toContain('@1clic:');
    expect(markerAbove(key, line)).toBe(true);
  });

  it('cost_visible apunta a la línea que pinta el coste, y la duración va al lado', () => {
    const line = declaredLine('cost_visible');
    expect(lines[line - 1]).toContain('proposal.cost_usd');
    expect(lines.slice(line - 1, line + 2).join('\n')).toContain('proposal.duration_ms');
  });

  it('proposal_only apunta al botón de aprobar; después hay una decisión humana, no una escritura', () => {
    const line = declaredLine('proposal_only');
    expect(lines[line - 1]).toContain("setDecision('approved')");
    const block = lines.slice(line - 1, line + 10).join('\n');
    expect(block).toContain("setDecision('discarded')");
    expect(block).not.toMatch(/updateDoc|setDoc|addDoc|fetch\(/);
  });
});
