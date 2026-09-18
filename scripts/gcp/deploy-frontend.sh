#!/usr/bin/env bash
#
# Despliega el frontend (esta carpeta) al servicio Cloud Run `jiffy-us`.
#
# Cloud Build construye la imagen con el Dockerfile del repo (Vite + nginx) y
# Cloud Run la publica en una revisión nueva con el 100 % del tráfico. Las
# variables VITE_* se leen de .env.local en tiempo de build (está versionado:
# solo contiene la config pública de Firebase y las URLs del backend).
#
#   bash scripts/gcp/deploy-frontend.sh               # despliega el árbol actual
#   bash scripts/gcp/deploy-frontend.sh --no-traffic  # revisión sin tráfico, para probar
#
# Antes de desplegar pasa typecheck + tests, igual que el CI.
#
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

cd "$FRONTEND_DIR"
require_gcloud_auth

sha="$(git rev-parse --short HEAD)"
branch="$(git branch --show-current)"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Aviso: hay cambios sin commitear; se desplegará el árbol de trabajo tal cual." >&2
fi

echo "Comprobando typecheck y tests…"
npm run --silent typecheck
npm run --silent test

echo
echo "Desplegando $FRONTEND_SERVICE ← $branch@$sha ($PROJECT, $REGION)…"
gcloud run deploy "$FRONTEND_SERVICE" \
  --project "$PROJECT" --region "$REGION" \
  --source . \
  --allow-unauthenticated \
  --port 80 \
  --update-labels "git-sha=$sha" \
  --quiet "$@"

echo
echo "Desplegado. Comprueba: $PUBLIC_URL"
gcloud run services describe "$FRONTEND_SERVICE" --project "$PROJECT" --region "$REGION" \
  --format='value(status.latestReadyRevisionName)' | tr -d '\r' | sed 's/^/Revisión viva: /'
