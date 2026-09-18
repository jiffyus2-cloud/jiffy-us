# Reglas de seguridad (Firestore y Storage)

Las reglas viven en este repositorio y **el repositorio manda**:

| Archivo | Servicio | Qué protege |
|---|---|---|
| `firestore.rules` | Cloud Firestore | Pedidos, usuarios, ajustes de tienda, códigos de descuento |
| `storage.rules` | Cloud Storage | Fotos de los pedidos e imágenes de la tienda |

Se pueden editar desde la consola de Firebase, y ahí está el peligro: si alguien
lo hace, el repo deja de contar la verdad y el siguiente despliegue pisa ese
cambio sin avisar. Por eso hay una comprobación.

## Comprobar si lo publicado coincide con el repo

```bash
npm run rules:check
```

Pregunta a la API de Firebase Rules qué está publicado ahora mismo y lo compara
con los dos archivos, ignorando comentarios y líneas en blanco. Si algo no
coincide, deja lo publicado en `<archivo>.live` para poder mirarlo y sale con
código 1.

Necesita una cuenta de servicio del proyecto. Por defecto busca
`../jiffy-backend/firebase-service-account.json`; también admite
`GOOGLE_APPLICATION_CREDENTIALS` o `--key <ruta>`:

```bash
node scripts/rules-diff.mjs --key C:/ruta/service-account.json
```

## Publicar

```bash
npm run rules:deploy
```

Publica **los dos** archivos (`firebase deploy --only firestore:rules,storage`).
Antes de ejecutarlo conviene lanzar `npm run rules:check`: si hay cambios hechos
en la consola que no están en el repo, este comando los borra.

## Cómo están hoy

### Firestore

- `orders`: cada quien lee y escribe los suyos; el dueño de la tienda, todos. Un
  pedido en producción, enviado o entregado ya no lo puede tocar el cliente.
- `users`: cada quien su propio perfil; el dueño puede leerlos todos.
- `settings`: lectura pública (la tienda necesita precios e imágenes sin sesión),
  escritura solo del dueño.
- `discount_codes`: `get` público y `list` solo del dueño. Es deliberado — el
  checkout tiene que poder comprobar **un** código sin sesión de administración,
  pero nadie debe poder descargarse el catálogo entero de códigos.
- `mcp_api_keys`: solo el dueño.

El canje de códigos lo escribe el backend con el SDK de administrador, que **se
salta las reglas**; por eso no hay ninguna regla que permita a un cliente tocar
`uses` ni `redemptions`.

### Storage

- `orders/{uid}/**`: cada cliente entra solo en la carpeta que lleva su propio
  uid, que es justo donde escribe la app — `orderService` construye la ruta con
  el uid de la sesión. El dueño de la tienda entra en todas, porque tiene que
  revisar y descargar los pedidos para producción.
- `system_images/**`: lectura pública (los visitantes sin sesión tienen que ver
  las imágenes de la tienda) y escritura solo del correo de administración.

No hay ninguna regla que abarque el bucket entero, y es a propósito: en Storage
las reglas se combinan con OR, así que una regla amplia no se puede «acotar»
después con otra más específica. Hasta septiembre de 2026 existía
`/{allPaths=**}` con `allow read, write: if request.auth != null`, que dejaba a
cualquier cliente con cuenta leer, sobrescribir o borrar los archivos de
cualquier otro pedido.

Las URLs de descarga que guarda la app (`getDownloadURL`) llevan un token y
siguen funcionando al margen de las reglas; por eso endurecerlas no afecta a las
galerías ya guardadas ni a las descargas del panel.
