/**
 * Textos de la Política de privacidad y de los Términos del servicio.
 *
 * Van en código (no en los textos editables del panel) porque son documentos
 * largos y estructurados. Cualquier cambio de proveedor o de cómo se tratan los
 * datos debe reflejarse aquí. Google exige la política para publicar el cliente
 * OAuth de "Importar desde Google Fotos", y la sección de Google Fotos recoge
 * el compromiso de "uso limitado" de su política de datos de usuario.
 */
import type { Language } from '../../i18n/translations';

export type LegalDocKind = 'privacy' | 'terms';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  /** Párrafos que van después de la lista. */
  after?: string[];
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_CONTACT_EMAIL = 'memorias@jiffyphotos.com';
export const LEGAL_PATHS: Record<LegalDocKind, string> = {
  privacy: '/privacidad',
  terms: '/terminos',
};

const UPDATED_ES = 'Última actualización: 17 de noviembre de 2026';
const UPDATED_EN = 'Last updated: November 17, 2026';

const GOOGLE_POLICY_URL = 'https://developers.google.com/terms/api-services-user-data-policy';

const privacyEs: LegalDoc = {
  title: 'Política de privacidad',
  updated: UPDATED_ES,
  intro:
    'En Jiffy Photos (jiffyphotos.com) creamos álbumes y calendarios impresos con tus fotos. Esta política explica qué datos recogemos, para qué los usamos, con quién los compartimos y cómo puedes ejercer tus derechos, de acuerdo con la Ley 1581 de 2012 de Colombia y sus normas reglamentarias.',
  sections: [
    {
      heading: '1. Qué datos recogemos',
      bullets: [
        'Datos de cuenta: nombre, correo electrónico y, si te registras con contraseña, la contraseña cifrada (la gestiona Google Firebase; nosotros no la vemos).',
        'Datos del pedido: dirección de envío, teléfono, productos elegidos y el historial de tus pedidos.',
        'Tus fotos y textos: las imágenes que subes o importas y los textos que escribes en tus diseños.',
        'Datos de pago: los procesa Stripe. No guardamos los números de tu tarjeta.',
        'Datos técnicos mínimos: información que tu navegador envía para que el servicio funcione (por ejemplo, tipo de dispositivo) y registros técnicos de errores.',
      ],
    },
    {
      heading: '2. Para qué usamos tus datos',
      bullets: [
        'Crear, guardar y mostrarte tus diseños mientras los editas.',
        'Producir, imprimir y enviar tus pedidos.',
        'Cobrar los pedidos y emitir los comprobantes correspondientes.',
        'Enviarte correos sobre tu pedido y, solo si no te has dado de baja, novedades de Jiffy Photos.',
        'Atenderte cuando nos pides ayuda.',
        'Mantener el servicio seguro y corregir errores.',
      ],
      after: [
        'No vendemos tus datos ni tus fotos, y no los usamos para publicidad de terceros.',
      ],
    },
    {
      heading: '3. Importar fotos desde Google Fotos',
      paragraphs: [
        'Si eliges "Importar desde Google Fotos", te pedimos permiso de solo lectura (photospicker.mediaitems.readonly) y Google te muestra su propio selector. Solo recibimos las fotos que tú eliges en ese selector; no tenemos acceso al resto de tu biblioteca.',
        'Las fotos elegidas se descargan en tu navegador y entran a tu diseño igual que si las subieras desde tu dispositivo. El permiso de acceso es temporal, no lo guardamos en nuestros servidores y no lo usamos para nada más. Puedes retirarlo cuando quieras en myaccount.google.com/permissions.',
        `El uso y la transferencia de la información recibida de las API de Google se ajustan a la Política de datos de usuario de los servicios de API de Google (${GOOGLE_POLICY_URL}), incluidos los requisitos de uso limitado. No usamos esa información para publicidad, no la vendemos, no la usamos para entrenar modelos de inteligencia artificial y nadie la lee salvo que tú nos lo pidas para darte soporte o lo exija la ley.`,
      ],
    },
    {
      heading: '4. Con quién compartimos datos',
      paragraphs: ['Solo con los proveedores que necesitamos para prestar el servicio, y solo lo necesario:'],
      bullets: [
        'Google Cloud y Google Firebase: alojamiento de la web, cuentas, base de datos y almacenamiento de fotos.',
        'Stripe: procesamiento de pagos.',
        'Proveedores de correo electrónico: envío de confirmaciones de pedido y comunicaciones.',
        'Proveedores de inteligencia artificial: cuando usas el asistente de ayuda o funciones de ordenar fotos, se envía la información necesaria para responderte.',
        'Talleres de impresión y empresas de transporte: para fabricar y entregar tu pedido.',
        'Autoridades, cuando la ley nos obligue.',
      ],
    },
    {
      heading: '5. Transferencias internacionales',
      paragraphs: [
        'Algunos de estos proveedores guardan datos fuera de Colombia (por ejemplo, en la Unión Europea o en Estados Unidos). Solo trabajamos con proveedores que ofrecen niveles adecuados de protección.',
      ],
    },
    {
      heading: '6. Cuánto tiempo guardamos tus datos',
      bullets: [
        'Borradores sin pedir: se eliminan automáticamente tras un periodo sin actividad.',
        'Fotos de pedidos: las conservamos el tiempo necesario para producir, enviar y atender posibles reclamaciones del pedido.',
        'Datos de cuenta y pedidos: mientras tengas cuenta y, después, el tiempo que exijan las obligaciones legales y contables.',
      ],
    },
    {
      heading: '7. Almacenamiento en tu navegador',
      paragraphs: [
        'Usamos el almacenamiento local de tu navegador para mantener tu sesión, tu idioma y tus borradores mientras trabajas. No usamos cookies de publicidad ni de seguimiento de terceros.',
      ],
    },
    {
      heading: '8. Tus derechos',
      paragraphs: [
        `Puedes conocer, actualizar, rectificar y suprimir tus datos, revocar tu autorización y pedir prueba de ella, escribiéndonos a ${LEGAL_CONTACT_EMAIL}. Te responderemos en los plazos que fija la ley. Si no quedas conforme, puedes acudir a la Superintendencia de Industria y Comercio.`,
      ],
    },
    {
      heading: '9. Seguridad',
      paragraphs: [
        'Usamos conexiones cifradas (HTTPS), control de acceso y los sistemas de seguridad de nuestros proveedores. Ningún sistema es infalible, pero trabajamos para proteger tus datos.',
      ],
    },
    {
      heading: '10. Menores de edad',
      paragraphs: ['El servicio está dirigido a personas mayores de 18 años. Los pedidos los hace siempre una persona adulta.'],
    },
    {
      heading: '11. Cambios y contacto',
      paragraphs: [
        'Si cambiamos esta política, publicaremos la nueva versión aquí con su fecha. Si el cambio es importante, te avisaremos.',
        `Para cualquier pregunta sobre privacidad: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};

const privacyEn: LegalDoc = {
  title: 'Privacy Policy',
  updated: UPDATED_EN,
  intro:
    'At Jiffy Photos (jiffyphotos.com) we make printed photo albums and calendars from your photos. This policy explains what data we collect, why we use it, who we share it with and how you can exercise your rights, in accordance with Colombian Law 1581 of 2012 and its regulations.',
  sections: [
    {
      heading: '1. Data we collect',
      bullets: [
        'Account data: name, email address and, if you sign up with a password, the encrypted password (managed by Google Firebase; we never see it).',
        'Order data: shipping address, phone number, the products you choose and your order history.',
        'Your photos and text: the images you upload or import and the text you write in your designs.',
        'Payment data: processed by Stripe. We do not store your card numbers.',
        'Minimal technical data: information your browser sends so the service works (for example, device type) and technical error logs.',
      ],
    },
    {
      heading: '2. How we use your data',
      bullets: [
        'To create, save and show you your designs while you edit them.',
        'To produce, print and ship your orders.',
        'To charge for orders and issue the corresponding receipts.',
        'To email you about your order and, unless you unsubscribe, news from Jiffy Photos.',
        'To help you when you ask for support.',
        'To keep the service secure and fix errors.',
      ],
      after: ['We do not sell your data or your photos, and we do not use them for third-party advertising.'],
    },
    {
      heading: '3. Importing photos from Google Photos',
      paragraphs: [
        'If you choose "Import from Google Photos", we ask for read-only permission (photospicker.mediaitems.readonly) and Google shows you its own picker. We only receive the photos you select in that picker; we have no access to the rest of your library.',
        'The selected photos are downloaded in your browser and added to your design just as if you uploaded them from your device. The access permission is temporary, is not stored on our servers and is not used for anything else. You can revoke it at any time at myaccount.google.com/permissions.',
        `Jiffy Photos' use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy (${GOOGLE_POLICY_URL}), including the Limited Use requirements. We do not use that information for advertising, we do not sell it, we do not use it to train artificial intelligence models, and no person reads it unless you ask us to for support or the law requires it.`,
      ],
    },
    {
      heading: '4. Who we share data with',
      paragraphs: ['Only with the providers we need to run the service, and only what is necessary:'],
      bullets: [
        'Google Cloud and Google Firebase: website hosting, accounts, database and photo storage.',
        'Stripe: payment processing.',
        'Email providers: sending order confirmations and communications.',
        'Artificial intelligence providers: when you use the help assistant or photo-ordering features, the information needed to respond is sent.',
        'Print workshops and shipping companies: to make and deliver your order.',
        'Authorities, when required by law.',
      ],
    },
    {
      heading: '5. International transfers',
      paragraphs: [
        'Some of these providers store data outside Colombia (for example, in the European Union or the United States). We only work with providers that offer adequate levels of protection.',
      ],
    },
    {
      heading: '6. How long we keep your data',
      bullets: [
        'Drafts that were never ordered: deleted automatically after a period of inactivity.',
        'Order photos: kept as long as needed to produce and ship the order and handle any claims.',
        'Account and order data: while you have an account and afterwards for as long as legal and accounting obligations require.',
      ],
    },
    {
      heading: '7. Browser storage',
      paragraphs: [
        'We use your browser\'s local storage to keep your session, language and drafts while you work. We do not use third-party advertising or tracking cookies.',
      ],
    },
    {
      heading: '8. Your rights',
      paragraphs: [
        `You can access, update, correct and delete your data, revoke your consent and request proof of it by writing to ${LEGAL_CONTACT_EMAIL}. We will reply within the legal deadlines. If you are not satisfied, you may contact Colombia's Superintendence of Industry and Commerce (SIC).`,
      ],
    },
    {
      heading: '9. Security',
      paragraphs: [
        'We use encrypted connections (HTTPS), access control and our providers\' security systems. No system is infallible, but we work to protect your data.',
      ],
    },
    {
      heading: '10. Minors',
      paragraphs: ['The service is intended for people aged 18 or over. Orders are always placed by an adult.'],
    },
    {
      heading: '11. Changes and contact',
      paragraphs: [
        'If we change this policy, we will publish the new version here with its date. If the change is significant, we will let you know.',
        `For any privacy question: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};

const termsEs: LegalDoc = {
  title: 'Términos del servicio',
  updated: UPDATED_ES,
  intro:
    'Estos términos regulan el uso de jiffyphotos.com y la compra de nuestros productos personalizados (álbumes y calendarios impresos). Al usar el servicio o hacer un pedido, aceptas estos términos.',
  sections: [
    {
      heading: '1. El servicio',
      paragraphs: [
        'Jiffy Photos te permite diseñar álbumes y calendarios con tus propias fotos y textos, pagarlos en línea y recibirlos impresos en la dirección que indiques.',
      ],
    },
    {
      heading: '2. Tu cuenta',
      paragraphs: [
        'Eres responsable de que los datos de tu cuenta sean correctos y de mantener tu acceso seguro. Avísanos si crees que alguien ha usado tu cuenta sin permiso.',
      ],
    },
    {
      heading: '3. Tus fotos y contenidos',
      bullets: [
        'Tus fotos y textos siguen siendo tuyos.',
        'Nos das permiso para guardarlos, procesarlos e imprimirlos solo con el fin de prestarte el servicio y producir tus pedidos.',
        'Declaras que tienes derecho a usar las fotos y textos que subes y que no infringen derechos de otras personas.',
        'No aceptamos contenido ilegal, que explote a menores, que incite al odio o la violencia, o que infrinja derechos de autor o de imagen. Podemos rechazar o cancelar pedidos con ese contenido.',
      ],
    },
    {
      heading: '4. Pedidos, precios y pagos',
      bullets: [
        'Los precios se muestran en pesos colombianos (COP) e incluyen los impuestos aplicables, salvo que se indique otra cosa. El costo de envío se muestra antes de pagar.',
        'El pago se hace en línea a través de Stripe. El pedido se confirma cuando el pago se aprueba.',
        'Antes de pagar, revisa con cuidado fotos, textos, orden de páginas y ortografía: imprimimos el diseño tal y como lo apruebas.',
      ],
    },
    {
      heading: '5. Producción y envío',
      paragraphs: [
        'Los plazos de producción y entrega son estimados y pueden variar por causas ajenas a nosotros, como la transportadora. Te mantendremos informado por correo sobre el estado de tu pedido.',
      ],
    },
    {
      heading: '6. Cambios, devoluciones y garantía',
      paragraphs: [
        'Como cada producto se fabrica según tus especificaciones, no aplica el derecho de retracto (artículo 47 de la Ley 1480 de 2011, Estatuto del Consumidor).',
        `Sí respondemos por la calidad: si tu producto llega dañado o con defectos de fabricación o impresión, escríbenos a ${LEGAL_CONTACT_EMAIL} con fotos del problema dentro de los 30 días siguientes a la entrega y lo repondremos o te devolveremos el dinero. No cubre errores que ya estaban en el diseño aprobado (fotos de baja resolución, erratas en los textos, etc.).`,
      ],
    },
    {
      heading: '7. Uso aceptable',
      paragraphs: [
        'No uses el servicio para fines ilegales, para intentar acceder sin permiso a sistemas o datos, ni de forma que pueda dañar el servicio o a otras personas.',
      ],
    },
    {
      heading: '8. Responsabilidad',
      paragraphs: [
        'Hacemos lo posible para que el servicio funcione bien y sin interrupciones, pero no podemos garantizarlo siempre. Guarda copia de tus fotos originales: no somos un servicio de copia de seguridad. Nuestra responsabilidad por un pedido se limita, en lo que permita la ley, al valor pagado por ese pedido.',
      ],
    },
    {
      heading: '9. Privacidad',
      paragraphs: ['El tratamiento de tus datos se rige por nuestra Política de privacidad.'],
    },
    {
      heading: '10. Cambios en estos términos',
      paragraphs: [
        'Podemos actualizar estos términos. La versión vigente es siempre la publicada aquí, y los pedidos se rigen por los términos vigentes cuando se hicieron.',
      ],
    },
    {
      heading: '11. Ley aplicable y contacto',
      paragraphs: [
        'Estos términos se rigen por las leyes de la República de Colombia.',
        `Para cualquier duda: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};

const termsEn: LegalDoc = {
  title: 'Terms of Service',
  updated: UPDATED_EN,
  intro:
    'These terms govern the use of jiffyphotos.com and the purchase of our personalized products (printed albums and calendars). By using the service or placing an order, you accept these terms.',
  sections: [
    {
      heading: '1. The service',
      paragraphs: [
        'Jiffy Photos lets you design albums and calendars with your own photos and text, pay for them online and receive them printed at the address you provide.',
      ],
    },
    {
      heading: '2. Your account',
      paragraphs: [
        'You are responsible for keeping your account details accurate and your access secure. Let us know if you think someone has used your account without permission.',
      ],
    },
    {
      heading: '3. Your photos and content',
      bullets: [
        'Your photos and text remain yours.',
        'You allow us to store, process and print them solely to provide the service and produce your orders.',
        'You confirm that you have the right to use the photos and text you upload and that they do not infringe anyone else\'s rights.',
        'We do not accept illegal content, content that exploits minors, incites hatred or violence, or infringes copyright or image rights. We may reject or cancel orders with such content.',
      ],
    },
    {
      heading: '4. Orders, prices and payment',
      bullets: [
        'Prices are shown in Colombian pesos (COP) and include applicable taxes unless stated otherwise. Shipping costs are shown before you pay.',
        'Payment is made online through Stripe. The order is confirmed once the payment is approved.',
        'Before paying, carefully review photos, text, page order and spelling: we print the design exactly as you approve it.',
      ],
    },
    {
      heading: '5. Production and shipping',
      paragraphs: [
        'Production and delivery times are estimates and may vary for reasons beyond our control, such as the carrier. We will keep you informed by email about your order status.',
      ],
    },
    {
      heading: '6. Changes, returns and warranty',
      paragraphs: [
        'Because each product is made to your specifications, the right of withdrawal does not apply (article 47 of Colombian Law 1480 of 2011, Consumer Statute).',
        `We do stand behind quality: if your product arrives damaged or with manufacturing or printing defects, email ${LEGAL_CONTACT_EMAIL} with photos of the problem within 30 days of delivery and we will replace it or refund you. This does not cover errors already present in the approved design (low-resolution photos, typos, etc.).`,
      ],
    },
    {
      heading: '7. Acceptable use',
      paragraphs: [
        'Do not use the service for illegal purposes, to try to access systems or data without permission, or in any way that could harm the service or other people.',
      ],
    },
    {
      heading: '8. Liability',
      paragraphs: [
        'We do our best to keep the service working well and without interruption, but we cannot always guarantee it. Keep a copy of your original photos: we are not a backup service. To the extent permitted by law, our liability for an order is limited to the amount paid for that order.',
      ],
    },
    {
      heading: '9. Privacy',
      paragraphs: ['The processing of your data is governed by our Privacy Policy.'],
    },
    {
      heading: '10. Changes to these terms',
      paragraphs: [
        'We may update these terms. The current version is always the one published here, and orders are governed by the terms in force when they were placed.',
      ],
    },
    {
      heading: '11. Governing law and contact',
      paragraphs: [
        'These terms are governed by the laws of the Republic of Colombia.',
        `For any question: ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};

const DOCS: Record<LegalDocKind, Record<'es' | 'en', LegalDoc>> = {
  privacy: { es: privacyEs, en: privacyEn },
  terms: { es: termsEs, en: termsEn },
};

export function getLegalDoc(kind: LegalDocKind, language: Language): LegalDoc {
  return DOCS[kind][language === 'en' ? 'en' : 'es'];
}
