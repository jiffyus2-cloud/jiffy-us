import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronDown, ShoppingBag, Tag, Truck, Gift, Star } from 'lucide-react';
import ProductDetailsModal from './ProductDetailsModal';
import type { ProductType } from './ProductSelection';
import { DESIGN } from '../../styles/design-system';
import { Header } from './navigation/Header';
import { useLanguage } from '../context/LanguageContext';
import { RichBlock } from './ui/RichText';

/** Preguntas frecuentes: faq.1 … faq.N en los textos de la tienda. */
const FAQ_COUNT = 12;

/** Duración del fundido entre diapositivas del carrusel. */
const HERO_FADE_MS = 1000;

// --- IMPORTAMOS EL CONTEXTO DINÁMICO ---
import { useStoreConfig } from '../context/StoreConfigContext';

// --- IMÁGENES DEL SISTEMA (sustituibles desde el panel de administración) ---
import { useSystemImage, useCarouselSlides, useSystemImages } from '../context/SystemImagesContext';
import StoreImage from './ui/StoreImage';

export default function LandingPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);

  // Cada imagen sale del panel de administración si la han cambiado; si no, del asset original.
  const albumImage = useSystemImage('landing.product.album');
  const calendarImage = useSystemImage('landing.product.calendar');
  // Diapositivas (imagen + textos) tal y como las haya dejado la administración.
  const heroImages = useCarouselSlides();
  const { loaded: imagesLoaded } = useSystemImages();
  // Diapositivas cuya imagen ya terminó de cargar: los textos esperan a su
  // imagen, y el carrusel no avanza a una que aún no se puede ver.
  const [readyHeroUrls, setReadyHeroUrls] = useState<Set<string>>(() => new Set());
  const markHeroReady = useCallback((url: string) => {
    setReadyHeroUrls(prev => (prev.has(url) ? prev : new Set(prev).add(url)));
  }, []);
  // Diapositiva que se está yendo: se queda opaca DEBAJO mientras la nueva
  // aparece encima, para que entre una y otra nunca se vea el fondo.
  const [leavingSlide, setLeavingSlide] = useState<number | null>(null);

  // Traemos SOLO las promociones de Firebase (eliminamos discounts para evitar el error)
  const { promotions, configLoaded } = useStoreConfig();
  const activePromotions = configLoaded ? (promotions || []).filter(p => p.active) : [];

  // 3 por fila en md con gap-5 (1.25rem): (100% - 2×1.25rem)/3
  const CARD_WIDTH = 'w-full md:w-[calc(33.333%_-_0.834rem)]';

  // --- PREGUNTAS FRECUENTES ---
  // Texto editable desde "Textos de la Tienda" (faq.N.q / faq.N.a). En las
  // respuestas, las líneas que empiezan por "- " salen como lista.
  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    question: t(`faq.${i + 1}.q`),
    answer: t(`faq.${i + 1}.a`),
  }));

  // Si la administración borra diapositivas, el índice puede quedar apuntando
  // fuera de la lista: se recorta al pintar en vez de reventar con undefined.
  const activeIndex = Math.min(currentSlide, Math.max(heroImages.length - 1, 0));
  const activeSlide = heroImages.length > 0 ? heroImages[activeIndex] : null;

  // El temporizador lee lo último sin reiniciarse cada vez que carga una imagen.
  const heroStateRef = useRef({ heroImages, readyHeroUrls, activeIndex });
  heroStateRef.current = { heroImages, readyHeroUrls, activeIndex };

  useEffect(() => {
    if (heroImages.length <= 1) return;
    let clearLeaving: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      const { heroImages: slides, readyHeroUrls: ready, activeIndex: current } = heroStateRef.current;
      const next = (current + 1) % slides.length;
      // Si la siguiente aún no ha cargado, se espera en la actual en vez de
      // fundirse hacia un hueco en blanco.
      if (!ready.has(slides[next].url)) return;
      setLeavingSlide(current);
      setCurrentSlide(next);
      clearTimeout(clearLeaving);
      clearLeaving = setTimeout(() => setLeavingSlide(null), HERO_FADE_MS);
    }, 10000);
    return () => {
      clearInterval(timer);
      clearTimeout(clearLeaving);
    };
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
      
      {/* Hero Carousel Section — mientras cargan las imágenes, solo el logo de espera */}
      {(activeSlide || !imagesLoaded) && (
      <section className="relative h-[60vh] w-full overflow-hidden">
        {/* Todas las diapositivas montadas y apiladas: así se descargan desde el
            principio y el cambio es un fundido de la nueva sobre la anterior,
            que sigue opaca debajo hasta que la nueva termina de aparecer. */}
        {heroImages.length === 0 ? (
          <StoreImage src="" alt="" logoClassName="w-1/4 max-w-[220px]" />
        ) : (
          heroImages.map((slide, i) => (
            <div
              key={slide.id}
              className={`absolute inset-0 ${
                i === activeIndex
                  ? 'z-[2] opacity-100 transition-opacity ease-in-out'
                  : i === leavingSlide
                  ? 'z-[1] opacity-100'
                  : 'z-0 opacity-0'
              }`}
              style={i === activeIndex ? { transitionDuration: `${HERO_FADE_MS}ms` } : undefined}
            >
              <StoreImage
                src={slide.url}
                alt="Hero"
                className="w-full h-full object-cover"
                logoClassName="w-1/4 max-w-[220px]"
                onReady={markHeroReady}
              />
            </div>
          ))
        )}

        {/* Hero Content */}
        {activeSlide && readyHeroUrls.has(activeSlide.url) && (
        <div className="absolute inset-0 flex items-end z-20">
          <div className="w-full px-8 md:px-16 py-10 bg-gradient-to-t from-black/60 to-transparent">
            <motion.h1
              key={`title-${currentSlide}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl md:text-4xl font-medium mb-2 text-white max-w-2xl"
            >
              {activeSlide.title}
            </motion.h1>
            <motion.p
              key={`desc-${currentSlide}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-base text-white/80 mb-5 max-w-lg"
            >
              {activeSlide.description}
            </motion.p>
            <motion.button
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={() => navigate('/create')}
              className="px-6 py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              {activeSlide.cta}
            </motion.button>
          </div>
        </div>
        )}

      </section>
      )}

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

          <div className="flex flex-wrap justify-center gap-5">
            {/* Photo Album */}
            <div className={`${CARD_WIDTH} ${DESIGN.card.base} ${DESIGN.card.interactive}`} onClick={() => setSelectedProduct('album')}>
              <div className="relative h-72">
                <StoreImage src={albumImage} alt="Photo Albums" className="w-full h-full object-cover" />
                <div className={DESIGN.card.overlay} />
                <div className={DESIGN.card.content}>
                  <h3 className="text-xl font-medium mb-1">{t('landing.cardAlbum')}</h3>
                  <button onClick={() => setSelectedProduct('album')} className="px-4 py-1.5 rounded-md bg-white text-black text-sm hover:bg-gray-100 transition-colors">
                    {t('landing.more')}
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className={`${CARD_WIDTH} ${DESIGN.card.base} ${DESIGN.card.interactive}`} onClick={() => setSelectedProduct('calendar')}>
              <div className="relative h-72">
                <StoreImage src={calendarImage} alt="Photo Calendars" className="w-full h-full object-cover" />
                <div className={DESIGN.card.overlay} />
                <div className={DESIGN.card.content}>
                  <h3 className="text-lg font-medium mb-1">{t('landing.cardCalendar')}</h3>
                  <button onClick={() => setSelectedProduct('calendar')} className="px-4 py-1.5 rounded-md bg-white text-black text-sm hover:bg-gray-100 transition-colors">
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
            <h2 className={`${DESIGN.text.h2} mb-0`}>{t('landing.faq')}</h2>
            <ChevronDown className={`w-6 h-6 text-gray-400 transition-transform duration-300 shrink-0 ${isFaqOpen ? 'rotate-180' : ''}`} />
          </button>

          {isFaqOpen && (
            <>
              <p className={`${DESIGN.text.sectionSubtitle} mt-3`}>{t('landing.faqSubtitle')}</p>
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
                      <RichBlock text={faq.answer} className="pb-4 text-sm text-gray-600 space-y-2" />
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

      <ProductDetailsModal isOpen={selectedProduct !== null} onClose={() => setSelectedProduct(null)} productType={selectedProduct || 'album'} showCustomAlbumNote />
    </div>
  );
}