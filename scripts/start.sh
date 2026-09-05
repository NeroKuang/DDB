#!/bin/sh
set -e

# First deploy: RUN_DB_PUSH=1. After schema is stable, set to 0.
if [ "$RUN_DB_PUSH" = "1" ]; then
  echo "[start] prisma db push..."
  # Full CLI tree lives under /opt/prisma-cli (see Dockerfile prisma-cli stage).
  # Fail fast — do not start the app against an uninitialized schema.
  node /opt/prisma-cli/node_modules/prisma/build/index.js db push --schema=/app/prisma/schema.prisma --skip-generate
  echo "[start] prisma db push done"
fi

exec node server.js
