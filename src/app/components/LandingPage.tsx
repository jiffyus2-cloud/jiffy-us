import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronDown, ShoppingBag, Palette, Image as ImageIcon, BookImage, Calendar, Coffee, Tag, Truck, Gift, Star } from 'lucide-react';
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
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);

  // Traemos SOLO las promociones de Firebase (eliminamos discounts para evitar el error)
  const { promotions } = useStoreConfig();
  const activePromotions = (promotions || []).filter(p => p.active);

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

  const testimonials = [
    { name: 'Sarah Johnson', rating: 5, comment: t('testimonial.1.comment'), avatar: 'https://images.unsplash.com/photo-1762613875432-1b80b1682905?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGN1c3RvbWVyJTIwcmV2aWV3JTIwc2F0aXNmYWN0aW9ufGVufDF8fHx8MTc3MTYxMjM2NXww&ixlib=rb-4.1.0&q=80&w=1080' },
    { name: 'Michael Chen', rating: 5, comment: t('testimonial.2.comment'), avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400' },
    { name: 'Emma Rodriguez', rating: 5, comment: t('testimonial.3.comment'), avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400' },
    { name: 'David Thompson', rating: 5, comment: t('testimonial.4.comment'), avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400' }
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
    }, 5000);
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
      <section className="relative h-[70vh] w-full overflow-hidden">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <div className="relative h-full w-full">
            <img
              src={heroImages[currentSlide].url}
              alt="Hero"
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-center justify-start z-20">
          <div className="text-left text-white pl-12 md:pl-24 pr-16 py-10 bg-white/40 max-w-4xl w-fit rounded-r-2xl backdrop-blur-sm">
            <motion.h1
              key={`title-${currentSlide}`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`${DESIGN.text.h1} text-[var(--color-black)]`}
            >
              {heroImages[currentSlide].title}
            </motion.h1>
            <motion.p
              key={`desc-${currentSlide}`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xl md:text-2xl mb-8 font-bold text-gray-800"
            >
              {heroImages[currentSlide].description}
            </motion.p>
            <motion.button
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={() => navigate('/create')}
              className={`${DESIGN.button.base} ${DESIGN.button.secondary}`}
            >
              {heroImages[currentSlide].cta}
            </motion.button>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-12 md:left-24 z-30 flex gap-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 transition-all rounded-full ${
                currentSlide === index ? 'w-8 bg-white' : 'w-2 bg-white/50'
              }`}
            />
          ))}
        </div>
      </section>

      {/* SECCIÓN DINÁMICA DE PROMOCIONES (Avisos Controlables) */}
      {activePromotions.length > 0 && (
        <section className="bg-white py-12 border-b border-gray-100">
          <div className={DESIGN.layout.container}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {activePromotions.map((promo, index) => (
                <motion.div
                  key={promo.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`p-6 rounded-2xl border-2 ${getColorClasses(promo.colorTheme)} flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow`}
                >
                  <div className="shrink-0">
                    {getIconComponent(promo.icon)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">{promo.title}</h3>
                    <p className="text-sm opacity-90 font-medium">{promo.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products Section - Bento Boxes */}
      <section className={DESIGN.layout.sectionGray}>
        <div className={DESIGN.layout.container}>
          <h2 className={DESIGN.text.h2}>{t('landing.ourProducts')}</h2>
          <p className={DESIGN.text.sectionSubtitle}>
            {t('landing.productsSubtitle')}
          </p>

          <div className={DESIGN.layout.grid}>
            {/* Photo Album - Large */}
            <div className={`md:col-span-2 md:row-span-2 ${DESIGN.card.base} ${DESIGN.card.interactive}`}>
              <div className="relative h-96 md:h-full">
                <img src={albumImage} alt="Photo Albums" className="w-full h-full object-cover" />
                <div className={DESIGN.card.overlay} />
                <div className={DESIGN.card.content}>
                  <BookImage className="w-12 h-12 mb-4" />
                  <h3 className={DESIGN.text.h3}>Álbumes de fotos</h3>
                  <p className="text-lg mb-4 text-gray-200">Cada recuerdo es único y merece ser contado. Álbumes personalizados para tus momentos más importantes.</p>
                  <button onClick={() => setSelectedProduct('album')} className={`${DESIGN.button.base} ${DESIGN.button.secondary} ${DESIGN.button.xs}`}>
                    {t('landing.more')}
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className={`${DESIGN.card.base} ${DESIGN.card.interactive}`}>
              <div className="relative h-96">
                <img src={calendarImage} alt="Photo Calendars" className="w-full h-full object-cover" />
                <div className={DESIGN.card.overlay} />
                <div className={DESIGN.card.content}>
                  <Calendar className="w-10 h-10 mb-3" />
                  <h3 className="text-2xl mb-2 font-medium">Calendarios</h3>
                  <p className="text-sm mb-3 text-gray-200">Tus días merecen la mejor sonrisa. Calendarios personalizados para recibir el día con la mejor actitud.</p>
                  <button onClick={() => setSelectedProduct('calendar')} className={`${DESIGN.button.base} ${DESIGN.button.secondary} ${DESIGN.button.xs}`}>
                    {t('landing.more')}
                  </button>
                </div>
              </div>
            </div>

            {/* Mugs (Renderizado condicional) */}
            {showMugs && (
              <div className={`${DESIGN.card.base} ${DESIGN.card.interactive}`}>
                <div className="relative h-96">
                  <img src={mugImage} alt="Photo Mugs" className="w-full h-full object-cover" />
                  <div className={DESIGN.card.overlay} />
                  <div className={DESIGN.card.content}>
                    <Coffee className="w-10 h-10 mb-3" />
                    <h3 className="text-2xl mb-2 font-medium">{t('product.mug')}</h3>
                    <p className="text-sm mb-3 text-gray-200">{t('product.mugDesc')}</p>
                    <button onClick={() => setSelectedProduct('mug')} className={`${DESIGN.button.base} ${DESIGN.button.secondary} ${DESIGN.button.xs}`}>
                      {t('landing.more')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Photo Packs - Wide (Renderizado condicional) */}
            {showPhotoPacks && (
              <div className={`md:col-span-3 ${DESIGN.card.base} ${DESIGN.card.interactive}`}>
                <div className="relative h-80">
                  <img src={photoPackImage} alt="Photo Packs" className="w-full h-full object-cover" />
                  <div className={DESIGN.card.overlay} />
                  <div className={DESIGN.card.content}>
                    <ImageIcon className="w-10 h-10 mb-3" />
                    <h3 className="text-2xl mb-2 font-medium">{t('product.photoPack')}</h3>
                    <p className="text-sm mb-3 text-gray-200">{t('product.photoPackDesc')}</p>
                    <button onClick={() => setSelectedProduct('photo-pack')} className={`${DESIGN.button.base} ${DESIGN.button.secondary} ${DESIGN.button.xs}`}>
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
        <div className="max-w-6xl mx-auto">
          <h2 className={DESIGN.text.h2}>{t('landing.simpleProcess')}</h2>
          <p className={DESIGN.text.sectionSubtitle}>{t('landing.processSubtitle')}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 mx-auto bg-black rounded-full flex items-center justify-center relative">
                  <ShoppingBag className="w-20 h-20 text-white opacity-20 absolute" />
                  <span className="text-6xl text-white font-bold relative z-10">1</span>
                </div>
                <div className="hidden md:block absolute top-16 left-[50%] w-full h-0.5 bg-gray-300 -z-10" />
              </div>
              <h3 className={DESIGN.text.h3}>{t('landing.step1Title')}</h3>
              <p className={DESIGN.text.body}>{t('landing.step1Desc')}</p>
            </div>

            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 mx-auto bg-black rounded-full flex items-center justify-center relative">
                  <Palette className="w-20 h-20 text-white opacity-20 absolute" />
                  <span className="text-6xl text-white font-bold relative z-10">2</span>
                </div>
                <div className="hidden md:block absolute top-16 left-[50%] w-full h-0.5 bg-gray-300 -z-10" />
              </div>
              <h3 className={DESIGN.text.h3}>{t('landing.step2Title')}</h3>
              <p className={DESIGN.text.body}>{t('landing.step2Desc')}</p>
            </div>

            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 mx-auto bg-black rounded-full flex items-center justify-center relative">
                  <ImageIcon className="w-20 h-20 text-white opacity-20 absolute" />
                  <span className="text-6xl text-white font-bold relative z-10">3</span>
                </div>
              </div>
              <h3 className={DESIGN.text.h3}>{t('landing.step3Title')}</h3>
              <p className={DESIGN.text.body}>{t('landing.step3Desc')}</p>
            </div>
          </div>

          <div className="text-center mt-16">
            <button onClick={() => navigate('/create')} className={`${DESIGN.button.base} ${DESIGN.button.primary}`}>
              {t('landing.startNow')}
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={DESIGN.layout.sectionGray}>
        <div className={DESIGN.layout.container}>
          <h2 className={DESIGN.text.h2}>{t('landing.testimonials')}</h2>
          <p className={DESIGN.text.sectionSubtitle}>{t('landing.testimonialsSubtitle')}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <img src={testimonial.avatar} alt={testimonial.name} className="w-16 h-16 rounded-full object-cover" />
                  <div>
                    <h4 className={DESIGN.text.label}>{testimonial.name}</h4>
                    <div className="flex gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <span key={i} className="text-yellow-400">★</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600">{testimonial.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={DESIGN.layout.section}>
        <div className={DESIGN.layout.containerNarrow}>
          <h2 className={DESIGN.text.h2}>Preguntas Frecuentes</h2>
          <p className={DESIGN.text.sectionSubtitle}>Resolvemos tus dudas principales para que disfrutes tu experiencia.</p>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <span className="text-xl font-medium">{faq.question}</span>
                  <ChevronDown className={`w-6 h-6 transition-transform ${openFaq === index ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === index && <div className={`px-6 pb-6 ${DESIGN.text.body}`}>{faq.answer}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={DESIGN.footer.wrapper}>
        <div className={DESIGN.layout.container}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <h3 className="text-2xl mb-4 font-medium">Photo Creator</h3>
              <p className="text-gray-400">{t('footer.description')}</p>
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
            <p>&copy; {new Date().getFullYear()} Photo Creator. {t('footer.rights')}</p>
          </div>
        </div>
      </footer>

      <ProductDetailsModal isOpen={selectedProduct !== null} onClose={() => setSelectedProduct(null)} productType={selectedProduct || 'album'} />
    </div>
  );
}