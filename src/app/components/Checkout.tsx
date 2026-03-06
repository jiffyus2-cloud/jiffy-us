import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CreditCard, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { saveCompleteOrder } from '../../services/orderService';
import { useAuth } from '../../hooks/useAuth';

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // designData includes customization, coverData, photos, pageLayouts, textBoxSlots, photoCrops
  const designData = state?.designData;
  const product = state?.product;

  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    address: '',
    city: '',
    zipCode: '',
    // Billing (default same as shipping)
    billingName: '',
    billingAddress: '',
    billingCity: '',
    billingZipCode: '',
    sameAsShipping: true,
    // Payment
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  if (!designData || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="text-2xl mb-4">No order data found</h2>
        <button 
          onClick={() => navigate('/')}
          className="bg-black text-white px-6 py-2 rounded"
        >
          Go to Home
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to complete your order.');
      return;
    }

    setIsProcessing(true);

    try {
      const orderDetails = {
        shippingAddress: {
          name: formData.name,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
        },
        billingAddress: formData.sameAsShipping ? {
          name: formData.name,
          email: formData.email,
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
        } : {
          name: formData.billingName,
          email: formData.email,
          address: formData.billingAddress,
          city: formData.billingCity,
          zipCode: formData.billingZipCode,
        }
      };

      await saveCompleteOrder(user.uid, designData, orderDetails);
      navigate('/success');
    } catch (error) {
      console.error('Error saving order:', error);
      alert('There was an error processing your order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const calculateTotal = () => {
    const basePrice = (product as any).price || (product as any).basePrice || 0;
    return basePrice;
  };

  const subtotal = calculateTotal();
  const shipping = 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/create', { state })}
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-black"
          title="Volver a la edición"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Volver a la edición</span>
        </button>
      </div>

      <h2 className="text-3xl font-bold mb-8">Checkout</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Summary */}
        <div className="lg:col-span-1 lg:order-2">
          <div className="bg-gray-50 rounded-lg p-6 lg:sticky lg:top-4">
            <h3 className="text-xl mb-6">Order Summary</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Product</span>
                <span>{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Size</span>
                <span>{designData.customization?.size}</span>
              </div>
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

            <div className="mt-6 pt-6 border-t border-gray-300">
              <p className="text-sm text-gray-600 mb-3">Cover Preview</p>
              <div className="aspect-[3/4] rounded overflow-hidden bg-gray-200">
                {designData.coverData.image && (
                  <img
                    src={designData.coverData.image}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <p className="text-center mt-2 text-sm font-medium">{designData.coverData.title}</p>
            </div>
          </div>
        </div>

        {/* Checkout form */}
        <div className="lg:col-span-2 lg:order-1">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Contact Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm mb-2">Full Name *</label>
                  <input
                    type="text" id="name" name="name" required
                    value={formData.name} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm mb-2">Email *</label>
                  <input
                    type="email" id="email" name="email" required
                    value={formData.email} onChange={handleChange}
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
                  <label htmlFor="address" className="block text-sm mb-2">Street Address *</label>
                  <input
                    type="text" id="address" name="address" required
                    value={formData.address} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm mb-2">City *</label>
                    <input
                      type="text" id="city" name="city" required
                      value={formData.city} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label htmlFor="zipCode" className="block text-sm mb-2">ZIP Code *</label>
                    <input
                      type="text" id="zipCode" name="zipCode" required
                      value={formData.zipCode} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl mb-4">Billing Address</h3>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox" id="sameAsShipping" name="sameAsShipping"
                  checked={formData.sameAsShipping} onChange={handleChange}
                  className="w-4 h-4"
                />
                <label htmlFor="sameAsShipping" className="text-sm">Same as shipping address</label>
              </div>
              
              {!formData.sameAsShipping && (
                <div className="space-y-4 mt-4">
                  <div>
                    <label htmlFor="billingName" className="block text-sm mb-2">Full Name *</label>
                    <input
                      type="text" id="billingName" name="billingName" required
                      value={formData.billingName} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label htmlFor="billingAddress" className="block text-sm mb-2">Street Address *</label>
                    <input
                      type="text" id="billingAddress" name="billingAddress" required
                      value={formData.billingAddress} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="billingCity" className="block text-sm mb-2">City *</label>
                      <input
                        type="text" id="billingCity" name="billingCity" required
                        value={formData.billingCity} onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label htmlFor="billingZipCode" className="block text-sm mb-2">ZIP Code *</label>
                      <input
                        type="text" id="billingZipCode" name="billingZipCode" required
                        value={formData.billingZipCode} onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5" />
                <h3 className="text-xl">Payment Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="cardNumber" className="block text-sm mb-2">Card Number *</label>
                  <input
                    type="text" id="cardNumber" name="cardNumber" required
                    placeholder="1234 5678 9012 3456"
                    value={formData.cardNumber} onChange={handleChange}
                    maxLength={19}
                    className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiry" className="block text-sm mb-2">Expiry Date *</label>
                    <input
                      type="text" id="expiry" name="expiry" required
                      placeholder="MM/YY"
                      value={formData.expiry} onChange={handleChange}
                      maxLength={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div>
                    <label htmlFor="cvv" className="block text-sm mb-2">CVV *</label>
                    <input
                      type="text" id="cvv" name="cvv" required
                      placeholder="123"
                      value={formData.cvv} onChange={handleChange}
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
              disabled={isProcessing}
              className="w-full bg-black text-white py-4 rounded-lg hover:bg-gray-800 transition-colors text-lg flex items-center justify-center gap-2 disabled:bg-gray-400"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando imagenes y guardando pedido...
                </>
              ) : (
                `Place Order - $${total.toFixed(2)}`
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
