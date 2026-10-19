#!/bin/sh
set -eu

if [ -z "${CRON_SECRET:-}" ]; then
  echo "[cron] CRON_SECRET is required" >&2
  exit 1
fi

APP_BASE_URL="${APP_BASE_URL:-http://app:8080}"

# BusyBox crond does not inherit Docker env into jobs; dump secrets to a root-only file.
umask 077
cat >/etc/ddb-cron.env <<EOF
CRON_SECRET=${CRON_SECRET}
APP_BASE_URL=${APP_BASE_URL}
EOF
chmod 600 /etc/ddb-cron.env

echo "[cron] starting crond TZ=${TZ:-Asia/Taipei} APP_BASE_URL=${APP_BASE_URL}"
exec crond -f -l 8 -L /var/log/ddb-cron.log
