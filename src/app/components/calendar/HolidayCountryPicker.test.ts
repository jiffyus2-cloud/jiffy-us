import { describe, expect, it } from 'vitest';
import { scoreCountry } from './HolidayCountryPicker';

describe('scoreCountry', () => {
  it('encuentra el país escribiendo más de una letra', () => {
    expect(scoreCountry('Colombia', 'CO', 'colom')).toBeGreaterThan(0);
    expect(scoreCountry('Colombia', 'CO', 'colombia')).toBeGreaterThan(0);
    expect(scoreCountry('Canadá', 'CA', 'colom')).toBe(0);
  });

  it('ignora tildes y mayúsculas', () => {
    expect(scoreCountry('México', 'MX', 'mexico')).toBeGreaterThan(0);
    expect(scoreCountry('Perú', 'PE', 'PERU')).toBeGreaterThan(0);
  });

  it('busca en medio del nombre y por código', () => {
    expect(scoreCountry('Estados Unidos', 'US', 'unidos')).toBeGreaterThan(0);
    expect(scoreCountry('Estados Unidos', 'US', 'us')).toBeGreaterThan(0);
    expect(scoreCountry('Reino Unido', 'GB', 'nido')).toBeGreaterThan(0);
  });

  it('pone primero lo que empieza igual', () => {
    expect(scoreCountry('Chile', 'CL', 'chi')).toBeGreaterThan(scoreCountry('Bélgica', 'BE', 'gi'));
    expect(scoreCountry('España', 'ES', 'es')).toBeGreaterThan(scoreCountry('Estados Unidos', 'US', 'unid'));
  });

  it('sin texto muestra todos', () => {
    expect(scoreCountry('Alemania', 'DE', '')).toBe(1);
  });
});
