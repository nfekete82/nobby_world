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
| Pfeiltasten | Bewegen; zwei Pfeiltasten gleichzeitig ermöglichen diagonale Bewegung |
| WASD | Laufen; z. B. W+D für schräg oben rechts |
| Linksklick auf die Karte | Automatisch auch diagonal laufen, ohne Wasser- oder Mauerecken zu schneiden (8-Wege-A*) |
| Linksklick auf Gegner | Blaue Arkankugel aus der Distanz (12 Mana, 380px Reichweite); bei Bedarf sicher heranlaufen |
| Leertaste | Nahkampf / NPC ansprechen / Portal benutzen |
| H oder Heilen-Button | 25 % Leben heilen, kostet 25 Mana |
| Esc oder Menü-Button | Status, Inventar, Fähigkeiten, Ausrüstung, Optionen, Speichern |
| Button rechts oben | Browser-Vollbild |

Diagonale Bewegung nutzt normalisierte Vektoren aus der nativen RPG-JS-Bewegungsphysik (ohne Geschwindigkeitsbonus). Kollisionen und Positionen werden weiterhin vom Spielserver geprüft. Die Kamera- und Schrittanimationen bleiben die vorhandenen RPG-JS-Animationen.

Die Ansicht füllt das Fenster. Papier- und Holzrahmen laden auch unter einem konfigurierten Vite-Unterpfad.
Der Heil-Button wird bei voller Gesundheit oder zu wenig Mana deaktiviert. Kamera-Zoom ist ganzzahlig, sämtliche Texturen
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
- `scripts/world-data.mjs`: validiert Karten/Assets und kompiliert Events sowie eine Hinderniskarte für Linksklick-Bewegung.
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
npm run test:click
```

`npm run test:click` prüft einen echten Linksklick samt anschließender Figurbewegung im Browser.

`npm run test:art` startet bei Bedarf selbst einen lokalen Vite-Server auf
`127.0.0.1:5173`, beendet ihn nach dem Test und verwendet einen bereits laufenden
Nobby-World-Server unverändert weiter. Es ist kein zweites Terminal nötig.

Tests prüfen Framegrenzen/Füße, referenzierte PNGs, echte Gelände-/Objektgrundflächen,
Erreichbarkeit aller Begegnungen und Portale, Produktions-Builds unter Root/Subpfad,
Nahkampf/Belohnungen, Dialoge, Speichern, Kartenwechsel, Live-Editing und echte
Browseransichten. Vorher-/Nachher-Bilder: `artifacts/tiny-swords/`.

Der Save-Namensraum bleibt `nobby_world_rpgjs_v1`. Der frühere 3D-Prototyp ist in
Git archiviert. Seine 80-Gegner-Wellen, Zauber und Farmmechaniken wurden im
RPG-JS-Neustart nicht übernommen. Die aktuell vorhandenen Spielmechaniken bleiben
beim Grafikumbau erhalten; es gibt zwei Nahkampf-Gegnerarten und keine Bossbegegnung.

### Nobby als Magier

Ein Linksklick auf einen lebenden Gegner wählt ihn als Ziel und wirkt eine blaue Arkankugel.
Nobby läuft nur dann näher, wenn das Ziel außerhalb der 380px-Reichweite liegt
oder die Sichtlinie blockiert wird. Der Zauber verursacht 10 HP Schaden, kostet 12 Mana und hat 850ms
Abklingzeit. Der Server prüft Ziel, Sichtlinie, Mana, Reichweite und Cooldown
und wendet Treffer über die bestehende Action-Battle-KI an; Treffer
werden nach einer zur Flugdistanz passenden Verzögerung abgewickelt.
Klicks auf den Boden und die vorhandenen WASD-/Diagonaltasten funktionieren weiter.
Der leuchtende Projektil-Effekt wird bislang clientseitig für den Zaubernden
angezeigt; eine synchrone Anzeige für alle Spieler ist ein späterer Multiplayer-Schritt.

### Ruhige Animationen (FPS)

Das Sprite-Timing liegt in `src/art/registry.json` unter `assets.*.animations.*.fps`.
Aktuell: Nobby idle **1,5 FPS** (zwei ruhige Posen), Mira idle **1,5 FPS**,
Gegner idle **4 FPS**, Bäume/Büsche **2,5 FPS**, Schafe **4 FPS**, Wasser
**5 FPS**, Portal **8 FPS**. Laufen, Angriff und Zaubern sind unverändert
schnell. Die gleichen Werte sind in `scripts/compile-art.mjs` gesetzt,
damit `npm run art:prepare` sie nicht zurücksetzt.

#### Feste Gebäude und tiefere Wiesenfarbe

Häuser, Türme, Bäume und sonstige Dekorationen sind im RPG-JS-Physiksystem
**nicht schiebbar** (mass: 0, pushable: false), NPCs können sie nicht verschieben.
Die Wiesen-Tilesets `grass` und `forest` sind um **20 %** abgedunkelt.
Die abgeleiteten Dateien werden bei Änderungen an `scripts/darken-grass.mjs`
automatisch neu erstellt, ohne die Originale zu überschreiben.

### Waldwege mit natürlicher Abwechslung

Die ursprüngliche `src/tiled/tiny-swords/path.png` bleibt als unveränderte
Quelle erhalten. `scripts/path-art.mjs` erstellt die beiden Bildvarianten
`path-earthy.png` (moosig-erdig abgedunkelte weiß-blaue Ränder) und
`path-details.png` (zehn 64px-Varianten mit kleinen Steinen, Zweigen und Laub).
Das Tiled-Tileset `path-details.tsx` verwendet GIDs 218–227, die beiden
vorhandenen Karten mischen sie dezent unter normale Wegfelder. Keine
Kollisionen, Wegekonturen oder Raster ändern sich. `npm test`,
`npm run art:check` und der Docker-Build erzeugen die Dateien automatisch.

### Mana-Regeneration beim Stehen

nobby erhält **5 Mana pro Sekunde**, sobald er rund 250 ms nicht mehr
läuft oder zaubert. Die Regeneration läuft autoritativ auf dem Spielserver
in 200-ms-Schritten (1 Mana pro Schritt), nur solange der Held lebt,
auf einer Karte steht und noch Mana fehlt. Laufen und Zaubern setzen die
kurze Ruhephase zurück; das Mana kann niemals den MAXSP-Wert überschreiten.
Der Timer wird beim Verlassen der Spielsitzung entfernt.

### Karteneditor direkt im Spiel (erste Version)

Der Browser-Karteneditor ist über **Esc → 🗺 Karteneditor** erreichbar und
zeigt die echten Tiny-Swords-Kacheln, Häuser, Bäume, NPCs und Gegner an.
Er unterstützt:
- Kachelebenen auswählen, Kacheln aus allen vorhandenen Tilesets malen,
  mit dem Rad zoomen und per rechter Maustaste die Karte verschieben
- Gebäude und Bäume direkt platzieren, Objekte auswählen/verschieben/löschen,
  Objektnamen und Asset wechseln sowie Gegnerstufen und NPC-Texte ändern
- Rückgängig, TMX exportieren und Speichern; alle Änderungen bleiben im
  von Tiled bearbeitbaren TMX-Format

**Direkt in die Projektdateien speichern:** die lokale Entwickler-Vorschau
starten (in einem Terminal: `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`),
dann http://127.0.0.1:5173 öffnen und **Esc → Karteneditor**.
Die Vite-API erlaubt Änderungen nur von der lokalen Vorschau, prüft die
Dateiversion, erstellt vor jeder Änderung ein Backup unter
`art/map-backups/web-editor-*.tmx` und validiert die Karten. Bei einem
Fehler wird die Ursprungsdatei wiederhergestellt. Danach lädt die Vorschau
bei Bedarf automatisch neu.

**Docker auf Port 8088:** hier kann der Editor ebenfalls angezeigt und
benutzt werden, aber der Webserver enthält keinen Dateischreibdienst.
Mit **TMX exportieren** erhältst du die bearbeitete Karte zum manuellen
Ersetzen. Für direktes Speichern stets die Entwicklungs-Vorschau 5173 benutzen.

Die native RPG-JS-Spiellogik und die Original-Tiled-Vorlagen bleiben erhalten.
Komplexe Spezialeditoren (Autotiling, mehrstufige Objektgruppen, neue eigene
Sprites) werden weiterhin in Tiled gepflegt. Der Browser-Editor ist ein
erster, bewusst begrenzter Kartenbau-Modus. Browser-Abnahmetest:
`npm run test:web-editor`.
