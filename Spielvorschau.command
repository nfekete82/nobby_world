#!/bin/zsh
set -e
cd "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v docker >/dev/null 2>&1; then
  echo 'Docker / OrbStack fehlt. Bitte installieren oder starten.'
  read '?Enter zum Schließen …'
  exit 1
fi
docker compose up -d --remove-orphans game
open 'http://localhost:8088/'
