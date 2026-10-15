# Nobby World · verbindliche Art Direction

## Einheit und Perspektive

Ein Weltpixel entspricht einem Quellpixel. Das Kartenraster ist 64×64 px, wie im
bereitgestellten Tiny-Swords-Pack. Alle originalen Charaktere, Häuser und Pflanzen
bleiben nativ groß. Kamera-Zoom ist eine ganze Zahl; Nearest Neighbor,
Renderer-Auflösung 1 und deaktiviertes Antialiasing verhindern unscharfe Sprites.
Die Kamera folgt dem Spieler; bei großen Bildschirmen steigt der ganzzahlige Zoom,
damit keine schwarzen Ränder erscheinen.

Blickwinkel, Silhouetten und Licht kommen aus Tiny Swords: Aufsicht mit sichtbaren
Vorderseiten, große Chibi-Köpfe, dunkle schieferblaue Konturen, Licht von links oben.
Die Wiese verwendet Salbei/Olive, der Wald dunkleres Gras, Wasser Türkis, Wege Ocker,
Siedlungen blaue Dächer und warmes Holz. Grün kennzeichnet Heilung; Blau/Weiß den
kurzen magischen Nahkampfbogen. Gegner bleiben bewaffnete Nahkämpfer.

## Figuren, Fußpunkte und Kollision

`src/art/registry.json` ist die einzige Runtime-Quelle für Framegrößen, Frames,
Animationstakt, transparente Pixelgrenzen, Fußpunkte und Grundflächen. Eine
192×192-Charakterzelle enthält ungefähr 64–80 sichtbare Körperpixel. Nobby/Mira
werden mechanisch auf 70px Ruhehöhe normalisiert, mit unveränderlicher Skalierung
innerhalb jeder Animation. Der feste Fußpunkt ist `[96,132]`, die Grundfläche
32×24 px. Die Sprite-Position liegt in der Mitte der unteren Hitboxkante.

Props haben individuelle Fußpunkte. Baumkronen und Dächer kollidieren nicht;
Stämme, Felsen und Hausgrundflächen schon. Native RPG-JS-Sortierung verwendet
`y + Hitboxhöhe + z`: Spieler und Objekte werden nach ihrer Bodenposition geordnet.
Ein Spieler oberhalb des Stamms verschwindet hinter der Krone, unterhalb davor.
Wasser-/Klippenkollisionen liegen separat vom sichtbaren Gelände. Eine Brücke
entfernt dort die Wasser-Sperre, ohne den Fluss durch Gras zu ersetzen.

## Karten und Bedienoberfläche

Die erste Insel ist 40×32 Tiles (2560×2048 px), der Übungswald 48×38 Tiles
(3072×2432 px). Dorf, Burg, Schafwiese, Flussbrücke, Seen, Waldlichtungen und
zugängliche Hochflächen bilden unterscheidbare Bereiche. Baumgruppen lassen
Laufwege frei. Bei der Neugestaltung wurden bestehende Objekt-IDs, Gegnerstufen,
HP-Regeln, Belohnungen, Dialogtexte und Portalziele erhalten.

Native Dialoge, Inventar, Status, Ausrüstung, Fähigkeiten, Optionen und Speicher-
menüs verwenden Tiny-Swords-Papier. Der Gebietsname sitzt auf einer Holztafel;
Leben/Mana und Menü-/Heilaktionen bleiben im Spiel direkt lesbar. Die native
Menülogik und der lokale Save-Namensraum bleiben erhalten. Das HUD liest die
Engine-Signale und führt keinen zweiten Spielzustand.

## Assets ergänzen und lokal gestalten

Neue Objekte zuerst in der Registry mit nativen Abmessungen, Fuß und Hitbox
registrieren, anschließend eine `prop`-Vorlage hinzufügen. PNGs haben transparente
Hintergründe und feste Framezellen. Keine Grafik durch Objekt-Rechteckgrößen in
Tiled skalieren. `npm run art:prepare` kompiliert vorhandene Quellbilder neu.
`scripts/design-worlds.mjs` ist die einmalige Landschaftsmigration. Sie überschreibt
beide Karten nur noch mit `--force` und legt vorher Sicherungen unter
`art/map-backups/` an. **Nicht auf später bearbeiteten Karten ausführen**. Normale Builds
und die Live-Vorschau führen diese Migration niemals aus.

Tiled benötigt keine Verbindung zu RPG-JS Studio. Anleitung: `editor/ANLEITUNG.md`.

## Tatsächliche Grenzen und Asset-Lücken

- Die Free-Pack-Figuren verwenden die native seitliche/frontale Ansicht, mit
  Spiegelung links/rechts. Eigenständige Rückenansichten fehlen; Nord/Süd-Bewegung
  behält dieselbe Darstellung. Es werden keine fremden Richtungs-Sprites gemischt.
- Der aktive RPG-JS-Neustart besitzt zwei Nahkampf-Gegnerarten und vier platzierte
  Begegnungen über beide Karten. Er besaß keine Bosse, Farmmechanik, Bogenschützen
  oder endlose Monsterwellen. Diese wurden durch den Grafikumbau nicht erfunden.
- Nobby/Mira sowie Erdweg und Brücke fehlen als individuelle Motive im Pack und
  wurden erfolgreich mit ImageGen ergänzt. Originale Ausgaben bleiben erhalten.
- Kein eigenes Hurt-/Death-Sheet ist vorhanden. Vorhandenes Engine-Trefferfeedback
  und Gegnerentfernung bleiben aktiv, ohne ungültige Grafikreferenzen anzufordern.
- Gebäude sind Landschaftsobjekte. Innenräume, Shop- und Schmiedmechaniken waren
  im aktiven Projekt nicht implementiert; die vorhandenen Menüs bleiben nutzbar.
- Die Screenshots der alten Grafik liegen ausschließlich unter `before/` und
  historischen Testartefakten. Im laufenden Spiel werden keine Pipoya-/SVG-Sprites
  mehr geladen.
