#!/bin/zsh
set -e
cd "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
preview_page=$(curl -fsS --max-time 2 'http://localhost:5173' 2>/dev/null || true)
if [[ "$preview_page" == *'<title>Nobby World'* ]]; then
  open 'http://localhost:5173'
  echo 'Die Nobby-Spielvorschau läuft bereits.'
  exit 0
fi
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
