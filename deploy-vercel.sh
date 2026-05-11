#!/usr/bin/env bash
# Run from your Mac after: npx vercel login
#
# Defaults: scope id from `vercel teams ls` (Team name "…'s projects" → id column).
# Override: VERCEL_SCOPE=other-id VERCEL_PROJECT=elanacaplan ./deploy-vercel.sh

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

SCOPE="${VERCEL_SCOPE:-${VERCEL_TEAM:-elanacaplan22-7229s-projects}}"
PROJECT="${VERCEL_PROJECT:-elanacaplan}"

echo "==> Linking directory to Vercel (scope: $SCOPE, project: $PROJECT)"
npx vercel@latest link --yes --scope "$SCOPE" --project "$PROJECT"

echo "==> Deploying preview"
npx vercel@latest deploy --yes --scope "$SCOPE"

echo "==> Deploying production"
npx vercel@latest deploy --yes --prod --scope "$SCOPE"

echo "Done."
