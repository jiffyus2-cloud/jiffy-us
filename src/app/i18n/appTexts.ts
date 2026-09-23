// ============================================================================
// App Texts
// ============================================================================
// Textos informativos que antes estaban escritos a mano dentro de cada
// componente (descripciones, avisos, alertas…). Viven aquí para que salgan en
// el panel "Textos de la Tienda" y se puedan cambiar sin tocar código.
//
// Solo en español: la app no ofrece hoy otro idioma y `t()` usa el español
// cuando una clave no existe en inglés.
//
// Variables: `{nombre}` se rellena desde el código (no se puede quitar al
// editar). `**texto**` sale en negrilla donde el componente usa <RichText>.
// ============================================================================

export const APP_TEXTS_ES: Record<string, string> = {

  // ── Preguntas frecuentes (landing) ──────────────────────────────────────
  'faq.1.q': '1. ¿Cómo creo mi álbum Jiffy?',
  'faq.1.a': 'Crear tu álbum es muy fácil:\n- Elige el tipo de álbum que más te guste.\n- Personaliza tu portada con título, colores y detalles.\n- Selecciona tus fotos desde el celular o computador.\n- Aprueba el diseño digital.\n- ¡Recibe tu álbum en casa!',
  'faq.2.q': '2. ¿Qué tipos de álbumes ofrecen?',
  'faq.2.a': 'Contamos con 4 formatos:\n- 20x20 cm\n- 30x30 cm\n- Vertical 21x28 cm\n- Horizontal 28x21 cm',
  'faq.3.q': '3. ¿Cuánto tiempo tarda la entrega?',
  'faq.3.a': 'El tiempo de producción es de 10 días hábiles después de que apruebes el diseño. El envío depende de tu ciudad, pero normalmente llega en 2 a 5 días hábiles adicionales.',
  'faq.4.q': '4. ¿Hacen envíos a todo el país?',
  'faq.4.a': 'Sí. Enviamos a cualquier ciudad de Colombia mediante transportadoras confiables.',
  'faq.5.q': '5. ¿Cómo se realiza el pago?',
  'faq.5.a': 'Puedes pagar por tarjeta de crédito o débito (link de pago).',
  'faq.6.q': '6. ¿Puedo regalar un álbum Jiffy?',
  'faq.6.a': '¡Claro! 🎁 Tenemos bonos de regalo para que la persona que quieras pueda crear su álbum con sus propias fotos y estilo.',
  'faq.7.q': '7. ¿Cuántas fotos puedo incluir?',
  'faq.7.a': 'Generalmente recomendamos entre 40 y 120 fotos para que el álbum quede bien organizado y visualmente equilibrado. Si tienes más, puedes agregar páginas hasta un total de 250 páginas por álbum.',
  'faq.8.q': '8. ¿Puedo hacer cambios en el diseño?',
  'faq.8.a': 'Sí. Después de terminar tu álbum lo puedes revisar en vista previa y ahí podrás realizar ajustes en portada, orden de fotos o textos.',
  'faq.9.q': '9. ¿Las fotos pierden calidad al imprimirse?',
  'faq.9.a': 'Trabajamos con impresión de alta resolución. Recomendamos subir las fotos en la mejor calidad posible (evita capturas de pantalla o fotos descargadas de WhatsApp, porque suelen perder nitidez).',
  'faq.10.q': '10. ¿Qué otros productos ofrece Jiffy además de álbumes?',
  'faq.10.a': 'Además de álbumes, tenemos calendarios personalizados y el servicio de Álbum Personalizado, en el que una curadora diseña cada página por ti.',
  'faq.11.q': '11. Política de calidad de imagen e impresión',
  'faq.11.a': 'En Jiffy cuidamos cada detalle para que tus recuerdos se vean lo mejor posible. Sin embargo, es importante tener en cuenta que los colores pueden variar ligeramente entre lo que ves en pantalla y el resultado impreso. Esto se debe a que las pantallas emiten luz, mientras que la impresión se realiza con tinta sobre papel, lo que puede generar pequeñas diferencias en tonos y brillo. Trabajamos con estándares de impresión profesional para lograr la mayor fidelidad posible en cada álbum.',
  'faq.12.q': '12. ¿Qué formatos de archivos aceptan para las fotos?',
  'faq.12.a': 'Aceptamos formatos JPG, PNG y HEIC. Para obtener la mejor calidad, recomendamos imágenes con una resolución mayor a 300 dpi.',

  // ── Elige tu producto ─────────────────────────────────────────────────────
  'product.albumCardDesc': 'Cada recuerdo es único y merece ser contado. Álbumes con páginas en papel opalina para tus momentos más importantes.',
  'product.customAlbumCardDesc': 'Una curadora selecciona tus mejores fotos y diseña cada página por ti, de principio a fin.',
  'product.calendarCardDesc': 'Tus días merecen la mejor sonrisa. Calendarios personalizados para recibir el día con la mejor actitud.',

  // ── Álbum Personalizado (pantalla de solicitud) ───────────────────────────
  'customAlbum.intro': 'Un curador te acompaña de principio a fin: tú solo compartes tus fotos, nosotros hacemos el resto.',
  'customAlbum.step1.desc': 'Al confirmar, te redirigimos a WhatsApp para hablar directamente con una de nuestras curadoras.',
  'customAlbum.step2.desc': 'Le envías todas las fotos que quieras incluir en tu álbum.',
  'customAlbum.step3.desc': 'La curadora escoge las mejores fotos y crea la disposición de cada página por ti.',
  'customAlbum.step4.desc': 'Te mostramos el diseño final antes de imprimir, para que apruebes cualquier ajuste.',
  'customAlbum.step5.desc': 'Una vez aprobado, enviamos tu álbum a producción y lo despachamos a tu dirección.',
  'customAlbum.sizeDesc': 'Precios estimados — la curadora confirmará el valor final según la cantidad de fotos y páginas de tu álbum.',

  // ── Ficha de producto (modal de detalles) ─────────────────────────────────
  'details.album.gallerySubtitle': 'Historias reales, recuerdos que hoy se pueden volver a sentir',

  // ── Instalar la app (aviso emergente) ─────────────────────────────────────
  'install.iosSteps': 'Toca **Compartir** (⬆) y luego **"Añadir a pantalla de inicio"** para instalar Jiffy Photos como app.',

  // ── Pago (checkout) ───────────────────────────────────────────────────────
  'checkout.pickupPointDesc': 'Te contactaremos por correo o teléfono para coordinar la entrega',
  'checkout.pickupHowItWorks': '**¿Cómo funciona?** Una vez confirmado tu pedido, te contactaremos al correo o teléfono que nos dejaste para coordinar el punto y horario de entrega.',
  'checkout.deliveryTime': '**Tiempo de entrega de los álbumes:** 12 días hábiles a partir de la confirmación de la compra.',

  // ── Configurar álbum y portada ────────────────────────────────────────────
  'albumSetup.basicDesc': 'Ajusta los materiales y dimensiones antes de diseñar la portada.',
  'albumSetup.coverDesc': 'Elige el diseño que más te guste y luego haz clic en la portada para añadir tus textos y fotos.',

  // ── Configurar calendario ─────────────────────────────────────────────────
  'calendarSetup.range': 'Tu calendario irá desde **{from}** hasta **{to}**.',

  // ── Editor de portada ─────────────────────────────────────────────────────
  'cover.fixRedTexts': 'Ajusta los textos marcados en rojo para poder guardar.',
  'cover.lowResDesc': 'Esta imagen mide **{size}** (menor a 1080p). Al imprimirse en la portada podría verse pixelada o borrosa.',

  // ── Mi cuenta y borradores ────────────────────────────────────────────────
  'dashboard.customAlbumPending': 'Un curador se pondrá en contacto contigo por WhatsApp para continuar con tu solicitud.',
  'dashboard.customAlbumWhatsApp': 'Hola, quiero hacer un Álbum Personalizado. Mi solicitud fue registrada con el código {code}.',

  // ── Visor del pedido (detalle) ────────────────────────────────────────────
  'orderView.noPreview': 'No hay una vista previa disponible para este tipo de producto.',

  // ── Fotos (avisos comunes de álbum y calendario) ──────────────────────────
  'photos.lowResDesc': 'Esta imagen mide **{size}** (menor a 1080p). Al imprimirla podría verse pixelada o borrosa.',
  'photos.checkingQualityDesc': 'Asegurando la mejor resolución para tu impresión',

  // ── Organizador del calendario ────────────────────────────────────────────
  'calendarOrg.tooManyPhotos': 'Solo puedes subir un máximo de {max} fotos para este calendario.\n\nSe han seleccionado automáticamente las primeras {count} fotos permitidas para completar los espacios vacíos.',
  'calendarOrg.duplicateDesc': 'La foto **"{name}"** ya fue añadida anteriormente al calendario.',

  // ── Creador (guardado y avisos) ───────────────────────────────────────────
  'creator.photoLossZero': 'No guardamos: el diseño se quedaría sin ninguna de tus {count} fotos. Recarga la página y vuelve a abrir el borrador; el guardado anterior sigue intacto.',
  'creator.photoLossConfirm': 'Tu diseño pasaría de {before} a {after} fotos guardadas.\n\nSi no borraste fotos a propósito, cancela y avísanos.\n\n¿Continuar de todos modos?',
  'creator.photoLossAutoSave': 'No guardamos automáticamente: el diseño tenía menos fotos de lo esperado.',
  'creator.autoSaveFailed': 'No pudimos guardar automáticamente. Usa "Guardar borrador".',
  'creator.uploadFailedDesc': 'Tus fotos siguen aquí, no se perdió nada y tu diseño no cambió. Revisa tu conexión e inténtalo otra vez.',

  // ── Editor del álbum: avisos de reparto y páginas ─────────────────────────
  'organizer.feasTooFewPhotos': 'Tienes {photos} foto(s) para {pages} páginas con foto. Cada página necesita al menos una: quita páginas hasta {maxPages} o añade {missing} foto(s) más.',
  'organizer.feasTooManyPhotos': '{photos} foto(s) no caben en {pages} páginas: en este formato cada página admite como mucho {perPage}. Necesitas al menos {minPages} páginas.',
  'organizer.feasMinPhotos': 'Necesitas mínimo 40 fotos para crear el álbum (llevas {photos}).',
  'organizer.feasMaxPhotos': 'El máximo en este formato es {max} fotos (llevas {photos}).',
  'organizer.feasPagesRange': 'El álbum debe tener entre 40 y {max} páginas con foto.',
  'organizer.feasUnreachable': '{photos} foto(s) no se pueden repartir exactamente en {pages} páginas usando páginas de {sizes} fotos.',
  'organizer.appendAlbumFull': 'El álbum ya está en el máximo de {max} páginas: no hay sitio para páginas nuevas.',
  'organizer.appendNoRoom': '{photos} foto(s) no caben en las {free} páginas que quedan libres.',
  'organizer.appendUnreachable': '{photos} foto(s) no se pueden repartir exactamente en {pages} páginas nuevas usando páginas de {sizes} fotos. Prueba con otro número.',
  'organizer.appendDone': 'Añadimos {photos} foto(s) en {pages} página(s) nueva(s) al final (páginas {from} a {to}). Lo que ya tenías no cambió.',
  'organizer.fillNoEmpty': 'La página {page} ya no tiene huecos vacíos.',
  'organizer.fillDone': 'Colocamos {photos} foto(s) en los huecos de la página {page}.',
  'organizer.fillLeftOut': '{photos} foto(s) se quedaron fuera porque la página solo tenía {slots} hueco(s).',
  'organizer.pageMaxPhotos': 'Has alcanzado el límite máximo de {max} fotos para esta página en este formato.',
  'organizer.redistributed': 'Álbum reorganizado: {photos} foto(s) repartidas en {pages} páginas.',
  'organizer.redistributedReverse': 'Álbum reorganizado en orden inverso (Z → A): {photos} foto(s) repartidas en {pages} páginas.',
  'organizer.sendNoRoom': 'No hay espacio disponible en la página {page}.',
  'organizer.sendFailed': 'No se pudo enviar la foto a esa página. Intenta de nuevo.',
  'organizer.warnMaxPages': 'No hay espacio para {photos} foto(s): el álbum ya está en el máximo de {max} páginas. No se movió ninguna foto.',
  'organizer.warnRefusedDeletion': 'No borramos la(s) página(s) {pages} porque tienen contenido.',
  'organizer.warnMoved': 'Movimos {photos} foto(s) a la página {page}.',
  'organizer.recovered': 'Recuperamos {photos} foto(s) desde la copia guardada en este dispositivo.',
  'organizer.noCompanionPage': 'No encontramos una página compañera que se pueda eliminar.',
  'organizer.wouldGoBelowMin': 'No se puede completar la acción porque el álbum quedaría con menos de 40 páginas.',

  // ── Editor del álbum: fotos, ajustes de página y carga ────────────────────
  'organizer.duplicateDesc': 'La foto **"{name}"** ya fue añadida anteriormente al álbum.',
  'organizer.sendDropZone': 'Arrastra una foto aquí para enviarla a otra página',
  'organizer.emptySlotsDesc': 'Esta página tiene **{count} hueco(s)** sin foto. Puedes elegir las {count} de una vez y se colocan en orden.',
  'organizer.pickerDesc': 'El carrete se cerrará solo cuando iOS termine y la app continuará automáticamente.',
  'organizer.pickerAccept': 'Entendido — esperaré sin cerrar la app hasta que el carrete se cierre solo.',
  'organizer.transferMenuHint': '👆 Hay un menú en pantalla, selecciona la opción de dónde quieres seleccionar tus fotos',
  'organizer.transferWait': 'Cuando ya hayas elegido, por favor espera sin cerrar la app',

  // ── Editor del álbum: subida y número de páginas ──────────────────────────
  'organizer.recoveredDesc': 'La app se reinició, pero tus fotos seguían guardadas en este dispositivo. Puedes seguir añadiendo más.',
  'organizer.dontCloseTab': '⚠️ Por favor, no cierres ni recargues esta pestaña',
  'organizer.uploadTimeHint': 'Según la cantidad de fotos seleccionadas, el tiempo de carga puede variar',
  'organizer.photosGiveForPages': 'Con **{photos} fotos** y 1 foto por página como mínimo, tus fotos dan para **{pages} páginas**. Si quieres más, añádelas en blanco aquí abajo.',
  'organizer.extraBlankDesc': 'Súmalas si quieres más de las {pages} páginas que dan tus {photos} fotos (hasta {max} en total).',
  'organizer.pagesWillBeEmpty': 'Has elegido {pages} páginas y tienes {photos} fotos: **{empty} página(s) quedarán vacías**. Podrás rellenarlas o eliminarlas en el editor.',
  'organizer.appendDesc': 'Se crearán páginas nuevas después de la página {page}. Las que ya tienes no cambian.',
  'organizer.appendKeep': 'Tus páginas actuales, con sus fotos, recortes, textos y diseños, **quedan igual**.',
  'organizer.appendRules': 'Las fotos nuevas se reparten con las mismas reglas de la carga inicial: la primera sola, sin repetir tamaños seguidos y con las menos páginas de 3 posibles.',

  // ── Editor del álbum: modales (añadir, formato, páginas vacías, eliminar) ───
  'organizer.appendResult': 'El álbum pasará de **{from}** a **{to} páginas** (las nuevas serán de la {first} a la {to}).',
  'organizer.appendExtraPrice': 'Cada página por encima de las 40 base cuesta {price}.',
  'organizer.skippedFiles': 'No pudimos procesar {count} archivo(s): {files}',
  'organizer.formatChangedMax': 'En **{size}** caben como máximo **{max} fotos por página**.',
  'organizer.formatChangedAtRisk': 'Tienes **{photos} foto(s)** en {pages} página(s) que ya no caben. No se perderá ninguna: las moveremos a las páginas siguientes.',
  'organizer.formatKeepHint': 'Si prefieres conservar el diseño actual, vuelve atrás y elige de nuevo un tamaño cuadrado.',
  'organizer.emptyPagesDesc': 'Tienes **{count} página(s) vacía(s)** en tu diseño (Págs: {pages}). ¿Qué deseas hacer antes de enviar a imprimir?',
  'organizer.emptyPagesCantDelete': 'No puedes eliminar páginas porque el álbum debe mantener un mínimo de 40 páginas.',
  'organizer.emptyPagesOddDesc': 'Los álbumes requieren páginas en pares. Elige cómo ajustar:',
  'organizer.deletePageHasPhotos': 'Contiene **{count} foto(s)** que se perderán permanentemente.',
  'organizer.companionAlsoDeleted': 'Los álbumes requieren páginas en pares, por lo que esta página también será eliminada.',
  'organizer.companionPhotosLost': '**{count} foto(s)** se perderán permanentemente.',

  // ── Editor del álbum: reorganizar, ayuda y cuadrícula ─────────────────────
  'organizer.redistributeDesc': 'Reparte otra vez tus {photos} fotos desde cero, como cuando se cargaron al principio.',
  'organizer.redistributeWarnOrder': 'El orden en que colocaste las fotos **se pierde**: se reparten de nuevo de la primera a la última página.',
  'organizer.redistributeWarnCounts': 'Se borrarán **{crops} recorte(s)** y **{texts} caja(s) de texto**.',
  'organizer.redistributeWarnAll': 'Se borrarán los recortes y las cajas de texto de todas las páginas.',
  'organizer.redistributeWarnLayouts': 'Los diseños de cada página y las páginas en blanco que hayas insertado vuelven al reparto automático.',
  'organizer.redistributeWarnUndo': '**No se puede deshacer.** Ninguna foto se borra: las {photos} siguen en el álbum.',
  'organizer.redistributeRules': 'Tus **{photos} fotos** se repartirán entre las **{pages} páginas** con las mismas reglas de la carga inicial: la primera sola, sin repetir tamaños seguidos y con las menos páginas de 3 posibles.',
  'organizer.redistributeConfirm': 'Entiendo que se reiniciará el orden de mis fotos y que se perderán los recortes, los textos y los diseños de página.',
  'organizer.helpReorderDesc': 'Mantén presionada una página **1 segundo** hasta que vibre. La página queda seleccionada. Luego toca otra página y elige **Intercambiar** (las dos páginas se cambian de lugar) o **Insertar aquí** (la página se mueve a esa posición desplazando las demás).',
  'organizer.helpEditDesc': 'Toca el botón **Ajustes** de cualquier página para abrir el panel de edición: añade, elimina o recorta fotos, cambia el diseño y el número de imágenes por página.',
  'organizer.helpMoveDesc': 'Dentro del panel de ajustes, **toca y arrastra** cualquier foto para cambiar su posición con otra dentro de la misma página.',
  'organizer.layoutDecreaseDesc': 'Al reducir el diseño, te quedan **{count} foto(s)** por fuera. ¿Qué deseas hacer con ellas?',
  'organizer.layoutIncreaseDesc': 'El nuevo diseño quedó con espacios en blanco. ¿Quieres que organicemos las fotos automáticamente para llenarlos?',
  'organizer.longPressHint': 'Mantén presionada una página para reorganizarla',

};
