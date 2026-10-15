#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p .tools
if [ -d .tools/Tiled.app ]; then echo 'Tiled ist bereits eingerichtet.'; exit 0; fi
archive=$(mktemp -t nobby-tiled)
trap 'rm -f "$archive"' EXIT
curl -fL 'https://github.com/mapeditor/tiled/releases/download/v1.12.2/Tiled-1.12.2_macOS-13%2B.zip' -o "$archive"
printf '%s  %s\n' '75712ec3a892701a9b2b7a12e44d636a1dbbe4caa6bb8bba729e697bd8a80433' "$archive" | shasum -a 256 -c -
ditto -xk "$archive" .tools
echo 'Tiled eingerichtet. Karteneditor.command öffnet dein Projekt.'
