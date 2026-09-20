#!/usr/bin/env bash
#
# Crea o actualiza el job de Cloud Scheduler que lanza la limpieza automática de
# borradores (`POST /storage/cleanup` de jiffy-backend) una vez al día.
#
#   export STORAGE_CLEANUP_TOKEN=...          # el mismo que tiene el servicio
#   bash scripts/gcp/scheduler-cleanup.sh     # crea/actualiza el job
#   bash scripts/gcp/scheduler-cleanup.sh --run     # lo dispara ahora mismo
#   bash scripts/gcp/scheduler-cleanup.sh --delete  # lo elimina
#
# El token no se pasa por argumentos (quedaría en el historial): se lee de la
# variable de entorno STORAGE_CLEANUP_TOKEN y viaja en el header
# `x-cleanup-token`, que es lo que comprueba CleanupAuthGuard en el backend.
# Cloud Run escala a cero, por eso la limpieza no puede ser un cron interno.
#
# Horario y zona se pueden cambiar: SCHEDULE="0 4 * * *" TIME_ZONE=Europe/Madrid ...
#
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

JOB_NAME="${JOB_NAME:-jiffy-storage-cleanup}"
SCHEDULE="${SCHEDULE:-0 3 * * *}"
TIME_ZONE="${TIME_ZONE:-America/Bogota}"

require_gcloud_auth

case "${1:-}" in
  --run)
    gcloud scheduler jobs run "$JOB_NAME" --project "$PROJECT" --location "$REGION"
    echo "Job lanzado. Mira el resultado con: bash scripts/gcp/logs.sh $BACKEND_SERVICE 50"
    exit 0
    ;;
  --delete)
    gcloud scheduler jobs delete "$JOB_NAME" --project "$PROJECT" --location "$REGION" --quiet
    echo "Job $JOB_NAME eliminado."
    exit 0
    ;;
  "") ;;
  *) echo "Argumento no reconocido: $1" >&2; exit 2 ;;
esac

if [[ -z "${STORAGE_CLEANUP_TOKEN:-}" ]]; then
  echo "Falta STORAGE_CLEANUP_TOKEN en el entorno. Genera uno y ponlo también en el servicio:" >&2
  echo '  export STORAGE_CLEANUP_TOKEN="$(openssl rand -hex 32)"' >&2
  echo "  bash scripts/gcp/env-set.sh $BACKEND_SERVICE STORAGE_CLEANUP_TOKEN=\"\$STORAGE_CLEANUP_TOKEN\"" >&2
  exit 2
fi

backend_url="$(gcloud run services describe "$BACKEND_SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)' | tr -d '\r')"
if [[ -z "$backend_url" ]]; then
  echo "No encuentro la URL del servicio $BACKEND_SERVICE." >&2
  exit 2
fi

# La API de Cloud Scheduler debe estar habilitada en el proyecto de Cloud Run.
gcloud services enable cloudscheduler.googleapis.com --project "$PROJECT" >/dev/null

common=(
  --project "$PROJECT" --location "$REGION"
  --schedule "$SCHEDULE" --time-zone "$TIME_ZONE"
  --uri "$backend_url/storage/cleanup" --http-method POST
  --headers "Content-Type=application/json,x-cleanup-token=$STORAGE_CLEANUP_TOKEN"
  --message-body '{"dryRun":false,"expiredDrafts":true,"orphans":false}'
  --attempt-deadline 900s
)

if gcloud scheduler jobs describe "$JOB_NAME" --project "$PROJECT" --location "$REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$JOB_NAME" "${common[@]}" >/dev/null
  echo "Job $JOB_NAME actualizado."
else
  gcloud scheduler jobs create http "$JOB_NAME" "${common[@]}" >/dev/null
  echo "Job $JOB_NAME creado."
fi
echo "  $SCHEDULE ($TIME_ZONE) → POST $backend_url/storage/cleanup"
echo "Pruébalo ahora con: bash scripts/gcp/scheduler-cleanup.sh --run"
