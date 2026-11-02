import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOLIDAY_COUNTRY, NO_HOLIDAYS, getHolidayCountries, getHolidayCountryName, getHolidaysForCountry,
} from './holidays';

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('getHolidaysForCountry', () => {
  it('Colombia (por defecto) da los 18 festivos oficiales de 2027', async () => {
    const dates = (await getHolidaysForCountry(undefined, [2027])).map(h => ymd(h.date)).sort();
    expect(dates).toEqual([
      '2027-01-01', '2027-01-11', '2027-03-22', '2027-03-25', '2027-03-26', '2027-05-01',
      '2027-05-10', '2027-05-31', '2027-06-07', '2027-07-05', '2027-07-20', '2027-08-07',
      '2027-08-16', '2027-10-18', '2027-11-01', '2027-11-15', '2027-12-08', '2027-12-25',
    ]);
    expect(await getHolidaysForCountry(DEFAULT_HOLIDAY_COUNTRY, [2027])).toHaveLength(18);
  });

  it('otro país usa sus festivos oficiales, en fecha local y con nombre en español', async () => {
    const mx = await getHolidaysForCountry('MX', [2027]);
    const independence = mx.find(h => ymd(h.date) === '2027-09-16');
    expect(independence?.name).toMatch(/Independencia/);
    expect(mx.some(h => ymd(h.date) === '2027-01-11')).toBe(false); // Reyes es solo de Colombia
  });

  it('cubre varios años (calendarios que no empiezan en enero) sin duplicar días', async () => {
    const es = await getHolidaysForCountry('ES', [2027, 2028]);
    const days = es.map(h => ymd(h.date));
    expect(days).toContain('2027-10-12');
    expect(days).toContain('2028-01-01');
    expect(new Set(days).size).toBe(days.length);
  });

  it('"Sin festivos" no marca ninguno', async () => {
    expect(await getHolidaysForCountry(NO_HOLIDAYS, [2027])).toEqual([]);
  });

  it('un país desconocido vuelve a Colombia en vez de imprimir sin festivos', async () => {
    expect(await getHolidaysForCountry('XX', [2027])).toHaveLength(18);
  });
});

describe('getHolidayCountries', () => {
  it('lista los países en español, ordenados, con Colombia incluida', async () => {
    const list = await getHolidayCountries();
    expect(list.length).toBeGreaterThan(100);
    expect(list.find(c => c.code === 'CO')?.name).toBe('Colombia');
    expect(list.find(c => c.code === 'DE')?.name).toBe('Alemania');
    const names = list.map(c => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('nombre de "Sin festivos"', () => {
    expect(getHolidayCountryName(NO_HOLIDAYS)).toBe('Sin festivos');
  });
});
