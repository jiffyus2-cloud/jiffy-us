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

- `/{allPaths=**}`: cualquier usuario con sesión puede leer y escribir.
- `/system_images/**`: lectura pública (los visitantes sin sesión tienen que ver
  las imágenes de la tienda) y escritura o borrado solo del correo de
  administración.

> **Riesgo conocido, sin resolver.** La primera regla es muy amplia: cualquier
> cliente con cuenta puede leer, sobrescribir o borrar **cualquier** archivo del
> bucket, incluidas las fotos de los pedidos de otras personas y las imágenes de
> la tienda. En Storage las reglas se combinan con OR, así que el bloque
> específico de `system_images` no restringe nada: solo añade la lectura
> pública. Acotarlo (por ejemplo, que cada quien solo escriba bajo
> `orders/{su-uid}/**`) exige comprobar antes que ninguna ruta en uso se quede
> fuera, y por eso no se ha tocado aquí.
