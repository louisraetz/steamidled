#!/bin/sh
set -e
case "${1:-web}" in
  web)
    [ "$#" -eq 0 ] || shift
    exec node /app/dist/index.js --web "$@"
    ;;
  healthcheck)
    pgrep -f -- '--web' >/dev/null || exit 0
    wget -q -O /dev/null "http://127.0.0.1:${STEAMIDLED_WEB_PORT:-4821}/healthz"
    ;;
  idle)
    shift 2>/dev/null || true
    exec node /app/dist/index.js --headless "$@"
    ;;
  login)
    exec node /app/dist/index.js
    ;;
  *)
    exec node /app/dist/index.js "$@"
    ;;
esac
