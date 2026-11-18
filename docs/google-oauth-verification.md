# Verificación de Google — "Data access" (Google Fotos)

Material para la solicitud de verificación del cliente OAuth de **jiffy-photos-app**
(Google Auth Platform → *Data access* → *Prepare for verification*).
Todo lo que se pega en Google va **en inglés**.

Requisito previo: **Branding verificado** (dominio `jiffyphotos.com` verificado en
Google Search Console con la cuenta jiffyus2@gmail.com, y *Verify branding* aprobado).

---

## 1. Datos de la app (comprobar antes de enviar)

| Campo | Valor |
|---|---|
| App name | Jiffy Photos |
| Home page | https://jiffyphotos.com |
| Privacy policy | https://jiffyphotos.com/privacidad |
| Terms of service | https://jiffyphotos.com/terminos |
| Authorized domain | jiffyphotos.com |
| OAuth client (Web) | 347563811469-nr5qked2cp72p3jsvee94mua1ilfi3fn.apps.googleusercontent.com |
| Authorized JS origins | https://jiffyphotos.com, https://www.jiffyphotos.com, http://localhost:5173 |
| Scopes solicitados | **solo** `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` |

En *Data access*, comprueba que **no** haya otros scopes añadidos (ni Drive, ni
`photoslibrary.*`). Cada scope de más alarga la revisión. Antes de enviar,
conviene **quitar `http://localhost:5173`** de los orígenes del cliente de
producción (Google a veces lo marca) o crear un segundo cliente solo para desarrollo.

---

## 2. Justificación del scope (pegar en "How will the scopes be used?")

> **Scope:** `https://www.googleapis.com/auth/photospicker.mediaitems.readonly`
>
> Jiffy Photos (https://jiffyphotos.com) is an online service where customers design
> and order printed photo albums and calendars. To build an album, the customer must
> add their own photos. Many of our customers keep their photos only in Google Photos,
> so we offer an optional "Import from Google Photos" button on the photo upload step
> of the album editor.
>
> When the customer clicks the button, we request the photospicker.mediaitems.readonly
> scope and open the Google Photos Picker. The customer chooses exactly which photos to
> import inside Google's own picker UI. We then call the Picker API (sessions and
> mediaItems endpoints) to read only the items the customer selected, and download
> those image files in the customer's browser so they can be placed on the pages of
> their album. Videos are ignored.
>
> We never see or access the rest of the user's library: the Picker API only exposes
> the items the user explicitly selected. The access token is kept only in the browser's
> memory for the current session; it is never sent to or stored on our servers, and the
> picker session is deleted as soon as the import finishes.
>
> The selected photos become part of the customer's album design. They are stored
> (Google Cloud / Firebase Storage) only to save the customer's draft and to print and
> ship the order the customer pays for, and they are deleted according to the retention
> rules described in our privacy policy. We do not use this data for advertising, we do
> not sell or share it with third parties other than our printing partners for the
> customer's own order, we do not use it to train AI or ML models, and no person views
> it except to fulfil or support the customer's order.
>
> A narrower scope is not available: photospicker.mediaitems.readonly is the most
> limited scope that lets a user pick photos from Google Photos, and it only grants
> access to the items the user selects. Our use complies with the Google API Services
> User Data Policy, including the Limited Use requirements, as stated in our privacy
> policy: https://jiffyphotos.com/privacidad

---

## 3. Vídeo de demostración

Requisitos de Google: **YouTube, visibilidad "No listado"**, en inglés o con
subtítulos/rótulos en inglés, que se vea **el flujo completo de OAuth** y **el uso
de los datos**. 2–4 minutos. Grabarlo con la app ya desplegada en
**https://jiffyphotos.com** (no localhost) y con el idioma de la app en **English**
si es posible (los textos del editor que siguen en español se explican con los rótulos en inglés).

### Guion (cada paso en pantalla; los rótulos entre comillas se pueden narrar o poner como texto)

1. **Navegador en https://jiffyphotos.com** — que se vea la URL.
   Rótulo: *"Jiffy Photos – customers design printed photo albums."*
2. Mostrar el pie de página y abrir **Privacy Policy** → bajar hasta la sección
   *"Importing photos from Google Photos"* y el párrafo de *Limited Use*. Volver.
3. Iniciar sesión en Jiffy, elegir **Photo Album → Create yours**, pasar la
   personalización hasta el paso **Photos**.
   Rótulo: *"Step 3: the customer adds photos to the album."*
4. Pulsar **"Importar desde Google Fotos"** (el botón solo existe en español).
   Rótulo: *"Clicking \"Import from Google Photos\"."*
5. **Pantalla de consentimiento de Google**: detenerse 3–4 segundos. Hacer zoom /
   mostrar la barra de direcciones para que se lea el **client_id**
   (`347563811469-nr5qked2…`) y el nombre **Jiffy Photos**. Mostrar el permiso
   solicitado (*"See the photos you select…"*). Aceptar.
   Rótulo: *"Only scope requested: photospicker.mediaitems.readonly."*
6. **Selector de Google Fotos**: elegir 3–5 fotos y pulsar **Done**.
   Rótulo: *"The user chooses exactly which photos to share. We cannot see anything else."*
7. Volver a la pestaña de Jiffy: se ve cómo se importan las fotos y aparecen en las
   **páginas del álbum**.
   Rótulo: *"Selected photos are downloaded in the browser and placed on the album pages."*
8. Mostrar una página del álbum con una foto importada (abrir el editor de la página).
   Rótulo: *"The photos are only used to build and print the customer's own album."*
9. Final: abrir https://myaccount.google.com/permissions y mostrar que el acceso de
   Jiffy Photos se puede revocar.
   Rótulo: *"Users can revoke access at any time."*

Consejos: grabar a pantalla completa (Win + Alt + R con la Xbox Game Bar, o OBS),
sin datos personales de clientas reales; usar una cuenta de Google con fotos de prueba.

---

## 4. Respuestas habituales del formulario

- **Does your app access Google user data from a server?** No. The token is used
  only in the browser; our servers receive only the photo files the user chose,
  as part of their album draft/order.
- **Do you transfer Google user data to third parties?** Only to fulfil the user's
  own order (printing partner), as permitted by Limited Use.
- **Is the app used only internally / by test users?** No, public customers.
- **Contact email for Google's team:** jiffyus2@gmail.com (o memorias@jiffyphotos.com).

---

## 5. Después de enviar

- Google responde por correo (a la dirección de *Developer contact*), normalmente
  en 3–5 días hábiles; a veces pide un vídeo nuevo o aclaraciones. Contestar desde
  el mismo hilo.
- `photospicker.mediaitems.readonly` es un scope **sensible**, no restringido:
  **no** requiere auditoría de seguridad (CASA).
- Mientras tanto la app funciona con el aviso "Google hasn't verified this app"
  y el tope de 100 usuarios de por vida.
