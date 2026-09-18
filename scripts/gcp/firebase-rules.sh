#!/usr/bin/env bash
#
# Reglas de Firestore/Storage: compara las del repo con las publicadas y,
# con `--deploy`, publica las del repo.
#
#   bash scripts/gcp/firebase-rules.sh           # solo diff (= npm run rules:check)
#   bash scripts/gcp/firebase-rules.sh --deploy  # firebase deploy --only firestore:rules,storage
#
source "$(dirname "${BASH_SOURCE[0]}")/env.sh"
cd "$FRONTEND_DIR"

session="$(firebase login:list 2>/dev/null | tr -d '\r' | grep -i 'logged in' || true)"
echo "Firebase CLI: ${session:-sin sesión → ejecuta: firebase login}"
if [[ "${1:-}" == "--deploy" ]]; then
  firebase deploy --only firestore:rules,storage --project "$FIREBASE_PROJECT"
else
  node scripts/rules-diff.mjs
fi
