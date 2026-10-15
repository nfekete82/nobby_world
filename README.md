# Nobby World · Tiny Swords RPG

**Entwicklungsstand: v0.2.0-dev.0** · lokaler Art-Direction-Review. Noch kein finales Release.

Ein vollständig lokales 2D-RPG auf RPG-JS 5.0: fünf in Tiled bearbeitbare
Welten mit Nobby, Mira, Nahkampfgegnern, Kartenportalen und nativen Speicherständen.
Grafikbasis ist der bereitgestellte **Tiny Swords Free Pack von Pixel Frog**.
Nobby behält braunes Haar, Bart und seine blaue Robe; Mira blondes Haar und Grün.
Die früheren Pipoya-Grafiken wurden aus dem laufenden Spiel entfernt.

## Charaktere und neue Biome

Beim ersten Start stehen Magier und Schamane zur Wahl. Der Schamane beschwört mit **R** oder Touch bis zu drei kämpfende Skelette für je **10 Mana**. Ein Reisestein nahe dem Inselstart führt zu Goldsand-Oase, Frostpranken-Pass und Smaragd-Dschungel. Neue Gegner, animierte Vegetation und transparente Agaven sind auch im Karteneditor verfügbar. Bestehende Spielstände laden als Magier; manuelle Karten werden nicht migriert.

[Bedienung, Architektur, Speicherstände und Docker-Start](docs/SHAMAN_AND_BIOMES.md) · [Grafikquellen und Promptset](docs/EXPANSION_ART_PROMPTS.md) · [Abnahme](docs/SHAMAN_ACCEPTANCE.md)

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

Die Docker-Version auf Port 8088 ist ein fertiger Build und übernimmt Änderungen
nach einem Neubau. Das Spiel benötigt im Einzelspielermodus keinen externen Server.

### OrbStack · einmal einrichten, danach ohne Terminal spielen und Karten bearbeiten

OrbStack führt bereits den Spielcontainer mit `restart: unless-stopped` aus.
Für Kartenänderungen und automatische Live-Aktualisierung ist jetzt zusätzlich
ein **Editor-Container** vorgesehen. Einmalig im Projektverzeichnis:

```sh
docker compose --profile editor up -d editor
```

Danach einfach **http://localhost:5173** öffnen. Auf diesem Port läuft das
Spiel inklusive Esc-Karteneditor, **direktem Speichern in `src/tiled/`**, 
Hot-Reload und Backup. Die macOS-Projektdateien sind in den Container eingebunden;
Abhängigkeiten liegen separat in einem OrbStack-/Docker-Volume und werden nur
bei Änderung der `package-lock.json` neu installiert.

Der Container wird nach Docker-Neustarts automatisch wiederhergestellt, solange
du ihn nicht manuell stoppst; dafür muss OrbStack laufen (optional **Start on login**
in den OrbStack-Einstellungen aktivieren). Der Editor ist aus Sicherheitsgründen
nur auf `127.0.0.1:5173` am Mac veröffentlicht. Prüfen mit
`docker compose --profile editor ps`, bei Bedarf Logs mit
`docker compose --profile editor logs -f editor`.

**Unterschied:** `localhost:5173` ist immer die Live-Entwicklerversion;
`localhost:8088` ist der separate, gebaute Release-Container. Für neue Versionen
auf 8088 einmal `docker compose up -d --build game` ausführen, für Arbeiten im
Karteneditor ist das nicht nötig.

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

**Direkt in die Projektdateien speichern:** Den oben beschriebenen OrbStack-
Editor einmalig starten und anschließend http://localhost:5173 öffnen.
Alternativ ohne Docker: `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`.
Dann **Esc → Karteneditor** öffnen.
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


#### Objektgalerie und Kartengröße

**Esc → Karteneditor → 🌲 Platzieren:** rechts sind alle verfügbaren Gebäude,
Bäume, Büsche, Steine, Figuren und Portale als **anklickbare Pixel-Art-Miniaturen**.
Mit der Suchleiste passende Objekte filtern. Ein Klick auf ein Objekt aktiviert
„Platzieren“ – weitere Klicks auf die Karte fügen dasselbe Objekt wiederholt
hinzu; **↖ Objekte** beendet den Platziermodus. Die Eigenschaften eines Objekts
kannst du weiterhin in „Objekte“ bearbeiten.

**Nur die Ansicht vergrößern:** oben **+ / −** oder Mausrad verwenden.
**⤢ Einpassen** zeigt wieder die ganze Karte.

**Die Spielwelt erweitern:** oben **▣ Karte erweitern** anklicken, neue Breite
und Höhe in 64px-Kacheln eingeben und **Fläche erweitern** wählen.
Die vorhandene Karte bleibt links oben an ihrer bisherigen Position, einschließlich
aller Landschaftskacheln, Gebäude, NPCs und Gegner. Rechts/unten kommt
anfangs **Wasser mit Kollisionssperre** dazu. Das kannst du anschließend mit
Geländekacheln übermalen und die Wasser-Kollision auf den neuen Landfeldern
entfernen. Zum Übernehmen **Speichern** (Vorschau auf Port 5173) oder
**TMX exportieren** (Docker). Rückgängig stellt die vorige Kartengröße
und sämtliche Tilesets wieder her. Aktuelle technische Grenzen:
128 Kacheln pro Seite und höchstens 6.250 Kacheln insgesamt, um das
RPG-JS-Navigationslimit (100.000 Zellen) nicht zu überschreiten.

### Erfahrungspunkte und Levelaufstieg

RPG-JS verteilt besiegten Gegnern automatisch **15 EP × Gegnerstufe** und
berechnet daraus Levelaufstiege. Die pro Stufe benötigten EP steigen mit der
bestehenden RPG-JS-Erfahrungskurve:

| Von → nach Stufe | EP für diesen Aufstieg |
| --- | ---: |
| 1 → 2 | 50 |
| 2 → 3 | 112 |
| 3 → 4 | 204 |
| 4 → 5 | 329 |
| 5 → 6 | 485 |

Die EP-Leiste zeigt den aktuellen Fortschritt innerhalb der Stufe, das
Charakterfenster (**C**) zusätzlich die noch fehlenden EP. Jeder Aufstieg
gibt 3 frei verteilbare Attributpunkte. Das Spiel berechnet weiterhin EP,
Stufen und die verfügbaren Punkte auf dem autoritativen Server.

### Karteneditor: sicher erweitern, speichern und einfach bedienen

**Karte erweitern:** Über **▣ Karte erweitern** Breite und Höhe in 64px-Kacheln
erhöhen. Bestehende Felder und Objekte bleiben an ihren Koordinaten; neue
Fläche ist Wasser mit blockierter Kollision. **💾 Speichern** validiert alle
CSV-Ebenen und Spielobjekte, schreibt die TMX-Datei atomar und kontrolliert
Breite, Höhe und Daten nach dem Schreiben. Ein Backup liegt unter
`art/map-backups/web-editor-*.tmx`. Bei einem Fehler wird die vorherige TMX
wiederhergestellt, der Editor bleibt mit deinen Änderungen offen und zeigt
die konkrete Fehlermeldung. Nach **erfolgreichem Speichern** kannst du
weiter editieren; mit **✕ Schließen** wird die Spielwelt neu kompiliert
und einmal kontrolliert neu geladen. So unterbricht kein erzwungener
Vite-Reload das Speichern.

**Kacheln versus Objekte:** Beim Klick auf **🖌 Kacheln** erscheinen
die Ebenenauswahl, eine Erklärung der Ebene sowie die Filter **Gelände,
Wasser, Wege, Brücken, Details**. Ein Filter wählt die passende Ebene vor;
die gewünschte Kachel danach aus der Vorschau anklicken. Bei **🌲 Platzieren**
und **↖ Objekte** gibt es stattdessen **Wald, Wasserobjekte, Felsen,
Gebäude, Deko, Tiere, NPCs, Gegner, Portale**. Das Platzieren bleibt aktiv,
bis du auf Objekte zurückschaltest. Die Ebenenauswahl wird bei Objekten
absichtlich ausgeblendet: Objekte sind unabhängig von den Kachelebenen.

**Ebenen:** Wassergrund = unterste Ozeanfläche; Uferwellen = optische Wellen;
Gelände = Gras/Erde/Inselland; Wege = sichtbare Wege; Brücke = sichtbare
Übergänge; **Sperrflächen (Logik)** = unsichtbare Kollision. In der
Kachelauswahl wird die Kollisionsschicht rot überblendet. Nachdem du neues
Land über dem hinzugefügten Wasser angelegt hast, auf **Sperrflächen
(Logik)** wechseln und die roten Sperren auf dem neuen Land mit
**⌫ Löschen** entfernen. Die echten Tiled-Namen werden nicht geändert,
damit vorhandene Karten kompatibel bleiben.

**OrbStack:** Den Editor-Container einmalig mit
`docker compose --profile editor up -d editor` starten. Änderungen an
TypeScript/JavaScript werden über Vite automatisch übernommen. Bei
Konfigurationsänderungen mit Vite-Neustart kann einmalig
`docker compose --profile editor restart editor` erforderlich sein.

### Zusätzliche Landschafts-Ebenen: Wüste, Felsboden und Schnee

Unter **Esc → Karteneditor → Kacheln** findest du **Wüste**, **Felsboden**
und **Schnee**. Jede Kategorie hat ein eigenes Tiny-Swords-Tileset mit 54
64×64-Kacheln und eine eigene Tiled-Ebene (sowohl in simplemap als auch in wald).
Das Anklicken eines Tilesets wählt die passende Ebene automatisch aus.

Neue Landschaften liegen **über Gras, aber unter Wegen und Brücken**. Das
gewünschte Übereinanderlegen bleibt erhalten: Beim Malen löscht der Editor
**keine fremden Ebenen**. Mit ⌫ Löschen entfernst du nur die aktuell gewählte
Ebene. Neue Landflächen müssen zusätzlich auf der Kollisions-Ebene entsperrt
werden, damit Nobby dort laufen kann.

Die drei PNG-Varianten werden aus der Original-Tiny-Swords-Wiese beim
Start bzw. World-Compile mit `scripts/biome-art.mjs` erzeugt, ohne die
Originalgrafiken zu verändern. Beide Karten haben leere neue Ebenen;
bestehende Weltinhalte und Objekte bleiben unverändert.

### Browser-Speicherung und Vite 8

Das Web-Editor-Speichern darf keinen Hot-Reload starten: Dafür unterdrückt
`vite.config.ts` während eines verwalteten TMX-Speichervorgangs sowohl Vites
`hotUpdate` (Vite 8) als auch den Kompatibilitäts-Hook `handleHotUpdate`.
Nach erfolgreichem Speichern bleibt der Editor geöffnet. Das reguläre Laden
der aktualisierten Spielwelt findet erst mit **Schließen** statt.

Ein Regressionstest speichert die tatsächliche `simplemap.tmx` in einem **temporären
Verzeichnis**, einschließlich der lokalen Kartendimensionen und aller Kachelebenen.
Die Projektkarte selbst wird dabei nicht verändert. Der Browser-Test
`npm run test:web-editor` liest ebenfalls die tatsächliche Kartengröße, statt
40×32 vorauszusetzen. Der Browser-Test exportiert/ändert die Karte nur im
Arbeitsspeicher und schreibt keine gespeicherte TMX-Datei.

### Biome-Workshop: additive Tilesets ohne Map-Verlust

Beim Öffnen des Web-Editors werden zusätzliche Overlay-Tilesets
`desert-path.tsx` und `snow-path.tsx` **nur im Browser-Dokument** eingebunden.
Sie erscheinen unter **Wüste → Übergänge** bzw. **Schnee → Übergänge**.
Die GIDs werden hinter dem höchsten bereits verwendeten Tileset ermittelt,
sodass auch ältere und lokal erweiterte Karten keine existierenden IDs verlieren.
Erst beim Malen und Speichern werden die neuen Tileset-Referenzen in der
TMX-Datei mitgespeichert. Gebäude und Kakteen verwenden die generierten
Sprite-Assets und benötigen keine neuen Kachelebenen.

### Werkstatt-Workflow: Wald, Wüste und Schnee

**Esc → Karteneditor → Gegend wählen:** Wald, Wüste oder Schnee.
Unter **🖌 Kacheln** erscheinen passende Flächen, Wasser, Wege, Brücken
und zusätzliche **Übergänge** (Sandweg/Schneepfad). Unter **🌲 Platzieren**
sind die zur Gegend passenden Objekte zu finden: sechs neue Wüstenobjekte
(zwei Kakteen, Fels, Lehmhaus, Zelt, Tempel) und ein Schneebaum.
Ein Objekt bleibt für Mehrfachplatzierung ausgewählt.

**Kollisionen:** Neue, gemalte Landschaft/Wege/Brücken entfernen standardmäßig
die Sperrfläche an dieser 64px-Kachel. Die Option
**„Beim Malen Boden/Wege begehbar machen“** lässt sich im Editor abschalten.
**„🧭 Vorhandene Wege entsperren“** korrigiert alte, sichtbare Wege/Brücken
und Biomflächen, die noch auf gesperrtem Wasser liegen. Das ist eine bewusste
Änderung der logischen Ebene; Wasser, Gras und Brückengrafiken werden **nicht**
zusammengeführt oder gelöscht. Bei der Reparatur nur bewusst angelegte
Wege/Brücken/Flächen prüfen, danach speichern.

Die Wüstengrafik verwendet stärkere Sand-Schattierung, dezente Dünenlinien
und Körnung statt eines einheitlich eingefärbten Gras-Tilesets.
Die neue Weggrafik ist als transparentes 3×3-Tileset ausgelegt und kann
auf die Sand- bzw. Schneeschicht gelegt werden; sie ist keine automatische
48-Kachel-Wang-/Blob-Autotiling-Engine. Ein komplexeres, vollständig
automatisches Multi-Terrain-Autotiling wäre ein späterer Ausbauschritt.

**Lokale Karten schützen:** Bei lokal editierten `src/tiled/*.tmx`
keinen Reset/Checkout und keinen Stash-Pop ausführen. Die Änderung dieses
Branches enthält keine zusätzlichen Änderungen an den beiden bereits
eingecheckten TMX-Karten; `git pull --ff-only` kann den Code daher unabhängig
von deiner 100×40-Karte aktualisieren. Wenn Git wegen anderer Dateien
blockiert, zuerst Kopien davon außerhalb des Repos anlegen.

### Lebendige Schafe auf der Wiese

Bereits platzierte und neu im Karteneditor hinzugefügte `sheep`-Objekte
sind jetzt servergesteuerte, friedliche Tiere. Sie laufen jeweils einzelne
64px-Schritte, nur auf echten Gras-/Waldkacheln, höchstens vier Kacheln
von ihrem ursprünglichen Standort entfernt. Dazwischen warten sie 2–4
Sekunden mit eigener, abgesenkter Fressanimation. Die Tiere überschreiten
keine Wassersperren, Gebäude oder Wege und wechseln nicht auf Wüste,
Felsen oder Schnee. Andere Props bleiben starr.

RPGJS `infiniteMoveRoute()` verwaltet die Abläufe auf dem Server ohne
eigene `setInterval`-Timer pro Tier. Kollisionslogik ist nicht verändert;
Schafe selbst sind weiterhin durchquerbar. Alle Kartenmasken werden beim
Kompilieren aus den tatsächlich gespeicherten TMX-Ebenen generiert.
`scripts/sheep-art.mjs` erzeugt das 6-Frame-Fressspritesheet aus der
vorhandenen Schafgrafik in einem ignorierten Ausgabeverzeichnis.

### Schafe im laufenden Browser prüfen

`npm run test:sheep` startet einen nicht-schreibenden Playwright-Test:
Er öffnet die echte Startwelt, wartet auf die serverseitigen Schaf-Events,
beobachtet ihre Positionen ca. 22 Sekunden und prüft den Gras- und
Bewegungsradius. Der Test ändert keine Karten und legt keine Objekte an.
