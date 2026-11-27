import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CreditCard, Smartphone, Lock, Loader2, ArrowLeft, AlertCircle, Eye, Tag, Truck, ChevronDown, MapPin, BookmarkCheck, Store, ShoppingBag } from 'lucide-react';
import { PhoneInput } from './ui/PhoneInput';
import { COLOMBIA_DEPARTMENTS } from '../utils/colombiaData';
import { getSavedAddresses, saveAddress, getSavedBilling, saveBilling, type SavedAddress, type SavedBilling } from '../../services/userProfileService';
import { writeCheckoutOrders, PENDING_CHECKOUT_IDS_KEY } from '../../services/cartService';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';
import { useCartOrders, type CartLine } from '../hooks/useCartOrders';
import OrderDetailsModal from './OrderDetailsModal';
import { LineThumb, lineDetail } from './cart/CartPage';

// --- IMPORTAMOS EL CONTEXTO DE LA TIENDA ---
import { useStoreConfig } from '../context/StoreConfigContext';
import { validateDiscountCode, type AppliedDiscount } from '../../services/discountCodeApi';
import { cartTotalsItem, computeCartTotals, shippingCost } from '../utils/cartPricing';
import { buildCheckoutWrites, newCheckoutGroupId } from '../utils/cartCheckout';
import { RichText } from './ui/RichText';
import NequiPaymentModal from './NequiPaymentModal';
import { TRACKING_EVENTS, TRACKING_IDS, trackEventThen } from '../utils/analytics';
import { createNequiPayment, isNequiEnabled, normalizeNequiPhone, type NequiPaymentView } from '../../services/nequiApi';

const cop = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

/**
 * Checkout del carrito: uno o varios productos (cada uno su propio pedido) con
 * un solo pago, un solo envío y los descuentos sobre el total de la compra.
 */
export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const cart = useCart();
  const { lines, loading } = useCartOrders();

  // Obtenemos la configuración dinámica en tiempo real
  const config = useStoreConfig();

  const [isProcessing, setIsProcessing] = useState(false);
  // Código de descuento: lo valida el backend, aquí solo se guarda la respuesta.
  const [codeInput, setCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<AppliedDiscount | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [preview, setPreview] = useState<CartLine | null>(null);

  // Saved data from Firestore
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savedBilling, setSavedBilling] = useState<SavedBilling | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [shouldSaveAddress, setShouldSaveAddress] = useState(true);
  const [shouldSaveBilling, setShouldSaveBilling] = useState(true);

  const [pickupLocation, setPickupLocation] = useState<'' | 'Arboleda' | 'Ciudad Jardin'>('');

  // Método de pago. Nequi solo aparece si el backend lo tiene configurado.
  const [nequiEnabled, setNequiEnabled] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'nequi'>('card');
  const [nequiPhone, setNequiPhone] = useState('');
  const [nequiPhoneTouched, setNequiPhoneTouched] = useState(false);
  const [nequiPayment, setNequiPayment] = useState<NequiPaymentView | null>(null);
  const [leadOrderId, setLeadOrderId] = useState<string | null>(null);
  // Pedidos que cubre el cobro de Nequi en curso (para reenviarlo igual).
  const [nequiOrderIds, setNequiOrderIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '', email: user?.email || '', phoneCode: '+57', phone: '',
    department: '', city: '', address: '', addressExtra: '', zipCode: '',
    billingName: '', billingAddress: '', billingCity: '', billingZipCode: '', sameAsShipping: true,
  });

  // Ciudades disponibles según el departamento seleccionado
  const availableCities = COLOMBIA_DEPARTMENTS.find(d => d.name === formData.department)?.cities ?? [];

  // Enlaces antiguos (o el carrito lleno) traen el pedido en el state: se
  // asegura que esté en el carrito, que es lo que este checkout cobra.
  const [stateOrderReady, setStateOrderReady] = useState(!state?.orderId);
  useEffect(() => {
    if (stateOrderReady || !cart.loaded || !state?.orderId) return;
    (cart.has(state.orderId) ? Promise.resolve(true) : cart.addItem(state.orderId))
      .catch(() => false)
      .finally(() => setStateOrderReady(true));
  }, [cart, state?.orderId, stateOrderReady]);

  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: user.email! }));
    }
  }, [user, formData.email]);

  useEffect(() => {
    let alive = true;
    isNequiEnabled().then(enabled => { if (alive) setNequiEnabled(enabled); });
    return () => { alive = false; };
  }, []);

  // Mientras el cliente no escriba otro, el celular de Nequi es el de contacto
  // (si es colombiano): casi siempre coinciden.
  useEffect(() => {
    if (nequiPhoneTouched) return;
    setNequiPhone(formData.phoneCode === '+57' ? formData.phone.replace(/\D/g, '') : '');
  }, [formData.phone, formData.phoneCode, nequiPhoneTouched]);

  // Load saved addresses and billing from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    Promise.all([getSavedAddresses(user.uid), getSavedBilling(user.uid)]).then(([addresses, billing]) => {
      setSavedAddresses(addresses);
      setSavedBilling(billing);
    }).catch(() => {});
  }, [user?.uid]);

  // Si cambia el carrito, el código aplicado se calculó sobre otro subtotal.
  const linesKey = lines.map(l => `${l.orderId}:${l.quantity}`).join('|');
  const prevLinesKey = useRef(linesKey);
  useEffect(() => {
    if (prevLinesKey.current !== linesKey && appliedCode) {
      setAppliedCode(null);
      setCodeInput(appliedCode.code);
      setCodeError('El carrito cambió: vuelve a aplicar el código.');
    }
    prevLinesKey.current = linesKey;
  }, [linesKey, appliedCode]);

  const applyAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    const savedPhone = addr.phone || '';
    const matchedCode = savedPhone.startsWith('+')
      ? (['+1-809', '+593', '+591', '+595', '+598', '+506', '+502', '+503', '+504', '+505', '+507', '+351'].find(c => savedPhone.startsWith(c)) || (savedPhone.length > 3 ? savedPhone.slice(0, savedPhone.indexOf(' ') > 0 ? savedPhone.indexOf(' ') : 3) : '+57'))
      : '+57';
    const numberPart = savedPhone.startsWith(matchedCode) ? savedPhone.slice(matchedCode.length).trim() : savedPhone;
    setFormData(prev => ({
      ...prev,
      name: addr.name,
      email: addr.email || prev.email,
      phoneCode: matchedCode,
      phone: numberPart,
      department: addr.department,
      city: addr.city,
      address: addr.address,
      addressExtra: addr.addressExtra || '',
      zipCode: addr.zipCode,
    }));
  };

  const clearSelectedAddress = () => {
    setSelectedAddressId(null);
    setFormData(prev => ({
      ...prev,
      name: '', phoneCode: '+57', phone: '', department: '', city: '', address: '', addressExtra: '', zipCode: '',
    }));
  };

  if (loading || !stateOrderReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <Loader2 className="w-12 h-12 animate-spin text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">{t('checkout.loadingOrder')}</h2>
        <p className="text-gray-500 mt-2">{t('checkout.preparingSummary')}</p>
      </div>
    );
  }

  if (lines.length === 0 && !nequiPayment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl mb-4 font-semibold">{t('checkout.noOrderData')}</h2>
        <p className="text-gray-600 mb-8 text-center max-w-md">{t('checkout.errorSession')}</p>
        <button onClick={() => navigate('/create', { state: { fromCart: true } })} className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors">
          Crear un producto
        </button>
      </div>
    );
  }

  const isMulti = lines.length > 1;
  // Nequi cobra la compra entera (uno o varios productos) en un solo push.
  const nequiAvailable = nequiEnabled;
  const isPickup = pickupLocation !== '';
  const shipping = shippingCost(isPickup ? { pickup: true } : { pickup: false, city: formData.city }, config.prices);
  const cartItems = lines.map(l => cartTotalsItem(l.orderId, l.pricing));
  const totals = computeCartTotals(cartItems, { discounts: config.discounts, codeDiscount: appliedCode?.discount, shipping });
  const { subtotal, total } = totals;
  const totalLabel = `$${total.toLocaleString('es-CO')} COP`;
  // id y data-gtm-action únicos por método para los activadores de clic de GTM.
  const payWithNequi = nequiAvailable && paymentMethod === 'nequi';
  const payButtonId = payWithNequi ? TRACKING_IDS.checkoutNequi : TRACKING_IDS.checkoutStripe;
  const payButtonAction = payWithNequi ? 'compra_nequi' : 'compra_stripe';
  const payLabel = payWithNequi
    ? t('checkout.payNequi', { total: totalLabel })
    : t('checkout.payNow', { total: totalLabel });

  /**
   * Comprueba el código contra el backend. Se llama al pulsar «Aplicar» y otra
   * vez justo antes de pagar: entre una cosa y otra el código puede haberse
   * agotado, haber vencido o haber cambiado el subtotal.
   */
  const applyCode = async (raw: string): Promise<AppliedDiscount | null> => {
    const code = raw.trim();
    if (!code) return null;

    setIsCheckingCode(true);
    setCodeError(null);
    try {
      // El código se calcula sobre lo que queda tras la promoción del 3.º a mitad de precio.
      const result = await validateDiscountCode(code, subtotal - totals.promoDiscount);
      if (!result.ok) {
        setAppliedCode(null);
        setCodeError(result.reason);
        return null;
      }
      setAppliedCode(result.applied);
      return result.applied;
    } finally {
      setIsCheckingCode(false);
    }
  };

  const removeCode = () => {
    setAppliedCode(null);
    setCodeError(null);
    setCodeInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage(t('checkout.loginRequired'));
      return;
    }

    const useNequi = nequiAvailable && paymentMethod === 'nequi';
    const nequiNumber = useNequi ? normalizeNequiPhone(nequiPhone) : null;
    if (useNequi && !nequiNumber) {
      setNequiPhoneTouched(true);
      setErrorMessage(t('checkout.nequiPhoneInvalid'));
      return;
    }

    setIsProcessing(true);

    try {
      const pickupLabel = pickupLocation === 'Arboleda' ? 'Arboleda, Cali' : 'Ciudad Jardín, Cali';
      const shippingAddress = isPickup ? {
        name: formData.name,
        email: formData.email,
        phone: formData.phone.trim() ? `${formData.phoneCode}${formData.phone.trim()}` : '',
        department: 'Valle del Cauca',
        city: 'Cali',
        address: `Recogida en punto: ${pickupLabel}`,
        addressExtra: '',
        zipCode: '760001',
      } : {
        name: formData.name,
        email: formData.email,
        phone: formData.phone.trim() ? `${formData.phoneCode}${formData.phone.trim()}` : '',
        department: formData.department,
        city: formData.city,
        address: formData.address,
        addressExtra: formData.addressExtra,
        zipCode: formData.zipCode,
      };
      const billingAddress = formData.sameAsShipping ? shippingAddress : { name: formData.billingName, email: formData.email, address: formData.billingAddress, city: formData.billingCity, zipCode: formData.billingZipCode };

      // Se revalida contra el backend por si el código venció o se agotó
      // mientras el cliente rellenaba la dirección.
      let confirmedCode: AppliedDiscount | null = null;
      if (appliedCode) {
        confirmedCode = await applyCode(appliedCode.code);
        if (!confirmedCode) {
          setIsProcessing(false);
          return;
        }
      }

      const finalTotals = computeCartTotals(cartItems, {
        discounts: config.discounts, codeDiscount: confirmedCode?.discount, shipping,
      });
      const finalTotal = finalTotals.total;
      const city = formData.city.trim();
      const orderIds = lines.map(l => l.orderId);
      const lead = orderIds[0];

      // Todos los pedidos de la compra quedan listos para cobrar a la vez.
      await writeCheckoutOrders(buildCheckoutWrites(lines, finalTotals, {
        shippingAddress,
        billingAddress,
        groupId: newCheckoutGroupId(),
        code: confirmedCode ? { code: confirmedCode.code, discount: confirmedCode.discount } : null,
        shippingMethod: isPickup ? 'pickup' : city === '' ? 'unknown' : city.toLowerCase().includes('cali') ? 'cali' : 'national',
        pickupLocation: isPickup ? pickupLabel : null,
        shippingCity: isPickup ? 'Cali' : city || null,
        paymentMethod: useNequi ? 'nequi' : 'card',
        now: new Date().toISOString(),
      }));
      localStorage.setItem('pending_order_id', lead);
      localStorage.setItem(PENDING_CHECKOUT_IDS_KEY, JSON.stringify(orderIds));
      setLeadOrderId(lead);
      setNequiOrderIds(orderIds);

      // Save address/billing to user profile if requested
      if (user?.uid) {
        const saves: Promise<void>[] = [];
        if (shouldSaveAddress) {
          saves.push(saveAddress(user.uid, {
            name: shippingAddress.name,
            email: shippingAddress.email,
            phone: shippingAddress.phone,
            department: shippingAddress.department,
            city: shippingAddress.city,
            address: shippingAddress.address,
            addressExtra: shippingAddress.addressExtra || '',
            zipCode: shippingAddress.zipCode,
          }));
        }
        if (shouldSaveBilling && !formData.sameAsShipping) {
          saves.push(saveBilling(user.uid, {
            name: billingAddress.name,
            address: billingAddress.address,
            city: billingAddress.city,
            zipCode: billingAddress.zipCode,
          }));
        }
        await Promise.all(saves);
      }

      if (useNequi && nequiNumber) {
        // El backend envía la notificación al celular y el modal espera a
        // que el cliente la acepte; no hay redirección como con Stripe.
        const payment = await createNequiPayment(lead, nequiNumber, orderIds);
        setNequiPayment(payment);
        setIsProcessing(false);
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://jiffy-backend-938778636106.europe-west1.run.app';
      const idToken = await user.getIdToken();
      const response = await fetch(`${backendUrl}/stripe/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          amount: Math.round(finalTotal * 100),
          title: isMulti ? `Pedido Jiffy (${lines.length} productos)` : (lines[0].order?.product?.name || 'Pedido Jiffy'),
          // `orderId` sigue yendo para backends que aún no conocen `orderIds`.
          orderId: lead,
          orderIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t('checkout.errorStripe'));
      }

      const sessionData = await response.json();
      if (sessionData && sessionData.url) {
        // Avisar a GTM antes de salir hacia Stripe (espera a sus etiquetas, máx. 1 s).
        trackEventThen(
          TRACKING_EVENTS.stripeCheckoutStarted,
          {
            order_id: lead,
            value: finalTotal,
            currency: 'COP',
            product_type: isMulti ? 'carrito' : (lines[0].pricing.kind || null),
            items: lines.length,
          },
          () => { window.location.href = sessionData.url; },
        );
      } else {
        throw new Error(t('checkout.errorStripe'));
      }
    } catch (error: any) {
      console.error('Error en el proceso de pago:', error);
      setErrorMessage(error.message || t('error.generic'));
      setIsProcessing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const type = e.target.type;
    // Al cambiar departamento, resetear la ciudad seleccionada
    if (name === 'department') {
      setFormData(prev => ({ ...prev, department: value, city: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const editLine = (line: CartLine) => navigate('/create', {
    state: { fromCheckout: true, orderId: line.orderId, productType: line.pricing.kind === 'calendar' ? 'calendar' : 'album' },
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4 md:py-12 relative">
      <div className="flex items-center gap-4 mb-3 md:mb-8">
        <button onClick={() => navigate('/carrito')} className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-black">
          <ArrowLeft className="w-5 h-5" /><span className="font-medium">Volver al carrito</span>
        </button>
      </div>

      <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8">{t('checkout.title')}</h2>

      {errorMessage && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /><p>{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* --- FORMULARIO — primero en DOM para que salga arriba en mobile --- */}
        <div className="lg:col-span-2 lg:order-1">
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-4 md:space-y-8">
            <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
              <h3 className="text-base md:text-xl font-bold mb-3 md:mb-6 flex items-center gap-2"><span className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 bg-black text-white rounded-full text-xs md:text-sm">1</span>{t('checkout.contactInfo')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                <div className="space-y-2"><label htmlFor="name" className="text-sm font-medium text-gray-700">{t('checkout.fullName')} *</label><input type="text" id="name" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none" placeholder="Ej. Juan Pérez" /></div>
                <div className="space-y-2"><label htmlFor="email" className="text-sm font-medium text-gray-700">{t('auth.emailLabel')} *</label><input type="email" id="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none" placeholder="juan@ejemplo.com" /></div>
              </div>
              <div className="mt-3 md:mt-4">
                <PhoneInput
                  phoneCode={formData.phoneCode}
                  phoneNumber={formData.phone}
                  onPhoneCodeChange={(code) => setFormData(prev => ({ ...prev, phoneCode: code }))}
                  onPhoneNumberChange={(num) => setFormData(prev => ({ ...prev, phone: num }))}
                  label="Teléfono *"
                  required
                />
              </div>
            </div>

            {/* --- MÉTODO DE ENTREGA --- */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
              <h3 className="text-base md:text-xl font-bold mb-3 md:mb-5 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 bg-black text-white rounded-full text-xs md:text-sm">2</span>
                Método de entrega
              </h3>
              {isMulti && (
                <p className="text-xs text-gray-500 -mt-2 mb-3">Todos los productos llegan juntos: pagas un solo envío.</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Envío a domicilio */}
                <button
                  type="button"
                  onClick={() => setPickupLocation('')}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${!isPickup ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-gray-400 text-gray-700'}`}
                >
                  <Truck className={`w-5 h-5 mt-0.5 shrink-0 ${!isPickup ? 'text-white' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-semibold text-sm">Envío a domicilio</p>
                    <p className={`text-xs mt-0.5 ${!isPickup ? 'text-gray-300' : 'text-gray-500'}`}>Entrega en tu dirección</p>
                  </div>
                </button>
                {/* Recogida en Cali */}
                <button
                  type="button"
                  onClick={() => setPickupLocation(pickupLocation === '' ? 'Arboleda' : pickupLocation)}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${isPickup ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-gray-400 text-gray-700'}`}
                >
                  <Store className={`w-5 h-5 mt-0.5 shrink-0 ${isPickup ? 'text-white' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-semibold text-sm">Recogida en Cali</p>
                    <p className={`text-xs mt-0.5 ${isPickup ? 'text-green-300 font-semibold' : 'text-green-600 font-semibold'}`}>Sin costo de envío</p>
                  </div>
                </button>
              </div>

              {/* Sub-opciones de punto de recogida */}
              {isPickup && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selecciona el punto de recogida:</p>
                  {(['Arboleda', 'Ciudad Jardin'] as const).map(loc => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setPickupLocation(loc)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${pickupLocation === loc ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${pickupLocation === loc ? 'border-black' : 'border-gray-300'}`}>
                        {pickupLocation === loc && <div className="w-2 h-2 rounded-full bg-black" />}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{loc === 'Arboleda' ? 'Arboleda' : 'Ciudad Jardín'}, Cali</p>
                        <p className="text-xs text-gray-500">{t('checkout.pickupPointDesc')}</p>
                      </div>
                    </button>
                  ))}
                  <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-800 leading-snug">
                      <RichText text={t('checkout.pickupHowItWorks')} />
                    </p>
                  </div>
                </div>
              )}
            </div>

            {!isPickup && <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
              <h3 className="text-base md:text-xl font-bold mb-3 md:mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 bg-black text-white rounded-full text-xs md:text-sm">3</span>
                {t('checkout.shippingAddress')}
              </h3>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && (
                <div className="mb-4 md:mb-6">
                  <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />{t('checkout.savedAddresses')}
                  </p>
                  <div className="flex flex-col gap-2">
                    {savedAddresses.map(addr => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => selectedAddressId === addr.id ? clearSelectedAddress() : applyAddress(addr)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-sm ${selectedAddressId === addr.id ? 'border-black bg-black text-white' : 'border-gray-200 bg-gray-50 hover:border-gray-400 text-gray-700'}`}
                      >
                        <span className="font-semibold">{addr.name}</span>
                        <span className="mx-1.5 opacity-50">·</span>
                        <span>{addr.address}{addr.addressExtra ? `, ${addr.addressExtra}` : ''}</span>
                        <span className="mx-1.5 opacity-50">·</span>
                        <span>{addr.city}, {addr.department}</span>
                        {selectedAddressId === addr.id && (
                          <span className="ml-2 text-xs opacity-75">({t('checkout.newAddress')})</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Save address checkbox — before the form fields */}
              <div className="mb-4 pb-4 border-b border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={shouldSaveAddress}
                    onChange={e => setShouldSaveAddress(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="flex items-center gap-1.5 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    <BookmarkCheck className="w-3.5 h-3.5 text-gray-400" />
                    {t('checkout.saveAddress')}
                  </span>
                </label>
                {shouldSaveAddress && savedAddresses.length >= 3 && (
                  <p className="mt-1.5 ml-7 text-xs text-amber-600">{t('checkout.savedAddressesLimit')}</p>
                )}
              </div>


              <div className="space-y-3 md:space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="department" className="text-sm font-medium text-gray-700">Departamento *</label>
                    <div className="relative">
                      <select id="department" name="department" required value={formData.department} onChange={handleChange} className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none bg-white text-gray-800">
                        <option value="">Selecciona un departamento</option>
                        {COLOMBIA_DEPARTMENTS.map(d => (<option key={d.name} value={d.name}>{d.name}</option>))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="city" className="text-sm font-medium text-gray-700">{t('checkout.city')} *</label>
                    <div className="relative">
                      <select id="city" name="city" required value={formData.city} onChange={handleChange} disabled={!formData.department} className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none bg-white text-gray-800 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed">
                        <option value="">{formData.department ? 'Selecciona una ciudad' : 'Primero elige un departamento'}</option>
                        {availableCities.map(city => (<option key={city} value={city}>{city}</option>))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="address" className="text-sm font-medium text-gray-700">{t('checkout.address')} *</label>
                  <input type="text" id="address" name="address" required value={formData.address} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none" placeholder="Ej. Calle 10 # 25-30" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="addressExtra" className="text-sm font-medium text-gray-700">Apto, casa, barrio <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input type="text" id="addressExtra" name="addressExtra" value={formData.addressExtra} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none" placeholder="Ej. Apto 301, Barrio El Poblado" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="zipCode" className="text-sm font-medium text-gray-700">{t('checkout.zipCode')} *</label>
                    <input type="text" id="zipCode" name="zipCode" required value={formData.zipCode} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none" placeholder="Ej. 760001" />
                  </div>
                </div>
              </div>
            </div>}

            <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
              <h3 className="text-base md:text-xl font-bold mb-3 md:mb-4 flex items-center gap-2"><span className="flex items-center justify-center w-6 h-6 md:w-7 md:h-7 bg-black text-white rounded-full text-xs md:text-sm">{isPickup ? '3' : '4'}</span>{t('checkout.billingAddress')}</h3>
              <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors"><input type="checkbox" id="sameAsShipping" name="sameAsShipping" checked={formData.sameAsShipping} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black" /><span className="text-sm text-gray-700">{t('checkout.sameAddress')}</span></label>
              {!formData.sameAsShipping && (
                <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2"><label htmlFor="billingName" className="text-sm font-medium text-gray-700">{t('checkout.billingName')} *</label><input type="text" id="billingName" name="billingName" required value={formData.billingName} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none" /></div>
                  <div className="space-y-2"><label htmlFor="billingAddress" className="text-sm font-medium text-gray-700">{t('checkout.billingAddress')} *</label><input type="text" id="billingAddress" name="billingAddress" required value={formData.billingAddress} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none" /></div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><label htmlFor="billingCity" className="text-sm font-medium text-gray-700">{t('checkout.city')} *</label><input type="text" id="billingCity" name="billingCity" required value={formData.billingCity} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none" /></div>
                    <div className="space-y-2"><label htmlFor="billingZipCode" className="text-sm font-medium text-gray-700">{t('checkout.zipCode')} *</label><input type="text" id="billingZipCode" name="billingZipCode" required value={formData.billingZipCode} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none" /></div>
                  </div>
                </div>
              )}
            </div>

            {nequiAvailable && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
                <h3 className="text-base md:text-xl font-bold mb-3 md:mb-5">{t('checkout.paymentMethod')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={t('checkout.paymentMethod')}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'card'}
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === 'card' ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-gray-400 text-gray-700'}`}
                  >
                    <CreditCard className={`w-5 h-5 mt-0.5 shrink-0 ${paymentMethod === 'card' ? 'text-white' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-sm">{t('checkout.methodCard')}</p>
                      <p className={`text-xs mt-0.5 ${paymentMethod === 'card' ? 'text-gray-300' : 'text-gray-500'}`}>{t('checkout.methodCardDesc')}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'nequi'}
                    onClick={() => setPaymentMethod('nequi')}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${paymentMethod === 'nequi' ? 'border-black bg-black text-white' : 'border-gray-200 hover:border-gray-400 text-gray-700'}`}
                  >
                    <Smartphone className={`w-5 h-5 mt-0.5 shrink-0 ${paymentMethod === 'nequi' ? 'text-white' : 'text-gray-400'}`} />
                    <div>
                      <p className="font-semibold text-sm">Nequi</p>
                      <p className={`text-xs mt-0.5 ${paymentMethod === 'nequi' ? 'text-gray-300' : 'text-gray-500'}`}>{t('checkout.methodNequiDesc')}</p>
                    </div>
                  </button>
                </div>

                {paymentMethod === 'nequi' && (
                  <div className="mt-4 space-y-1.5">
                    <label htmlFor="nequiPhone" className="text-sm font-medium text-gray-700">{t('checkout.nequiPhone')} *</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      id="nequiPhone"
                      value={nequiPhone}
                      onChange={e => { setNequiPhoneTouched(true); setNequiPhone(e.target.value); }}
                      onBlur={() => setNequiPhoneTouched(true)}
                      maxLength={16}
                      placeholder="300 123 4567"
                      aria-invalid={nequiPhoneTouched && !normalizeNequiPhone(nequiPhone)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none ${nequiPhoneTouched && nequiPhone && !normalizeNequiPhone(nequiPhone) ? 'border-red-400' : 'border-gray-300'}`}
                    />
                    <p className="text-xs text-gray-500">{t('checkout.nequiPhoneHelp')}</p>
                  </div>
                )}
              </div>
            )}

            {!payWithNequi ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3 md:mb-4"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><CreditCard className="w-5 h-5 md:w-6 md:h-6" /></div><h3 className="text-base md:text-xl font-bold text-gray-800">{t('checkout.securePayment')}</h3></div>
                <p className="text-gray-600 text-sm leading-relaxed mb-3 md:mb-6">{t('checkout.securePaymentDesc')}</p>
                <div className="items-center gap-2 text-xs font-medium text-gray-500 bg-white p-3 rounded-lg border border-gray-100 inline-flex"><Lock className="w-3.5 h-3.5" /><span>{t('checkout.encrypted')}</span></div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-3 md:mb-4"><div className="p-2 bg-[#200020] text-white rounded-lg"><Smartphone className="w-5 h-5 md:w-6 md:h-6" /></div><h3 className="text-base md:text-xl font-bold text-gray-800">{t('checkout.nequiTitle')}</h3></div>
                <p className="text-gray-600 text-sm leading-relaxed">{t('checkout.nequiDesc')}</p>
              </div>
            )}

            {/* Botón pagar — solo visible en desktop dentro del form */}
            <button type="submit" id={payButtonId} data-gtm-action={payButtonAction} disabled={isProcessing} className="hidden md:flex w-full bg-black text-white py-4 md:py-5 rounded-xl hover:bg-gray-900 transition-all text-lg md:text-xl font-bold items-center justify-center gap-3 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg shadow-gray-200">
              {isProcessing ? (<><Loader2 className="w-6 h-6 animate-spin" />{t('checkout.processing')}</>) : (<>{payLabel}</>)}
            </button>
            <p className="hidden md:block text-center text-xs text-gray-400">{t('checkout.terms')}</p>
          </form>
        </div>

        {/* --- RESUMEN — segundo en DOM, aparece después del formulario en mobile --- */}
        <div className="lg:col-span-1 lg:order-2">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 md:p-6 lg:sticky lg:top-8">
            <div className="flex items-center justify-between mb-3 md:mb-5">
              <h3 className="text-lg md:text-xl font-bold">{t('checkout.summary')}</h3>
              <button type="button" onClick={() => navigate('/carrito')} className="text-sm font-semibold text-blue-600 hover:text-blue-800">Editar carrito</button>
            </div>

            {/* --- PRODUCTOS DE LA COMPRA --- */}
            <ul className="space-y-3 mb-4" data-testid="checkout-lines">
              {lines.map(line => (
                <li key={line.orderId} className="flex gap-3">
                  <button type="button" onClick={() => setPreview(line)} className="relative group" aria-label="Ver diseño">
                    <LineThumb order={line.order} className="w-14 h-14" />
                    {line.quantity > 1 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center">×{line.quantity}</span>
                    )}
                  </button>
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="font-semibold text-gray-900 truncate">{line.pricing.label}</p>
                    <p className="text-xs text-gray-500 truncate">{lineDetail(line)}</p>
                    <button type="button" onClick={() => setPreview(line)} className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"><Eye className="w-3 h-3" /> {t('checkout.preview')}</button>
                  </div>
                  <p className="text-sm font-semibold whitespace-nowrap">{cop(line.pricing.lineTotal)}</p>
                </li>
              ))}
            </ul>

            {lines.some(l => l.pricing.kind === 'album' && (l.pricing.extraPages ?? 0) > 0) && (
              <p className="text-[11px] text-gray-400 mb-3">Los álbumes incluyen 40 páginas; las páginas extra ya están sumadas en su precio.</p>
            )}

            <div className="border-t border-gray-200 pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('checkout.subtotal')}</span>
                <span>${subtotal.toLocaleString('es-CO')} COP</span>
              </div>

              {/* --- PROMOCIÓN 3.º A MITAD DE PRECIO --- */}
              {totals.promoDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-bold" data-testid="promo-third-half">
                  <span className="flex items-center gap-1"><Tag className="w-4 h-4"/> {totals.promoUnits > 1 ? `${totals.promoUnits} productos a mitad de precio` : "3.º producto a mitad de precio"}</span>
                  <span>-${totals.promoDiscount.toLocaleString("es-CO")} COP</span>
                </div>
              )}

              {/* --- DESCUENTO DINÁMICO --- */}
              {totals.storeDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span className="flex items-center gap-1"><Tag className="w-4 h-4"/> Descuento ({totals.storeDiscountPct}%)</span>
                  <span>-${totals.storeDiscount.toLocaleString('es-CO')} COP</span>
                </div>
              )}

              {/* --- CÓDIGO DE DESCUENTO --- */}
              {appliedCode ? (
                <div className="flex justify-between text-green-600 font-bold">
                  <span className="flex items-center gap-1">
                    <Tag className="w-4 h-4" /> Código {appliedCode.code}
                    <button
                      type="button"
                      onClick={removeCode}
                      className="ml-1 text-xs text-gray-400 hover:text-red-500 underline font-medium"
                    >
                      quitar
                    </button>
                  </span>
                  <span>-${totals.codeDiscount.toLocaleString('es-CO')} COP</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <input
                      value={codeInput}
                      onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(null); }}
                      placeholder="Código de descuento"
                      className="flex-1 min-w-0 p-2 border border-gray-300 rounded-lg text-sm uppercase tracking-wide focus:outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={() => void applyCode(codeInput)}
                      disabled={isCheckingCode || codeInput.trim() === ''}
                      className="px-4 py-2 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400"
                    >
                      {isCheckingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                    </button>
                  </div>
                  {codeError && <p className="text-xs text-red-600">{codeError}</p>}
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('checkout.shipping')}{isMulti ? ' (uno solo)' : ''}</span>
                  <span>
                    {isPickup
                      ? <span className="text-green-600 font-semibold">Gratis (recogida)</span>
                      : shipping === null
                        ? <span className="text-gray-400 italic text-xs">Por determinar</span>
                        : `$${shipping.toLocaleString('es-CO')} COP`}
                  </span>
                </div>
                {!isPickup && (
                  <p className="text-xs text-gray-400">
                    Cali: ${config.prices.shippingCali.toLocaleString('es-CO')} · Otras ciudades: ${config.prices.shippingNational.toLocaleString('es-CO')}
                  </p>
                )}
                {isPickup && (
                  <p className="text-xs text-gray-500">Punto: {pickupLocation === 'Arboleda' ? 'Arboleda' : 'Ciudad Jardín'}, Cali</p>
                )}
              </div>
            </div>

            <div className="border-t-2 border-gray-200 mt-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">{t('checkout.total')}</span>
                <span className="text-2xl font-bold" data-testid="checkout-total">${total.toLocaleString('es-CO')} COP</span>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <Truck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-snug">
                <RichText text={t('checkout.deliveryTime')} />
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Botón pagar mobile-only — aparece después del resumen */}
      <div className="mt-4 md:hidden">
        <button type="submit" form="checkout-form" id={`${payButtonId}-movil`} data-gtm-action={payButtonAction} disabled={isProcessing} className="w-full bg-black text-white py-4 rounded-xl hover:bg-gray-900 transition-all text-lg font-bold flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg shadow-gray-200">
          {isProcessing ? (<><Loader2 className="w-6 h-6 animate-spin" />{t('checkout.processing')}</>) : (<>{payLabel}</>)}
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">{t('checkout.terms')}</p>
      </div>

      {preview && (
        <OrderDetailsModal
          isOpen
          onClose={() => setPreview(null)}
          order={{ ...preview.order, total: preview.pricing.lineTotal, shippingAddress: null, billingAddress: null }}
          hideAddressInfo={true}
          onGoToEdit={() => editLine(preview)}
        />
      )}

      {nequiPayment && leadOrderId && (
        <NequiPaymentModal
          orderId={leadOrderId}
          initial={nequiPayment}
          onPaid={() => navigate('/success?method=nequi')}
          onResend={async () => {
            const number = normalizeNequiPhone(nequiPhone);
            if (!number) throw new Error(t('checkout.nequiPhoneInvalid'));
            setNequiPayment(await createNequiPayment(leadOrderId, number, nequiOrderIds));
          }}
          onClose={() => setNequiPayment(null)}
        />
      )}
    </div>
  );
}
