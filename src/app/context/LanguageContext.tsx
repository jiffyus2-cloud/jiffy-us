import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Header
    'nav.login': 'Log In',
    'nav.signup': 'Sign Up',
    'nav.home': 'Home',
    'nav.dashboard': 'Projects',
    
    // Creator Steps
    'step.product': 'Product',
    'step.customize': 'Customize',
    'step.photos': 'Photos',
    'step.design': 'Design',
    'step.checkout': 'Checkout',
    'step.back': 'Back',
    'step.of': 'of',
    'step.step': 'Step',
    
    // Album Customization
    'album.coverType': 'Cover Type',
    'album.tela': 'Fabric',
    'album.papel': 'Paper',
    'album.size': 'Size',
    'album.coverColor': 'Cover Color',
    'album.typographyColor': 'Typography Color',
    'album.paperType': 'Paper Type',
    'album.mate': 'Matte',
    'album.brillante': 'Glossy',
    'album.continue': 'Continue',
    'album.caratula': 'Cover',
    'album.clickToCustomize': 'Click to customize cover',
    'album.customizeCoverContent': 'Customize Cover Content',
    'album.coverDetails': 'Cover Details',
    'album.title': 'Title',
    'album.subtitle': 'Subtitle',
    'album.spineText': 'Spine Text',
    'album.coverPhoto': 'Cover Photo',
    'album.uploadCoverPhoto': 'Upload Cover Photo',
    'album.applyChanges': 'Apply Changes',
    'album.livePreview': 'Live Preview',
    'album.frontCover': 'Front Cover',
    'album.spine': 'Spine',
    'album.previewNote': 'Preview Note',
    'album.previewNoteText': 'This is a simplified preview. The final album will have a professional finish matching your selected cover type.',
    'album.color.white': 'White',
    'album.color.gold': 'Gold',
    'album.color.silver': 'Silver',
    'album.color.black': 'Black',
    'album.color.whitePhoto': 'White with photo',
    'album.size.sq20': 'Square 20x20 cm',
    'album.size.sq30': 'Square 30x30 cm',
    'album.size.hor21': 'Horizontal 21x28 cm',
    'album.size.ver28': 'Vertical 28x21 cm',
    'album.defaultTitle': 'My Photo Album',
    'album.defaultSubtitle': '2024',
    'album.defaultSpine': 'Memories',
    'album.titlePlaceholder': 'Enter album title...',
    'album.subtitlePlaceholder': 'Enter subtitle (e.g., year, location)...',
    'album.spinePlaceholder': 'Text for the spine...',
    'album.spineNote': 'This text will appear on the spine of the album',

    // Photo Organizer Setup
    'organizer.uploadTitle': 'Upload Your Photos',
    'organizer.uploadDesc': 'Select at least 40 photos to start creating your album.',
    'organizer.photosSelected': 'photos selected',
    'organizer.clickToSelect': 'Click to select photos',
    'organizer.selectMultiple': 'You can select multiple images at once',
    'organizer.minPhotosWarning': 'You need to upload at least 40 photos. You currently have {count}.',
    'organizer.continueToPages': 'Continue to Page Selection',
    'organizer.howManyPages': 'How many pages?',
    'organizer.distributeDesc': 'Distribute your photos across pages.',
    'organizer.numPages': 'Number of Pages',
    'organizer.pages': 'pages',
    'organizer.autoDistributeDesc': 'Based on your selection, we will distribute your photos automatically. You can still move them and change layouts later.',
    'organizer.createAlbum': 'Create Album',
    'organizer.complete': 'Confirm Organization',
    'organizer.addPhoto': 'añadir Photo',
    'organizer.addText': 'añadir texto',
    'organizer.editText': 'Edit Text Box',
    'organizer.removeText': 'Remove Text Box',
    'organizer.content': 'Content',
    'organizer.size': 'Size',
    'organizer.font': 'Font',
    'organizer.color': 'Color',
    'organizer.saveChanges': 'Save Changes',

    // Product Details Modal
    'details.availableStyles': 'Available Styles',
    'details.specifications': 'Specifications',
    'details.customerExamples': 'Customer Examples',
    'details.customerExamplesDesc': 'See what other customers have created with our products',
    'details.makeYourOwn': 'Make Your Own',

    // Product Selection
    'product.title': 'Choose Your Product',
    'product.subtitle': 'Select the type of product you want to create',
    'product.album': 'Photo Album',
    'product.calendar': 'Photo Calendar',
    'product.mug': 'Photo Mug',
    'product.photoPack': 'Photo Pack',
    'product.continue': 'Continue',
    'product.albumDesc': 'Create a beautiful, professionally printed photo album with customizable covers, layouts, and premium paper quality.',
    'product.calendarDesc': 'Design a personalized wall calendar featuring your favorite photos for each month of the year.',
    'product.mugDesc': 'Create a unique photo mug with your favorite image, perfect for coffee or tea.',
    'product.photoPackDesc': 'High-quality prints of your favorite moments, delivered in a beautiful package.',

    // Calendar
    'calendar.preview': 'Calendar Preview',
    'calendar.size.standard': 'Standard size',
    'calendar.size.large': 'Large',
    'calendar.size.square': 'Square',
    'calendar.year': 'Calendar Year',
    'calendar.moreYears': 'More years...',
    'calendar.uploadDesc': 'Select the photos you want for each month of your calendar.',
    'calendar.uploadPrompt': 'Upload photos to continue',
    'calendar.orientation': 'Orientation',
    'calendar.orientation.vertical': 'Vertical',
    'calendar.orientation.horizontal': 'Horizontal',

    // Landing Page
    'landing.letsDesign': "Let's Design",
    'landing.ourProducts': 'Our Products',
    'landing.productsSubtitle': 'Transform your memories into unique personalized products',
    'landing.more': 'More',
    'landing.simpleProcess': 'Simple Process',
    'landing.processSubtitle': 'Create your personalized product in just 3 easy steps',
    'landing.step1Title': 'Choose Your Project',
    'landing.step1Desc': 'Select from photo albums, calendars, mugs, and more customizable products.',
    'landing.step2Title': 'Customize It',
    'landing.step2Desc': 'Choose colors, sizes, materials, and design your cover with our intuitive editor.',
    'landing.step3Title': 'Pick Your Moments',
    'landing.step3Desc': "Upload your favorite photos and arrange them your way. We'll take care of the rest!",
    'landing.startNow': 'Start Now',
    'landing.testimonials': 'What Our Customers Say',
    'landing.testimonialsSubtitle': 'Thousands of satisfied customers have created their products with us',
    'landing.faq': 'Frequently Asked Questions',
    'landing.faqSubtitle': 'Everything you need to know about our products and services',

    // Testimonials
    'testimonial.1.comment': 'Absolutely love my photo album! The quality is exceptional and the customization options made it truly special.',
    'testimonial.2.comment': 'The photo calendar I created is stunning! It made the perfect gift for my parents. Will definitely order again.',
    'testimonial.3.comment': 'Easy to use and the final product exceeded my expectations. The printing quality is top-notch!',
    'testimonial.4.comment': 'Created a custom mug with family photos. It turned out amazing! Great quality and fast shipping.',

    // FAQ
    'faq.1.q': 'How long does it take to receive my order?',
    'faq.1.a': 'Standard shipping takes 5-7 business days. Express shipping (2-3 business days) is also available at checkout.',
    'faq.2.q': 'What file formats do you accept for photos?',
    'faq.2.a': 'We accept JPG, PNG, and HEIC formats. For best quality, we recommend high-resolution images (at least 1200x1200 pixels).',
    'faq.3.q': 'Can I edit my design after placing an order?',
    'faq.3.a': 'You can edit your design until the order enters production (usually within 24 hours). Contact our support team for assistance.',
    'faq.4.q': 'What is your return policy?',
    'faq.4.a': 'We offer a 100% satisfaction guarantee. If you\'re not happy with your product, contact us within 14 days for a refund or reprint.',
    'faq.5.q': 'Do you offer bulk discounts?',
    'faq.5.a': 'Yes! Orders of 10+ items receive a 15% discount, and 25+ items receive 25% off. Contact us for custom quotes on larger orders.',

    // Footer
    'footer.description': 'Creating beautiful memories since 2024. Quality products, personalized for you.',
    'footer.products': 'Products',
    'footer.support': 'Support',
    'footer.legal': 'Legal',
    'footer.helpCenter': 'Help Center',
    'footer.shippingInfo': 'Shipping Info',
    'footer.returns': 'Returns',
    'footer.contactUs': 'Contact Us',
    'footer.privacyPolicy': 'Privacy Policy',
    'footer.termsOfService': 'Terms of Service',
    'footer.cookiePolicy': 'Cookie Policy',
    'footer.rights': 'All rights reserved.',

    // Hero
    'hero.1.title': 'Preserve Your Precious Moments',
    'hero.1.desc': 'Create stunning photo albums that tell your story',
    'hero.1.highlight': 'High quality finishes for every memory',
    'hero.2.title': 'Memories That Last Forever',
    'hero.2.desc': 'Design personalized calendars and gifts for every occasion',
    'hero.2.highlight': 'Capture every day with a custom touch',
    'hero.3.title': 'Your Creativity, Our Quality',
    'hero.3.desc': 'Professional printing with premium materials',
    'hero.3.highlight': 'Designed by you, crafted by us',
    'hero.4.title': 'The Perfect Personalized Gift',
    'hero.4.desc': 'Surprise your loved ones with something unique',
    'hero.4.highlight': 'Fast delivery and 100% satisfaction guaranteed',

    // Promotions
    'promo.title': 'Active Promotions',
    'promo.1.title': '20% Off Your First Order',
    'promo.1.desc': 'Use code WELCOME20 at checkout',
    'promo.2.title': 'Free Shipping',
    'promo.2.desc': 'On all orders over 50€',
    'promo.3.title': 'Special Offer 3x2',
    'promo.3.desc': 'Buy 2 photo albums and get 1 calendar free!',

    // Common
    'common.new': 'NEW',
  },
  es: {
    // Header
    'nav.login': 'Iniciar Sesión',
    'nav.signup': 'Registrarse',
    'nav.home': 'Inicio',
    'nav.dashboard': 'Proyectos',
    
    // Creator Steps
    'step.product': 'Producto',
    'step.style': 'Estilo',
    'step.customize': 'Personalizar',
    'step.photos': 'Fotos',
    'step.design': 'Diseño',
    'step.checkout': 'Pagar',
    'step.back': 'Atrás',
    'step.of': 'de',
    'step.step': 'Paso',

    // Album Customization
    'album.coverType': 'Tipo de Carátula',
    'album.tela': 'Tela',
    'album.papel': 'Papel',
    'album.size': 'Tamaño',
    'album.coverColor': 'Color de Carátula',
    'album.typographyColor': 'Color de Tipografía',
    'album.paperType': 'Tipo de Papel',
    'album.mate': 'Mate',
    'album.brillante': 'Brillante',
    'album.continue': 'Continuar',
    'album.caratula': 'Carátula',
    'album.clickToCustomize': 'Haz clic para personalizar la carátula',
    'album.customizeCoverContent': 'Personalizar Contenido de la Carátula',
    'album.coverDetails': 'Detalles de la Carátula',
    'album.title': 'Título',
    'album.subtitle': 'Subtítulo',
    'album.spineText': 'Texto del Lomo',
    'album.coverPhoto': 'Foto de Portada',
    'album.uploadCoverPhoto': 'Subir Foto de Portada',
    'album.applyChanges': 'Aplicar Cambios',
    'album.livePreview': 'Vista Previa en Vivo',
    'album.frontCover': 'Portada Frontal',
    'album.spine': 'Lomo',
    'album.previewNote': 'Nota de Vista Previa',
    'album.previewNoteText': 'Esta es una vista previa simplificada. El álbum final tendrá un acabado profesional que coincidirá con el tipo de carátula seleccionado.',
    'album.color.white': 'Blanco',
    'album.color.gold': 'Oro',
    'album.color.silver': 'Plata',
    'album.color.black': 'Negro',
    'album.color.whitePhoto': 'Blanco con fotografía',
    'album.size.sq20': 'Cuadrado 20x20 cm',
    'album.size.sq30': 'Cuadrado 30x30 cm',
    'album.size.hor21': 'Horizontal 21x28 cm',
    'album.size.ver28': 'Vertical 28x21 cm',
    'album.defaultTitle': 'Mi Álbum de Fotos',
    'album.defaultSubtitle': '2024',
    'album.defaultSpine': 'Recuerdos',
    'album.titlePlaceholder': 'Introduce el título del álbum...',
    'album.subtitlePlaceholder': 'Introduce el subtítulo (ej. año, lugar)...',
    'album.spinePlaceholder': 'Texto para el lomo...',
    'album.spineNote': 'Este texto aparecerá en el lomo del álbum',

    // Calendar
    'calendar.preview': 'Vista Previa del Calendario',
    'calendar.size.standard': 'Tamaño estándar',
    'calendar.size.large': 'Grande',
    'calendar.size.square': 'Cuadrado',
    'calendar.year': 'Año del Calendario',
    'calendar.moreYears': 'Más años...',
    'calendar.uploadDesc': 'Selecciona las fotos que quieras para cada mes de tu calendario.',
    'calendar.uploadPrompt': 'Sube fotos para continuar',
    'calendar.orientation': 'orientacion',
    'calendar.orientation.vertical': 'vertical',
    'calendar.orientation.horizontal': 'horizontal',

    // Mug
    'mug.capacity': 'Capacidad de la Taza',
    'mug.material': 'Material de la Taza',
    'mug.material.ceramic': 'Cerámica',
    'mug.material.ceramicDesc': 'Clásico y apto para microondas',
    'mug.material.porcelain': 'Porcelana',
    'mug.material.porcelainDesc': 'Calidad premium y elegante',
    'mug.material.steel': 'Acero Inoxidable',
    'mug.material.steelDesc': 'Duradero y para viajes',
    'mug.style': 'Estilo de Diseño',
    'mug.style.separate': 'Imagen y Texto',
    'mug.style.separateDesc': 'La imagen y el texto se muestran por separado en la taza.',
    'mug.style.cutout': 'Texto con Foto',
    'mug.style.cutoutDesc': 'Tu foto aparece dentro de las letras de un texto grande.',
    'mug.uploadDesc': 'Sube fotos para tus tazas personalizadas. Cada foto creará un diseño de taza separado.',
    'mug.startEmpty': 'Empezar con una taza vacía',
    'mug.size.standard': 'Estándar',
    'mug.size.large': 'Grande',

    // Photo Pack
    'photopack.finish': 'Acabado de las Fotos',
    'photopack.finish.matteDesc': 'Sin reflejos, aspecto profesional',
    'photopack.finish.glossyDesc': 'Brillante, colores vibrantes',
    'photopack.uploadDesc': 'Selecciona las fotos que quieres imprimir. Cada foto se puede ajustar individualmente.',
    'photopack.size.standard': 'Tamaño estándar',
    'photopack.size.medium': 'Algo más grande',
    'photopack.size.large': 'Retratos',

    // Photo Organizer Setup
    'organizer.uploadTitle': 'Sube Tus Fotos',
    'organizer.uploadDesc': 'Selecciona al menos 40 fotos para empezar a crear tu álbum.',
    'organizer.photosSelected': 'fotos seleccionadas',
    'organizer.clickToSelect': 'Haz clic para seleccionar fotos',
    'organizer.selectMultiple': 'Puedes seleccionar varias imágenes a la vez',
    'organizer.minPhotosWarning': 'Necesitas subir al menos 40 fotos. Actualmente tienes {count}.',
    'organizer.continueToPages': 'Continuar a la selección de páginas',
    'organizer.howManyPages': '¿Cuántas páginas?',
    'organizer.distributeDesc': 'Distribuye tus fotos en las páginas.',
    'organizer.numPages': 'Número de páginas',
    'organizer.pages': 'páginas',
    'organizer.autoDistributeDesc': 'Basándonos en tu selección, distribuiremos tus fotos automáticamente. Podrás moverlas y cambiar los diseños más tarde.',
    'organizer.createAlbum': 'Crear Álbum',
    'organizer.complete': 'Confirmar Organización',
    'organizer.addPhoto': 'añadir Photo',
    'organizer.addText': 'añadir texto',

    // Product Details Modal
    'details.availableStyles': 'Estilos Disponibles',
    'details.specifications': 'Especificaciones',
    'details.customerExamples': 'Ejemplos de Clientes',
    'details.customerExamplesDesc': 'Mira lo que otros clientes han creado con nuestros productos',
    'details.makeYourOwn': 'Crea el Tuyo',

    // Product Selection
    'product.title': 'Elige Tu Producto',
    'product.subtitle': 'Selecciona el tipo de producto que quieres crear',
    'product.album': 'Álbum de Fotos',
    'product.calendar': 'Calendario de Fotos',
    'product.mug': 'Taza de Fotos',
    'product.photoPack': 'Pack de Fotos',
    'product.continue': 'Continuar',
    'product.albumDesc': 'Crea un hermoso álbum de fotos impreso profesionalmente con portadas personalizables, diseños y papel de calidad premium.',
    'product.calendarDesc': 'Diseña un calendario de pared personalizado con tus fotos favoritas para cada mes del año.',
    'product.mugDesc': 'Crea una taza de fotos única con tu imagen favorita, perfecta para café o té.',
    'product.photoPackDesc': 'Impresiones de alta calidad de tus momentos favoritos, entregadas en un paquete hermoso.',

    // Landing Page
    'landing.letsDesign': 'Vamos a Diseñar',
    'landing.ourProducts': 'Nuestros Productos',
    'landing.productsSubtitle': 'Transforma tus recuerdos en productos personalizados únicos',
    'landing.more': 'Más',
    'landing.simpleProcess': 'Proceso Simple',
    'landing.processSubtitle': 'Crea tu producto personalizado en solo 3 pasos fáciles',
    'landing.step1Title': 'Elige Tu Proyecto',
    'landing.step1Desc': 'Selecciona entre álbumes de fotos, calendarios, tazas y más productos personalizables.',
    'landing.step2Title': 'Personalízalo',
    'landing.step2Desc': 'Elige colores, tamaños, materiales y diseña tu portada con nuestro editor intuitivo.',
    'landing.step3Title': 'Elige Tus Momentos',
    'landing.step3Desc': 'Sube tus fotos favoritas y organízalas a tu manera. ¡Nosotros nos encargamos del resto!',
    'landing.startNow': 'Comenzar Ahora',
    'landing.testimonials': 'Lo Que Dicen Nuestros Clientes',
    'landing.testimonialsSubtitle': 'Miles de clientes satisfechos han creado sus productos con nosotros',
    'landing.faq': 'Preguntas Frecuentes',
    'landing.faqSubtitle': 'Todo lo que necesitas saber sobre nuestros productos y servicios',

    // Testimonials
    'testimonial.1.comment': '¡Me encanta mi álbum de fotos! La calidad es excepcional y las opciones de personalización lo hicieron realmente especial.',
    'testimonial.2.comment': '¡El calendario de fotos que creé es impresionante! Fue el regalo perfecto para mis padres. Definitivamente volveré a pedir.',
    'testimonial.3.comment': 'Fácil de usar y el producto final superó mis expectativas. ¡La calidad de impresión es de primera clase!',
    'testimonial.4.comment': 'Creé una taza personalizada con fotos familiares. ¡Quedó increíble! Gran calidad y envío rápido.',

    // FAQ
    'faq.1.q': '¿Cuánto tiempo tarda en llegar mi pedido?',
    'faq.1.a': 'El envío estándar tarda de 5 a 7 días hábiles. El envío exprés (2-3 días hábiles) también está disponible al finalizar la compra.',
    'faq.2.q': '¿Qué formatos de archivo aceptan para las fotos?',
    'faq.2.a': 'Aceptamos formatos JPG, PNG y HEIC. Para obtener la mejor calidad, recomendamos imágenes de alta resolución (al menos 1200x1200 píxeles).',
    'faq.3.q': '¿Puedo editar mi diseño después de realizar un pedido?',
    'faq.3.a': 'Puedes editar tu diseño hasta que el pedido entre en producción (generalmente dentro de las 24 horas). Contacta a nuestro equipo de soporte para asistencia.',
    'faq.4.q': '¿Cuál es su política de devolución?',
    'faq.4.a': 'Ofrecemos una garantía de satisfacción del 100%. Si no estás satisfecho con tu producto, contáctanos dentro de los 14 días para un reembolso o reimpresión.',
    'faq.5.q': '¿Ofrecen descuentos por volumen?',
    'faq.5.a': '¡Sí! Los pedidos de más de 10 artículos reciben un 15% de descuento, y más de 25 artículos reciben un 25% de descuento. Contáctanos para presupuestos personalizados en pedidos más grandes.',

    // Footer
    'footer.description': 'Creando hermosos recuerdos desde 2024. Productos de calidad, personalizados para ti.',
    'footer.products': 'Productos',
    'footer.support': 'Soporte',
    'footer.legal': 'Legal',
    'footer.helpCenter': 'Centro de Ayuda',
    'footer.shippingInfo': 'Información de Envío',
    'footer.returns': 'Devoluciones',
    'footer.contactUs': 'Contáctanos',
    'footer.privacyPolicy': 'Política de Privacidad',
    'footer.termsOfService': 'Términos de Servicio',
    'footer.cookiePolicy': 'Política de Cookies',
    'footer.rights': 'Todos los derechos reservados.',

    // Hero
    'hero.1.title': 'Preserva Tus Momentos Preciosos',
    'hero.1.desc': 'Crea álbumes de fotos impresionantes que cuenten tu historia',
    'hero.1.highlight': 'Acabados de alta calidad para cada recuerdo',
    'hero.2.title': 'Recuerdos Que Duran Para Siempre',
    'hero.2.desc': 'Diseña calendarios y regalos personalizados para cada ocasión',
    'hero.2.highlight': 'Captura cada día con un toque personalizado',
    'hero.3.title': 'Tu Creatividad, Nuestra Calidad',
    'hero.3.desc': 'Impresión profesional con materiales premium',
    'hero.3.highlight': 'Diseñado por ti, fabricado por nosotros',
    'hero.4.title': 'El Regalo Personalizado Perfecto',
    'hero.4.desc': 'Sorprende a tus seres queridos con algo único',
    'hero.4.highlight': 'Entrega rápida y satisfacción 100% garantizada',

    // Promotions
    'promo.title': 'Promociones Activas',
    'promo.1.title': '20% de Descuento en tu Primer Pedido',
    'promo.1.desc': 'Usa el código BIENVENIDO20 al finalizar la compra',
    'promo.2.title': 'Envío Gratis',
    'promo.2.desc': 'En todos los pedidos superiores a 50€',
    'promo.3.title': 'Oferta Especial 3x2',
    'promo.3.desc': '¡Compra 2 álbumes y llévate 1 calendario gratis!',

    // Common
    'common.new': 'NUEVO',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('es');

  const t = (key: string): string => {
    const value = (translations[language] as any)[key];
    return value || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
