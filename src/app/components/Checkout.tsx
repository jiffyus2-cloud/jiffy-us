import { useState } from 'react';
import { CreditCard, Lock } from 'lucide-react';
import type { Album } from './AlbumSelection';
import type { Calendar } from './CalendarStyleSelection';
import type { MugProduct } from './MugStyleSelection';

interface CheckoutProps {
  product: Album | Calendar | MugProduct;
  productType: 'album' | 'calendar' | 'mug';
  photoCount?: number;
  textBoxCount?: number;
  totalPages?: number;
  itemCount?: number;
  customizationDetails?: any;
  onComplete: () => void;
}

export default function Checkout({ product, productType, photoCount, textBoxCount, totalPages, itemCount, customizationDetails, onComplete }: CheckoutProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    zipCode: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate payment processing
    setTimeout(() => {
      alert('Order placed successfully! 🎉');
      onComplete();
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const calculateTotal = () => {
    let basePrice = 0;
    
    if (productType === 'mug' && itemCount && 'basePrice' in product) {
      // Calculate price based on quantity and material
      const materialPrice = customizationDetails?.material === 'vacuum-insulated' ? 5 :
                           customizationDetails?.material === 'porcelain' ? 3 :
                           customizationDetails?.material === 'stainless-steel' ? 4 : 0;
      basePrice = (product.basePrice + materialPrice) * itemCount;
    } else {
      basePrice = product.price || ('basePrice' in product ? product.basePrice : 0);
    }
    
    return basePrice;
  };

  const subtotal = calculateTotal();
  const shipping = 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-3xl mb-8">Checkout</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Summary - Appears first on mobile, last on desktop */}
        <div className="lg:col-span-1 lg:order-2">
          <div className="bg-gray-50 rounded-lg p-6 lg:sticky lg:top-4">
            <h3 className="text-xl mb-6">Order Summary</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Product</span>
                <span>{product.name}</span>
              </div>
              {productType === 'album' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Pages</span>
                    <span>{totalPages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Photos</span>
                    <span>{photoCount}</span>
                  </div>
                  {textBoxCount && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Text Boxes</span>
                      <span>{textBoxCount}</span>
                    </div>
                  )}
                </>
              )}
              {productType === 'calendar' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Photos</span>
                    <span>{photoCount}</span>
                  </div>
                </>
              )}
              {productType === 'mug' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Photos</span>
                    <span>{photoCount}</span>
                  </div>
                  {itemCount && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items</span>
                      <span>{itemCount}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-gray-300 pt-4 space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t-2 border-gray-300 mt-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg">Total</span>
                <span className="text-2xl">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Product preview */}
            <div className="mt-6 pt-6 border-t border-gray-300">
              <p className="text-sm text-gray-600 mb-3">Product Preview</p>
              <div className="aspect-[3/4] rounded overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Checkout form - Appears second on mobile, first on desktop */}
        <div className="lg:col-span-2 lg:order-1">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Contact Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl mb-4">Shipping Address</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="address" className="block text-sm mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label htmlFor="zipCode" className="block text-sm mb-2">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      required
                      value={formData.zipCode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5" />
                <h3 className="text-xl">Payment Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="cardNumber" className="block text-sm mb-2">
                    Card Number *
                  </label>
                  <input
                    type="text"
                    id="cardNumber"
                    name="cardNumber"
                    required
                    placeholder="1234 5678 9012 3456"
                    value={formData.cardNumber}
                    onChange={handleChange}
                    maxLength={19}
                    className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiry" className="block text-sm mb-2">
                      Expiry Date *
                    </label>
                    <input
                      type="text"
                      id="expiry"
                      name="expiry"
                      required
                      placeholder="MM/YY"
                      value={formData.expiry}
                      onChange={handleChange}
                      maxLength={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label htmlFor="cvv" className="block text-sm mb-2">
                      CVV *
                    </label>
                    <input
                      type="text"
                      id="cvv"
                      name="cvv"
                      required
                      placeholder="123"
                      value={formData.cvv}
                      onChange={handleChange}
                      maxLength={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <Lock className="w-4 h-4" />
                <span>Your payment information is secure and encrypted</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-4 rounded-lg hover:bg-gray-800 transition-colors text-lg"
            >
              Place Order - ${total.toFixed(2)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}