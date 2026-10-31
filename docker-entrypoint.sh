#!/bin/sh
set -e
case "${1:-idle}" in
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
