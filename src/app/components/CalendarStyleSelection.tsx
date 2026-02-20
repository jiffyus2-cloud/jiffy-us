import { Check } from 'lucide-react';

export interface Calendar {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  type: 'desk' | 'wall-notes' | 'wall-no-notes';
}

interface CalendarStyleSelectionProps {
  selectedCalendar: Calendar | null;
  onSelectCalendar: (calendar: Calendar) => void;
}

export default function CalendarStyleSelection({ selectedCalendar, onSelectCalendar }: CalendarStyleSelectionProps) {
  const calendars: Calendar[] = [
    {
      id: 'desk',
      name: 'Desk Calendar',
      description: 'Perfect for your workspace',
      price: 24.99,
      image: 'https://images.unsplash.com/photo-1611532736570-5e53e18baa6f?w=800&h=1000&fit=crop',
      type: 'desk',
    },
    {
      id: 'wall-notes',
      name: 'Wall Calendar with Notes',
      description: 'Extra space for your reminders',
      price: 29.99,
      image: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=800&h=1000&fit=crop',
      type: 'wall-notes',
    },
    {
      id: 'wall-no-notes',
      name: 'Wall Calendar without Notes',
      description: 'Clean and elegant design',
      price: 27.99,
      image: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=1000&fit=crop',
      type: 'wall-no-notes',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h2 className="text-3xl mb-2">Choose Your Calendar Style</h2>
        <p className="text-gray-600">
          Select the calendar type that best fits your needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {calendars.map((calendar) => (
          <button
            key={calendar.id}
            onClick={() => onSelectCalendar(calendar)}
            className={`group relative rounded-lg overflow-hidden border-4 transition-all hover:shadow-xl ${
              selectedCalendar?.id === calendar.id
                ? 'border-black shadow-xl'
                : 'border-transparent hover:border-gray-300'
            }`}
          >
            {/* Selected indicator */}
            {selectedCalendar?.id === calendar.id && (
              <div className="absolute top-4 right-4 z-10 bg-black text-white rounded-full p-2">
                <Check className="w-5 h-5" />
              </div>
            )}

            {/* Image */}
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src={calendar.image}
                alt={calendar.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Info */}
            <div className="p-6 bg-white text-left">
              <h3 className="text-xl mb-2">{calendar.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{calendar.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl">${calendar.price.toFixed(2)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}