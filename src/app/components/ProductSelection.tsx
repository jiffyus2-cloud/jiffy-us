import albumImage from '@/assets/c5681b257e0dede5d7d87776730ada678398ff51.png';
import calendarImage from '@/assets/ec28dc812bed68927d47becc060a8091e563d836.png';
import mugImage from '@/assets/eb118a5bec949d55aceb42319ab38162a57c22ff.png';

export type ProductType = 'album' | 'calendar' | 'mug';

interface ProductSelectionProps {
  selectedProduct: ProductType | null;
  onSelectProduct: (product: ProductType) => void;
}

export default function ProductSelection({ selectedProduct, onSelectProduct }: ProductSelectionProps) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl mb-4">Choose Your Product</h2>
        <p className="text-gray-600 text-lg">
          Select the type of product you want to create
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Photo Album Option */}
        <button
          onClick={() => onSelectProduct('album')}
          className={`group relative rounded-lg border-2 transition-all text-left overflow-hidden ${
            selectedProduct === 'album'
              ? 'border-black bg-black text-white'
              : 'border-gray-300 bg-white hover:border-black hover:shadow-lg'
          }`}
        >
          {/* Album Image */}
          <div className="w-full h-64">
            <img 
              src={albumImage} 
              alt="Photo Albums" 
              className="w-full h-full object-fill"
            />
          </div>

          <div className="p-8">
            <h3 className="text-2xl mb-3">Photo Album</h3>
            <p className={`text-base mb-6 ${
              selectedProduct === 'album' ? 'text-gray-200' : 'text-gray-600'
            }`}>
              Create a beautiful, professionally printed photo album with customizable covers, layouts, and premium paper quality.
            </p>
            
            <ul className={`space-y-2 text-sm ${
              selectedProduct === 'album' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Premium cover options (Linen, Leather, Wood)</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Multiple size options available</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Up to 40 pages with customizable layouts</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>High-quality paper types</span>
              </li>
            </ul>
          </div>

          {selectedProduct === 'album' && (
            <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-black rounded-full" />
            </div>
          )}
        </button>

        {/* Photo Calendar Option */}
        <button
          onClick={() => onSelectProduct('calendar')}
          className={`group relative rounded-lg border-2 transition-all text-left overflow-hidden ${
            selectedProduct === 'calendar'
              ? 'border-black bg-black text-white'
              : 'border-gray-300 bg-white hover:border-black hover:shadow-lg'
          }`}
        >
          {/* Calendar Image */}
          <div className="w-full h-64">
            <img 
              src={calendarImage} 
              alt="Photo Calendars" 
              className="w-full h-full object-fill"
            />
          </div>

          <div className="p-8">
            <h3 className="text-2xl mb-3">Photo Calendar</h3>
            <p className={`text-base mb-6 ${
              selectedProduct === 'calendar' ? 'text-gray-200' : 'text-gray-600'
            }`}>
              Design a personalized wall calendar featuring your favorite photos for each month of the year.
            </p>
            
            <ul className={`space-y-2 text-sm ${
              selectedProduct === 'calendar' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>12 months with custom photos</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Multiple calendar sizes</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Starts from any month you choose</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>High-quality glossy or matte finish</span>
              </li>
            </ul>
          </div>

          {selectedProduct === 'calendar' && (
            <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-black rounded-full" />
            </div>
          )}
        </button>

        {/* Mug Option */}
        <button
          onClick={() => onSelectProduct('mug')}
          className={`group relative rounded-lg border-2 transition-all text-left overflow-hidden ${
            selectedProduct === 'mug'
              ? 'border-black bg-black text-white'
              : 'border-gray-300 bg-white hover:border-black hover:shadow-lg'
          }`}
        >
          {/* Mug Image */}
          <div className="w-full h-64">
            <img 
              src={mugImage} 
              alt="Photo Mugs" 
              className="w-full h-full object-fill"
            />
          </div>

          <div className="p-8">
            <h3 className="text-2xl mb-3">Photo Mug</h3>
            <p className={`text-base mb-6 ${
              selectedProduct === 'mug' ? 'text-gray-200' : 'text-gray-600'
            }`}>
              Create a unique photo mug with your favorite image, perfect for coffee or tea.
            </p>
            
            <ul className={`space-y-2 text-sm ${
              selectedProduct === 'mug' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Custom photo design</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Available in multiple colors</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>High-quality ceramic material</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Perfect for coffee or tea</span>
              </li>
            </ul>
          </div>

          {selectedProduct === 'mug' && (
            <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-black rounded-full" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}