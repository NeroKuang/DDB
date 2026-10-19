#!/bin/sh
# Host-side helper for Vultr/Compose. Does NOT auto-run; invoke manually.
#
# Usage (on VPS under /opt/ddb):
#   ./scripts/vps-backfill-pay-periods.sh --from 2026-07 --to 2026-10
#   ./scripts/vps-backfill-pay-periods.sh --from 2026-07
#   ./scripts/vps-backfill-pay-periods.sh --from 2026-07 --force --continue-on-error

set -eu
cd "$(dirname "$0")/.."

exec docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T cron \
  /usr/local/bin/backfill-pay-periods.sh "$@"
