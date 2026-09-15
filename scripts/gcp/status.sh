#!/usr/bin/env bash
#
# Radiografía de producción sin tocar nada: sesión de gcloud, servicios de
# Cloud Run (URL, revisión viva, tráfico, cuándo se desplegó), variables de
# entorno con los secretos ocultos, y si las reglas de Firebase del repo
# coinciden con las publicadas.
#
#   bash scripts/gcp/status.sh
#
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"

require_gcloud_auth
echo

for service in "$FRONTEND_SERVICE" "$BACKEND_SERVICE"; do
  echo "── Cloud Run · $service ──────────────────────────────────────────"
  if ! gcloud run services describe "$service" --project "$PROJECT" --region "$REGION" --format=json 2>/dev/null | node -e '
      let raw = ""; process.stdin.on("data", d => raw += d).on("end", () => {
        if (!raw.trim()) process.exit(1);
        const s = JSON.parse(raw);
        const traffic = (s.status?.traffic ?? []).map(t => `${t.revisionName}: ${t.percent}%`).join(", ");
        const ready = (s.status?.conditions ?? []).find(c => c.type === "Ready");
        console.log("  URL:       " + s.status?.url);
        console.log("  Revisión:  " + s.status?.latestReadyRevisionName + "  (tráfico → " + traffic + ")");
        console.log("  Estado:    " + (ready?.status === "True" ? "Ready" : ready?.status + " " + (ready?.message ?? "")));
        console.log("  Modificó:  " + (s.metadata?.annotations?.["serving.knative.dev/lastModifier"] ?? "?") + " · " + (ready?.lastTransitionTime ?? "?"));
        console.log("  git-sha:   " + (s.metadata?.labels?.["git-sha"] ?? "(sin etiqueta)"));
      });'; then
    echo "  (no existe en $PROJECT/$REGION o no tienes permiso)"
    echo
    continue
  fi
  echo "  Variables de entorno:"
  print_service_env "$service"
  echo
done

echo "── Firebase · $FIREBASE_PROJECT ─────────────────────────────────────────────"
echo "  Consola: https://console.firebase.google.com/project/$FIREBASE_PROJECT/overview"
if [[ -f "$FRONTEND_DIR/scripts/rules-diff.mjs" ]]; then
  echo "  Reglas (repo vs publicadas):"
  (cd "$FRONTEND_DIR" && node scripts/rules-diff.mjs 2>&1 | sed 's/^/    /') || true
fi
echo
echo "Público: $PUBLIC_URL"
