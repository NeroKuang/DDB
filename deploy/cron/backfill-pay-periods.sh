#!/bin/sh
# Manual only — NOT wired into crontab.
# Runs inside the Compose `cron` container (internal http://app:8080).
#
# Usage:
#   backfill-pay-periods.sh --from 2026-07 [--to 2026-10] [--force] [--continue-on-error]
#
# On VPS (recommended):
#   docker compose --env-file .env.prod -f docker-compose.prod.yml exec cron \
#     /usr/local/bin/backfill-pay-periods.sh --from 2026-07 --to 2026-10
#
# Long run: months run one-by-one (store fetch lock). Expect tens of minutes each.

set -eu

FROM=""
TO=""
FORCE=0
CONTINUE=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --from)
      FROM="${2:-}"
      shift 2
      ;;
    --to)
      TO="${2:-}"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --continue-on-error)
      CONTINUE=1
      shift
      ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

if [ -z "$FROM" ]; then
  echo "Required: --from YYYY-MM" >&2
  exit 2
fi

# shellcheck disable=SC1091
. /etc/ddb-cron.env

QS="from=${FROM}"
if [ -n "$TO" ]; then
  QS="${QS}&to=${TO}"
fi
if [ "$FORCE" -eq 1 ]; then
  QS="${QS}&force=1"
fi
if [ "$CONTINUE" -eq 1 ]; then
  QS="${QS}&continueOnError=1"
fi

URL="${APP_BASE_URL}/api/cron/backfill-pay-periods?${QS}"
echo "[backfill] GET ${URL}"
# 4h ceiling for several months of Playwright
exec curl -fsS --max-time 14400 \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "$URL"
echo
