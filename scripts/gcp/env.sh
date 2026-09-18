#!/usr/bin/env bash
#
# Constantes y utilidades compartidas por los scripts de scripts/gcp/*.
# No se ejecuta directamente: los demás hacen `source "$(dirname "$0")/env.sh"`.
#
# Topología (ver README de scripts/gcp):
#   - Frontend: servicio Cloud Run `jiffy-us`, detrás de https://jiffyphotos.com
#   - Backend:  servicio Cloud Run `jiffy-backend` (NestJS, repo ../jiffy-backend)
#   - Firebase: proyecto `jiffy-photos-app` (Auth, Firestore, Storage, reglas)
#
# OJO: son DOS proyectos de GCP distintos. Cloud Run corre en
# `project-d2f55c96-6c64-431f-b40` (nº 938778636106, el número que aparece en
# las URLs *.run.app) y Firebase en `jiffy-photos-app` (nº 347563811469).
#
# Todo se puede sobrescribir por entorno: PROJECT=... bash scripts/gcp/status.sh

set -euo pipefail

PROJECT="${PROJECT:-project-d2f55c96-6c64-431f-b40}"        # Cloud Run
FIREBASE_PROJECT="${FIREBASE_PROJECT:-jiffy-photos-app}"   # Firebase
REGION="${REGION:-europe-west1}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-jiffy-us}"
BACKEND_SERVICE="${BACKEND_SERVICE:-jiffy-backend}"
PUBLIC_URL="${PUBLIC_URL:-https://jiffyphotos.com}"

# Raíz del repo del frontend (donde está este scripts/gcp) y del backend.
FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="${BACKEND_DIR:-$(cd "$FRONTEND_DIR/.." 2>/dev/null && pwd)/jiffy-backend}"
# Dentro de un worktree (.claude/worktrees/<n>) el backend está tres niveles más arriba.
if [[ ! -d "$BACKEND_DIR" && -d "$FRONTEND_DIR/../../../../jiffy-backend" ]]; then
  BACKEND_DIR="$(cd "$FRONTEND_DIR/../../../../jiffy-backend" && pwd)"
fi

# Cuenta de servicio para scripts/rules-diff.mjs (solo lectura de reglas).
if [[ -z "${GOOGLE_APPLICATION_CREDENTIALS:-}" && -f "$BACKEND_DIR/firebase-service-account.json" ]]; then
  export GOOGLE_APPLICATION_CREDENTIALS="$BACKEND_DIR/firebase-service-account.json"
fi

# Variables de entorno que NUNCA se imprimen (ni parcialmente).
# Un `gcloud run services describe` sin filtrar las muestra en claro.
SECRET_ENV_PATTERN='SECRET|PRIVATE|KEY|TOKEN|PASSWORD|PASS$|CREDENTIAL'

# ── gcloud en Windows ────────────────────────────────────────────────────────
# El instalador deja `gcloud.cmd` en %LOCALAPPDATA%. Desde Git Bash ese wrapper
# rompe con cualquier argumento que lleve espacios (los filtros de `logging
# read`, por ejemplo): cmd.exe vuelve a trocear la línea y se queda con
# "C:...GoogleCloud". Por eso, si existe el Python empaquetado del SDK, se
# llama directamente a `lib/gcloud.py` sin pasar por cmd.exe. La función
# `gcloud` de aquí es la que usan todos los scripts.
_find_sdk_root() {
  local candidate
  for candidate in     "${CLOUDSDK_ROOT_DIR:-}"     "${LOCALAPPDATA:-}/Google/Cloud SDK/google-cloud-sdk"     "/c/Users/${USERNAME:-}/AppData/Local/Google/Cloud SDK/google-cloud-sdk"     "/c/Program Files (x86)/Google/Cloud SDK/google-cloud-sdk"     "/c/Program Files/Google/Cloud SDK/google-cloud-sdk"; do
    [[ -n "$candidate" && -f "$candidate/lib/gcloud.py" ]] && { printf "%s" "$candidate"; return 0; }
  done
  return 1
}

SDK_ROOT="$(_find_sdk_root || true)"
if [[ -n "$SDK_ROOT" && -f "$SDK_ROOT/platform/bundledpython/python.exe" ]]; then
  gcloud() { "$SDK_ROOT/platform/bundledpython/python.exe" "$SDK_ROOT/lib/gcloud.py" "$@"; }
elif command -v gcloud >/dev/null 2>&1; then
  gcloud() { command gcloud "$@"; }   # Linux/macOS o Cloud Shell
else
  echo "No encuentro gcloud. Instálalo con: winget install --id Google.CloudSDK" >&2
  exit 2
fi

# Firebase CLI (npm i -g firebase-tools). Igual: en Git Bash prefiere el .cmd.
FIREBASE_BIN="$(command -v firebase.cmd 2>/dev/null || command -v firebase 2>/dev/null || true)"
firebase() {
  [[ -n "$FIREBASE_BIN" ]] || { echo "No encuentro firebase-tools: npm i -g firebase-tools" >&2; return 2; }
  "$FIREBASE_BIN" "$@"
}

# ── Comprobaciones ───────────────────────────────────────────────────────────
require_gcloud_auth() {
  local account
  account="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | tr -d '\r')"
  if [[ -z "$account" ]]; then
    echo "gcloud no tiene sesión. Ejecuta: gcloud auth login" >&2
    exit 2
  fi
  echo "gcloud: $account · proyecto $PROJECT · región $REGION"
}

# Imprime las variables de entorno de un servicio ocultando el valor de las
# sensibles. Es la ÚNICA forma de mirar el entorno desde estos scripts:
# un `describe` sin filtrar enseña STRIPE_SECRET_KEY y FIREBASE_PRIVATE_KEY.
print_service_env() {
  local service="$1"
  gcloud run services describe "$service" --project "$PROJECT" --region "$REGION" --format=json 2>/dev/null |
    SECRET_ENV_PATTERN="$SECRET_ENV_PATTERN" node -e '
      let raw = ""; process.stdin.on("data", d => raw += d).on("end", () => {
        const svc = JSON.parse(raw || "{}");
        const env = svc?.spec?.template?.spec?.containers?.[0]?.env ?? [];
        const secret = new RegExp(process.env.SECRET_ENV_PATTERN, "i");
        if (!env.length) { console.log("  (sin variables)"); return; }
        for (const { name, value, valueFrom } of env) {
          const shown = valueFrom ? "(Secret Manager)" : secret.test(name) ? "(oculto)" : value;
          console.log("  " + name.padEnd(32) + " " + shown);
        }
      });'
}
