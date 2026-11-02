import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../ui/command';
import { NO_HOLIDAYS, getHolidayCountryName, type HolidayCountry } from '../../utils/holidays';

/** Minúsculas y sin tildes: "México" → "mexico". */
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Puntuación de un país para lo que se escribe en el buscador (0 = no aparece).
 * Busca en cualquier parte del nombre, sin importar tildes ni mayúsculas, y
 * también por código ISO ("us", "co"). Primero lo que empieza igual.
 */
export const scoreCountry = (name: string, code: string, query: string): number => {
  const q = normalize(query);
  if (!q) return 1;
  const n = normalize(name);
  if (n.startsWith(q)) return 1;
  if (code.toLowerCase() === q) return 0.9;
  if (n.split(/[\s-]+/).some(word => word.startsWith(q))) return 0.8;
  if (n.includes(q)) return 0.5;
  return 0;
};

interface HolidayCountryPickerProps {
  value: string;
  countries: HolidayCountry[];
  onChange: (code: string) => void;
}

/** Selector de país con búsqueda para los festivos del calendario. */
export default function HolidayCountryPicker({ value, countries, onChange }: HolidayCountryPickerProps) {
  const [open, setOpen] = useState(false);
  const options = [...countries, { code: NO_HOLIDAYS, name: getHolidayCountryName(NO_HOLIDAYS) }];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="w-full p-3 border-2 border-gray-200 hover:border-black focus:border-black rounded-lg text-base font-medium bg-white focus:outline-none flex items-center justify-between gap-2 text-left"
        >
          <span className="truncate">{getHolidayCountryName(value)}</span>
          <ChevronsUpDown className="w-4 h-4 shrink-0 text-gray-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] bg-white" align="start">
        <Command
          filter={(code, search, keywords) => scoreCountry(keywords?.[0] ?? code, code, search)}
        >
          <CommandInput placeholder="Busca un país…" />
          <CommandList className="max-h-72">
            <CommandEmpty>No encontramos ese país.</CommandEmpty>
            {options.map(c => (
              <CommandItem
                key={c.code}
                value={c.code}
                keywords={[c.name]}
                onSelect={() => { onChange(c.code); setOpen(false); }}
                className="cursor-pointer"
              >
                <Check className={`w-4 h-4 ${value === c.code ? 'opacity-100' : 'opacity-0'}`} />
                {c.name}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
