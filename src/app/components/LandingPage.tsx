// RECORDATORIO: Los nombres de los archivos importados (ej. carrusela.png) deben coincidir 
// exactamente con las mayúsculas/minúsculas del archivo real en el sistema de archivos 
// para evitar fallos en entornos de producción (Linux/Vercel).
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ShoppingBag, Palette, Image as ImageIcon, BookImage, Calendar, Coffee, Tag, Truck, Gift } from 'lucide-react';
import ProductDetailsModal from './ProductDetailsModal';
import type { ProductType } from './ProductSelection';
import { DESIGN } from '../../styles/design-system';
import { Header } from './navigation/Header';
import { useLanguage } from '../context/LanguageContext';

import albumImage from '../../assets/393887a967df563ed043288f1df82bb73bcc5ae3.png';
import mugImage from '../../assets/f4da798dda5ec8fb3dfb223bc7ad323042e3d27f.png';
import calendarImage from '../../assets/e10b8bcd9dce4c4659f29f62c8704217f6ab8e6a.png';

import CarruselA from '../../assets/carrusela.png';
import CarruselB from '../../assets/carruselb.png';
import CarruselC from '../../assets/carruselc.png';
import CarruselD from '../../assets/carruseld.png';

export default function LandingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);

  const heroImages = [
    {
      url: CarruselA,
      title: t('hero.1.title'),
      description: t('hero.1.desc'),
      highlight: t('hero.1.highlight')
    },
    {
      url: CarruselB,
      title: t('hero.2.title'),
      description: t('hero.2.desc'),
      highlight: t('hero.2.highlight')
    },
    {
      url: CarruselC,
      title: t('hero.3.title'),
      description: t('hero.3.desc'),
      highlight: t('hero.3.highlight')
    },
    {
      url: CarruselD,
      title: t('hero.4.title'),
      description: t('hero.4.desc'),
      highlight: t('hero.4.highlight')
    }
  ];

  const promotions = [
    {
      icon: <Tag className="w-8 h-8" />,
      title: t('promo.1.title'),
      desc: t('promo.1.desc'),
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    {
      icon: <Truck className="w-8 h-8" />,
      title: t('promo.2.title'),
      desc: t('promo.2.desc'),
      color: 'bg-green-50 text-green-700 border-green-200'
    },
    {
      icon: <Gift className="w-8 h-8" />,
      title: t('promo.3.title'),
      desc: t('promo.3.desc'),
      color: 'bg-purple-50 text-purple-700 border-purple-200'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      rating: 5,
      comment: t('testimonial.1.comment'),
      avatar: 'https://images.unsplash.com/photo-1762613875432-1b80b1682905?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGN1c3RvbWVyJTIwcmV2aWV3JTIwc2F0aXNmYWN0aW9ufGVufDF8fHx8MTc3MTYxMjM2NXww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      name: 'Michael Chen',
      rating: 5,
      comment: t('testimonial.2.comment'),
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
    },
    {
      name: 'Emma Rodriguez',
      rating: 5,
      comment: t('testimonial.3.comment'),
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'
    },
    {
      name: 'David Thompson',
      rating: 5,
      comment: t('testimonial.4.comment'),
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'
    }
  ];

  const faqs = [
    {
      question: t('faq.1.q'),
      answer: t('faq.1.a')
    },
    {
      question: t('faq.2.q'),
      answer: t('faq.2.a')
    },
    {
      question: t('faq.3.q'),
      answer: t('faq.3.a')
    },
    {
      question: t('faq.4.q'),
      answer: t('faq.4.a')
    },
    {
      question: t('faq.5.q'),
      answer: t('faq.5.a')
    }
  ];

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  return (
    <div className="w-full">
      <Header />
      {/* Hero Carousel Section */}
      <section className="relative h-[70vh] w-full overflow-hidden">
        <AnimatePresence mode="wait">
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
        </AnimatePresence>

        {/* Hero Content - Aligned to Left */}
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
              className="text-xl md:text-2xl mb-4 text-gray-800"
            >
              {heroImages[currentSlide].description}
            </motion.p>
            <motion.p
              key={`highlight-${currentSlide}`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xl md:text-2xl mb-8 font-bold text-gray-800"
            >
              {heroImages[currentSlide].highlight}
            </motion.p>
            <motion.button
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={() => navigate('/create')}
              className={`${DESIGN.button.base} ${DESIGN.button.secondary}`}
            >
              {t('landing.letsDesign')}
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

      {/* Promotions Panel */}
      <section className="bg-white py-12 border-b border-gray-100">
        <div className={DESIGN.layout.container}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {promotions.map((promo, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`p-6 rounded-2xl border-2 ${promo.color} flex items-center gap-5 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="shrink-0">
                  {promo.icon}
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
                <img
                  src={albumImage}
                  alt="Photo Albums"
                  className="w-full h-full object-cover"
                />
                <div className={DESIGN.card.overlay} />
                <div className={DESIGN.card.content}>
                  <BookImage className="w-12 h-12 mb-4" />
                  <h3 className={DESIGN.text.h3}>{t('product.album')}</h3>
                  <p className="text-lg mb-4 text-gray-200">
                    {t('product.albumDesc')}
                  </p>
                  <button
                    onClick={() => setSelectedProduct('album')}
                    className={`${DESIGN.button.base} ${DESIGN.button.secondary} ${DESIGN.button.xs}`}
                  >
                    {t('landing.more')}
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className={`${DESIGN.card.base} ${DESIGN.card.interactive}`}>
              <div className="relative h-96">
                <img
                  src={calendarImage}
                  alt="Photo Calendars"
                  className="w-full h-full object-cover"
                />
                <div className={DESIGN.card.overlay} />
                <div className={DESIGN.card.content}>
                  <Calendar className="w-10 h-10 mb-3" />
                  <h3 className="text-2xl mb-2 font-medium">{t('product.calendar')}</h3>
                  <p className="text-sm mb-3 text-gray-200">
                    {t('product.calendarDesc')}
                  </p>
                  <button
                    onClick={() => setSelectedProduct('calendar')}
                    className={`${DESIGN.button.base} ${DESIGN.button.secondary} ${DESIGN.button.xs}`}
                  >
                    {t('landing.more')}
                  </button>
                </div>
              </div>
            </div>

            {/* Mugs */}
            <div className={`${DESIGN.card.base} ${DESIGN.card.interactive}`}>
              <div className="relative h-96">
                <img
                  src={mugImage}
                  alt="Photo Mugs"
                  className="w-full h-full object-cover"
                />
                <div className={DESIGN.card.overlay} />
                <div className={DESIGN.card.content}>
                  <Coffee className="w-10 h-10 mb-3" />
                  <h3 className="text-2xl mb-2 font-medium">{t('product.mug')}</h3>
                  <p className="text-sm mb-3 text-gray-200">
                    {t('product.mugDesc')}
                  </p>
                  <button
                    onClick={() => setSelectedProduct('mug')}
                    className={`${DESIGN.button.base} ${DESIGN.button.secondary} ${DESIGN.button.xs}`}
                  >
                    {t('landing.more')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className={DESIGN.layout.section}>
        <div className="max-w-6xl mx-auto">
          <h2 className={DESIGN.text.h2}>{t('landing.simpleProcess')}</h2>
          <p className={DESIGN.text.sectionSubtitle}>
            {t('landing.processSubtitle')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 mx-auto bg-black rounded-full flex items-center justify-center relative">
                  <ShoppingBag className="w-20 h-20 text-white opacity-20 absolute" />
                  <span className="text-6xl text-white font-bold relative z-10">1</span>
                </div>
                {/* Connector Line */}
                <div className="hidden md:block absolute top-16 left-[50%] w-full h-0.5 bg-gray-300 -z-10" />
              </div>
              <h3 className={DESIGN.text.h3}>{t('landing.step1Title')}</h3>
              <p className={DESIGN.text.body}>
                {t('landing.step1Desc')}
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 mx-auto bg-black rounded-full flex items-center justify-center relative">
                  <Palette className="w-20 h-20 text-white opacity-20 absolute" />
                  <span className="text-6xl text-white font-bold relative z-10">2</span>
                </div>
                {/* Connector Line */}
                <div className="hidden md:block absolute top-16 left-[50%] w-full h-0.5 bg-gray-300 -z-10" />
              </div>
              <h3 className={DESIGN.text.h3}>{t('landing.step2Title')}</h3>
              <p className={DESIGN.text.body}>
                {t('landing.step2Desc')}
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 mx-auto bg-black rounded-full flex items-center justify-center relative">
                  <ImageIcon className="w-20 h-20 text-white opacity-20 absolute" />
                  <span className="text-6xl text-white font-bold relative z-10">3</span>
                </div>
              </div>
              <h3 className={DESIGN.text.h3}>{t('landing.step3Title')}</h3>
              <p className={DESIGN.text.body}>
                {t('landing.step3Desc')}
              </p>
            </div>
          </div>

          <div className="text-center mt-16">
            <button
              onClick={() => navigate('/create')}
              className={`${DESIGN.button.base} ${DESIGN.button.primary}`}
            >
              {t('landing.startNow')}
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={DESIGN.layout.sectionGray}>
        <div className={DESIGN.layout.container}>
          <h2 className={DESIGN.text.h2}>{t('landing.testimonials')}</h2>
          <p className={DESIGN.text.sectionSubtitle}>
            {t('landing.testimonialsSubtitle')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
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
          <h2 className={DESIGN.text.h2}>{t('landing.faq')}</h2>
          <p className={DESIGN.text.sectionSubtitle}>
            {t('landing.faqSubtitle')}
          </p>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border-2 border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xl font-medium">{faq.question}</span>
                  <ChevronDown
                    className={`w-6 h-6 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className={`px-6 pb-6 ${DESIGN.text.body}`}>
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={DESIGN.footer.wrapper}>
        <div className={DESIGN.layout.container}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div>
              <h3 className="text-2xl mb-4 font-medium">Photo Creator</h3>
              <p className="text-gray-400">
                {t('footer.description')}
              </p>
            </div>

            {/* Products */}
            <div>
              <h4 className={DESIGN.text.footerHeading}>{t('footer.products')}</h4>
              <ul className="space-y-2">
                <li><a href="#" className={DESIGN.text.footerLink}>{t('product.album')}</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>{t('product.calendar')}</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>{t('product.mug')}</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>{t('footer.helpCenter')}</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className={DESIGN.text.footerHeading}>{t('footer.support')}</h4>
              <ul className="space-y-2">
                <li><a href="#" className={DESIGN.text.footerLink}>{t('footer.helpCenter')}</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>{t('footer.shippingInfo')}</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>{t('footer.returns')}</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>{t('footer.contactUs')}</a></li>
              </ul>
            </div>

            {/* Legal */}
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
            <p>&copy; 2026 Photo Creator. {t('footer.rights')}</p>
          </div>
        </div>
      </footer>

      {/* Product Details Modal */}
      <ProductDetailsModal
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
        productType={selectedProduct || 'album'}
      />
    </div>
  );
}