import { describe, it, expect } from 'vitest';
import { buildOrderSections } from './albumOrderSections';
import type { OneclicPhotoMetadata } from '../../../services/oneclicApi';

function photo(index: number, takenAt: string | null = null): OneclicPhotoMetadata {
  return {
    index, page: Math.floor(index / 2), slot: index % 2, url: `https://s/${index}.jpg`,
    takenAt, width: null, height: null, orientation: null, camera: null, bytes: null, note: null,
  };
}

/** 6 fotos capturadas a las 10:00, 10:01… en el mismo orden que su índice. */
const photos = Array.from({ length: 6 }, (_, i) => photo(i, `2026-05-02T10:0${i}:00.000Z`));

describe('buildOrderSections', () => {
  it('ordena las secciones por su captura más antigua, no por el array de grupos', () => {
    // El agente devuelve "Tarde" antes que "Mañana", pero Mañana es anterior.
    const { sections } = buildOrderSections(
      [3, 4, 0, 1],
      [{ title: 'Tarde', indices: [3, 4] }, { title: 'Mañana', indices: [0, 1] }],
      photos,
    );
    expect(sections.map(s => s.title)).toEqual(['Mañana', 'Tarde']);
    expect(sections[0].items.map(i => [i.photo.index, i.position])).toEqual([[0, 1], [1, 2]]);
    expect(sections[1].items.map(i => [i.photo.index, i.position])).toEqual([[3, 3], [4, 4]]);
  });

  it('dentro de una sección las fotos van por hora de captura', () => {
    // El agente las devuelve 2,0,1; sus capturas son 10:02, 10:00 y 10:01.
    const { sections } = buildOrderSections(
      [2, 0, 1],
      [{ title: 'Todo', indices: [0, 1, 2] }],
      photos,
    );
    expect(sections[0].items.map(i => i.photo.index)).toEqual([0, 1, 2]);
  });

  it('las fotos sin fecha van al final de su sección, en el orden del agente', () => {
    const mixtas = [photo(0, '2026-05-02T10:05:00.000Z'), photo(1), photo(2), photo(3, '2026-05-02T10:01:00.000Z')];
    const { sections } = buildOrderSections(
      [2, 1, 0, 3],
      [{ title: 'Todo', indices: [0, 1, 2, 3] }],
      mixtas,
    );
    expect(sections[0].items.map(i => i.photo.index)).toEqual([3, 0, 2, 1]);
  });

  it('cuenta las fotos en las que esta vista difiere de la lista plana del agente', () => {
    // Lista plana: 3,4,0,1 → secciones: 0,1,3,4. Las cuatro cambian de sitio.
    const { disagreements } = buildOrderSections(
      [3, 4, 0, 1],
      [{ title: 'Tarde', indices: [3, 4] }, { title: 'Mañana', indices: [0, 1] }],
      photos,
    );
    expect(disagreements).toBe(4);

    // Si la lista plana ya concuerda con las secciones, no hay discrepancia.
    const igual = buildOrderSections(
      [0, 1, 3, 4],
      [{ title: 'Mañana', indices: [0, 1] }, { title: 'Tarde', indices: [3, 4] }],
      photos,
    );
    expect(igual.disagreements).toBe(0);
  });

  it('una foto solo cae en una sección: gana el primer grupo que la nombra', () => {
    const { sections } = buildOrderSections(
      [0, 1, 2],
      [{ title: 'A', indices: [0, 1] }, { title: 'B', indices: [1, 2] }],
      photos,
    );
    expect(sections.map(s => [s.title, s.items.map(i => i.photo.index)])).toEqual([['A', [0, 1]], ['B', [2]]]);
  });

  it('las fotos sin grupo van a una sección final aunque aparezcan antes', () => {
    const { sections } = buildOrderSections(
      [5, 0, 1],
      [{ title: 'Mañana', indices: [0, 1] }],
      photos,
    );
    expect(sections.map(s => s.title)).toEqual(['Mañana', 'Sin sección']);
    expect(sections[1].groupIndex).toBeNull();
    expect(sections[1].items.map(i => i.position)).toEqual([3]);
  });

  it('las secciones sin ninguna fecha van tras las fechadas, en orden de aparición', () => {
    const mixtas = [photo(0, '2026-05-02T12:00:00.000Z'), photo(1), photo(2), photo(3, '2026-05-02T09:00:00.000Z')];
    const { sections } = buildOrderSections(
      [1, 2, 0, 3],
      [{ title: 'Sin fecha', indices: [1, 2] }, { title: 'Mediodía', indices: [0] }, { title: 'Mañana', indices: [3] }],
      mixtas,
    );
    expect(sections.map(s => s.title)).toEqual(['Mañana', 'Mediodía', 'Sin fecha']);
    expect(sections.map(s => [s.firstPosition, s.lastPosition])).toEqual([[1, 1], [2, 2], [3, 4]]);
  });

  it('resume rango temporal y cuántas fotos cambian de sitio', () => {
    const { sections } = buildOrderSections(
      [2, 1, 0],
      [{ title: 'Todo', indices: [0, 1, 2] }],
      photos,
    );
    expect(sections[0].from).toBe('2026-05-02T10:00:00.000Z');
    expect(sections[0].to).toBe('2026-05-02T10:02:00.000Z');
    // Ordenadas por captura quedan 0,1,2 — que es justo el orden actual.
    expect(sections[0].moved).toBe(0);
  });

  it('las posiciones son correlativas a través de todas las secciones', () => {
    const { sections } = buildOrderSections(
      [0, 1, 2, 3, 4, 5],
      [{ title: 'A', indices: [0, 1] }, { title: 'B', indices: [2, 3] }, { title: 'C', indices: [4, 5] }],
      photos,
    );
    expect(sections.flatMap(s => s.items.map(i => i.position))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('sin grupos, todo cae en una sección final que respeta la lista del agente', () => {
    // Sin secciones que contrastar, la lista plana es toda su respuesta.
    const { sections } = buildOrderSections([2, 0, 1], [], photos);
    expect(sections).toHaveLength(1);
    expect(sections[0].groupIndex).toBeNull();
    expect(sections[0].items.map(i => i.photo.index)).toEqual([2, 0, 1]);
  });

  it('un índice del orden que no existe entre las fotos se ignora sin romper', () => {
    const { sections } = buildOrderSections([0, 99, 1], [{ title: 'A', indices: [0, 1] }], photos);
    expect(sections[0].items.map(i => [i.photo.index, i.position])).toEqual([[0, 1], [1, 2]]);
  });
});
