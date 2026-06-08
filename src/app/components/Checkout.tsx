import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CreditCard, Lock, Loader2, ArrowLeft, AlertCircle, Eye, Coffee, Image as ImageIcon, Tag, Truck, ChevronDown, MapPin, BookmarkCheck, Store } from 'lucide-react';
import { PhoneInput } from './ui/PhoneInput';
import { COLOMBIA_DEPARTMENTS } from '../utils/colombiaData';
import { updateOrderAddresses, getOrder } from '../../services/orderService';
import { getSavedAddresses, saveAddress, getSavedBilling, saveBilling, type SavedAddress, type SavedBilling } from '../../services/userProfileService';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import OrderDetailsModal from './OrderDetailsModal';
import justWhiteImg from '../../assets/justwhite.png';

// --- IMPORTAMOS EL CONTEXTO DE LA TIENDA ---
import { useStoreConfig } from '../context/StoreConfigContext';

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Obtenemos la configuración dinámica en tiempo real
  const config = useStoreConfig();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [orderData, setOrderData] = useState<any>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Saved data from Firestore
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savedBilling, setSavedBilling] = useState<SavedBilling | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [shouldSaveAddress, setShouldSaveAddress] = useState(true);
  const [shouldSaveBilling, setShouldSaveBilling] = useState(true);

  const [pickupLocation, setPickupLocation] = useState<'' | 'Arboleda' | 'Ciudad Jardin'>('');

  const [formData, setFormData] = useState({
    name: '', email: user?.email || '', phoneCode: '+57', phone: '',
    department: '', city: '', address: '', addressExtra: '', zipCode: '',
    billingName: '', billingAddress: '', billingCity: '', billingZipCode: '', sameAsShipping: true,
  });

  // Ciudades disponibles según el departamento seleccionado
  const availableCities = COLOMBIA_DEPARTMENTS.find(d => d.name === formData.department)?.cities ?? [];

  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData(prev => ({ ...prev, email: user.email! }));
    }
  }, [user, formData.email]);

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

  // Load saved addresses and billing from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    Promise.all([getSavedAddresses(user.uid), getSavedBilling(user.uid)]).then(([addresses, billing]) => {
      setSavedAddresses(addresses);
      setSavedBilling(billing);
    }).catch(() => {});
  }, [user?.uid]);

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
        <p className="text-gray-600 mb-8 text-center max-w-md">{t('checkout.errorSession')}</p>
        <button onClick={() => navigate('/')} className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors">
          {t('success.backHome')}
        </button>
      </div>
    );
  }

  const product = orderData.product;
  const productTypeStr = String(orderData.productType || product?.type || product?.id || product?.name || '').toLowerCase();
  const isMugType = productTypeStr.includes('mug') || productTypeStr.includes('taza');
  const isCalendar = productTypeStr.includes('calendar') || productTypeStr.includes('calendario') || orderData.customization?.year !== undefined || orderData.customization?.imagesPerMonth !== undefined;
  const isAlbum = productTypeStr.includes('album') || productTypeStr.includes('photobook');
  const isTela = isAlbum && (
    orderData?.customization?.coverType === 'Tela' ||
    orderData?.customization?.material === 'Tela'
  );
  
  const getMugCount = () => {
    const arr = orderData.items || orderData.mugItems || [];
    return Array.isArray(arr) && arr.length > 0 ? arr.length : 1;
  };

  // --- CÁLCULO DE DESGLOSE PARA ÁLBUMES ---
  let albumBasePrice = 0;
  let albumExtraPagePrice = 0;
  let extraPagesCount = 0;
  let extraPagesCost = 0;
  let totalPageCount = 0;

  if (isAlbum && orderData) {
    const size = orderData.customization?.size || '';
    totalPageCount = orderData.pages?.length || orderData.photos?.length || 0;
    const basePages = 40;

    if (size.includes('20x20') || size.includes('2x2')) {
      albumBasePrice = isTela ? config.prices.albumTela20x20 : config.prices.album20x20;
      albumExtraPagePrice = config.prices.albumExtra20x20;
    } else if (size.includes('30x30')) {
      albumBasePrice = isTela ? config.prices.albumTela30x30 : config.prices.album30x30;
      albumExtraPagePrice = config.prices.albumExtra30x30;
    } else if (size.includes('28x21') || size.includes('21x28')) {
      albumBasePrice = isTela ? config.prices.albumTelaRect : config.prices.albumRect;
      albumExtraPagePrice = config.prices.albumExtraRect;
    } else {
      albumBasePrice = isTela ? config.prices.albumTela20x20 : config.prices.album20x20;
      albumExtraPagePrice = config.prices.albumExtra20x20;
    }

    if (totalPageCount > basePages) {
      extraPagesCount = totalPageCount - basePages;
      extraPagesCost = extraPagesCount * albumExtraPagePrice;
    }
  }

  // --- CÁLCULO DINÁMICO DE PRECIOS ---
  const calculateSubtotal = () => {
    if (!product || !orderData) return 0;
    
    if (isAlbum) return albumBasePrice + extraPagesCost;
    if (isMugType) return config.prices.mug * getMugCount(); 
    
    if (isCalendar) {
      const calendarFormat = String(orderData.customization?.type || orderData.customization?.format || orderData.customization?.size || '').toLowerCase();
      if (calendarFormat.includes('wall') || calendarFormat.includes('pared')) return config.prices.calendarWall;
      return config.prices.calendarDesk;
    }
    
    if (productTypeStr.includes('photo') || productTypeStr.includes('foto') || productTypeStr.includes('pack')) {
      const perPhoto = config.prices.photoPackBase || Number(product.basePrice || product.price || 0);
      return perPhoto * (orderData.photos?.length || 0);
    }

    return Number(product.basePrice || product.price || 0);
  };

  const subtotal = calculateSubtotal();
  const discountAmount = config.discounts.active ? subtotal * (config.discounts.percentage / 100) : 0;
  const isPickup = pickupLocation !== '';
  const cityLower = formData.city.trim().toLowerCase();
  const shipping = isPickup
    ? 0
    : cityLower === ''
      ? 0
      : cityLower.includes('cali')
        ? config.prices.shippingCali
        : config.prices.shippingNational;
  const tax = 0;
  const total = subtotal - discountAmount + shipping + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage(t('checkout.loginRequired'));
      return;
    }

    setIsProcessing(true);

    try {
      const shippingAddress = isPickup ? {
        name: formData.name,
        email: formData.email,
        phone: formData.phone.trim() ? `${formData.phoneCode}${formData.phone.trim()}` : '',
        department: 'Valle del Cauca',
        city: 'Cali',
        address: `Recogida en punto: ${pickupLocation === 'Arboleda' ? 'Arboleda, Cali' : 'Ciudad Jardín, Cali'}`,
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

      await updateOrderAddresses(state.orderId, { shippingAddress, billingAddress }, total, 'pending_payment');
      localStorage.setItem('pending_order_id', state.orderId);

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

  const modalOrderData = { ...orderData, total: total, shippingAddress: null, billingAddress: null };

  // --- LÓGICA DE EXTRACCIÓN DE IMAGEN PRINCIPAL (Para miniatura) ---
  let displayImage = orderData.coverData?.image;
  if (isCalendar) {
    const januaryPage = orderData.pages?.[0];
    if (januaryPage) {
      if (Array.isArray(januaryPage.images) && januaryPage.images.length > 0) displayImage = januaryPage.images[0];
      else if (januaryPage.image) displayImage = januaryPage.image;
    }
    if (!displayImage && orderData.photos && orderData.photos.length > 0) {
      const firstPhoto = orderData.photos[0];
      if (Array.isArray(firstPhoto) && firstPhoto.length > 0) displayImage = firstPhoto[0];
      else if (typeof firstPhoto === 'string') displayImage = firstPhoto as string;
    }
  } else if (isMugType) {
    const arr = orderData.items || orderData.mugItems || [];
    if (arr.length > 0) displayImage = arr[0].photo || arr[0].photos?.[0];
  } else if (isAlbum) {
    // Si es Tela, buscar la primera foto interna para mostrarla
    if (isTela || !displayImage || (typeof displayImage === 'string' && displayImage.includes('justwhite'))) {
      let firstInnerPhoto = null;
      if (orderData.pages && orderData.pages.length > 0) {
        for (const page of orderData.pages) {
          const imgs = Array.isArray(page) ? page : page.images;
          if (imgs && imgs.length > 0) {
            const validImg = imgs.find((img: any) => typeof img === 'string' && img.trim() !== '');
            if (validImg) {
              firstInnerPhoto = validImg;
              break;
            }
          }
        }
      }
      if (!firstInnerPhoto && orderData.photos && orderData.photos.length > 0) {
        for (const page of orderData.photos) {
          if (Array.isArray(page)) {
            const validImg = page.find((img: any) => typeof img === 'string' && img.trim() !== '');
            if (validImg) {
              firstInnerPhoto = validImg;
              break;
            }
          } else if (typeof page === 'string' && page.trim() !== '') {
            firstInnerPhoto = page;
            break;
          }
        }
      }
      if (firstInnerPhoto) {
        displayImage = firstInnerPhoto;
      }
    }
  }

  if (!displayImage) displayImage = product?.image;
  if (displayImage && typeof displayImage === 'string' && displayImage.includes('justwhite')) displayImage = justWhiteImg;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4 md:py-12 relative">
      <div className="flex items-center gap-4 mb-3 md:mb-8">
        <button onClick={() => navigate('/create', { state: { fromCheckout: true, orderId: state.orderId, productType: state.productType } })} className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-black">
          <ArrowLeft className="w-5 h-5" /><span className="font-medium">{t('step.back')}</span>
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
                        <p className="text-xs text-gray-500">Te contactaremos por correo o teléfono para coordinar la entrega</p>
                      </div>
                    </button>
                  ))}
                  <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-800 leading-snug">
                      <span className="font-semibold">¿Cómo funciona?</span> Una vez confirmado tu pedido, te contactaremos al correo o teléfono que nos dejaste para coordinar el punto y horario de entrega.
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

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-3 md:mb-4"><div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><CreditCard className="w-5 h-5 md:w-6 md:h-6" /></div><h3 className="text-base md:text-xl font-bold text-gray-800">{t('checkout.securePayment')}</h3></div>
              <p className="text-gray-600 text-sm leading-relaxed mb-3 md:mb-6">{t('checkout.securePaymentDesc')}</p>
              <div className="items-center gap-2 text-xs font-medium text-gray-500 bg-white p-3 rounded-lg border border-gray-100 inline-flex"><Lock className="w-3.5 h-3.5" /><span>{t('checkout.encrypted')}</span></div>
            </div>

            {/* Botón pagar — solo visible en desktop dentro del form */}
            <button type="submit" disabled={isProcessing} className="hidden md:flex w-full bg-black text-white py-4 md:py-5 rounded-xl hover:bg-gray-900 transition-all text-lg md:text-xl font-bold items-center justify-center gap-3 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg shadow-gray-200">
              {isProcessing ? (<><Loader2 className="w-6 h-6 animate-spin" />{t('checkout.processing')}</>) : (<>{t('checkout.payNow', { total: `$${total.toLocaleString('es-CO')} COP` })}</>)}
            </button>
            <p className="hidden md:block text-center text-xs text-gray-400">{t('checkout.terms')}</p>
          </form>
        </div>

        {/* --- RESUMEN — segundo en DOM, aparece después del formulario en mobile --- */}
        <div className="lg:col-span-1 lg:order-2">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 md:p-6 lg:sticky lg:top-8">
            <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-6">{t('checkout.summary')}</h3>

            <div className="space-y-2 md:space-y-4 mb-3 md:mb-6">
              <div className="flex justify-between items-start gap-4">
                <span className="text-gray-600">{t('dashboard.product')}</span>
                <span className="font-medium text-right">{product.name}</span>
              </div>
              {orderData.customization?.size && (
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('album.size')}</span><span>{orderData.customization.size}</span>
                </div>
              )}
              
              {/* --- DESGLOSE EXCLUSIVO DE ÁLBUMES --- */}
              {isAlbum && (
                 <>
                   <div className="flex justify-between text-sm border-t border-gray-200 pt-3 mt-3">
                     <span className="text-gray-600">Álbum Base (40 págs)</span>
                     <span className="font-medium">${albumBasePrice.toLocaleString('es-CO')} COP</span>
                   </div>
                   {extraPagesCount > 0 && (
                     <div className="flex justify-between text-sm mt-2">
                       <span className="text-gray-600">Páginas Extra ({extraPagesCount} x ${albumExtraPagePrice.toLocaleString('es-CO')})</span>
                       <span className="font-medium">${extraPagesCost.toLocaleString('es-CO')} COP</span>
                     </div>
                   )}
                   <div className="flex justify-between text-sm mt-2 font-bold text-gray-800">
                     <span>Total Páginas</span>
                     <span>{totalPageCount}</span>
                   </div>
                 </>
              )}

              {/* --- DESGLOSE DE TAZAS --- */}
              {isMugType && (
                 <div className="flex justify-between text-sm border-t border-gray-200 pt-3 mt-3">
                   <span className="text-gray-600">Cantidad Tazas</span><span className="font-medium">{getMugCount()} x ${config.prices.mug.toLocaleString('es-CO')} COP</span>
                 </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('checkout.subtotal')}</span>
                <span>${subtotal.toLocaleString('es-CO')} COP</span>
              </div>
              
              {/* --- DESCUENTO DINÁMICO --- */}
              {config.discounts.active && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span className="flex items-center gap-1"><Tag className="w-4 h-4"/> Descuento ({config.discounts.percentage}%)</span>
                  <span>-${discountAmount.toLocaleString('es-CO')} COP</span>
                </div>
              )}

              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('checkout.shipping')}</span>
                  <span>
                    {isPickup
                      ? <span className="text-green-600 font-semibold">Gratis (recogida)</span>
                      : formData.city.trim() === ''
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
                <span className="text-2xl font-bold">${total.toLocaleString('es-CO')} COP</span>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <Truck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-snug">
                <span className="font-semibold">Tiempo de entrega de los álbumes:</span> 12 días hábiles a partir de la confirmación de la compra.
              </p>
            </div>

            <div className="mt-4 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{t('checkout.preview')}</p>
                <button type="button" onClick={() => setIsModalOpen(true)} className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"><Eye className="w-4 h-4" /> Ver completo</button>
              </div>

              <div className="aspect-square max-h-40 md:max-h-none rounded-lg overflow-hidden bg-white shadow-sm border border-gray-100 cursor-pointer hover:ring-2 hover:ring-black transition-all group" onClick={() => setIsModalOpen(true)}>
                {displayImage && displayImage !== justWhiteImg ? (
                  <div className="w-full h-full relative">
                    <img src={displayImage} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center"><Eye className="text-white w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" /></div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300"><ImageIcon className="w-16 h-16" /></div>
                )}
              </div>
              {orderData.coverData?.title && !isMugType && <p className="text-center mt-3 font-semibold text-gray-800">{orderData.coverData.title}</p>}
              {isMugType && (<button type="button" onClick={() => setIsModalOpen(true)} className="w-full mt-4 py-4 bg-white hover:bg-gray-50 rounded-xl flex items-center justify-center gap-3 border border-gray-200 hover:border-black transition-all shadow-sm group"><Coffee className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" /><span className="font-bold text-gray-700 group-hover:text-black">Revisar mis diseños</span></button>)}
            </div>
          </div>
        </div>

      </div>

      {/* Botón pagar mobile-only — aparece después del resumen */}
      <div className="mt-4 md:hidden">
        <button type="submit" form="checkout-form" disabled={isProcessing} className="w-full bg-black text-white py-4 rounded-xl hover:bg-gray-900 transition-all text-lg font-bold flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg shadow-gray-200">
          {isProcessing ? (<><Loader2 className="w-6 h-6 animate-spin" />{t('checkout.processing')}</>) : (<>{t('checkout.payNow', { total: `$${total.toLocaleString('es-CO')} COP` })}</>)}
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">{t('checkout.terms')}</p>
      </div>

      <OrderDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={modalOrderData}
        hideAddressInfo={true}
        onGoToEdit={() => navigate('/create', { state: { fromCheckout: true, orderId: state.orderId, productType: state.productType } })}
      />
    </div>
  );
}