#!/usr/bin/env bash
#
# Despliega el backend NestJS (../jiffy-backend) al servicio Cloud Run `jiffy-backend`.
#
# Las variables de entorno del servicio (STRIPE_*, ONECLIC_*, FRONTEND_URL…)
# NO se tocan: `gcloud run deploy` conserva las de la revisión anterior.
# Para cambiarlas usa scripts/gcp/env-set.sh.
#
#   bash scripts/gcp/deploy-backend.sh
#   BACKEND_DIR=/ruta/a/jiffy-backend bash scripts/gcp/deploy-backend.sh
#
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

[[ -d "$BACKEND_DIR" ]] || { echo "No encuentro el backend en $BACKEND_DIR (usa BACKEND_DIR=…)" >&2; exit 2; }
cd "$BACKEND_DIR"
require_gcloud_auth

sha="$(git rev-parse --short HEAD)"
branch="$(git branch --show-current)"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Aviso: hay cambios sin commitear en $BACKEND_DIR; se desplegará el árbol tal cual." >&2
fi
# `--source .` sube el directorio a Cloud Build respetando .gcloudignore
# (o .gitignore si no existe). La cuenta de servicio nunca debe viajar.
if [[ -f firebase-service-account.json ]] && ! grep -qs 'firebase-service-account.json' .gcloudignore .gitignore; then
  echo "firebase-service-account.json no está ignorado: se subiría a Cloud Build. Abortando." >&2
  exit 1
fi

echo "Compilando y corriendo tests…"
npm run --silent build
npm test --silent

echo
echo "Desplegando $BACKEND_SERVICE ← $branch@$sha ($PROJECT, $REGION)…"
gcloud run deploy "$BACKEND_SERVICE" \
  --project "$PROJECT" --region "$REGION" \
  --source . \
  --allow-unauthenticated \
  --port 8080 \
  --update-labels "git-sha=$sha" \
  --quiet "$@"

echo
url="$(gcloud run services describe "$BACKEND_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)' | tr -d '\r')"
echo "Desplegado en $url"
echo -n "Comprobación de vida: "
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' "$url/" || true
echo -n "CORS desde $PUBLIC_URL: "
if curl -sS -i -X OPTIONS "$url/stripe/create-checkout" -H "Origin: $PUBLIC_URL" \
     -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type,authorization' \
     | grep -qi 'access-control-allow-origin'; then
  echo "OK"
else
  echo "FALTA access-control-allow-origin → revisa FRONTEND_URL / ALLOWED_ORIGINS (env-set.sh)"
fi
