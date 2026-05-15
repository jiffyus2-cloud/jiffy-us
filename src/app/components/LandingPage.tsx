import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronDown, ShoppingBag, Tag, Truck, Gift, Star } from 'lucide-react';
import ProductDetailsModal from './ProductDetailsModal';
import type { ProductType } from './ProductSelection';
import { DESIGN } from '../../styles/design-system';
import { Header } from './navigation/Header';
import { useLanguage } from '../context/LanguageContext';

// --- IMPORTAMOS EL CONTEXTO DINÁMICO ---
import { useStoreConfig } from '../context/StoreConfigContext';

// --- IMÁGENES DE LOS PRODUCTOS ACTUALIZADAS ---
import albumImage from '../../assets/IMG_8973.jpg';
import mugImage from '../../assets/f4da798dda5ec8fb3dfb223bc7ad323042e3d27f.png';
import calendarImage from '../../assets/Calendario.jpg';
import photoPackImage from '../../assets/926a104c374871caf4fcad0882de38be9da36b8a.png';

// --- NUEVAS IMÁGENES DEL CARRUSEL ---
import Slide1 from '../../assets/Carousel/c4.jpg';
import Slide2 from '../../assets/Carousel/C100164.jpg';
import Slide3 from '../../assets/Carousel/c8.jpg';
import Slide4 from '../../assets/Carousel/C100153.jpg';

export default function LandingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);

  // Traemos SOLO las promociones de Firebase (eliminamos discounts para evitar el error)
  const { promotions, configLoaded } = useStoreConfig();
  const activePromotions = configLoaded ? (promotions || []).filter(p => p.active) : [];

  const showMugs = import.meta.env.VITE_SHOW_MUGS === 'true';
  const showPhotoPacks = import.meta.env.VITE_SHOW_PHOTO_PACKS === 'true';

  // --- NUEVOS TEXTOS DEL CARRUSEL ---
  const heroImages = [
    { 
      url: Slide1, 
      title: 'Esos momentos que no quieres olvidar', 
      description: 'Cada photobook es un pedacito de tu historia', 
      cta: 'Vamos a Diseñar' 
    },
    { 
      url: Slide2, 
      title: 'Tus momentos en las mejores manos', 
      description: 'Porque tus recuerdos merecen lo mejor', 
      cta: 'Vamos a Diseñar' 
    },
    { 
      url: Slide3, 
      title: 'Lo que más amas, siempre cerca de ti', 
      description: 'Que cada día te recuerde lo que realmente importa', 
      cta: 'Vamos a Diseñar' 
    },
    { 
      url: Slide4, 
      title: 'Recuerdos que vuelves a sentir cada vez que los miras', 
      description: 'Llena tus días de momentos que amas', 
      cta: 'Vamos a Diseñar' 
    }
  ];

  // --- PREGUNTAS FRECUENTES (Desde tu documento) ---
  const faqs = [
    {
      question: '1. ¿Cómo creo mi álbum Jiffy?',
      answer: (
        <div className="space-y-2">
          <p>Crear tu álbum es muy fácil:</p>
          <ul className="list-disc pl-5">
            <li>Elige el tipo de álbum que más te guste.</li>
            <li>Personaliza tu portada con título, colores y detalles.</li>
            <li>Selecciona tus fotos desde el celular o computador.</li>
            <li>Aprueba el diseño digital.</li>
            <li>¡Recibe tu álbum en casa!</li>
          </ul>
        </div>
      )
    },
    {
      question: '2. ¿Qué tipos de álbumes ofrecen?',
      answer: (
        <div className="space-y-2">
          <p>Contamos con 4 formatos:</p>
          <ul className="list-disc pl-5">
            <li>20x20 cm</li>
            <li>30x30 cm</li>
            <li>Vertical 21x28 cm</li>
            <li>Horizontal 28x21 cm</li>
          </ul>
        </div>
      )
    },
    {
      question: '3. ¿Cuánto tiempo tarda la entrega?',
      answer: 'El tiempo de producción es de 10 días hábiles después de que apruebes el diseño. El envío depende de tu ciudad, pero normalmente llega en 2 a 5 días hábiles adicionales.'
    },
    {
      question: '4. ¿Hacen envíos a todo el país?',
      answer: 'Sí. Enviamos a cualquier ciudad de Colombia mediante transportadoras confiables.'
    },
    {
      question: '5. ¿Cómo se realiza el pago?',
      answer: 'Puedes pagar por tarjeta de crédito o débito (link de pago).'
    },
    {
      question: '6. ¿Puedo regalar un álbum Jiffy?',
      answer: '¡Claro! 🎁 Tenemos bonos de regalo para que la persona que quieras pueda crear su álbum con sus propias fotos y estilo.'
    },
    {
      question: '7. ¿Cuántas fotos puedo incluir?',
      answer: 'Generalmente recomendamos entre 40 y 120 fotos para que el álbum quede bien organizado y visualmente equilibrado. Si tienes más, puedes agregar páginas hasta un total de 250 páginas por álbum.'
    },
    {
      question: '8. ¿Puedo hacer cambios en el diseño?',
      answer: 'Sí. Después de terminar tu álbum lo puedes revisar en vista previa y ahí podrás realizar ajustes en portada, orden de fotos o textos.'
    },
    {
      question: '9. ¿Las fotos pierden calidad al imprimirse?',
      answer: 'Trabajamos con impresión de alta resolución. Recomendamos subir las fotos en la mejor calidad posible (evita capturas de pantalla o fotos descargadas de WhatsApp, porque suelen perder nitidez).'
    },
    {
      question: '10. ¿Qué otros productos ofrece Jiffy además de álbumes?',
      answer: 'Además de álbumes, también tenemos calendarios, imanes, mugs e impresión de fotos que puedes personalizar para ti o para regalar.'
    },
    {
      question: '11. Política de calidad de imagen e impresión',
      answer: 'En Jiffy cuidamos cada detalle para que tus recuerdos se vean lo mejor posible. Sin embargo, es importante tener en cuenta que los colores pueden variar ligeramente entre lo que ves en pantalla y el resultado impreso. Esto se debe a que las pantallas emiten luz, mientras que la impresión se realiza con tinta sobre papel, lo que puede generar pequeñas diferencias en tonos y brillo. Trabajamos con estándares de impresión profesional para lograr la mayor fidelidad posible en cada álbum.'
    },
    {
      question: '12. ¿Qué formatos de archivos aceptan para las fotos?',
      answer: 'Aceptamos formatos JPG, PNG y HEIC. Para obtener la mejor calidad, recomendamos imágenes con una resolución mayor a 300 dpi.'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  // Diccionario Dinámico de Íconos
  const getIconComponent = (iconName: string) => {
    switch(iconName) {
      case 'Truck': return <Truck className="w-8 h-8" />;
      case 'Gift': return <Gift className="w-8 h-8" />;
      case 'Star': return <Star className="w-8 h-8" />;
      case 'ShoppingBag': return <ShoppingBag className="w-8 h-8" />;
      case 'Tag':
      default: return <Tag className="w-8 h-8" />;
    }
  };

  // Diccionario Dinámico de Colores
  const getColorClasses = (theme: string) => {
    switch(theme) {
      case 'green': return 'bg-green-50 text-green-700 border-green-200';
      case 'purple': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'amber': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'rose': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'blue':
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="w-full">
      <Header />
      
      {/* Hero Carousel Section */}
      <section className="relative h-[60vh] w-full overflow-hidden">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <img
            src={heroImages[currentSlide].url}
            alt="Hero"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-end z-20">
          <div className="w-full px-8 md:px-16 py-10 bg-gradient-to-t from-black/60 to-transparent">
            <motion.h1
              key={`title-${currentSlide}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl font-medium mb-2 text-white max-w-2xl"
            >
              {heroImages[currentSlide].title}
            </motion.h1>
            <motion.p
              key={`desc-${currentSlide}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-base text-white/80 mb-5 max-w-lg"
            >
              {heroImages[currentSlide].description}
            </motion.p>
            <motion.button
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={() => navigate('/create')}
              className="px-6 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              {heroImages[currentSlide].cta}
            </motion.button>
          </div>
        </div>

      </section>

      {/* Promociones */}
      {activePromotions.length > 0 && (
        <section className="bg-gray-50 py-5 border-b border-gray-100">
          <div className={DESIGN.layout.container}>
            <div className="flex flex-col md:flex-row gap-3">
              {activePromotions.map((promo, index) => (
                <motion.div
                  key={promo.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: index * 0.08 }}
                  viewport={{ once: true }}
                  className={`flex-1 px-4 py-3 rounded-lg border ${getColorClasses(promo.colorTheme)} flex items-center gap-3`}
                >
                  <div className="shrink-0 opacity-70">
                    {getIconComponent(promo.icon)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-tight">{promo.title}</h3>
                    <p className="text-xs opacity-80 leading-snug mt-0.5">{promo.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products Section */}
      <section className="pt-2 pb-16 px-4 bg-gray-50">
        <div className={DESIGN.layout.container}>
          <h2 className={DESIGN.text.h2}>{t('landing.ourProducts')}</h2>

          <div className={DESIGN.layout.grid}>
            {/* Photo Album */}
            <div className={`${DESIGN.card.base} ${DESIGN.card.interactive}`}>
              <div className="relative h-72">
                <img src={albumImage} alt="Photo Albums" className="w-full h-full object-cover" />
                <div className={DESIGN.card.overlay} />
                <div className={DESIGN.card.content}>
                  <h3 className="text-xl font-medium mb-1">Álbumes de fotos</h3>
                  <button onClick={() => setSelectedProduct('album')} className="px-4 py-1.5 rounded-md bg-white text-black text-sm hover:bg-gray-100 transition-colors">
                    {t('landing.more')}
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className={`${DESIGN.card.base} ${DESIGN.card.interactive}`}>
              <div className="relative h-72">
                <img src={calendarImage} alt="Photo Calendars" className="w-full h-full object-cover" />
                <div className={DESIGN.card.overlay} />
                <div className={DESIGN.card.content}>
                  <h3 className="text-lg font-medium mb-1">Calendarios</h3>
                  <button onClick={() => setSelectedProduct('calendar')} className="px-4 py-1.5 rounded-md bg-white text-black text-sm hover:bg-gray-100 transition-colors">
                    {t('landing.more')}
                  </button>
                </div>
              </div>
            </div>

            {showMugs && (
              <div className={`${DESIGN.card.base} ${DESIGN.card.interactive}`}>
                <div className="relative h-72">
                  <img src={mugImage} alt="Photo Mugs" className="w-full h-full object-cover" />
                  <div className={DESIGN.card.overlay} />
                  <div className={DESIGN.card.content}>
                    <h3 className="text-lg font-medium mb-1">{t('product.mug')}</h3>
                    <button onClick={() => setSelectedProduct('mug')} className="px-4 py-1.5 rounded-md bg-white text-black text-sm hover:bg-gray-100 transition-colors">
                      {t('landing.more')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showPhotoPacks && (
              <div className={`md:col-span-3 ${DESIGN.card.base} ${DESIGN.card.interactive}`}>
                <div className="relative h-56">
                  <img src={photoPackImage} alt="Photo Packs" className="w-full h-full object-cover" />
                  <div className={DESIGN.card.overlay} />
                  <div className={DESIGN.card.content}>
                    <h3 className="text-lg font-medium mb-1">{t('product.photoPack')}</h3>
                    <button onClick={() => setSelectedProduct('photo-pack')} className="px-4 py-1.5 rounded-md bg-white text-black text-sm hover:bg-gray-100 transition-colors">
                      {t('landing.more')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className={DESIGN.layout.section}>
        <div className="max-w-5xl mx-auto">
          <h2 className={DESIGN.text.h2}>{t('landing.simpleProcess')}</h2>
          <p className={DESIGN.text.sectionSubtitle}>{t('landing.processSubtitle')}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-black rounded-full flex items-center justify-center mb-4">
                <span className="text-white text-sm font-semibold">1</span>
              </div>
              <h3 className={DESIGN.text.h3}>{t('landing.step1Title')}</h3>
              <p className={DESIGN.text.body}>{t('landing.step1Desc')}</p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-black rounded-full flex items-center justify-center mb-4">
                <span className="text-white text-sm font-semibold">2</span>
              </div>
              <h3 className={DESIGN.text.h3}>{t('landing.step2Title')}</h3>
              <p className={DESIGN.text.body}>{t('landing.step2Desc')}</p>
            </div>

            <div className="text-center">
              <div className="w-10 h-10 mx-auto bg-black rounded-full flex items-center justify-center mb-4">
                <span className="text-white text-sm font-semibold">3</span>
              </div>
              <h3 className={DESIGN.text.h3}>{t('landing.step3Title')}</h3>
              <p className={DESIGN.text.body}>{t('landing.step3Desc')}</p>
            </div>
          </div>

          <div className="text-center mt-10">
            <button onClick={() => navigate('/create')} className={`${DESIGN.button.base} ${DESIGN.button.primary}`}>
              {t('landing.startNow')}
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={`px-4 bg-gray-50 ${isFaqOpen ? 'py-16' : 'py-2'}`}>
        <div className={DESIGN.layout.containerNarrow}>
          <button
            onClick={() => setIsFaqOpen(p => !p)}
            className="w-full flex items-center justify-between text-left mb-0"
          >
            <h2 className={`${DESIGN.text.h2} mb-0`}>Preguntas Frecuentes</h2>
            <ChevronDown className={`w-6 h-6 text-gray-400 transition-transform duration-300 shrink-0 ${isFaqOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFaqOpen && (
            <>
              <p className={`${DESIGN.text.sectionSubtitle} mt-3`}>Resolvemos tus dudas principales para que disfrutes tu experiencia.</p>
              <div className="divide-y divide-gray-200 mt-4">
                {faqs.map((faq, index) => (
                  <div key={index}>
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full py-4 text-left flex items-center justify-between hover:text-gray-700 transition-colors"
                    >
                      <span className="text-sm font-medium pr-4">{faq.question}</span>
                      <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === index && (
                      <div className="pb-4 text-sm text-gray-600">{faq.answer}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className={DESIGN.footer.wrapper}>
        <div className={DESIGN.layout.container}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <p className="text-sm text-gray-500 mt-1">{t('footer.description')}</p>
            </div>
            <div>
              <h4 className={DESIGN.text.footerHeading}>{t('footer.products')}</h4>
              <ul className="space-y-2">
                <li><a href="#" className={DESIGN.text.footerLink}>{t('product.album')}</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>{t('product.calendar')}</a></li>
                {showMugs && <li><a href="#" className={DESIGN.text.footerLink}>{t('product.mug')}</a></li>}
                {showPhotoPacks && <li><a href="#" className={DESIGN.text.footerLink}>{t('product.photoPack')}</a></li>}
              </ul>
            </div>
            <div>
              <h4 className={DESIGN.text.footerHeading}>{t('footer.support')}</h4>
              <ul className="space-y-2">
                <li><a href="#" className={DESIGN.text.footerLink}>{t('footer.helpCenter')}</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>{t('footer.shippingInfo')}</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>{t('footer.returns')}</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>{t('footer.contactUs')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className={DESIGN.text.footerHeading}>{t('footer.legal')}</h4>
              <ul className="space-y-2">
                <li><a href="#" className={DESIGN.text.footerLink}>{t('footer.privacyPolicy')}</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>{t('footer.termsOfService')}</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>{t('footer.cookiePolicy')}</a></li>
              </ul>
            </div>
          </div>
          <div className={DESIGN.footer.bottom}>
            <p>&copy; {new Date().getFullYear()} Jiffy. {t('footer.rights')}</p>
          </div>
        </div>
      </footer>

      <ProductDetailsModal isOpen={selectedProduct !== null} onClose={() => setSelectedProduct(null)} productType={selectedProduct || 'album'} />
    </div>
  );
}