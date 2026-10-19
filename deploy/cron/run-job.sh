#!/bin/sh
set -eu

JOB="${1:-}"
MAX_TIME="${2:-900}"

if [ -z "$JOB" ]; then
  echo "[cron] usage: run-job.sh <daily-fetch|month-end-fetch|storage-retention> [max-time]" >&2
  exit 2
fi

# shellcheck disable=SC1091
. /etc/ddb-cron.env

LOCK="/tmp/ddb-cron-${JOB}.lock"
URL="${APP_BASE_URL}/api/cron/${JOB}"
STAMP="$(date '+%Y-%m-%dT%H:%M:%S%z')"

if ! flock -n "$LOCK" \
  curl -fsS --max-time "$MAX_TIME" \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    "$URL"; then
  code=$?
  # flock exit 1 = lock busy (overlap); curl non-zero = request failed
  if [ "$code" -eq 1 ]; then
    echo "[cron] ${STAMP} ${JOB}: skipped (already running)"
    exit 0
  fi
  echo "[cron] ${STAMP} ${JOB}: failed (exit ${code})" >&2
  exit "$code"
fi

echo "[cron] ${STAMP} ${JOB}: ok"
