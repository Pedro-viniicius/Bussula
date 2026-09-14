#!/usr/bin/env sh
# Runs a script against the PRODUCTION database in one shot:
# pull credentials → run → delete the file (also on failure or Ctrl-C).
#   sh scripts/prod.sh scripts/seed.ts [--force]
#   sh scripts/prod.sh scripts/db-whoami.ts
# .env.producao exists only for the duration of this command and is
# gitignored; application code never reads it.
set -eu
cd "$(dirname "$0")/.."
script="$1"; shift
trap 'rm -f .env.producao' EXIT INT TERM
vercel env pull .env.producao --environment=production --yes >/dev/null
ENV_FILE=.env.producao pnpm tsx "$script" "$@"
