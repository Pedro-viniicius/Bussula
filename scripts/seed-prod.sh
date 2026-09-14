#!/usr/bin/env sh
# Seeds the PRODUCTION database in one shot: pull credentials, seed, delete.
# The credentials file never lingers, even if the seed fails.
#   pnpm db:seed:prod            # refuses if leads already exist
#   pnpm db:seed:prod --force    # you know the database has leads
set -eu
cd "$(dirname "$0")/.."
trap 'rm -f .env.producao' EXIT INT TERM
vercel env pull .env.producao --environment=production --yes
ENV_FILE=.env.producao pnpm tsx scripts/seed.ts "$@"
