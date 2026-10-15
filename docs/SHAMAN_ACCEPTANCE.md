# Abnahme: Schamane, Begleiter und Biome

Datum: 2026-10-15. Implementierung: `77fbaddcdbac7eb4640ea0b4aa475229719e191f` plus Spawn-Kollisionsprüfung `f9bae68c702c8fc3a6ef6510f2c684d8ca201f36`, Basis `feat/player-level-progression` (`fc5a5174e006d10a0993b66dc065147363f0c682`).

## Tatsächlich ausgeführt

| Prüfung | Ergebnis |
| --- | --- |
| `npm test` im Arbeitsverzeichnis | **106/106 bestanden**, keine ausgelassenen Tests |
| `npm test` in separater Kopie exakt des PR-Inhalts | **106/106 bestanden**, keine ausgelassenen Tests |
| `npm run build`, Arbeitsverzeichnis und saubere PR-Kopie | **Bestanden**; Karten, Tilesets und PNGs im Produktionsoutput |
| Produktionspreview-Node-Test | **Bestanden**, einschließlich Root- und `/quest/`-Basis-URLs |
| `npm run art:prepare` in separater PR-Kopie | **Bestanden**, anschließend Node-Tests und Build bestanden |
| Magier-PNGs nach Grafikcompiler | Idle, Run, Attack und Cast **bytegenau unverändert** gegenüber den ausgelieferten Originaldateien |
| `npm run test:spell` auf 5173 | **Bestanden**: echte Arkankugel, 12 Mana, HP-Verlust, Retaliation, Idle-Mana-Regeneration |
| `npm run test:click` auf 5173 | **Bestanden**: Klicknavigation, Pfeiltasten und WASD-Diagonalen |
| `npm run test:sheep` | **Bestanden**, isoliert und auf 5173: über 22 Sekunden tatsächlich wandernde Schafe, Grasbegrenzung, keine Browserfehler |
| `npm run test:web-editor` auf 5173 | **Bestanden**: Escape-Menü, Galerie, Kacheln, Objekte, Vergrößern, Undo, TMX-Export und Schließen; keine Nutzer-TMX geschrieben |
| `npm run test:expansion` | **Bestanden**, auf 5173 sowie isoliert; unten aufgeführte echte Browserprüfungen |
| `docker compose build game` / `docker compose up -d game` | **Bestanden**; Spiel auf 8088 und Editor auf 5173 gesund |
| Browser-Smoke gegen Docker auf 8088 | **Bestanden**: Auswahl, Schamanengrafik, Beschwörung, gespeicherter Reload, keine Browserfehler oder fehlenden Assets |

Die neue Browserabnahme prüft echte Serverzustände mit testseitiger Engine-Instrumentierung. Ein tatsächlich platzierter Gegner wird für den Kampftest serverseitig in Sichtweite gestellt; weder Begleiterschaden noch Mana, Spawn oder Zielwahl werden simuliert. Die Reisestein-Abnahme öffnet den nativen Serverdialog und wählt das Ziel in der tatsächlichen GUI.

## Browser-Checks

1. Erstwahl mit Tastatur und Maus; bisherige 25-Mana-Magierheilung.
2. Reload stellt die Klasse wieder her und zeigt keine erneute Auswahl.
3. Nummerierter Altsave ohne Klasse migriert zum Magier; Level, XP und Gold bleiben erhalten.
4. Schamane mit eigenem Sprite; R-Hotkey, grüner Cast/Spawn und 10-Mana-Abzug.
5. Ein lebendes Skelett bewegt sich tatsächlich hinter dem laufenden Besitzer her.
6. Der Begleiter greift einen echten, autorisierten Gegner an und senkt dessen HP.
7. Kartenwechsel erhält die Klasse und entfernt Begleiter.
8. Erneute Beschwörung im Zielraum funktioniert mit der neuen Engine-/Rauminstanz.
9. Der native Reisestein-Dialog führt nach Mausauswahl zur Wüste.
10. Wüsten-, Schnee- und Dschungelkarten laden mit nativen Gegnern und Objekten.
11. Auswahl und Beschwörung funktionieren per Touch auf einem 390px-Viewport.

Der aktuelle maschinenlesbare Bericht ist [`artifacts/expansion/report.json`](../artifacts/expansion/report.json). Screenshots zeigen [Auswahl](../artifacts/expansion/character-selection.png), [Beschwörung](../artifacts/expansion/summoning.png), [Kampf](../artifacts/expansion/skeleton-combat.png), [Wüste](../artifacts/expansion/sunscar.png), [Schnee](../artifacts/expansion/frostwild.png), [Dschungel](../artifacts/expansion/verdant.png), [Touch](../artifacts/expansion/touch-summon.png), [Docker](../artifacts/expansion/docker-production.png) und den [Stilvergleich](../artifacts/expansion/style-comparison.png).

## Erhalt bestehender Daten

Die lokale, bereits bearbeitete `simplemap.tmx` mit 100×40 Kacheln wurde vor und nach der Arbeit bytegenau verglichen und nicht verändert. Der PR enthält **keine Änderung an `simplemap.tmx` oder `wald.tmx`**. Für den PR wurden die generierten World-Daten gesondert aus den Git-Basiskarten plus drei neuen Karten berechnet. In der lokalen Arbeitskopie bleiben dagegen die aus der Nutzerkarte abgeleiteten Daten erhalten. Bereits geänderte alte Screenshots und das untracked Wasserbild wurden nicht in die Commits übernommen. Manuelle Save-Slots behalten ihren ursprünglichen Storage-Key und werden durch Klassenwahl nicht überschrieben.

## Behobene Abnahmefehler und Hinweise

Die Browserläufe deckten zusätzlich zu den angefragten Features bestehende Probleme auf: leere Weidemasken durch falsch escapte CSV-Trennung, ungebundene native Move-Methoden, statisch eingefrorene Tiere, alte HUD-Engine-Referenzen nach Portalen und raumübergreifend verwaiste Regenerationsuhren. Diese Ursachen wurden korrigiert und erneut geprüft. Atlas-Zeilen werden vor der Normalisierung an ihren transparenten Zwischenräumen getrennt; abgeschnittene Nachbarfragmente werden nicht als schwebende Bildteile mitkopiert. Der Grafikcompiler regeneriert bestehende Charakter-Sheets nur noch mit dem ausdrücklichen Flag `--regenerate-characters`.

Es bleiben die bekannte Vite-Warnung zu großen Bundle-Chunks und die bestehende RPG-JS-Deprecation-Meldung der Magier-Heil-API; beide sind Warnungen, keine Build- oder Runtime-Fehler. Kein angeforderter lokaler Test wurde als bestanden erfunden oder wegen eines Fehlers stillschweigend ausgelassen. CI wird zusätzlich durch den PR gegen `feat/player-level-progression` ausgelöst.
