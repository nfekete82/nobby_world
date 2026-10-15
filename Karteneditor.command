#!/bin/zsh
set -e
cd "${0:A:h}"
if [[ ! -d .tools/Tiled.app ]]; then
  echo 'Tiled fehlt. Bitte npm run editor:setup ausführen.'
  read '?Enter zum Schließen …'
  exit 1
fi
open -a "$PWD/.tools/Tiled.app" "$PWD/nobby-world.tiled-project" "$PWD/src/tiled/simplemap.tmx"
