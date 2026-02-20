import { useState, useRef, useEffect } from 'react';
import { Upload, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import type { Calendar } from './CalendarStyleSelection';

interface CalendarOrganizerProps {
  calendar: Calendar;
  year: number;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarOrganizer({ calendar, year, photos, onPhotosChange }: CalendarOrganizerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentMonth, setCurrentMonth] = useState(0);

  // Initialize with 12 empty slots if needed
  useEffect(() => {
    if (photos.length === 0) {
      onPhotosChange(Array(12).fill(''));
    }
  }, [photos.length, onPhotosChange]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, monthIndex: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        const newPhotos = [...photos];
        newPhotos[monthIndex] = result;
        onPhotosChange(newPhotos);
      }
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (monthIndex: number) => {
    const newPhotos = [...photos];
    newPhotos[monthIndex] = '';
    onPhotosChange(newPhotos);
  };

  // Generate calendar grid for a given month
  const generateCalendarGrid = (monthIndex: number) => {
    const date = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDayOfWeek = date.getDay(); // 0 = Sunday

    const days = [];
    // Add empty cells for days before the 1st
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const totalPhotos = photos.filter(p => p !== '').length;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl mb-2">Organize Your Photos</h2>
            <p className="text-gray-600">
              {calendar.name} - {totalPhotos} of 12 photos added
            </p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Calendar Progress</span>
            <span className="text-sm">{Math.round((totalPhotos / 12) * 100)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-300 ease-out"
              style={{ width: `${(totalPhotos / 12) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main calendar view */}
        <div className="lg:col-span-2">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl">{MONTHS[currentMonth]} {year}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentMonth(Math.max(0, currentMonth - 1))}
                  disabled={currentMonth === 0}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentMonth(Math.min(11, currentMonth + 1))}
                  disabled={currentMonth >= 11}
                  className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo area */}
            <div className="mb-6">
              <div className="aspect-[4/3] border-2 border-dashed border-gray-300 rounded-lg overflow-hidden relative bg-gray-50">
                {photos[currentMonth] ? (
                  <>
                    <img
                      src={photos[currentMonth]}
                      alt={`Photo for ${MONTHS[currentMonth]}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removePhoto(currentMonth)}
                      className="absolute top-4 right-4 bg-black text-white rounded-full p-2 hover:bg-gray-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const file = e.target?.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            if (result) {
                              const newPhotos = [...photos];
                              newPhotos[currentMonth] = result;
                              onPhotosChange(newPhotos);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="w-full h-full flex flex-col items-center justify-center gap-4 hover:bg-gray-100 transition-colors"
                  >
                    <Upload className="w-16 h-16 text-gray-400" />
                    <div className="text-center">
                      <p className="text-lg mb-1">Add photo for {MONTHS[currentMonth]}</p>
                      <p className="text-sm text-gray-500">Click to upload an image</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Calendar grid */}
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <h4 className="text-sm text-gray-600 mb-3">Calendar preview</h4>
              <div className="grid grid-cols-7 gap-1">
                {/* Week day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs text-gray-600 py-1">
                    {day}
                  </div>
                ))}
                
                {/* Calendar days */}
                {generateCalendarGrid(currentMonth).map((day, index) => (
                  <div
                    key={index}
                    className={`aspect-square flex items-center justify-center text-sm rounded ${
                      day
                        ? 'bg-white border border-gray-200 hover:bg-gray-50'
                        : 'bg-transparent'
                    }`}
                  >
                    {day || ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Month thumbnails sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg mb-4">All Months</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {MONTHS.map((month, index) => (
                <button
                  key={month}
                  onClick={() => setCurrentMonth(index)}
                  className={`w-full p-3 rounded border-2 transition-all text-left ${
                    currentMonth === index
                      ? 'border-black bg-white'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{month}</span>
                    {photos[index] && (
                      <span className="text-xs text-green-600">✓</span>
                    )}
                  </div>
                  <div className="aspect-video bg-gray-200 rounded overflow-hidden">
                    {photos[index] ? (
                      <img
                        src={photos[index]}
                        alt={month}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}