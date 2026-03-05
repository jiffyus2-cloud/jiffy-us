import { useState } from 'react';
import { Calendar } from '../types/products';

export interface CalendarCustomizationOptions {
  size: string;
  paperType: string;
  year: number;
}

interface CalendarCustomizationProps {
  calendar: Calendar;
  onCustomizationComplete: (options: CalendarCustomizationOptions) => void;
}

export default function CalendarCustomization({ calendar, onCustomizationComplete }: CalendarCustomizationProps) {
  const [size, setSize] = useState('8x10');
  const [paperType] = useState('Opalina'); // Fixed option
  const [year, setYear] = useState(2026);

  const sizes = [
    { id: '8x10', name: '8" x 10"', description: 'Standard size' },
    { id: '11x14', name: '11" x 14"', description: 'Large' },
    { id: '12x12', name: '12" x 12"', description: 'Square' },
  ];

  // Generate years from 2026 to 2041
  const years = Array.from({ length: 16 }, (_, i) => 2026 + i);

  const handleContinue = () => {
    onCustomizationComplete({
      size,
      paperType,
      year,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h2 className="text-3xl mb-2">Customize Your Calendar</h2>
        <p className="text-gray-600">
          {calendar.name} - Adjust options to your preferences
        </p>
      </div>

      <div className="space-y-8">
        {/* Size Selection */}
        <div>
          <h3 className="text-xl mb-4">Size</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sizes.map((sizeOption) => (
              <button
                key={sizeOption.id}
                onClick={() => setSize(sizeOption.id)}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  size === sizeOption.id
                    ? 'border-black bg-gray-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="text-lg mb-1">{sizeOption.name}</div>
                <div className="text-sm text-gray-600">{sizeOption.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Paper Type - Fixed */}
        <div>
          <h3 className="text-xl mb-4">Paper Type</h3>
          <div className="p-6 rounded-lg border-2 border-gray-300 bg-gray-50">
            <div className="text-lg">{paperType}</div>
            <div className="text-sm text-gray-600 mt-1">Premium high-quality paper</div>
          </div>
        </div>

        {/* Year Selection */}
        <div>
          <h3 className="text-xl mb-4">Year</h3>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg focus:outline-none focus:border-black"
          >
            {years.map((yearOption) => (
              <option key={yearOption} value={yearOption}>
                {yearOption}
              </option>
            ))}
          </select>
        </div>

        {/* Preview Summary */}
        <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
          <h4 className="text-lg mb-4">Customization Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span>{calendar.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Size:</span>
              <span>{sizes.find(s => s.id === size)?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Paper:</span>
              <span>{paperType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Year:</span>
              <span>{year}</span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
              <span className="text-gray-600">Price:</span>
              <span className="text-lg">${calendar.price.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={handleContinue}
          className="w-full py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-lg"
        >
          Continue to Add Photos
        </button>
      </div>
    </div>
  );
}