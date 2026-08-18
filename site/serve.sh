#!/bin/sh
# Serve the course from the learn/ repo root so Markdown and site/ share one origin.
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8765}"
cd "$ROOT"
echo "learn_dsh 教程: http://127.0.0.1:${PORT}/site/"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
