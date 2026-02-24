import albumImage from '../../assets/c5681b257e0dede5d7d87776730ada678398ff51.png';
import calendarImage from '../../assets/ec28dc812bed68927d47becc060a8091e563d836.png';
import mugImage from '../../assets/eb118a5bec949d55aceb42319ab38162a57c22ff.png';
import { DESIGN } from '../../styles/design-system';

export type ProductType = 'album' | 'calendar' | 'mug';

interface ProductSelectionProps {
  selectedProduct: ProductType | null;
  onSelectProduct: (product: ProductType) => void;
  onContinue?: () => void;
}

export default function ProductSelection({ selectedProduct, onSelectProduct, onContinue }: ProductSelectionProps) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl mb-4 font-medium">Choose Your Product</h2>
        <p className={DESIGN.text.body}>
          Select the type of product you want to create
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Photo Album Option */}
        <button
          onClick={() => onSelectProduct('album')}
          className={`${DESIGN.card.border} ${
            selectedProduct === 'album' ? DESIGN.card.selected : DESIGN.card.unselected
          }`}
        >
          {/* Album Image */}
          <div className="w-full h-64 overflow-hidden">
            <img 
              src={albumImage} 
              alt="Photo Albums" 
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="p-8">
            <h3 className={DESIGN.text.h4}>Photo Album</h3>
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
          className={`${DESIGN.card.border} ${
            selectedProduct === 'calendar' ? DESIGN.card.selected : DESIGN.card.unselected
          }`}
        >
          {/* Calendar Image */}
          <div className="w-full h-64 overflow-hidden">
            <img 
              src={calendarImage} 
              alt="Photo Calendars" 
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="p-8">
            <h3 className={DESIGN.text.h4}>Photo Calendar</h3>
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
          className={`${DESIGN.card.border} ${
            selectedProduct === 'mug' ? DESIGN.card.selected : DESIGN.card.unselected
          }`}
        >
          {/* Mug Image */}
          <div className="w-full h-64 overflow-hidden">
            <img 
              src={mugImage} 
              alt="Photo Mugs" 
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="p-8">
            <h3 className={DESIGN.text.h4}>Photo Mug</h3>
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

      {/* Continue Button */}
      <div className="max-w-6xl mx-auto mt-12">
        <button
          onClick={onContinue}
          disabled={!selectedProduct}
          className={`${DESIGN.button.base} ${DESIGN.button.primary} w-full text-lg disabled:bg-gray-300 disabled:cursor-not-allowed`}
        >
          Continue to Style Selection
        </button>
      </div>
    </div>
  );
}