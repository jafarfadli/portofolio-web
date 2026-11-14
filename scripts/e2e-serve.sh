#!/bin/sh
# Seeds a throwaway database, builds once, then serves both roles from that build and data:
# public on :3100, and the editor on 127.0.0.1:3101 (ROLE=admin, a fake tailnet login for the identity check).
set -e
trap 'kill 0' INT TERM EXIT
rm -rf .data-e2e
export DATA_DIR=.data-e2e
pnpm -s db:seed
pnpm -s build
pnpm exec next start -p 3100 &
until curl -sf http://127.0.0.1:3100/api/health >/dev/null; do sleep 0.5; done
ROLE=admin ADMIN_TAILSCALE_LOGIN=owner@e2e.test pnpm exec next start -H 127.0.0.1 -p 3101 &
wait
