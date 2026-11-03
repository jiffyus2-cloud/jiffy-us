import { describe, expect, it } from 'vitest';
import { buildExportPrefix, formatExportDate, getClientInitials } from './exportFileNames';

describe('getClientInitials', () => {
  it('toma 2 letras del nombre y 2 del apellido', () => {
    expect(getClientInitials('José Pérez')).toBe('JoPe');
  });

  it('usa la última palabra como apellido', () => {
    expect(getClientInitials('maría  josé ÁLVAREZ')).toBe('MaAl');
  });

  it('con una sola palabra usa solo el nombre', () => {
    expect(getClientInitials('Ñoño')).toBe('No');
  });

  it('sin nombre devuelve XX', () => {
    expect(getClientInitials(undefined)).toBe('XX');
    expect(getClientInitials('   ')).toBe('XX');
  });
});

describe('formatExportDate', () => {
  it('formatea AAAAMMDD en hora local', () => {
    expect(formatExportDate(new Date(2026, 10, 3, 15, 30).toISOString())).toBe('20261103');
  });

  it('fecha inválida o ausente', () => {
    expect(formatExportDate(undefined)).toBe('sinfecha');
    expect(formatExportDate('no-es-fecha')).toBe('sinfecha');
  });
});

describe('buildExportPrefix', () => {
  it('une iniciales, tipo y fecha con _', () => {
    const iso = new Date(2026, 0, 9).toISOString();
    expect(buildExportPrefix({ clientName: 'Ana Gómez', productCode: 'ALB', lastEditedAt: iso })).toBe('AnGo_ALB_20260109');
    expect(buildExportPrefix({ clientName: 'Ana Gómez', productCode: 'YC', lastEditedAt: iso })).toBe('AnGo_YC_20260109');
  });
});
