import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ShoppingBag, Palette, Image as ImageIcon, BookImage, Calendar, Coffee } from 'lucide-react';
import ProductDetailsModal from './ProductDetailsModal';
import type { ProductType } from './ProductSelection';
import { DESIGN } from '../../styles/design-system';
import { Header } from './navigation/Header';

import albumImage from '../../assets/393887a967df563ed043288f1df82bb73bcc5ae3.png';
import mugImage from '../../assets/f4da798dda5ec8fb3dfb223bc7ad323042e3d27f.png';
import calendarImage from '../../assets/e10b8bcd9dce4c4659f29f62c8704217f6ab8e6a.png';
import React from 'react';

const heroImages = [
  {
    url: 'https://images.unsplash.com/photo-1627353802168-e8e8a81e51f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG90byUyMGFsYnVtJTIwbWVtb3JpZXMlMjBzY3JhcGJvb2t8ZW58MXx8fHwxNzcxNjEyMzY0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Preserve Your Precious Moments',
    subtitle: 'Create stunning photo albums that tell your story'
  },
  {
    url: 'https://images.unsplash.com/photo-1758562235074-c54b9f68af12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYW1pbHklMjBtZW1vcmllcyUyMHBob3RvZ3JhcGh5JTIwY29sbGVjdGlvbnxlbnwxfHx8fDE3NzE2MTIzNjR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Memories That Last Forever',
    subtitle: 'Design personalized calendars and gifts for every occasion'
  },
  {
    url: 'https://images.unsplash.com/photo-1543253454-467bd6c1e154?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmVhdGl2ZSUyMHBob3RvJTIwYWxidW0lMjBkZXNpZ258ZW58MXx8fHwxNzcxNjEyMzY0fDA&ixlib=rb-4.1.0&q=80&w=1080',
    title: 'Your Creativity, Our Quality',
    subtitle: 'Professional printing with premium materials'
  }
];

const testimonials = [
  {
    name: 'Sarah Johnson',
    rating: 5,
    comment: 'Absolutely love my photo album! The quality is exceptional and the customization options made it truly special.',
    avatar: 'https://images.unsplash.com/photo-1762613875432-1b80b1682905?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGN1c3RvbWVyJTIwcmV2aWV3JTIwc2F0aXNmYWN0aW9ufGVufDF8fHx8MTc3MTYxMjM2NXww&ixlib=rb-4.1.0&q=80&w=1080'
  },
  {
    name: 'Michael Chen',
    rating: 5,
    comment: 'The photo calendar I created is stunning! It made the perfect gift for my parents. Will definitely order again.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
  },
  {
    name: 'Emma Rodriguez',
    rating: 5,
    comment: 'Easy to use and the final product exceeded my expectations. The printing quality is top-notch!',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'
  },
  {
    name: 'David Thompson',
    rating: 5,
    comment: 'Created a custom mug with family photos. It turned out amazing! Great quality and fast shipping.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'
  }
];

const faqs = [
  {
    question: 'How long does it take to receive my order?',
    answer: 'Standard shipping takes 5-7 business days. Express shipping (2-3 business days) is also available at checkout.'
  },
  {
    question: 'What file formats do you accept for photos?',
    answer: 'We accept JPG, PNG, and HEIC formats. For best quality, we recommend high-resolution images (at least 1200x1200 pixels).'
  },
  {
    question: 'Can I edit my design after placing an order?',
    answer: 'You can edit your design until the order enters production (usually within 24 hours). Contact our support team for assistance.'
  },
  {
    question: 'What is your return policy?',
    answer: 'We offer a 100% satisfaction guarantee. If you\'re not happy with your product, contact us within 14 days for a refund or reprint.'
  },
  {
    question: 'Do you offer bulk discounts?',
    answer: 'Yes! Orders of 10+ items receive a 15% discount, and 25+ items receive 25% off. Contact us for custom quotes on larger orders.'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(null);

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full">
      <Header />
      {/* Hero Carousel Section */}
      <section className="relative h-[calc(100vh-80px)] w-full overflow-hidden">
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
              <div className="absolute inset-0 bg-black bg-opacity-40" />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Hero Content */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-white px-4 max-w-4xl">
            <motion.h1
              key={`title-${currentSlide}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={DESIGN.text.h1}
            >
              {heroImages[currentSlide].title}
            </motion.h1>
            <motion.p
              key={`subtitle-${currentSlide}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={DESIGN.text.subtitle}
            >
              {heroImages[currentSlide].subtitle}
            </motion.p>
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={() => navigate('/create')}
              className={`${DESIGN.button.base} ${DESIGN.button.secondary}`}
            >
              Let's Design
            </motion.button>
          </div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`${DESIGN.nav.indicator} ${
                index === currentSlide ? DESIGN.nav.indicatorActive : DESIGN.nav.indicatorInactive
              }`}
            />
          ))}
        </div>
      </section>

      {/* Products Section - Bento Boxes */}
      <section className={DESIGN.layout.sectionGray}>
        <div className={DESIGN.layout.container}>
          <h2 className={DESIGN.text.h2}>Our Products</h2>
          <p className={DESIGN.text.sectionSubtitle}>
            Transform your memories into unique personalized products
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
                  <h3 className={DESIGN.text.h3}>Photo Albums</h3>
                  <p className="text-lg mb-4 text-gray-200">
                    Create professional photo albums with custom covers and high-quality paper.
                  </p>
                  <button
                    onClick={() => setSelectedProduct('album')}
                    className={`${DESIGN.button.base} ${DESIGN.button.secondary} ${DESIGN.button.xs}`}
                  >
                    More
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
                  <h3 className="text-2xl mb-2 font-medium">Calendars</h3>
                  <p className="text-sm mb-3 text-gray-200">
                    Personalized calendars with your best photos.
                  </p>
                  <button
                    onClick={() => setSelectedProduct('calendar')}
                    className={`${DESIGN.button.base} ${DESIGN.button.secondary} ${DESIGN.button.xs}`}
                  >
                    More
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
                  <h3 className="text-2xl mb-2 font-medium">Mugs & Thermos</h3>
                  <p className="text-sm mb-3 text-gray-200">
                    Custom mugs with your favorite photos.
                  </p>
                  <button
                    onClick={() => setSelectedProduct('mug')}
                    className={`${DESIGN.button.base} ${DESIGN.button.secondary} ${DESIGN.button.xs}`}
                  >
                    More
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
          <h2 className={DESIGN.text.h2}>Simple Process</h2>
          <p className={DESIGN.text.sectionSubtitle}>
            Create your personalized product in just 3 easy steps
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
                <div className="hidden md:block absolute top-16 left-[60%] w-full h-0.5 bg-gray-300" />
              </div>
              <h3 className={DESIGN.text.h3}>Choose Your Project</h3>
              <p className={DESIGN.text.body}>
                Select from photo albums, calendars, mugs, and more customizable products.
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
                <div className="hidden md:block absolute top-16 left-[60%] w-full h-0.5 bg-gray-300" />
              </div>
              <h3 className={DESIGN.text.h3}>Customize It</h3>
              <p className={DESIGN.text.body}>
                Choose colors, sizes, materials, and design your cover with our intuitive editor.
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
              <h3 className={DESIGN.text.h3}>Pick Your Moments</h3>
              <p className={DESIGN.text.body}>
                Upload your favorite photos and arrange them your way. We'll take care of the rest!
              </p>
            </div>
          </div>

          <div className="text-center mt-16">
            <button
              onClick={() => navigate('/create')}
              className={`${DESIGN.button.base} ${DESIGN.button.primary}`}
            >
              Start Now
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={DESIGN.layout.sectionGray}>
        <div className={DESIGN.layout.container}>
          <h2 className={DESIGN.text.h2}>What Our Customers Say</h2>
          <p className={DESIGN.text.sectionSubtitle}>
            Thousands of satisfied customers have created their products with us
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
          <h2 className={DESIGN.text.h2}>Frequently Asked Questions</h2>
          <p className={DESIGN.text.sectionSubtitle}>
            Everything you need to know about our products and services
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
                Creating beautiful memories since 2024. Quality products, personalized for you.
              </p>
            </div>

            {/* Products */}
            <div>
              <h4 className={DESIGN.text.footerHeading}>Products</h4>
              <ul className="space-y-2">
                <li><a href="#" className={DESIGN.text.footerLink}>Photo Albums</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>Calendars</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>Mugs & Thermos</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>Gift Sets</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className={DESIGN.text.footerHeading}>Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className={DESIGN.text.footerLink}>Help Center</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>Shipping Info</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>Returns</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>Contact Us</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className={DESIGN.text.footerHeading}>Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className={DESIGN.text.footerLink}>Privacy Policy</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>Terms of Service</a></li>
                <li><a href="#" className={DESIGN.text.footerLink}>Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className={DESIGN.footer.bottom}>
            <p>&copy; 2026 Photo Creator. All rights reserved.</p>
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