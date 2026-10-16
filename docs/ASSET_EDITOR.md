# Karten, Grafiken und Animationen bearbeiten

Die lokale Vorschau über `Spielvorschau.command` bzw. `npm run dev` auf
http://localhost:5173 starten. **Esc → Karteneditor → Grafiken & Animationen**.
Im Karteneditor führt **Grafiken bearbeiten** direkt zum ausgewählten Objekt;
auch der Spieler lässt sich über seine sichtbare Figur auswählen. Ohne Auswahl
führt **Spieler-Grafiken bearbeiten** zur aktiven Klasse.

## Ein Laufbild austauschen

1. Schamane auswählen, **Laufen / Walk**, **Front** oder **Rücken**, **Frame 4**.
2. Unten rechts bei „Bilder importieren“ **Ausgewählten Frame ersetzen** wählen
   und eine PNG-Datei auswählen; alternativ direkt eine Datei hineinziehen.
3. Vorschau mit 100/200/400/800 %, Transparenzraster und Fußanker prüfen. Kleinere
   Bilder werden nur nach Bestätigung auf einer transparenten Fläche platziert;
   größere Bilder werden abgewiesen. Es gibt keine automatische Skalierung.
4. **Änderungsbereich** beachten: „Alle Instanzen“ ändert diese Asset-ID überall.
   „Nur ausgewähltes Kartenobjekt“ legt eine neue, freie ID an. Anschließend auch
   die Karte speichern, damit die Zuweisung dauerhaft ist. Spielerklassen gelten
   global; für sie gibt es keine einzelne Kartenobjektvariante.
5. **Asset speichern** / **⌘S**, anschließend **Spiel aktualisieren**. Die
   Kartenansicht übernimmt gespeicherte Grafiken sofort. Das laufende Spiel
   übernimmt sie beim kontrollierten Refresh. Dafür alle Entwürfe speichern.

Die Bibliothek zeigt Registry-Assets sowie die Projekt-Tilesets. Suche, Kategorie,
Biom, animiert/statisch/fehlerhaft filtern die Liste. Der direkte Vergleich läuft
mit den eigenen Frame-Dauern beider Assets. Alle vorhandenen Zustände bleiben
zugänglich, einschließlich Grasen, Treffer, Tod und zusätzlicher Animationen.

## Import und Zeitleiste

PNG, JPEG, WebP und GIF werden anhand ihrer tatsächlichen Bytes geprüft. Mehrere
Einzelbilder werden in Auswahlreihenfolge übernommen; vor dem Import bei Bedarf
Dateinamen nummerieren. GIF wird serverseitig von Sharp/libvips als vollständige
Bildfolge mit Disposal, Transparenz und ursprünglichen Frame-Dauern dekodiert.
Die Engine lädt anschließend PNG-Sheets. GIF-Loopzahl wird nicht als Spielregel
übernommen; **Vorschau wiederholen** steuert die lokale Vorschau.

Für PNG-Sheets Framegröße bewusst einstellen und 1, 2 oder 4 Richtungen wählen.
Sheets dürfen insgesamt breiter als ein einzelner Frame sein.
Front/Rücken stehen zeilenweise, Frames spaltenweise. Vier Richtungen sind Süd,
Nord, West, Ost. Bei einer einzelnen importierten Richtung bleiben die anderen
vorhandenen Richtungen erhalten; bei zusätzlichen Frames werden deren letzten
Bilder verlängert. Diese Entscheidung wird nach dem Import angezeigt.

Frames lassen sich ziehen, duplizieren und entfernen. FPS setzt alle Dauern neu;
eine einzelne Dauer kann separat geändert werden. Stand und die Pflichtzustände
der jeweiligen Basisfigur sind geschützt. Eine neue Zusatzanimation ist eine
Kopie der aktuellen Animation und kann anschließend ersetzt werden. Der Editor
ist ein Frame- und Sheet-Editor, kein Pixelmalprogramm.

Grenzen: 12 MB pro Datei, 24 MB pro HTTP-Anfrage (inklusive Base64/JSON), 16 Mio.
Pixel pro Import/Asset, 256 importierte Frames, 2048 px pro Framekante. Laufzeit-
Sheets dürfen höchstens 8192 px breit/hoch sein; bei 192-px-Figuren sind deshalb
maximal 42 Frames pro Richtung speicherbar. Dauern 16–10.000 ms (GIF mindestens
20 ms), FPS 0,1–60. Sehr große Entwürfe können die HTTP-Grenze erreichen; die
Fehlermeldung lässt den Entwurf unverändert und bietet Export/erneutes Speichern.

Gelände bleibt auf dem 64×64-Raster. Sein interner Kachelstreifen darf bis
16.384 px breit sein; der tatsächlich geladene Geländeatlas maximal 8192 px. Beim Sheet-Import eines Geländeatlanten gilt die angegebene Spaltenzahl;
mehrere Kachelzeilen werden zeilenweise gelesen. Neue Gelände-Assets beginnen
mit einer transparenten Kachel und einstellbarer Spaltenzahl.
Bestehende Kachelanzahl, Spalten und Indizes
bleiben erhalten, damit Kollisionsdaten und Karten-GIDs gültig bleiben. Einzelne
Kachelbilder oder ein passendes Sheet lassen sich ersetzen; Frames umsortieren,
hinzufügen oder löschen ist dort gesperrt. Neue Tilesets werden in die Palette
aufgenommen; neue Kartenreferenzen werden beim nächsten Kartenspeichern gesichert.

## Löschen und Wiederherstellen

- **Frame entfernen** betrifft ein Bild in der aktuellen Animation.
- **Animation entfernen** betrifft nur einen zusätzlichen Zustand.
- **Asset löschen** betrifft eine selbst angelegte Bibliotheks-ID. Karten,
  Vorlagen, Tilesets und abhängige Varianten werden vorher geprüft. Bestehende
  Referenzen blockieren das Löschen.
- Die Löschtaste im Kartenbereich entfernt ausschließlich das ausgewählte
  Kartenobjekt.

Basisgrafiken sind geschützt. Nach eigener Bearbeitung können nur **Eigene
Änderungen zurücksetzen** in den Papierkorb verschoben werden. Die Basis bleibt
vorhanden. **Papierkorb → Wiederherstellen** veröffentlicht die eigenen Bilder
wieder. Quelldateien und frühere Revisionen werden bewusst nicht endgültig
entfernt. Es gibt keinen automatischen „Speicher bereinigen“-Befehl.

## Zuverlässiges Speichern und Wiederherstellung

Karte und Asset sind getrennte Transaktionen. Ein Doppelklick startet keine
zweite parallele Speicherung. Eine Antwort bestätigt ausschließlich den gesendeten
Stand; spätere Änderungen bleiben ungespeichert. **Abbrechen** und ein Timeout
lassen den Entwurf stehen. Nach einer unklaren Netzwerkantwort benutzt erneutes
Speichern dieselbe Vorgangs-ID: ein bereits geschriebener Stand wird erkannt.
Nach einem eindeutig abgelehnten Inhalt kann der korrigierte Entwurf neu gesendet
werden. Undo/Redo bleibt beim Kartenspeichern erhalten.

Vor der Veröffentlichung wird die Kandidatenkarte in einem eigenen Prozess
validiert (maximal 15 s); anschließend atomar geschrieben und zurückgelesen.
Ein Vergleich mit dem gelesenen Ausgangsstand erkennt externe Tiled-Änderungen,
auch während der Prüfung. Bei Konflikten den Entwurf exportieren oder als eigene
Asset-Kopie retten und den aktuellen Stand neu öffnen. Ein Konflikt wird niemals
stillschweigend durch Überschreiben gelöst. Nach einem Serverneustart den Editor
neu öffnen; lokale Entwürfe werden zur Wiederherstellung angeboten.

Die Browserdatenbank IndexedDB hält Entwürfe einschließlich offener Vorgangs-ID.
Das ist eine zusätzliche Rettungsmöglichkeit; Browserdaten löschen entfernt diese
Entwürfe. **TMX exportieren** und **Entwurf herunterladen** sichern sie unabhängig.
Ein offener Editor verhindert automatische Vite-Reloads, auch bei Änderungen durch
Tiled; bewusstes Aktualisieren ist erforderlich. Dateiänderungen an Registry und
Welt-JSON starten den Vite-Server nicht mehr als Konfigurationsänderung neu.

Gespeicherte Dateien bleiben gespeichert, wenn die anschließende Weltkompilierung
oder Seitenaktualisierung scheitert. Das UI meldet dann **Gespeichert, Spiel muss
aktualisiert werden** und ermöglicht einen erneuten Refresh.

## Dauerhafte Dateien und Build

| Ort | Bedeutung |
| --- | --- |
| `art/user-assets/manifest.json` | Dauerhafte Benutzer-IDs, Metadaten, Revisionen, Lizenz/Herkunft, Originaldateien und Papierkorb |
| `art/user-assets/revisions/<id>/<revision>/` | Unveränderliche importierte Originaldateien und einzelne PNG-Frames |
| `public/tiny-swords/user/<id>/<revision>/` | Daraus erzeugte Laufzeit-Sheets |
| `src/tiled/tiny-swords/user/` | Eigene Geländeatlanten; TSX-Bildverweis wird atomar aktualisiert |
| `art/registry-base.json` | Vom Art-Compiler gepflegte Basis vor Benutzer-Überlagerung |
| `src/art/registry.json` | Zentrale Laufzeit-Registry, Basis plus Benutzeränderungen |
| `art/map-backups/` | TMX-Backups vor jeder Änderung |
| `art/editor-history/` | Lokales Journal, Prozesssperre, Prüf-/Fehlerprotokoll; nicht in Git |

Manifest, Quellrevisionen und erzeugte Benutzer-Sheets gemeinsam sichern bzw.
versionieren. `npm run art:prepare` aktualisiert die Basis und trägt Benutzer-
Assets zuletzt auf; `npm run build` übernimmt dieselben Einträge. Originaldateien
lizenzierter Packs werden weder überschrieben noch gelöscht. Stilprüfungen und
Referenzgalerie prüfen weiterhin die gepinnten Masterdateien; eigene importierte
Grafiken werden dadurch nicht automatisch zu freigegebenen Stilreferenzen.

Transaktionen verwenden eindeutige temporäre Dateien, fsync, atomare Umbenennung,
Dateihashes, eine Prozesssperre und ein Write-ahead-Journal. Nach Prozessabbruch
wird beim nächsten API-Start vollständig geschriebenes bestätigt, teilweise
geschriebenes zurückgesetzt. Externe Änderungen werden dabei erhalten und als
Konflikt protokolliert. Es besteht keine Garantie gegen Hardwaredefekte oder
Schreibzugriffe fremder Programme exakt zwischen letzter Hashprüfung und Rename;
Backups und unveränderliche Revisionen bleiben deshalb erhalten.

## Zugriff und Tests

Die API akzeptiert ausschließlich POST mit passendem Host **und** Origin auf
localhost/127.0.0.1:5173, Editor-Header und zufälligem Sitzungstoken. Pfade werden
serverseitig bestimmt, Traversal und Symlinks abgelehnt. SVG und ausführbare
Dateien erreichen keinen Bilddecoder. Die produktive Spielversion hat keine
Schreib-API und zeigt die Bibliothek schreibgeschützt aus dem erzeugten Katalog.
Das optionale Docker-Editorprofil setzt `NOBBY_EDITOR_READ_ONLY=1`; schreibender
Containerbetrieb benötigt künftig eine eigene Authentifizierung.

`npm run test:web-editor` erstellt immer eine komplette temporäre Projektkopie,
benutzt einen separaten Testport (Standard 5197) und entfernt sie anschließend.
Es verwendet niemals den vorhandenen Benutzer-Server für Schreibtests. Die
lokale API-Grenze bleibt dabei unverändert: ausschließlich der Testbrowser setzt
für Anfragen an seinen eigenen Fixture-Server die erlaubten Authority-Header.
`NOBBY_EDITOR_LARGE_MAP=/absoluter/pfad/simplemap.tmx` kopiert optional eine große
reale Karte **nur lesend** in diese Testumgebung. Screenshots werden nach
`artifacts/editor-workshop/` kopiert. Unit- und HTTP-Schreibtests verwenden ebenfalls
wegwerfbare Fixtures. Bestehende Karten werden niemals für Testschreibvorgänge
verwendet.

Sharp-Dekodierung: [Constructor / animated](https://sharp.pixelplumbing.com/api-constructor/),
[Metadata / delay, pages, pageHeight](https://sharp.pixelplumbing.com/api-input/).
