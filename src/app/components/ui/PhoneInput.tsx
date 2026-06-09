import { ChevronDown } from 'lucide-react';

export const COUNTRY_CODES = [
  { code: '+57',   flag: '🇨🇴', short: 'Col' },
  { code: '+54',   flag: '🇦🇷', short: 'Arg' },
  { code: '+591',  flag: '🇧🇴', short: 'Bol' },
  { code: '+55',   flag: '🇧🇷', short: 'Bra' },
  { code: '+56',   flag: '🇨🇱', short: 'Chi' },
  { code: '+506',  flag: '🇨🇷', short: 'CRi' },
  { code: '+53',   flag: '🇨🇺', short: 'Cub' },
  { code: '+593',  flag: '🇪🇨', short: 'Ecu' },
  { code: '+503',  flag: '🇸🇻', short: 'Sal' },
  { code: '+34',   flag: '🇪🇸', short: 'Esp' },
  { code: '+33',   flag: '🇫🇷', short: 'Fra' },
  { code: '+502',  flag: '🇬🇹', short: 'Gua' },
  { code: '+504',  flag: '🇭🇳', short: 'Hon' },
  { code: '+39',   flag: '🇮🇹', short: 'Ita' },
  { code: '+52',   flag: '🇲🇽', short: 'Mex' },
  { code: '+505',  flag: '🇳🇮', short: 'Nic' },
  { code: '+507',  flag: '🇵🇦', short: 'Pan' },
  { code: '+595',  flag: '🇵🇾', short: 'Par' },
  { code: '+51',   flag: '🇵🇪', short: 'Per' },
  { code: '+351',  flag: '🇵🇹', short: 'Por' },
  { code: '+1-809',flag: '🇩🇴', short: 'RDo' },
  { code: '+44',   flag: '🇬🇧', short: 'GBR' },
  { code: '+598',  flag: '🇺🇾', short: 'Uru' },
  { code: '+1',    flag: '🇺🇸', short: 'USA' },
  { code: '+58',   flag: '🇻🇪', short: 'Ven' },
  { code: '+49',   flag: '🇩🇪', short: 'Ale' },
];

interface PhoneInputProps {
  phoneCode: string;
  phoneNumber: string;
  onPhoneCodeChange: (code: string) => void;
  onPhoneNumberChange: (num: string) => void;
  required?: boolean;
  label?: string;
  inputClassName?: string;
}

export function PhoneInput({
  phoneCode,
  phoneNumber,
  onPhoneCodeChange,
  onPhoneNumberChange,
  required = false,
  label = 'Teléfono',
  inputClassName = '',
}: PhoneInputProps) {
  const selected = COUNTRY_CODES.find((c) => c.code === phoneCode) ?? COUNTRY_CODES[0];

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}{required && ' *'}
        </label>
      )}
      <div className="flex gap-2">
        {/* Custom trigger visible to the user */}
        <div className="relative flex-shrink-0">
          <select
            value={phoneCode}
            onChange={(e) => onPhoneCodeChange(e.target.value)}
            className={`appearance-none pl-3 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none bg-white text-gray-800 text-sm opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10 ${inputClassName}`}
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.short} ({c.code})
              </option>
            ))}
          </select>
          {/* Visual display */}
          <div className={`flex items-center gap-1.5 pl-3 pr-8 py-3 border border-gray-300 rounded-lg bg-white text-sm text-gray-800 pointer-events-none select-none ${inputClassName}`}>
            <span className="font-medium">{selected.short}</span>
            <span className="text-gray-400">({selected.code})</span>
          </div>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none z-20" />
        </div>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => onPhoneNumberChange(e.target.value)}
          required={required}
          placeholder="Ej. 3001234567"
          className={`flex-1 min-w-0 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none ${inputClassName}`}
        />
      </div>
    </div>
  );
}
