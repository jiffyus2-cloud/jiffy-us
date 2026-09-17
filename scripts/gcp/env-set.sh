#!/usr/bin/env bash
#
# Cambia variables de entorno de un servicio de Cloud Run (crea una revisión).
# Los valores se pasan como NAME=VALUE; `--remove NAME` quita una.
#
#   bash scripts/gcp/env-set.sh jiffy-backend FRONTEND_URL=https://jiffyphotos.com
#   bash scripts/gcp/env-set.sh jiffy-backend "ALLOWED_ORIGINS=https://jiffyphotos.com,https://www.jiffyphotos.com"
#   bash scripts/gcp/env-set.sh jiffy-backend --remove VITE_OWNER_KEY
#
# Los valores con comas van bien: se usa el delimitador `^##^` de gcloud.
# Para secretos no los escribas en la línea de comandos (quedan en el
# historial): exporta la variable y pásala como NAME="$NAME".
#
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

service="${1:-}"
shift || true
if [[ -z "$service" || $# -eq 0 ]]; then
  echo "Uso: $0 <servicio> NAME=VALUE [NAME=VALUE...] [--remove NAME...]" >&2
  exit 2
fi

require_gcloud_auth

updates=()
removes=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --remove) removes+=("$2"); shift 2 ;;
    *=*)      updates+=("$1"); shift ;;
    *)        echo "Argumento no reconocido: $1" >&2; exit 2 ;;
  esac
done

args=()
if [[ ${#updates[@]} -gt 0 ]]; then
  joined=""
  for u in "${updates[@]}"; do
    joined="${joined:+$joined##}$u"
    echo "  set    ${u%%=*}"
  done
  args+=(--update-env-vars "^##^${joined}")
fi
if [[ ${#removes[@]} -gt 0 ]]; then
  csv=""
  for r in "${removes[@]}"; do
    csv="${csv:+$csv,}$r"
    echo "  remove $r"
  done
  args+=(--remove-env-vars "$csv")
fi

gcloud run services update "$service" --project "$PROJECT" --region "$REGION" --quiet "${args[@]}" >/dev/null
echo "Hecho. Entorno actual de $service:"
print_service_env "$service"
