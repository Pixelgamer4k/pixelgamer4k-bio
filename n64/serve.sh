#!/usr/bin/env bash
# Local static server for the N64 web emulator (no COOP/COEP required).
set -euo pipefail
cd "$(dirname "$0")"
PORT="${1:-8080}"
echo "Serving $(pwd) on http://127.0.0.1:${PORT}/"
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
fi
exec npx --yes serve -l "$PORT" .
