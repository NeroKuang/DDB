#!/bin/sh
set -e

# First deploy: RUN_DB_PUSH=1. After schema is stable, set to 0.
if [ "$RUN_DB_PUSH" = "1" ]; then
  echo "[start] prisma db push..."
  node ./node_modules/prisma/build/index.js db push --skip-generate || true
fi

exec node server.js
