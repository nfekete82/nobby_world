#!/usr/bin/env bash
set -euo pipefail
# Run from the folder containing this script after extracting nobby_world.zip.
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
printf 'Nobby World: %s\n' "$PROJECT_DIR"
if ! command -v gh >/dev/null 2>&1; then
  echo 'GitHub CLI fehlt: brew install gh' >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo 'Bitte zuerst GitHub anmelden:' >&2
  echo '  gh auth login' >&2
  exit 1
fi
if [ ! -d .git ]; then
  git init -b main
  git add .
  git commit -m "feat: start Nobby World forest prototype"
fi
# Create the user's own isolated private repo. Never mutate Panda & Ape until creation succeeded.
if gh repo view nfekete82/nobby_world >/dev/null 2>&1; then
  if git remote get-url origin >/dev/null 2>&1; then
    echo 'Ein origin-Remote existiert bereits. Bitte vor dem Push prüfen.' >&2
    exit 1
  fi
  git remote add origin https://github.com/nfekete82/nobby_world.git
  gh auth setup-git
  git push -u origin main
else
  gh repo create nfekete82/nobby_world --private --source=. --remote=origin --push
fi
printf '\nNobby World ist auf GitHub.\n'
# Delete ONLY the temporary prototype branch, NOT the Panda & Ape project/main.
if gh api --silent -X DELETE repos/nfekete82/panda-ape-adventure/git/refs/heads/ebonwold-prototype; then
  echo 'Temporärer Panda & Ape Branch ebonwold-prototype gelöscht.'
else
  echo 'Der alte Branch konnte nicht gelöscht werden (oder war schon gelöscht).' >&2
  echo 'Nobby World ist trotzdem erfolgreich übertragen worden.'
fi
printf '\nStarten mit: cd "%s" && python3 -m http.server 8080\n' "$PROJECT_DIR"
