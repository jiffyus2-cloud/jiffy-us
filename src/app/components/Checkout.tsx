import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CreditCard, Lock, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { updateOrderAddresses, getOrder } from '../../services/orderService';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Nuevos estados para el flujo en dos pasos
  const [orderData, setOrderData] = useState<any>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    address: '',
    city: '',
    zipCode: '',
    billingName: '',
    billingAddress: '',
    billingCity: '',
    billingZipCode: '',
    sameAsShipping: true,
  });

  // Actualizar email cuando el usuario cargue
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: user.email! }));
    }
  }, [user, formData.email]);

  // Efecto que busca los datos del pedido en Firebase al entrar
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!state?.orderId) {
        setIsLoadingOrder(false);
        return;
      }
      try {
        const data = await getOrder(state.orderId);
        setOrderData(data);
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setIsLoadingOrder(false);
      }
    };
    
    fetchOrderDetails();
  }, [state?.orderId]);

  if (isLoadingOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Loader2 className="w-12 h-12 animate-spin text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">{t('checkout.loadingOrder')}</h2>
        <p className="text-gray-500 mt-2">{t('checkout.preparingSummary')}</p>
      </div>
    );
  }

  if (!orderData || !state?.orderId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl mb-4 font-semibold">{t('checkout.noOrderData')}</h2>
        <p className="text-gray-600 mb-8 text-center max-w-md">
          {t('checkout.errorSession')}
        </p>
        <button 
          onClick={() => navigate('/')}
          className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          {t('success.backHome')}
        </button>
      </div>
    );
  }

  const product = orderData.product;
  const productTypeStr = String(orderData.productType || product?.type || product?.id || product?.name || '').toLowerCase();
  const isMugType = productTypeStr.includes('mug') || productTypeStr.includes('taza');
  
  const getMugCount = () => {
    const arr = orderData.items || orderData.designData?.items || orderData.mugItems || orderData.designData?.mugItems || [];
    return Array.isArray(arr) && arr.length > 0 ? arr.length : 1;
  };

  const calculateTotal = () => {
    if (!product || !orderData) return 0;

    // 1. ÁLBUMES
    if (productTypeStr.includes('album') || productTypeStr.includes('photobook')) {
      const size = orderData.customization?.size || '';
      const pageCount = orderData.designData?.photos?.length || 0; 
      const basePages = 40;
      let basePrice = 0;
      let additionalPagePrice = 0;

      if (size.includes('20x20') || size.includes('2x2')) {
        basePrice = 150000;
        additionalPagePrice = 3750;
      } else if (size.includes('30x30')) {
        basePrice = 190000;
        additionalPagePrice = 4750;
      } else if (size.includes('28x21') || size.includes('21x28')) {
        basePrice = 180000;
        additionalPagePrice = 4500;
      } else {
        basePrice = 150000;
        additionalPagePrice = 3750;
      }

      if (pageCount > basePages) {
        return basePrice + ((pageCount - basePages) * additionalPagePrice);
      }
      return basePrice;
    } 
    
    // 2. TAZAS 
    if (isMugType) {
      return 45000 * getMugCount(); 
    } 
    
    // 3. CALENDARIOS
    const isCalendar = 
      productTypeStr.includes('calendar') || 
      productTypeStr.includes('calendario') || 
      orderData.designData?.customization?.year !== undefined || 
      orderData.designData?.customization?.imagesPerMonth !== undefined;

    if (isCalendar) {
      const calendarFormat = String(
        orderData.designData?.customization?.type || 
        orderData.designData?.customization?.format || 
        orderData.designData?.customization?.size || 
        ''
      ).toLowerCase();

      if (calendarFormat.includes('wall') || calendarFormat.includes('pared')) {
        return 80000; // Calendario de Pared
      }
      
      return 60000; // Calendario de Escritorio
    }
    
    // 4. FOTOS
    if (productTypeStr.includes('photo') || productTypeStr.includes('foto')) {
      const basePrice = Number(product.basePrice || product.price || 0);
      return basePrice * (orderData.designData?.photos?.length || 0);
    }

    // 5. FALLBACK
    return Number(product.basePrice || product.price || 0);
  };

  const subtotal = calculateTotal();
  const shipping = 0; 
  const tax = 0; 
  const total = subtotal + shipping + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage(t('checkout.loginRequired'));
      return;
    }

    setIsProcessing(true);

    try {
      const shippingAddress = {
        name: formData.name,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        zipCode: formData.zipCode,
      };

      const billingAddress = formData.sameAsShipping ? shippingAddress : {
        name: formData.billingName,
        email: formData.email,
        address: formData.billingAddress,
        city: formData.billingCity,
        zipCode: formData.billingZipCode,
      };

      await updateOrderAddresses(state.orderId, { shippingAddress, billingAddress }, total, 'pending_payment');
      localStorage.setItem('pending_order_id', state.orderId);

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://jiffy-backend-938778636106.europe-west1.run.app';
      const response = await fetch(`${backendUrl}/stripe/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(total * 100), 
          title: product.name || 'Pedido Jiffy', 
          orderId: state.orderId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t('checkout.errorStripe'));
      }

      const sessionData = await response.json();

      if (sessionData && sessionData.url) {
        window.location.href = sessionData.url;
      } else {
        throw new Error(t('checkout.errorStripe'));
      }

    } catch (error: any) {
      console.error('Error en el proceso de pago:', error);
      setErrorMessage(error.message || t('error.generic'));
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

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/create')}
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-black"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">{t('step.back')}</span>
        </button>
      </div>

      <h2 className="text-3xl font-bold mb-8">{t('checkout.title')}</h2>

      {errorMessage && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Resumen del Pedido */}
        <div className="lg:col-span-1 lg:order-2">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 lg:sticky lg:top-8">
            <h3 className="text-xl font-bold mb-6">{t('checkout.summary')}</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-start gap-4">
                <span className="text-gray-600">{t('dashboard.product')}</span>
                <span className="font-medium text-right">{product.name}</span>
              </div>
              {orderData.designData?.customization?.size && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('album.size')}</span>
                  <span>{orderData.designData.customization.size}</span>
                </div>
              )}
              {product.type === 'album' && orderData.designData?.photos && (
                 <div className="flex justify-between text-sm">
                   <span className="text-gray-600">{t('dashboard.totalPages')}</span>
                   <span className="font-medium">{orderData.designData.photos.length} ({orderData.designData.photos.length > 40 ? `+${orderData.designData.photos.length - 40} extra` : 'Base'})</span>
                 </div>
              )}
              {/* Información visual para el usuario cuando compra tazas */}
              {isMugType && (
                 <div className="flex justify-between text-sm border-t border-gray-200 pt-3">
                   <span className="text-gray-600">Cantidad Tazas</span>
                   <span className="font-medium">{getMugCount()} x $45.000 COP</span>
                 </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('checkout.subtotal')}</span>
                <span>${subtotal.toLocaleString('es-CO')} COP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('checkout.shipping')}</span>
                <span>${shipping.toLocaleString('es-CO')} COP</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('checkout.taxes')}</span>
                <span>${tax.toLocaleString('es-CO')} COP</span>
              </div>
            </div>

            <div className="border-t-2 border-gray-200 mt-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">{t('checkout.total')}</span>
                <span className="text-2xl font-bold">${total.toLocaleString('es-CO')} COP</span>
              </div>
            </div>

            {/* Vista previa segura */}
            {(orderData.designData?.coverData?.image || product?.image) && !isMugType && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 font-medium mb-4 uppercase tracking-wider">{t('checkout.preview')}</p>
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-white shadow-sm border border-gray-100">
                  <img
                    src={orderData.designData?.coverData?.image || product.image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                {orderData.designData?.coverData?.title && (
                  <p className="text-center mt-3 font-semibold text-gray-800">{orderData.designData.coverData.title}</p>
                )}
                {orderData.designData?.coverData?.subtitle && (
                  <p className="text-center text-sm text-gray-500">{orderData.designData.coverData.subtitle}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Formulario de Checkout */}
        <div className="lg:col-span-2 lg:order-1">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 bg-black text-white rounded-full text-sm">1</span>
                {t('checkout.contactInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-gray-700">{t('checkout.fullName')} *</label>
                  <input
                    type="text" id="name" name="name" required
                    value={formData.name} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">{t('auth.emailLabel')} *</label>
                  <input
                    type="email" id="email" name="email" required
                    value={formData.email} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    placeholder="juan@ejemplo.com"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 bg-black text-white rounded-full text-sm">2</span>
                {t('checkout.shippingAddress')}
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium text-gray-700">{t('checkout.address')} *</label>
                  <input
                    type="text" id="address" name="address" required
                    value={formData.address} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    placeholder="Calle, número, piso/depto"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="city" className="text-sm font-medium text-gray-700">{t('checkout.city')} *</label>
                    <input
                      type="text" id="city" name="city" required
                      value={formData.city} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="zipCode" className="text-sm font-medium text-gray-700">{t('checkout.zipCode')} *</label>
                    <input
                      type="text" id="zipCode" name="zipCode" required
                      value={formData.zipCode} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 bg-black text-white rounded-full text-sm">3</span>
                {t('checkout.billingAddress')}
              </h3>
              
              <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <input
                  type="checkbox" id="sameAsShipping" name="sameAsShipping"
                  checked={formData.sameAsShipping} onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-sm text-gray-700">{t('checkout.sameAddress')}</span>
              </label>
              
              {!formData.sameAsShipping && (
                <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label htmlFor="billingName" className="text-sm font-medium text-gray-700">{t('checkout.billingName')} *</label>
                    <input
                      type="text" id="billingName" name="billingName" required
                      value={formData.billingName} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="billingAddress" className="text-sm font-medium text-gray-700">{t('checkout.billingAddress')} *</label>
                    <input
                      type="text" id="billingAddress" name="billingAddress" required
                      value={formData.billingAddress} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="billingCity" className="text-sm font-medium text-gray-700">{t('checkout.city')} *</label>
                      <input
                        type="text" id="billingCity" name="billingCity" required
                        value={formData.billingCity} onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="billingZipCode" className="text-sm font-medium text-gray-700">{t('checkout.zipCode')} *</label>
                      <input
                        type="text" id="billingZipCode" name="billingZipCode" required
                        value={formData.billingZipCode} onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">{t('checkout.securePayment')}</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                {t('checkout.securePaymentDesc')}
              </p>
              <div className="items-center gap-2 text-xs font-medium text-gray-500 bg-white p-3 rounded-lg border border-gray-100 inline-flex">
                <Lock className="w-3.5 h-3.5" />
                <span>{t('checkout.encrypted')}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-black text-white py-5 rounded-xl hover:bg-gray-900 transition-all text-xl font-bold flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg shadow-gray-200"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  {t('checkout.processing')}
                </>
              ) : (
                <>
                  {t('checkout.payNow', { total: `$${total.toLocaleString('es-CO')} COP` })}
                </>
              )}
            </button>
            
            <p className="text-center text-xs text-gray-400">
              {t('checkout.terms')}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}