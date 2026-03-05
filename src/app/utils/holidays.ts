/**
 * Utility to calculate Colombian holidays
 */

export interface Holiday {
  date: Date;
  name: string;
}

function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getNextMonday(date: Date): Date {
  const day = date.getDay();
  if (day === 1) return date; // Already Monday
  const diff = day === 0 ? 1 : 8 - day;
  const result = new Date(date);
  result.setDate(date.getDate() + diff);
  return result;
}

export function getColombianHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [];

  // Fixed Dates
  holidays.push({ date: new Date(year, 0, 1), name: "Año Nuevo" });
  holidays.push({ date: new Date(year, 4, 1), name: "Día del Trabajo" });
  holidays.push({ date: new Date(year, 6, 20), name: "Grito de Independencia" });
  holidays.push({ date: new Date(year, 7, 7), name: "Batalla de Boyacá" });
  holidays.push({ date: new Date(year, 11, 8), name: "Inmaculada Concepción" });
  holidays.push({ date: new Date(year, 11, 25), name: "Navidad" });

  // Emiliani Law (Moved to next Monday)
  holidays.push({ date: getNextMonday(new Date(year, 0, 6)), name: "Reyes Magos" });
  holidays.push({ date: getNextMonday(new Date(year, 2, 19)), name: "San José" });
  holidays.push({ date: getNextMonday(new Date(year, 5, 29)), name: "San Pedro y San Pablo" });
  holidays.push({ date: getNextMonday(new Date(year, 7, 15)), name: "Asunción de la Virgen" });
  holidays.push({ date: getNextMonday(new Date(year, 9, 12)), name: "Día de la Raza" });
  holidays.push({ date: getNextMonday(new Date(year, 10, 1)), name: "Todos los Santos" });
  holidays.push({ date: getNextMonday(new Date(year, 10, 11)), name: "Independencia de Cartagena" });

  // Easter-dependent
  const easter = getEaster(year);

  // Jueves Santo (Easter - 3)
  const juevesSanto = new Date(easter);
  juevesSanto.setDate(easter.getDate() - 3);
  holidays.push({ date: juevesSanto, name: "Jueves Santo" });

  // Viernes Santo (Easter - 2)
  const viernesSanto = new Date(easter);
  viernesSanto.setDate(easter.getDate() - 2);
  holidays.push({ date: viernesSanto, name: "Viernes Santo" });

  // Ascension (Easter + 39 days + move to Monday)
  // Actually it's 40 days after Easter (Thursday), then moved to Monday (43 days after Easter)
  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 43);
  holidays.push({ date: ascension, name: "Ascensión del Señor" });

  // Corpus Christi (Easter + 60 days + move to Monday)
  // Actually it's 60 days after Easter (Thursday), then moved to Monday (64 days after Easter)
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 64);
  holidays.push({ date: corpusChristi, name: "Corpus Christi" });

  // Sagrado Corazón (Easter + 68 days + move to Monday)
  // Actually it's 68 days after Easter (Friday), then moved to Monday (71 days after Easter)
  const sagradoCorazon = new Date(easter);
  sagradoCorazon.setDate(easter.getDate() + 71);
  holidays.push({ date: sagradoCorazon, name: "Sagrado Corazón" });

  return holidays;
}

export function isHoliday(date: Date, holidays: Holiday[]): Holiday | undefined {
  return holidays.find(h => 
    h.date.getDate() === date.getDate() && 
    h.date.getMonth() === date.getMonth() && 
    h.date.getFullYear() === date.getFullYear()
  );
}
