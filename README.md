# Nobby World · Tiny Swords RPG

**Entwicklungsstand: v0.2.0-dev.0** · lokaler Art-Direction-Review. Noch kein finales Release.

Ein vollständig lokales 2D-RPG auf RPG-JS 5.0: zwei größere, in Tiled bearbeitbare
Welten mit Nobby, Mira, Nahkampfgegnern, Kartenportalen und nativen Speicherständen.
Grafikbasis ist der bereitgestellte **Tiny Swords Free Pack von Pixel Frog**.
Nobby behält braunes Haar, Bart und seine blaue Robe; Mira blondes Haar und Grün.
Die früheren Pipoya-Grafiken wurden aus dem laufenden Spiel entfernt.

## Spielen

Node.js 24 LTS verwenden:

```sh
npm ci
npm start
```

Öffnen: http://localhost:8088. Mit Docker:

```sh
docker compose up -d --build --force-recreate
```

Die Docker-Version ist ein fertiger Build und übernimmt Änderungen nach einem
Neubau. Das Spiel benötigt im Einzelspielermodus keinen externen Server.

| Eingabe | Aktion |
| --- | --- |
| Pfeiltasten | Bewegen |
| Leertaste | Nahkampf / NPC ansprechen / Portal benutzen |
| H oder Heilen-Button | 25 % Leben heilen, kostet 25 Mana |
| Esc oder Menü-Button | Status, Inventar, Fähigkeiten, Ausrüstung, Optionen, Speichern |
| Button rechts oben | Browser-Vollbild |

Die Ansicht füllt das Fenster. Kamera-Zoom ist ganzzahlig, sämtliche Texturen
werden mit Nearest Neighbor dargestellt. Alle Originalassets behalten ihre
Pixelgröße; transparente Ränder werden über zentrale Fußpunkte ausgeglichen.

## Eigene Karten · ohne Studio, Konto oder Cloud

`Karteneditor.command` öffnet Tiled und das vorbereitete Projekt.
`Spielvorschau.command` startet die Live-Vorschau unter http://localhost:5173.
In Tiled speichern → die Vorschau lädt die Karte neu. Tiled liegt lokal unter
`.tools/` und wird nicht mit Git/Docker verteilt. Auf einem neuen Mac (macOS 13+):
`npm run editor:setup`.

Die [Editor-Anleitung](editor/ANLEITUNG.md) erklärt 64px-Tiles, Wasser-Kollisionen,
Bäume/Gebäude, Gegnerstufen, NPC-Texte und Kartenportale. Vorlagen liegen unter
`editor/templates/`. Kopierte Karten mit `nobbyWorld = true` werden automatisch
registriert. Alternativ: `npm run world:new -- meine-welt`.

## Visuelles System

- Dorf/Insel: 40×32 Tiles, 2560×2048 px; Übungswald: 48×38, 3072×2432 px.
- Zusammenhängende Wege, Flussbrücke, Seen, Siedlung, Burg, Schafe und Hochflächen.
- `src/art/registry.json`: Framegrößen, Fußpunkte, Hitboxen, sichtbare Grenzen,
  Animationsdefinitionen und Herkunft der generierten Figuren.
- `public/tiny-swords/`: tatsächlich verwendete PNGs und kleine Compiler-Eingaben.
- `src/tiled/`: editierbare TMX/TSX-Karten und zugehörige Terrain-PNGs.
- `src/ui/`: Pack-basierte Papier-/Holzrahmen und HUD mit echten Engine-Werten.
- `scripts/world-data.mjs`: validiert Karten/Asset-Referenzen und kompiliert Events.
- `art/`: unveränderte ImageGen-Ausgaben, Produktionsbriefs, Pack-Digests und
  erhaltene Gameplay-Daten der Migration.

Verbindliche Regeln und tatsächliche Asset-Lücken:
[Art Direction](docs/TINY_SWORDS_ART_DIRECTION.md),
[Integrationsplan](docs/TINY_SWORDS_INTEGRATION_PLAN.md),
[Herkunft/Lizenzen](CREDITS.md), [ImageGen-Briefs](art/PROMPTS.md).

`npm run art:check` prüft **ohne npm-Abhängigkeiten** alle Asset-Dateien, Framegrößen, Tiled-Tilesets und verwendeten Tile-IDs.
`npm run art:prepare` kompiliert vorhandene Quellbilder deterministisch neu.
Normale Builds verändern keine Landschaft. `scripts/design-worlds.mjs` ist die
abgeschlossene, einmalige Migration. Ohne `--force` verweigert sie das Überschreiben.
Bei `node scripts/design-worlds.mjs --force` legt sie zuvor Sicherungen unter
`art/map-backups/` ab. Nicht auf später selbst bearbeiteten Karten verwenden.

## Prüfen

```sh
npm run art:check
npm run worlds:check
npm test
npm run build
# Chrome und das Docker-Spiel auf 8088:
npm run test:browser
# Chrome und die lokale Live-Vorschau auf 5173:
npm run test:editor
npm run test:art
```

Tests prüfen Framegrenzen/Füße, referenzierte PNGs, echte Gelände-/Objektgrundflächen,
Erreichbarkeit aller Begegnungen und Portale, Produktions-Builds unter Root/Subpfad,
Nahkampf/Belohnungen, Dialoge, Speichern, Kartenwechsel, Live-Editing und echte
Browseransichten. Vorher-/Nachher-Bilder: `artifacts/tiny-swords/`.

Der Save-Namensraum bleibt `nobby_world_rpgjs_v1`. Der frühere 3D-Prototyp ist in
Git archiviert. Seine 80-Gegner-Wellen, Zauber und Farmmechaniken wurden im
RPG-JS-Neustart nicht übernommen. Die aktuell vorhandenen Spielmechaniken bleiben
beim Grafikumbau erhalten; es gibt zwei Nahkampf-Gegnerarten und keine Bossbegegnung.
