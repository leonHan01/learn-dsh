#!/bin/sh
# Serve the course from the learn/ repo root so Markdown and site/ share one origin.
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8765}"
cd "$ROOT"

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "端口 ${PORT} 已被占用。" >&2
  echo "若教程已在跑：http://127.0.0.1:${PORT}/site/" >&2
  echo "否则换端口：PORT=8766 $0" >&2
  exit 1
fi

echo "learn_dsh 教程: http://127.0.0.1:${PORT}/site/"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
