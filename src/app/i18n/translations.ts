// ============================================================================
// Translations
// ============================================================================
// Diccionario de textos de la app por idioma, sin dependencias (ni React ni
// Firebase) para que los tests y el panel "Textos de la Tienda" lo puedan leer.
// Los textos migrados desde los componentes viven en appTexts.ts.
// ============================================================================

import { APP_TEXTS_ES } from './appTexts';

export type Language = 'en' | 'es';

export const translations = {
  en: {
    // Header
    'nav.login': 'Log In',
    'nav.signup': 'Sign Up',
    'nav.home': 'Home',
    'nav.dashboard': 'My Account',
    'nav.support': 'Support',

    // Support chat panel
    'support.title': 'Support',
    'support.close': 'Close support chat',
    'support.whatsapp': 'Chat with us on WhatsApp',
    'support.placeholder': 'How can we help you today?',
    'support.inputPlaceholder': 'Type your message...',
    'support.send': 'Send',
    'support.sending': 'Typing...',
    'support.error': "Sorry, we couldn't send your message. Please try again.",
    'support.emptyReply': "We didn't receive a response. Please try again.",

    // Creator Steps
    'step.product': 'Product',
    'step.customize': 'Customize',
    'step.photos': 'Photos',
    'step.checkout': 'Checkout',
    'step.back': 'Back',
    'step.of': 'of',
    'step.step': 'Step',
    
    // Album Customization
    'album.coverType': 'Cover Type',
    'album.tela': 'Fabric',
    'album.papel': 'Paper',
    'album.size': 'Size',
    'album.continue': 'Continue',
    'album.color.gold': 'Gold',
    'album.color.silver': 'Silver',
    'album.color.black': 'Black',

    // Photo Organizer Setup
    'organizer.uploadTitle': 'Upload Your Photos',
    'organizer.photosSelected': 'photos selected',
    'organizer.clickToSelect': 'Click to select photos',
    'organizer.selectMultiple': 'You can select multiple images at once',
    'organizer.minPhotosWarning': 'Select at least 40 photos ({count} selected)',
    'organizer.continueToPages': 'Continue',
    'organizer.howManyPages': 'How many pages?',
    'organizer.distributeDesc': 'Distribute your photos across pages.',
    'organizer.numPages': 'Number of Pages',
    'organizer.pages': 'pages',
    'organizer.createAlbum': 'Create Album',
    'organizer.complete': 'Confirm Organization',
    'organizer.addPhoto': 'Add Photo',
    'organizer.addText': 'Add Text',
    'organizer.editText': 'Edit Text Box',
    'organizer.content': 'Content',
    'organizer.size': 'Size',
    'organizer.font': 'Font',
    'organizer.color': 'Color',
    'organizer.customColor': 'Custom color',
    'organizer.textStyle': 'Style',
    'organizer.styleHint': 'Select letters or words to apply bold or italic.',
    'organizer.textAlign': 'Alignment',
    'organizer.overflowMode': 'When text is too long',
    'organizer.overflowLimit': 'Limit characters',
    'organizer.overflowShrink': 'Shrink text',
    'organizer.maxCharsHint': 'Max. {count} characters',
    'organizer.saveChanges': 'Save Changes',
    'organizer.minPagesReached': 'Minimum of 40 pages required.',
    'organizer.preparingAlbum': 'Preparing your album',
    'organizer.preparingAlbumDesc': 'Sorting your photos and laying them out across the pages.',
    'organizer.clearAll': 'Clear all',
    'organizer.addPageEnd': 'Add new page at the end',
    'organizer.pageSettings': 'Page Settings',

    // Product Details Modal
    'details.availableStyles': 'Available Styles',
    'details.specifications': 'Specifications',
    'details.customerExamples': 'Customer Examples',
    'details.customerExamplesDesc': 'See what other customers have created with our products',
    'details.customAlbumTitle': 'Prefer we design it for you? Custom Album',
    'details.customAlbumDesc': 'Send us your photos and a curator picks the best ones and designs every page for you. You review the draft before it goes to print. Choose it under “Make Your Own”.',
    'details.makeYourOwn': 'Make Your Own',

    // Product Selection
    'product.title': 'Choose Your Product',
    'product.subtitle': 'Select the type of product you want to create',
    'product.album': 'Photo Album',
    'product.calendar': 'Photo Calendar',

    // Calendar
    'calendar.preview': 'Calendar Preview',
    'calendar.year': 'Calendar Year',

    // Landing Page
    'landing.ourProducts': 'Our Products',
    'landing.more': 'More',
    'landing.simpleProcess': 'Simple Process',
    'landing.processSubtitle': 'Create your personalized product in just 3 easy steps',
    'landing.step1Title': 'Choose Your Project',
    'landing.step1Desc': 'Select from photo albums, calendars and our Custom Album service.',
    'landing.step2Title': 'Customize It',
    'landing.step2Desc': 'Choose colors, sizes, materials, and design your cover with our intuitive editor.',
    'landing.step3Title': 'Pick Your Moments',
    'landing.step3Desc': "Upload your favorite photos and arrange them your way. We'll take care of the rest!",
    'landing.startNow': 'Start Now',
    'landing.faq': 'Frequently Asked Questions',
    'landing.faqSubtitle': 'Everything you need to know about our products and services',

    // Testimonials


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

    // Promotions

    // Common
    'common.attention': 'Attention!',
    'common.error': 'Error',
    'common.saving': 'Saving...',

    // Auth
    'auth.loginTitle': 'Welcome back',
    'auth.loginSubtitle': 'Enter your credentials to access your account',
    'auth.registerTitle': 'Create an account',
    'auth.registerSubtitle': 'Enter your details to start creating your albums',
    'auth.emailLabel': 'Email address',
    'auth.passwordLabel': 'Password',
    'auth.confirmPasswordLabel': 'Confirm Password',
    'auth.nameLabel': 'Full Name',
    'auth.namePlaceholder': 'Your name',
    'auth.loginButton': 'Log In',
    'auth.loggingIn': 'Logging in...',
    'auth.registerButton': 'Create Account',
    'auth.registering': 'Creating account...',
    'auth.noAccount': "Don't have an account?",
    'auth.haveAccount': 'Already have an account?',
    'auth.registerLink': 'Register here',
    'auth.loginLink': 'Log in here',
    'auth.forgotPassword': 'Forgot your password?',
    'auth.resetPasswordTitle': 'Recover password',
    'auth.resetPasswordSubtitle': 'Enter your email and we will send you a secure link to reset it.',
    'auth.resetSuccessTitle': 'Check your inbox',
    'auth.resetSuccessDesc': 'We have sent a link to {email}. Click on it to create a new password.',
    'auth.sendResetLink': 'Send link',
    'auth.sendingLink': 'Sending...',
    'auth.backToLogin': 'Back to login',
    'auth.goBack': 'Go back',

    // Errors
    'error.generic': 'Something went wrong. Please try again.',
    'error.invalidEmail': 'The email address is badly formatted.',
    'error.userNotFound': 'No account found with this email.',
    'error.wrongPassword': 'Incorrect password. Please try again.',
    'error.emailInUse': 'An account already exists with this email.',
    'error.weakPassword': 'Password should be at least 6 characters.',
    'error.passwordsDontMatch': 'Passwords do not match.',
    'error.network': 'Network error. Please check your connection.',
    'error.fetchOrders': 'Could not load your orders. Please try again later.',
    'error.verifyPayment': 'Could not verify payment with the server.',
    'error.confirmOrder': 'An error occurred while confirming your order.',
    'error.processingImages': 'There was a problem processing your images. Please try again.',

    // Success Page
    'success.title': 'Order placed successfully!',
    'success.subtitle': 'Your order has been saved and we are processing your creation. You will receive a confirmation email shortly.',
    'success.verifying': 'Verifying your payment with Stripe...',
    'success.myOrders': 'Go to my orders',
    'success.backHome': 'Back to home',

    // Dashboard
    'dashboard.title': 'My Account',
    'dashboard.subtitle': 'Manage and review the status of your creations.',
    'dashboard.noOrders': 'You haven\'t created any projects yet.',
    'dashboard.noOrdersDesc': 'Start creating your first album today!',
    'dashboard.viewDetails': 'View Details',
    'dashboard.orderDate': 'Ordered on {date}',
    'dashboard.total': 'Total',
    'dashboard.product': 'Product',
    'dashboard.totalPages': 'Total Pages',
    'dashboard.tab.projects': 'My Projects',
    'dashboard.tab.account': 'My Information',

    // Account / Mi Información
    'account.personalInfo': 'Personal Info',
    'account.name': 'Name',
    'account.email': 'Email',
    'account.emailNote': 'To change your email, contact support.',
    'account.saveName': 'Save',
    'account.nameSaved': 'Name updated!',
    'account.phone': 'Phone',
    'account.savePhone': 'Save',
    'account.phoneSaved': 'Phone updated!',
    'account.security': 'Security',
    'account.resetPassword': 'Send password reset email',
    'account.resetSent': 'Email sent! Check your inbox.',
    'account.addresses': 'Saved Addresses',
    'account.noAddresses': 'No saved addresses yet.',
    'account.deleteAddress': 'Delete',
    'account.editAddress': 'Edit',
    'account.saveAddress': 'Save changes',
    'account.cancelEdit': 'Cancel',
    'account.addressSaved': 'Address updated!',
    'account.billing': 'Saved Billing',
    'account.noBilling': 'No saved billing info.',
    'account.deleteBilling': 'Delete',

    // Draft saving
    'draft.saveDraft': 'Save Draft',
    'draft.saved': 'Saved!',
    'draft.sectionTitle': 'Saved Drafts',
    'draft.sectionSubtitle': '{count} of {max} drafts used',
    'draft.continueEditing': 'Continue Editing',
    'draft.delete': 'Delete Draft',
    'draft.limitWarning': 'Draft limit reached',
    'draft.limitReached': 'You have reached the maximum of {max} drafts. Delete one to continue.',
    'draft.modalTitle': 'You have saved drafts',
    'draft.modalSubtitle': 'Continue a draft or start a new creation?',
    'draft.modalContinue': 'Continue',
    'draft.modalStartNew': 'Start New',
    'draft.savedOn': 'Saved on {date}',
    'draft.hintTitle': 'Save your progress anytime!',
    'draft.hintBody': 'Use this button to save your design as a draft. You can pick it up right where you left off from your dashboard.',
    'draft.hintDismiss': 'Got it!',
    'error.savingDraft': 'Error saving draft. Please try again.',

    // Statuses
    'status.paid': 'Paid',
    'status.pending_payment': 'Pending Payment',
    'status.en_produccion': 'In Production',
    'status.enviado': 'Shipped',
    'status.entregado': 'Delivered',
    'status.unknown': 'Unknown',

    // Dashboard - edit paid order
    'dashboard.editOrder': 'Edit Order',

    // Creator - edit paid order mode
    'creator.saveChanges': 'Save Changes',
    'creator.changesSaved': 'Changes saved!',
    'creator.pagesLockedBanner': 'Page count is fixed for paid orders. You can change photos and content but cannot add or remove pages.',

    // Creator - assist mode (store admin editing a customer's draft)
    'creator.assistMode': 'Assist mode',
    'creator.assistEditing': "You are editing draft #{id} for {customer}. Changes are saved to the customer's account.",
    'creator.assistBack': 'Back to dashboard',
    'creator.assistNotFound': 'This draft no longer exists.',
    'creator.assistWrongStatus': 'This order is in "{status}" state and can no longer be edited as a draft.',
    'creator.assistNoOwner': 'This draft has no customer attached and cannot be opened.',
    'creator.assistLoadError': 'Could not open the draft. Make sure you are signed in as the store admin.',

    // Checkout
    'checkout.title': 'Checkout',
    'checkout.processing': 'Processing order...',
    'checkout.payNow': 'Pay Now - {total}',
    'checkout.summary': 'Order Summary',
    'checkout.subtotal': 'Subtotal',
    'checkout.shipping': 'Shipping',
    'checkout.total': 'Total',
    'checkout.preview': 'Preview',
    'checkout.contactInfo': 'Contact Information',
    'checkout.shippingAddress': 'Shipping Address',
    'checkout.billingAddress': 'Billing Address',
    'checkout.sameAddress': 'Use the same address for billing',
    'checkout.fullName': 'Full Name',
    'checkout.address': 'Address and Number',
    'checkout.city': 'City',
    'checkout.zipCode': 'Zip Code',
    'checkout.billingName': 'Cardholder Name',
    'checkout.securePayment': 'Secure Payment with Stripe',
    'checkout.securePaymentDesc': 'For your security, you will be redirected to the official Stripe platform. Your bank details are encrypted and are never stored on our servers.',
    'checkout.encrypted': '256-BIT SSL ENCRYPTED CONNECTION',
    'checkout.terms': 'By clicking "Pay Now", you agree to our terms and conditions and privacy policy.',
    'checkout.loginRequired': 'You must log in to complete your order.',
    'checkout.errorSession': 'It seems the shopping session has expired or the necessary data has not been provided.',
    'checkout.errorStripe': 'The server did not return the Stripe payment URL.',
    'checkout.loadingOrder': 'Retrieving your design...',
    'checkout.preparingSummary': 'We are preparing your purchase summary.',
    'checkout.noOrderData': 'Order data not found',
    'checkout.saveAddress': 'Save this address for future orders',
    'checkout.savedAddresses': 'Saved addresses',
    'checkout.newAddress': 'Use a new address',
    'checkout.savedAddressesLimit': 'You can save up to 3 addresses. Remove one to save this address.',

    // Creator
    'creator.savingTitle': 'Saving Design',
    'creator.uploading': 'Uploading files',
  },
  es: {
    // Header
    'nav.login': 'Iniciar Sesión',
    'nav.signup': 'Registrarse',
    'nav.home': 'Inicio',
    'nav.dashboard': 'Mi Cuenta',
    'nav.support': 'Soporte',

    // Panel de chat de soporte
    'support.title': 'Soporte',
    'support.close': 'Cerrar chat de soporte',
    'support.whatsapp': 'Escríbenos por WhatsApp',
    'support.placeholder': '¿En qué podemos ayudarte hoy?',
    'support.inputPlaceholder': 'Escribe tu mensaje...',
    'support.send': 'Enviar',
    'support.sending': 'Escribiendo...',
    'support.error': 'Lo sentimos, no pudimos enviar tu mensaje. Intenta nuevamente.',
    'support.emptyReply': 'No recibimos una respuesta. Intenta nuevamente.',

    // Creator Steps
    'step.product': 'Producto',
    'step.customize': 'Personalizar',
    'step.photos': 'Fotos',
    'step.checkout': 'Pagar',
    'step.back': 'Volver',
    'step.of': 'de',
    'step.step': 'Paso',

    // Album Customization
    'album.coverType': 'Acabado de portada pasta dura',
    'album.tela': 'Tela',
    'album.papel': 'Papel',
    'album.size': 'Tamaño',
    'album.continue': 'Continuar',
    'album.color.gold': 'Oro',
    'album.color.silver': 'Plata',
    'album.color.black': 'Negro',

    // Calendar
    'calendar.preview': 'Vista Previa del Calendario',
    'calendar.year': 'Año del Calendario',


    // Photo Pack

    // Photo Organizer Setup
    'organizer.uploadTitle': 'Sube Tus Fotos',
    'organizer.photosSelected': 'fotos seleccionadas',
    'organizer.clickToSelect': 'Haz clic para seleccionar fotos',
    'organizer.selectMultiple': 'Puedes seleccionar varias imágenes a la vez',
    'organizer.minPhotosWarning': 'Selecciona mínimo 40 fotos ({count} seleccionadas)',
    'organizer.continueToPages': 'Continuar',
    'organizer.howManyPages': '¿Cuántas páginas?',
    'organizer.distributeDesc': 'Distribuye tus fotos en las páginas.',
    'organizer.numPages': 'Número de páginas',
    'organizer.pages': 'páginas',
    'organizer.createAlbum': 'Crear Álbum',
    'organizer.complete': 'Confirmar Organización',
    'organizer.addPhoto': 'Añadir Foto',
    'organizer.addText': 'Añadir Texto',
    'organizer.editText': 'Editar Cuadro de Texto',
    'organizer.content': 'Contenido',
    'organizer.size': 'Tamaño',
    'organizer.font': 'Fuente',
    'organizer.color': 'Color',
    'organizer.customColor': 'Color personalizado',
    'organizer.textStyle': 'Estilo',
    'organizer.styleHint': 'Selecciona letras o palabras para aplicar negrilla o itálica.',
    'organizer.textAlign': 'Alineación',
    'organizer.overflowMode': 'Si el texto es muy largo',
    'organizer.overflowLimit': 'Limitar caracteres',
    'organizer.overflowShrink': 'Reducir tamaño',
    'organizer.maxCharsHint': 'Máx. {count} caracteres',
    'organizer.saveChanges': 'Guardar Cambios',
    'organizer.minPagesReached': 'Se requiere un mínimo de 40 páginas.',
    'organizer.preparingAlbum': 'Preparando tu álbum',
    'organizer.preparingAlbumDesc': 'Ordenando tus fotos y repartiéndolas en las páginas.',
    'organizer.clearAll': 'Limpiar todo',
    'organizer.addPageEnd': 'Añadir nueva página al final',
    'organizer.pageSettings': 'Ajustes de Página',

    // Product Details Modal
    'details.availableStyles': 'Estilos Disponibles',
    'details.specifications': 'Especificaciones',
    'details.customerExamples': 'Ejemplos de Clientes',
    'details.customerExamplesDesc': 'Mira lo que otros clientes han creado con nuestros productos',
    'details.customAlbumTitle': '¿Prefieres que lo diseñemos por ti? Álbum Personalizado',
    'details.customAlbumDesc': 'Nos envías tus fotos y una curadora escoge las mejores y diseña cada página por ti. Revisas el borrador antes de imprimir. Elígelo en «Crea el Tuyo».',
    'details.makeYourOwn': 'Crea el Tuyo',

    // Product Selection
    'product.title': 'Elige Tu Producto',
    'product.subtitle': 'Selecciona el tipo de producto que quieres crear',
    'product.album': 'Álbum de Fotos',
    'product.calendar': 'Calendario de Fotos',

    // Landing Page
    'landing.ourProducts': 'Nuestros Productos',
    'landing.more': 'Más',
    'landing.simpleProcess': 'Proceso Simple',
    'landing.processSubtitle': 'Crea tu producto personalizado en solo 3 pasos fáciles',
    'landing.step1Title': 'Elige Tu Proyecto',
    'landing.step1Desc': 'Selecciona entre álbumes de fotos, calendarios y el servicio de Álbum Personalizado.',
    'landing.step2Title': 'Personalízalo',
    'landing.step2Desc': 'Elige colores, tamaños, materiales y diseña tu portada con nuestro editor intuitivo.',
    'landing.step3Title': 'Elige Tus Momentos',
    'landing.step3Desc': 'Sube tus fotos favoritas y organízalas a tu manera. ¡Nosotros nos encargamos del resto!',
    'landing.startNow': 'Comenzar Ahora',
    'landing.faq': 'Preguntas Frecuentes',
    'landing.faqSubtitle': 'Resolvemos tus dudas principales para que disfrutes tu experiencia.',

    // Testimonials


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

    // Promotions

    // Common
    'common.attention': '¡Atención!',
    'common.error': 'Error',
    'common.saving': 'Guardando...',

    // Auth
    'auth.loginTitle': 'Bienvenido de nuevo',
    'auth.loginSubtitle': 'Ingresa tus credenciales para acceder a tu cuenta',
    'auth.registerTitle': 'Crear una cuenta',
    'auth.registerSubtitle': 'Ingresa tus datos y comienza a crear tus recuerdos',
    'auth.emailLabel': 'Correo electrónico',
    'auth.passwordLabel': 'Contraseña',
    'auth.confirmPasswordLabel': 'Confirmar contraseña',
    'auth.nameLabel': 'Nombre completo',
    'auth.namePlaceholder': 'Tu nombre',
    'auth.loginButton': 'Iniciar sesión',
    'auth.loggingIn': 'Iniciando sesión...',
    'auth.registerButton': 'Crear cuenta',
    'auth.registering': 'Creando cuenta...',
    'auth.noAccount': '¿No tienes una cuenta?',
    'auth.haveAccount': '¿Ya tienes una cuenta?',
    'auth.registerLink': 'Regístrate aquí',
    'auth.loginLink': 'Inicia sesión aquí',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.resetPasswordTitle': 'Recuperar contraseña',
    'auth.resetPasswordSubtitle': 'Ingresa tu correo y te enviaremos un enlace seguro para restablecerla.',
    'auth.resetSuccessTitle': 'Revisa tu bandeja de entrada',
    'auth.resetSuccessDesc': 'Hemos enviado un enlace a {email}. Haz clic en él para crear una nueva contraseña.',
    'auth.sendResetLink': 'Enviar enlace',
    'auth.sendingLink': 'Enviando...',
    'auth.backToLogin': 'Volver al inicio de sesión',
    'auth.goBack': 'Volver atrás',

    // Errors
    'error.generic': 'Algo salió mal. Por favor, inténtalo de nuevo.',
    'error.invalidEmail': 'El formato del correo electrónico no es válido.',
    'error.userNotFound': 'No existe ninguna cuenta con este correo.',
    'error.wrongPassword': 'Contraseña incorrecta. Por favor, inténtalo de nuevo.',
    'error.emailInUse': 'Ya existe una cuenta con este correo electrónico.',
    'error.weakPassword': 'La contraseña debe tener al menos 6 caracteres.',
    'error.passwordsDontMatch': 'Las contraseñas no coinciden.',
    'error.network': 'Error de red. Por favor, comprueba tu conexión.',
    'error.fetchOrders': 'No se pudieron cargar tus pedidos. Inténtalo de nuevo más tarde.',
    'error.verifyPayment': 'No se pudo verificar el pago con el servidor.',
    'error.confirmOrder': 'Ocurrió un error al confirmar tu pedido.',
    'error.processingImages': 'Hubo un problema al procesar tus imágenes. Por favor intenta de nuevo.',

    // Success Page
    'success.title': '¡Pedido realizado con éxito!',
    'success.subtitle': 'Tu pedido ha sido guardado y estamos procesando tu creación. Recibirás un correo de confirmación en breve.',
    'success.verifying': 'Verificando tu pago con Stripe...',
    'success.myOrders': 'Ir a mis pedidos',
    'success.backHome': 'Volver al inicio',

    // Dashboard
    'dashboard.title': 'Mi Cuenta',
    'dashboard.subtitle': 'Gestiona y revisa el estado de tus creaciones.',
    'dashboard.noOrders': 'Aún no tienes pedidos',
    'dashboard.noOrdersDesc': '¡Empieza a crear tu primer álbum hoy mismo!',
    'dashboard.viewDetails': 'Ver Detalles',
    'dashboard.orderDate': 'Pedido el {date}',
    'dashboard.total': 'Total',
    'dashboard.product': 'Producto',
    'dashboard.totalPages': 'Total Páginas',
    'dashboard.tab.projects': 'Mis Proyectos',
    'dashboard.tab.account': 'Mi Información',

    // Account / Mi Información
    'account.personalInfo': 'Datos Personales',
    'account.name': 'Nombre',
    'account.email': 'Correo electrónico',
    'account.emailNote': 'Para cambiar tu correo, contacta soporte.',
    'account.saveName': 'Guardar',
    'account.nameSaved': '¡Nombre actualizado!',
    'account.phone': 'Teléfono',
    'account.savePhone': 'Guardar',
    'account.phoneSaved': '¡Teléfono actualizado!',
    'account.security': 'Seguridad',
    'account.resetPassword': 'Enviar correo para cambiar contraseña',
    'account.resetSent': '¡Correo enviado! Revisa tu bandeja.',
    'account.addresses': 'Direcciones Guardadas',
    'account.noAddresses': 'No tienes direcciones guardadas aún.',
    'account.deleteAddress': 'Eliminar',
    'account.editAddress': 'Editar',
    'account.saveAddress': 'Guardar cambios',
    'account.cancelEdit': 'Cancelar',
    'account.addressSaved': '¡Dirección actualizada!',
    'account.billing': 'Facturación Guardada',
    'account.noBilling': 'No tienes información de facturación guardada.',
    'account.deleteBilling': 'Eliminar',

    // Draft saving
    'draft.saveDraft': 'Guardar borrador',
    'draft.saved': '¡Guardado!',
    'draft.sectionTitle': 'Borradores guardados',
    'draft.sectionSubtitle': '{count} de {max} borradores usados',
    'draft.continueEditing': 'Continuar editando',
    'draft.delete': 'Eliminar borrador',
    'draft.limitWarning': 'Límite de borradores alcanzado',
    'draft.limitReached': 'Has alcanzado el límite máximo de {max} borradores. Elimina uno para continuar.',
    'draft.modalTitle': 'Tienes borradores guardados',
    'draft.modalSubtitle': '¿Quieres continuar uno de tus borradores o empezar una nueva creación?',
    'draft.modalContinue': 'Continuar',
    'draft.modalStartNew': 'Empezar nuevo',
    'draft.savedOn': 'Guardado el {date}',
    'draft.hintTitle': '¡Guarda tu progreso cuando quieras!',
    'draft.hintBody': 'Usa este botón para guardar tu diseño como borrador en cualquier momento. Puedes retomarlo desde tu perfil cuando quieras.',
    'draft.hintDismiss': '¡Entendido!',
    'error.savingDraft': 'Error al guardar el borrador. Intenta de nuevo.',

    // Statuses
    'status.paid': 'Pagado',
    'status.pending_payment': 'Pendiente de Pago',
    'status.en_produccion': 'En Producción',
    'status.enviado': 'Enviado',
    'status.entregado': 'Entregado',
    'status.unknown': 'Desconocido',

    // Dashboard - edit paid order
    'dashboard.editOrder': 'Editar Orden',

    // Creator - edit paid order mode
    'creator.saveChanges': 'Guardar Cambios',
    'creator.changesSaved': '¡Cambios guardados!',
    'creator.pagesLockedBanner': 'El número de páginas es fijo en órdenes pagadas. Puedes cambiar fotos y contenido pero no añadir ni eliminar páginas.',

    // Creator - modo asistencia (el admin edita el borrador de un cliente)
    'creator.assistMode': 'Modo asistencia',
    'creator.assistEditing': 'Estás editando el borrador #{id} de {customer}. Los cambios se guardan en la cuenta del cliente.',
    'creator.assistBack': 'Volver al panel',
    'creator.assistNotFound': 'Este borrador ya no existe.',
    'creator.assistWrongStatus': 'Este pedido está en estado "{status}" y ya no se puede editar como borrador.',
    'creator.assistNoOwner': 'Este borrador no tiene cliente asociado y no se puede abrir.',
    'creator.assistLoadError': 'No se pudo abrir el borrador. Asegúrate de haber iniciado sesión como administrador de la tienda.',

    // Checkout
    'checkout.title': 'Finalizar Compra',
    'checkout.processing': 'Procesando pedido...',
    'checkout.payNow': 'Pagar Ahora - {total}',
    'checkout.summary': 'Resumen del Pedido',
    'checkout.subtotal': 'Subtotal',
    'checkout.shipping': 'Envío',
    'checkout.total': 'Total',
    'checkout.preview': 'Vista previa',
    'checkout.contactInfo': 'Información de Contacto',
    'checkout.shippingAddress': 'Dirección de Envío',
    'checkout.billingAddress': 'Dirección de Facturación',
    'checkout.sameAddress': 'Usar la misma dirección que el envío',
    'checkout.fullName': 'Nombre Completo',
    'checkout.address': 'Dirección y Número',
    'checkout.city': 'Ciudad',
    'checkout.zipCode': 'Código Postal',
    'checkout.billingName': 'Nombre del Titular',
    'checkout.securePayment': 'Pago Seguro con Stripe',
    'checkout.securePaymentDesc': 'Para tu seguridad, serás redirigido a la plataforma oficial de Stripe. Tus datos bancarios están cifrados y nunca son almacenados en nuestros servidores.',
    'checkout.encrypted': 'CONEXIÓN CIFRADA SSL DE 256 BITS',
    'checkout.terms': 'Al hacer clic en "Pagar Ahora", aceptas nuestros términos y condiciones y política de privacidad.',
    'checkout.loginRequired': 'Debes iniciar sesión para completar tu pedido.',
    'checkout.errorSession': 'Parece que la sesión de compra ha expirado o no se han proporcionado los datos necesarios.',
    'checkout.errorStripe': 'El servidor no devolvió la URL de pago de Stripe.',
    'checkout.loadingOrder': 'Recuperando tu diseño...',
    'checkout.preparingSummary': 'Estamos preparando tu resumen de compra.',
    'checkout.noOrderData': 'No se encontraron datos del pedido',
    'checkout.saveAddress': 'Guardar esta dirección para próximos pedidos',
    'checkout.savedAddresses': 'Direcciones guardadas',
    'checkout.newAddress': 'Usar una dirección nueva',
    'checkout.savedAddressesLimit': 'Puedes guardar hasta 3 direcciones. Elimina una para guardar esta.',

    // Creator
    'creator.savingTitle': 'Guardando Diseño',
    'creator.uploading': 'Subiendo archivos',
  }
};

/**
 * Textos por defecto (los del código), por idioma. El panel "Textos de la
 * Tienda" los lista y muestra junto a lo que se haya cambiado.
 */
export const DEFAULT_TEXTS: Record<Language, Record<string, string>> = {
  en: translations.en,
  es: { ...translations.es, ...APP_TEXTS_ES },
};
