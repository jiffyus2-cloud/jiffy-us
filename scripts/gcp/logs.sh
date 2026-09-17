#!/usr/bin/env bash
#
# Últimas líneas de log de un servicio de Cloud Run (más antiguas arriba).
#
#   bash scripts/gcp/logs.sh jiffy-backend          # últimas 50
#   bash scripts/gcp/logs.sh jiffy-backend 200      # últimas 200
#   bash scripts/gcp/logs.sh jiffy-backend 50 ERROR # solo severidad >= ERROR
#
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

service="${1:-$BACKEND_SERVICE}"
limit="${2:-50}"
severity="${3:-}"

require_gcloud_auth >/dev/null
filter="resource.type=cloud_run_revision AND resource.labels.service_name=$service"
if [[ -n "$severity" ]]; then
  filter="$filter AND severity>=$severity"
fi

gcloud logging read "$filter" --project "$PROJECT" --limit "$limit" --order desc --format=json | node -e '
  let raw = ""; process.stdin.on("data", d => raw += d).on("end", () => {
    const entries = JSON.parse(raw || "[]").reverse();
    for (const e of entries) {
      const req = e.httpRequest ? `${e.httpRequest.requestMethod} ${e.httpRequest.status} ${e.httpRequest.requestUrl}` : "";
      const msg = e.textPayload ?? e.jsonPayload?.message ?? (e.jsonPayload ? JSON.stringify(e.jsonPayload) : "");
      console.log(`${e.timestamp}  ${(e.severity ?? "").padEnd(7)} ${req}${msg}`.trimEnd());
    }
  });'
