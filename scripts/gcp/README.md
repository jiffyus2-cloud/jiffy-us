# Google Cloud y Firebase desde esta máquina

Scripts para operar producción sin pasar por Cloud Shell. Todos son `bash`
(Git Bash en Windows) y comparten `env.sh`, que localiza `gcloud.cmd` /
`firebase.cmd` y fija proyecto, región y nombres de servicio.

| Script | Qué hace |
|---|---|
| `status.sh` | Sesión de gcloud, URL/revisión/tráfico de `jiffy-us` y `jiffy-backend`, variables de entorno (secretos ocultos) y diff de reglas de Firebase. No cambia nada. |
| `deploy-frontend.sh` | Typecheck + tests y `gcloud run deploy --source .` de este repo a `jiffy-us`. |
| `deploy-backend.sh` | Build + tests y despliegue de `../jiffy-backend` a `jiffy-backend`; luego comprueba `/` y el preflight CORS desde `jiffyphotos.com`. |
| `env-set.sh` | Cambia/quita variables de entorno de un servicio (`^##^` para valores con comas). |
| `logs.sh` | Últimos logs de un servicio, opcionalmente filtrados por severidad. |
| `firebase-rules.sh` | Diff de `firestore.rules`/`storage.rules` contra lo publicado; `--deploy` las publica. |
| `scheduler-cleanup.sh` | Crea/actualiza el job de Cloud Scheduler que lanza la limpieza diaria de borradores vencidos (`POST /storage/cleanup` del backend). `--run` lo dispara ya; `--delete` lo quita. Necesita `STORAGE_CLEANUP_TOKEN` en el entorno. |

Atajos en `package.json`: `npm run gcp:status`, `gcp:deploy:frontend`,
`gcp:deploy:backend`, `gcp:logs`, `rules:check`, `rules:deploy`.

## Requisitos (ya instalados el 2026-09-15)

- **Google Cloud SDK** — `winget install --id Google.CloudSDK`. Queda en
  `%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin` y en el PATH del
  usuario. Desde Git Bash el wrapper `gcloud.cmd` falla con argumentos que
  llevan espacios, así que `env.sh` invoca el Python empaquetado del SDK
  (`platform/bundledpython/python.exe lib/gcloud.py`) directamente. Desde
  PowerShell o cmd, `gcloud` a secas funciona.
- **Firebase CLI** — `npm i -g firebase-tools`. Sesión: `firebase login`.
- Sesión de gcloud: `gcloud auth login --update-adc` con la cuenta dueña del
  proyecto (`jiffyus2@gmail.com`). Si el navegador por defecto no es el de esa
  cuenta, copia la URL que imprime gcloud al navegador correcto; y lanza UN solo
  `auth login` a la vez (dos a la vez se roban el callback de `localhost:8085`
  y falla con `mismatching_state`). `--update-adc` deja también las
  *Application Default Credentials* para librerías de Google en local.

## Topología

- **Dos proyectos de GCP**, no uno (la cuenta `jiffyus2@gmail.com` ve ambos):
  - `project-d2f55c96-6c64-431f-b40` (nº 938778636106, "My First Project"):
    aquí corre **Cloud Run**. Es el número que aparece en las URLs `*.run.app`.
  - `jiffy-photos-app` (nº 347563811469): **Firebase** (Auth, Firestore,
    Storage, reglas). No tiene la API de Cloud Run habilitada.
  `env.sh` los separa en `PROJECT` (Cloud Run) y `FIREBASE_PROJECT`.
- Región `europe-west1`. `gcloud config` ya apunta al proyecto de Cloud Run.
- Frontend: Cloud Run `jiffy-us` ← dominio `https://jiffyphotos.com`.
- Backend: Cloud Run `jiffy-backend` (NestJS), repo hermano `../jiffy-backend`.
- `FRONTEND_URL` del backend controla a la vez el CORS y el retorno de Stripe:
  debe ser siempre `https://jiffyphotos.com`.

## Reglas de seguridad

- Nunca `gcloud run services describe` sin filtrar: imprime en claro
  `STRIPE_SECRET_KEY`, `FIREBASE_PRIVATE_KEY`, `STRIPE_WEBHOOK_SECRET` y
  `ONECLIC_API_KEY`. Usa `status.sh`, que oculta todo lo que parezca secreto.
- Los secretos no van en la línea de comandos (`env-set.sh` avisa): expórtalos
  primero o pásalos a Secret Manager (`gcloud run services update --set-secrets`).
- `deploy-backend.sh` aborta si `firebase-service-account.json` no está en
  `.gcloudignore`/`.gitignore`: `--source .` sube el directorio a Cloud Build.
