import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { CreditCard, Lock, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { saveCompleteOrder } from '../../services/orderService';
import { useAuth } from '../../hooks/useAuth';
import type { Album, Calendar, MugProduct, PhotoPack } from '../types/products';

// Configuración de Stripe y Backend mediante variables de entorno con fallbacks
const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_51T9a093Pe5TEvfZ9b4qRxjsXCyTqa4TJBrpg0W8XBvGRx8vTiOzmGeBebqhK1Q3asgg3e9RNXkieH2RmTUfkxvY500R14E9ytM';
const API_URL = import.meta.env.VITE_API_URL || 'https://jiffy-us-938778636106.europe-west1.run.app';

const stripePromise = loadStripe(STRIPE_PUBLIC_KEY);

type Product = Album | Calendar | MugProduct | PhotoPack;

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // designData incluye customization, coverData, photos, pageLayouts, textBoxSlots, photoCrops
  const [designData, setDesignData] = useState(state?.designData || null);
  const [product, setProduct] = useState<Product | null>(state?.product || null);

  // Persistencia en sessionStorage para evitar pérdida de datos al refrescar
  useEffect(() => {
    if (state?.designData && state?.product) {
      try {
        // Intenta guardar los datos del diseño y producto en sessionStorage.
        // Esto puede fallar si los datos (especialmente imágenes en base64) son demasiado grandes.
        sessionStorage.setItem('pending_checkout_design', JSON.stringify(state.designData));
        sessionStorage.setItem('pending_checkout_product', JSON.stringify(state.product));
      } catch (error) {
        if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)) {
          // Si se excede la cuota, la app no se romperá, pero los datos no persistirán si se refresca la página.
          // Se muestra una advertencia en la consola para el desarrollador, sin interrumpir al usuario.
          console.warn(
            "Advertencia: No se pudieron guardar los datos del pedido en sessionStorage porque exceden el límite de tamaño. " +
            "Si el usuario refresca la página, se perderán los datos del checkout."
          );
        } else {
          console.error("Error inesperado al guardar en sessionStorage:", error);
        }
      }
    } else {
      const savedDesign = sessionStorage.getItem('pending_checkout_design');
      const savedProduct = sessionStorage.getItem('pending_checkout_product');
      if (savedDesign && savedProduct) {
        try {
          setDesignData(JSON.parse(savedDesign));
          setProduct(JSON.parse(savedProduct));
        } catch (parseError) {
          console.error("Error al parsear los datos de sessionStorage:", parseError);
          // Limpiar datos corruptos para evitar futuros errores
          sessionStorage.removeItem('pending_checkout_design');
          sessionStorage.removeItem('pending_checkout_product');
        }
      }
    }
  }, [state]);

  const [formData, setFormData] = useState({
    name: '',
    email: user?.email || '',
    address: '',
    city: '',
    zipCode: '',
    // Billing
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

  if (!designData || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl mb-4 font-semibold">No se encontraron datos del pedido</h2>
        <p className="text-gray-600 mb-8 text-center max-w-md">
          Parece que la sesión de compra ha expirado o no se han proporcionado los datos necesarios.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const calculateTotal = () => {
    if (!product || !designData) {
      return 0;
    }

    const basePrice = (product as any).basePrice || 0;

    // El objeto 'product' del estado debe tener una propiedad 'type'.
    switch ((product as any).type) {
      case 'album':
        // El precio podría depender del tamaño o las páginas, pero asumimos el precio base por ahora.
        // Esta lógica se puede expandir.
        return basePrice;

      case 'calendar':
        // El precio del calendario es probablemente fijo.
        return basePrice;

      case 'mug': {
        const material = designData.customization?.material;
        let materialSurcharge = 0;
        // Esta lógica se basa en MugCustomization.tsx y debe mantenerse sincronizada.
        if (material === 'porcelain') materialSurcharge = 3;
        else if (material === 'stainless-steel') materialSurcharge = 4;
        
        const pricePerMug = basePrice + materialSurcharge;
        const numberOfMugs = designData.mugItems?.length || 0;
        return pricePerMug * numberOfMugs;
      }

      case 'photo-pack': {
        // Para los paquetes de fotos, el precio base es por foto.
        const numberOfPhotos = designData.photos?.length || 0;
        return basePrice * numberOfPhotos;
      }

      default:
        // Fallback para tipos desconocidos o productos con un campo 'price' simple.
        return (product as any).price || basePrice;
    }
  };

  const subtotal = calculateTotal();
  const shipping = 9.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!user) {
      setErrorMessage('Debes iniciar sesión para completar tu pedido.');
      return;
    }

    // Validar que no haya páginas vacías en el álbum antes de proceder.
    // Esto asegura que se cumpla la regla de negocio de tener al menos una foto por página.
    if ((product as any)?.type === 'album' && Array.isArray(designData?.photos)) {
      const hasEmptyPages = designData.photos.some(
        (page: unknown[]) => Array.isArray(page) && page.length === 0
      );
      if (hasEmptyPages) {
        setErrorMessage(
          'Tu álbum contiene páginas vacías. Por favor, vuelve a la edición y asegúrate de que cada página tenga al menos una foto.'
        );
        return;
      }
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

      // 1. EL FILTRO ESTRICTO: Reconstruimos 'customization' solo con texto puro
      const cleanCustomization = {
        size: designData?.customization?.size ? String(designData.customization.size) : '',
        material: designData?.customization?.material ? String(designData.customization.material) : '',
        // Se ignoran clases de React, objetos File o arrays anidados que causan el error
      };

      // Clonamos el diseño, pero le inyectamos nuestra versión desinfectada
      const cleanDesignData = {
        ...designData,
        customization: cleanCustomization
      };

      // 2. Guardar el pedido completo en Firestore con la data limpia
      const orderId = await saveCompleteOrder(
        user.uid,
        cleanDesignData,
        { shippingAddress, billingAddress },
        product,
        total,
        'pending_payment'
      );

      // 3. Guardar el ID en localStorage
      localStorage.setItem('pending_order_id', orderId);

      // 4. Llamada a tu Backend en Google Cloud (con la corrección matemática de centavos)
      // ... tu código fetch anterior ...
     // 4. Llamada a tu Backend en Google Cloud
     const response = await fetch('https://jiffy-backend-938778636106.europe-west1.run.app/stripe/create-checkout', {
      method: 'POST', // <-- ¡Esto es lo que nos faltaba en el intento anterior!
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(total * 100), 
        title: product.name || 'Álbum Jiffy', 
        orderId: orderId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al crear la sesión de pago');
    }

    // Extraemos la respuesta completa del Backend
    const sessionData = await response.json();

    // El objeto que devuelve Stripe desde el Backend contiene la 'url' directa
    if (sessionData && sessionData.url) {
      // ¡Viaje directo a Stripe usando JavaScript nativo!
      window.location.href = sessionData.url;
    } else {
      throw new Error('El servidor no devolvió la URL de pago de Stripe.');
    }

    } catch (error: any) {
      // ... tu código catch anterior ...
      console.error('Error en el proceso de pago:', error);
      setErrorMessage(error.message || 'Hubo un error al procesar el pago. Por favor intenta de nuevo.');
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
          onClick={() => navigate('/create', { state: { designData, product } })}
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-black"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Volver a la edición</span>
        </button>
      </div>

      <h2 className="text-3xl font-bold mb-8">Finalizar Compra</h2>

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
            <h3 className="text-xl font-bold mb-6">Resumen del Pedido</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-start gap-4">
                <span className="text-gray-600">Producto</span>
                <span className="font-medium text-right">{product.name}</span>
              </div>
              {designData.customization?.size && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tamaño</span>
                  <span>{designData.customization.size}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Envío</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Impuestos (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t-2 border-gray-200 mt-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500 font-medium mb-4 uppercase tracking-wider">Vista previa de la portada</p>
              <div className="aspect-[3/4] rounded-lg overflow-hidden bg-white shadow-sm border border-gray-100">
                {designData.coverData.image && (
                  <img
                    src={designData.coverData.image}
                    alt="Portada del álbum"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <p className="text-center mt-3 font-semibold text-gray-800">{designData.coverData.title}</p>
              {designData.coverData.subtitle && (
                <p className="text-center text-sm text-gray-500">{designData.coverData.subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Formulario de Checkout */}
        <div className="lg:col-span-2 lg:order-1">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Información de Contacto */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 bg-black text-white rounded-full text-sm">1</span>
                Información de Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-gray-700">Nombre Completo *</label>
                  <input
                    type="text" id="name" name="name" required
                    value={formData.name} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">Correo Electrónico *</label>
                  <input
                    type="email" id="email" name="email" required
                    value={formData.email} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    placeholder="juan@ejemplo.com"
                  />
                </div>
              </div>
            </div>

            {/* Dirección de Envío */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 bg-black text-white rounded-full text-sm">2</span>
                Dirección de Envío
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium text-gray-700">Dirección y Número *</label>
                  <input
                    type="text" id="address" name="address" required
                    value={formData.address} onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    placeholder="Calle, número, piso/depto"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="city" className="text-sm font-medium text-gray-700">Ciudad *</label>
                    <input
                      type="text" id="city" name="city" required
                      value={formData.city} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="zipCode" className="text-sm font-medium text-gray-700">Código Postal *</label>
                    <input
                      type="text" id="zipCode" name="zipCode" required
                      value={formData.zipCode} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dirección de Facturación */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 bg-black text-white rounded-full text-sm">3</span>
                Dirección de Facturación
              </h3>
              
              <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <input
                  type="checkbox" id="sameAsShipping" name="sameAsShipping"
                  checked={formData.sameAsShipping} onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                />
                <span className="text-sm text-gray-700">Usar la misma dirección que el envío</span>
              </label>
              
              {!formData.sameAsShipping && (
                <div className="space-y-6 mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label htmlFor="billingName" className="text-sm font-medium text-gray-700">Nombre del Titular *</label>
                    <input
                      type="text" id="billingName" name="billingName" required
                      value={formData.billingName} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="billingAddress" className="text-sm font-medium text-gray-700">Dirección de Facturación *</label>
                    <input
                      type="text" id="billingAddress" name="billingAddress" required
                      value={formData.billingAddress} onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="billingCity" className="text-sm font-medium text-gray-700">Ciudad *</label>
                      <input
                        type="text" id="billingCity" name="billingCity" required
                        value={formData.billingCity} onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="billingZipCode" className="text-sm font-medium text-gray-700">CP *</label>
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

            {/* Información de Pago Seguro */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Pago Seguro con Stripe</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                Para tu seguridad, serás redirigido a la plataforma oficial de Stripe. 
                Tus datos bancarios están cifrados y nunca son almacenados en nuestros servidores.
              </p>
              <div className="items-center gap-2 text-xs font-medium text-gray-500 bg-white p-3 rounded-lg border border-gray-100 inline-flex">
                <Lock className="w-3.5 h-3.5" />
                <span>CONEXIÓN CIFRADA SSL DE 256 BITS</span>
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
                  Procesando pedido...
                </>
              ) : (
                <>
                  Pagar Ahora - ${total.toFixed(2)}
                </>
              )}
            </button>
            
            <p className="text-center text-xs text-gray-400">
              Al hacer clic en "Pagar Ahora", aceptas nuestros términos y condiciones y política de privacidad.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
