import { describe, expect, it } from 'vitest';
import { moveCalendarMonth, swapCalendarMonths, type CalendarPhotoState } from './calendarReorder';

const state = (photos: string[], crops: CalendarPhotoState['crops'] = {}): CalendarPhotoState => ({
  photos, crops, signatures: photos.map(p => (p ? `sig-${p}` : '')),
});

describe('swapCalendarMonths', () => {
  it('intercambia dos meses con su recorte y firma', () => {
    const s = state(['a', 'b', 'c', 'd'], { 0: { x: 10, y: 20, zoom: 2 } });
    const r = swapCalendarMonths(s, 0, 2, 4, 1);
    expect(r.photos).toEqual(['c', 'b', 'a', 'd']);
    expect(r.signatures).toEqual(['sig-c', 'sig-b', 'sig-a', 'sig-d']);
    expect(r.crops).toEqual({ 2: { x: 10, y: 20, zoom: 2 } });
  });

  it('con 4 fotos por mes mueve el bloque completo', () => {
    const s = state(['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3', 'b4'], { 5: { x: 1, y: 1, zoom: 1 } });
    const r = swapCalendarMonths(s, 0, 1, 2, 4);
    expect(r.photos).toEqual(['b1', 'b2', 'b3', 'b4', 'a1', 'a2', 'a3', 'a4']);
    expect(r.crops).toEqual({ 1: { x: 1, y: 1, zoom: 1 } });
  });

  it('respeta meses vacíos y arreglos incompletos', () => {
    const r = swapCalendarMonths(state(['a']), 0, 2, 3, 1);
    expect(r.photos).toEqual(['', '', 'a']);
    expect(r.signatures).toEqual(['', '', 'sig-a']);
  });
});

describe('moveCalendarMonth', () => {
  it('inserta un mes en otra posición desplazando los demás', () => {
    const s = state(['a', 'b', 'c', 'd'], { 0: { x: 5, y: 5, zoom: 1.5 } });
    const r = moveCalendarMonth(s, 0, 2, 4, 1);
    expect(r.photos).toEqual(['b', 'c', 'a', 'd']);
    expect(r.crops).toEqual({ 2: { x: 5, y: 5, zoom: 1.5 } });
    expect(moveCalendarMonth(s, 3, 0, 4, 1).photos).toEqual(['d', 'a', 'b', 'c']);
  });

  it('mover al mismo lugar no cambia nada', () => {
    const s = state(['a', 'b']);
    expect(moveCalendarMonth(s, 1, 1, 2, 1)).toBe(s);
  });
});
