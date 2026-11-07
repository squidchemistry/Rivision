#!/bin/sh
set -e
npx prisma migrate deploy
if [ "$DEMO_SEED" = "true" ]; then
  npm run db:seed-demo
fi
exec npm start
