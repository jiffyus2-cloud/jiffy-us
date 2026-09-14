import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Las atestaciones que mandamos a 1clic son `archivo:línea`, no una promesa.
 * Si alguien reordena el panel y las líneas se mueven, este test lo dice antes
 * de que la verificación apunte a una línea que ya no demuestra nada.
 *
 * No se importa el componente (arrastraría React y lucide al entorno `node`):
 * se leen las constantes del propio archivo con una expresión regular.
 */
const FILE = 'src/app/components/oneclic/OneclicPanel.tsx';
const source = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const lines = source.split(/\r?\n/);

function declaredLine(key: 'cost_visible' | 'proposal_only'): number {
  const match = source.match(new RegExp(key + String.raw`: \{ file: ONECLIC_PANEL_FILE, line: (\d+) \}`));
  if (!match) throw new Error(`No se encontró la atestación ${key} en ${FILE}`);
  return Number(match[1]);
}

describe('atestaciones de conformidad de 1clic', () => {
  it('ONECLIC_PANEL_FILE es la ruta real del panel', () => {
    expect(source).toContain(`export const ONECLIC_PANEL_FILE = '${FILE}';`);
  });

  it.each(['cost_visible', 'proposal_only'] as const)('%s apunta a la línea con su marcador', key => {
    const line = declaredLine(key);
    expect(line).toBeGreaterThan(0);
    expect(lines[line - 1]).toContain(`@1clic:${key}`);
  });

  it('el coste y la duración se pintan justo después del marcador', () => {
    const line = declaredLine('cost_visible');
    const block = lines.slice(line, line + 4).join('\n');
    expect(block).toContain('proposal.cost_usd');
    expect(block).toContain('proposal.duration_ms');
  });

  it('tras el marcador de propuesta hay una decisión humana, no una escritura', () => {
    const line = declaredLine('proposal_only');
    const block = lines.slice(line, line + 12).join('\n');
    expect(block).toContain("setDecision('approved')");
    expect(block).toContain("setDecision('discarded')");
    expect(block).not.toMatch(/updateDoc|setDoc|addDoc|fetch\(/);
  });
});
