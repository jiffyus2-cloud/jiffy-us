import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Error recurrente en móvil: un modal centrado con `fixed inset-0 flex items-center`
 * cuyo panel es más alto que la pantalla (teléfono pequeño, barra del navegador,
 * teclado abierto) se recorta por arriba y por abajo y NO se puede desplazar, así que
 * los botones de abajo quedan inalcanzables y el cliente no puede continuar.
 *
 * Regla: todo fondo de modal centrado debe poder desplazarse (`overflow-y-auto`).
 * El panel lleva `my-auto` (centrado si cabe, arriba y desplazable si no) y, si
 * tiene alto máximo, `max-h-[min(NNvh,100%)]`: los `vh` del móvil incluyen la zona
 * que tapa la barra del navegador; el 100% del fondo es lo realmente visible.
 * En móvil el fondo reserva `max-sm:pb-24` para que el botón flotante de WhatsApp
 * (z-400, encima de todo a propósito) no tape el último botón del panel.
 *
 * Las pantallas de carga a pantalla completa (`flex-col` sin panel) quedan fuera.
 */
const ROOT = join(__dirname);

const tsxFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });

const overlays = tsxFiles(ROOT).flatMap(file =>
  readFileSync(file, 'utf8').split('\n').flatMap((line, i) => {
    const m = line.match(/className="(fixed inset-0[^"]*)"/);
    if (!m || !/\bitems-(center|end)\b/.test(m[1])) return [];
    return [{ where: `${relative(ROOT, file)}:${i + 1}`, cls: m[1] }];
  }),
);

describe('fondos de modal en móvil', () => {
  it('encuentra los modales de la app', () => {
    expect(overlays.length).toBeGreaterThan(20);
  });

  it('todo fondo de modal centrado se puede desplazar si el panel no cabe', () => {
    const sinScroll = overlays
      .filter(o => !/\bflex-col\b/.test(o.cls) && !/\boverflow-y-auto\b/.test(o.cls))
      .map(o => o.where);
    expect(sinScroll).toEqual([]);
  });

  it('los paneles no usan un alto máximo en vh puro (en móvil excede lo visible)', () => {
    const offenders = tsxFiles(ROOT).flatMap(file =>
      readFileSync(file, 'utf8').split('\n').flatMap((line, i) =>
        /className="(my-auto|mt-auto)[^"]*\bmax-h-\[\d+vh\]/.test(line) ? [`${relative(ROOT, file)}:${i + 1}`] : [],
      ),
    );
    expect(offenders).toEqual([]);
  });
});
