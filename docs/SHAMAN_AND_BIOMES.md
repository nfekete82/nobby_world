# Schamane und neue Biome

## Spielen

Beim ersten Start wählen Maus, Enter/Pfeiltasten oder Touch zwischen Magier und Schamane. Die Auswahl gilt für diesen Spielstand. Der Magier verwendet unverändert seine bisherigen PNG-Dateien, Arkankugel (12 Mana) und Heilung (H, 25 Mana).

Der Schamane trägt Vollbart, dunkelbraunen Man Bun, petrolgrüne Kleidung, Naturornamente und einen Holzstab. R oder der HUD-Button beschwört ein Skelett: **10 Mana**, **maximal 3**, **60 Sekunden Lebensdauer**, **1,8 Sekunden Cooldown**. Die grüne Cast- und Spawnanimation dauert etwa 650 ms. Ablehnungen wegen Mana, Limit, Cooldown oder fehlender freier Position kosten nichts. Für Werte siehe `SUMMON` in `src/combat/skeletons.mjs`; Lebensdauer und übrige Regeln sind dort zentral konfigurierbar.

Am zusätzlichen Weltenreisestein nahe dem Start der ersten Insel führt die Aktionstaste Leertaste zu Goldsand-Oase, Frostpranken-Pass oder Smaragd-Dschungel. Die neuen Karten haben Rückportale zur Insel sowie Portale zum nächsten Biom. Bestehende TMX-Dateien brauchen keine neuen Objekte oder Migration.

Die Wüste enthält animierte Kakteen und Palmen, reparierte Agaven, Sandstachel-Skorpione, große Dünenvipern und harmlose kleine Schlangen. Schnee enthält animierte Tannen, Eiskristalle, Winterbüsche und feindliche Eisbären; Dschungel enthält animierte Palmen, Laubbäume und Farne. Alle Objekte und Gegner stehen im Webeditor in passenden Biomen bereit.

## Integration und Spielstände

- Es bleibt bei RPG-JS 5, CanvasEngine, dem vorhandenen Kampfsystem, den Tiled-Kollisionen und dem 16-Pixel-Navigationsraster. Wie bisher läuft der RPG-JS-Server im Standalone-Modus im Browser; Docker liefert das gebaute Spiel über nginx aus.
- `nobbyClass` ist eine permanente, synchronisierte Servereigenschaft. Der Server validiert die einmalige Auswahl. Alte nummerierte Saves ohne Klasse laden als Magier, ohne Level, XP, Gold oder Attributinvestitionen zurückzusetzen.
- Der bestehende Schlüssel `nobby_world_rpgjs_v1` für manuelle Spielstände bleibt erhalten. `nobby_world_resume_v1` enthält eine getrennte Fortsetzungskopie; Klassenwahl überschreibt keinen nummerierten Save. Automatische Fortsetzung erfolgt alle fünf Sekunden und direkt bei der Auswahl. Ohne Fortsetzungskopie wird der neueste bestehende Save geladen.
- Begleiterzustand bleibt flüchtig. Der native Server-Step verarbeitet Mana und Begleiter alle 200 ms mit den aktuellen Rauminstanzen. Es gibt keine eigenen KI-Intervalle pro Skelett. Tod, Timeout, Disconnect, Laden und Kartenwechsel entfernen Begleiter und beenden deren native BattleAi.
- Nur vom Kartencompiler erfasste Monster-IDs sind Ziele. Spieler, NPCs, Schafe, neutrale Schlangen und andere Skelette werden ausgeschlossen. Der native Kampf-Zielfilter verhindert zusätzlich Angriffe des Spielers auf Begleiter; Gegner dürfen zurückschlagen.
- Ein Begleitertreffer aktualisiert HP einmal und ruft einmal `BattleAi.handleDamage` auf. Die vorhandene Defeat-/XP-/Gold-Verarbeitung erhält den Besitzer als Angreifer. Ein bereits besiegtes Ziel bekommt keinen weiteren Treffer und keine zweite Belohnung.
- Wege werden mit vorhandener A*-Navigation, ohne diagonales Schneiden durch Ecken, regelmäßig neu berechnet. Beschwörung und Angriff prüfen freie Position beziehungsweise Sichtlinie. Es gibt keine Teleport-Aufholmechanik.

## Karten und Grafiken

`simplemap.tmx` und `wald.tmx` bleiben unberührt. Neu sind ausschließlich `sunscar.tmx`, `frostwild.tmx` und `verdant.tmx`. Der Reisestein wird zur Laufzeit hinzugefügt. `scripts/add-biome-worlds.mjs` ist ein expliziter Erstellungsbefehl, überspringt vorhandene Dateien und läuft niemals im Build.

Der Editor ergänzt fehlende optionale Tilesets und die Dschungelebene nur im Speicher. Erst explizites Speichern schreibt eine Karte. Bestehende GIDs und Kollisionsebenen bleiben erhalten. Neue Gebiete verwenden eigene blaue Wasserreferenzen; vorhandenes Waldwasser wird nicht umgefärbt.

Quellatlanten stehen unter `art/generated-source/expansion/`, die nativen PNGs unter `public/tiny-swords/expansion/`. `scripts/expansion-art.mjs` normalisiert mit Nearest-Neighbor, binärem Alpha und konstanten 192×192-Zellen, Fußpunkt (96,132), Hitbox 32×24. Der Schamane hat separate Rückansichten für alle Zustände. Szenenobjekte behalten individuelle native Dimensionen und bestehende Kollisionsverträge. Die zentrale Registry und `npm run art:prepare` integrieren die Erweiterung; bestehende Magier- und Mira-Sheets bleiben dabei standardmäßig unverändert. Docker übernimmt die eingecheckten PNGs; zur Buildzeit ist keine Bildgenerierung und kein API-Schlüssel nötig.

Die Weide-Daten wurden nebenbei korrigiert: echte CSV-Trennung, korrekt gebundene native Bewegungsbefehle und bewegliche Physikkörper für Tiere statt statischer Masse null. Unbewegliche Häuser, Bäume und Felsen behalten Masse null. Schafe grasen ausschließlich auf frei begehbarem Gras, nicht auf Wegen oder übermalten Biomen.

## Lokaler Start und Prüfung

```sh
docker compose up -d --build game
docker compose --profile editor up -d editor
```

Spiel: http://127.0.0.1:8088 — Webeditor: http://127.0.0.1:5173 (Esc → Karteneditor).

```sh
npm test
npm run build
npm run test:expansion
npm run test:spell
npm run test:click
npm run test:sheep
npm run test:web-editor
```

Für einen isolierten Testserver: `NOBBY_TEST_PORT=5183 npm run test:expansion`. Die Browserprüfungen verwenden lokal Chrome und in CI installiertes Chromium. Screenshots und der neue Laufbericht liegen in `artifacts/expansion/`. Details der tatsächlichen Abnahme folgen in `docs/SHAMAN_ACCEPTANCE.md`.
