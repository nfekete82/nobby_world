# Abnahme: integrierter Karten-, Asset- und Animationseditor

Basis: `feat/shaman-biome-expansion`, Commit `9772812`.
Implementierung: `feat/integrated-asset-animation-editor` in einem eigenen Worktree.
Die vorhandene Arbeitskopie einschließlich aller 23 zuvor erfassten lokalen
Änderungen wurde per SHA-256 unverändert geprüft. Keine TMX-Karte, kein Spielstand
und keine Benutzer-Grafik wurde für Testschreibvorgänge verwendet.

## Behobene Speicherursachen

- Fetch ohne Frist und Abbruch: begrenzte Requests, Upload-Frist, Abbruchsignal,
  eigene begrenzte Kartenprüfprozesse und verständlicher Wiederholungsstatus.
- Prüfung nach Überschreiben mit pauschalem Rollback: Kandidatenprüfung vor der
  Veröffentlichung; spätere Refreshfehler können gespeicherte Karten nicht mehr
  durch ältere Dateien ersetzen.
- Verlorene spätere Änderungen: eine Antwort bestätigt nur ihren Snapshot;
  Tests prüfen weitere Änderungen während einer verzögerten echten Antwort.
- Parallele Schreibvorgänge: Projektwarteschlange, Prozesssperre, eindeutige
  temporäre Dateien, Hashvergleich und wiederholbare Vorgangs-IDs.
- Vite-Serverneustart bei Registry-/Welt-JSON: diese Daten gehören nicht in die
  Liste der Konfigurationsabhängigkeiten. Zusätzlich unterdrückt die Editor-
  Sitzung HMR/Reloads, bis der Benutzer bewusst aktualisiert.
- Unklare Wiederherstellung: unveränderliche Asset-Revisionen, TMX-Backups,
  Write-ahead-Journal, IndexedDB-Entwürfe und unabhängiger Export.

## Geprüfter Stand

- `npm test`: **142 Tests bestanden**. Zusätzliche Fixtures prüfen Rasterformate,
  unabhängige GIF-Disposal-2/3-Testdaten, Transparenz/Dauern, Sheet- und Gelände-
  Import, Framewechsel, Zusatzanimationen, Duplikate, Papierkorb, Referenzen,
  Pflichtzustände, Registry-Persistenz, Pfade/Symlinks, Größen, parallele Saves,
  Timeouts/Abbruch, externe Änderungen und Journal-Wiederherstellung.
- `npm run art:style:check`: bestanden; 44 Basis-Assets, 110 Animationen,
  13 gepinnte Referenzen einschließlich unveränderter nativer Packdateien.
- `npm run build`: bestanden. Bestehender Hinweis auf große JavaScript-Chunks;
  kein Buildfehler. Produktionsvorschau wird auch unter `/quest/` getestet.
- `npm run art:references`: Referenzgalerie erfolgreich erzeugt.
- `npm run test:web-editor`: bestanden auf einer **temporären Kopie der realen
  100×40-Karte**. Direkter Klick auf den Schamanen, Frame 4 von Walk durch echtes
  PNG ersetzt, unveränderte Frame-Pixel im neuen Sheet geprüft, Schaf dupliziert,
  Frames dupliziert/gezogen/entfernt, Animation angelegt/entfernt, während eines
  Saves weitergeändert, Papierkorb/Wiederherstellung, vollständiger Refresh,
  gerenderte Szene und tatsächlich geladene Runtime-Registry geprüft.
- `art:prepare` innerhalb der Browser-Fixture: die gespeicherte Schamanengrafik
  bleibt erhalten. Kein Zugriff auf den vorhandenen Benutzer-Server.

## Visuelle Abnahme und Referenzen

[Animationen](../artifacts/editor-workshop/animation-editor.png),
[Bibliothek](../artifacts/editor-workshop/asset-library.png),
[Karteneditor](../artifacts/editor-workshop/map-editor.png),
[Spiel nach Refresh](../artifacts/editor-workshop/game-after-refresh.png),
[Referenzgalerie](../artifacts/editor-workshop/style-references.png),
[Browserbericht](../artifacts/editor-workshop/report.json).

Die Galerie wurde neben den tatsächlichen Spielszenen geprüft. Referenzen:
`enemy-warrior` für native Figurenproportionen, `shaman` für Identität und native
192×192-Zellen mit Fuß [96,132], `sheep` für native 128×128-Frames sowie
`tree-oak`, `tower` und `castle` für die unveränderte Welt. Vorschau und Laufzeit
verwenden Nearest-Neighbor; das UI übernimmt Pergament-, Holz- und Türkistöne des
vorhandenen Editors. Keine neue Spielgrafik wurde gezeichnet oder generiert;
der PNG-Austausch verändert ausschließlich eine Testkopie eines sichtbaren Pixels.

## Bewusste Grenzen

Ein Frame-/Sheet-Editor, kein Pixelmalprogramm. Schreibzugriff nur in der lokalen
Mac-Vorschau auf 5173; Produktion und Docker-Editorprofil schreibgeschützt. Die
Wiederholungseinstellung betrifft die Vorschau; das Spiel behält seine zustands-
abhängigen Bewegungs-/Kampfabläufe. Terrain-Indizes und Pflichtanimationen sind
zum Schutz vorhandener Karten gesperrt. Originale und Papierkorbrevisionen werden
nicht endgültig gelöscht. Upload-/Atlasgrenzen und Wiederherstellungsverfahren
stehen in [ASSET_EDITOR.md](ASSET_EDITOR.md).
