# Schamanen-Laufzyklus – Review vom 16. Oktober 2026

Der aktive Laufzyklus verwendet vollständig gezeichnete Beinposen statt des
bisherigen Knöchel-Spiegelpatches. Die beiden Kontaktposen zeigen jetzt sichtbar
verschiedene Beine vorne. Oberkörper, Gesicht, Bart, Dutt, Stab, Arme und
Kleidung stammen pixelgetreu aus den bestehenden sechs Laufposen.

## Referenzen und Befund vor der Änderung

- Native Stil-/Bewegungsreferenz: `enemy-warrior` aus
  `art/style-references.json`, insbesondere
  `public/tiny-swords/Units/Red Units/Warrior/Warrior_Run.png`.
- Vergleichbarer Spielcharakter und Identität: `shaman`; zusätzliche
  Größen-/Stilkontrolle mit `hero` aus derselben Referenzliste.
- Analysiert: beide ursprünglichen 1223×1286-Schamanenatlanten,
  `expansion/shaman-walk.png`, das tatsächlich geladene
  `biomes/shaman-natural-walk.png`, Registry und beide bisherigen Gait-Skripte.

Die ursprünglichen Frontframes zeigen bei allen sechs Posen den rechts unten
vorgestreckten Stiefel; auch hinten bleibt derselbe Fuß unten. Der alte Patch
ersetzte nur Pixel ab y=119 und spiegelte/verschob sie. Knie und Unterschenkel
folgten diesem Wechsel nicht. Sein synthetischer Zweibein-Test bewies lediglich,
dass der Algorithmus zwei rechteckige Testbeine verschieben konnte.

Der Ritter wurde als komplette Bildfolge verglichen: wechselnde gestreckte und
kompakte Untersilhouetten, geknicktes Spielbein, passende Waffen-/Armbewegung
und die Wiederholung nach sechs Frames. Schild und Rüstung verdecken Teile der
Beine; sein Gang wurde nicht als Farb- oder FPS-Vorlage allein verwendet.

## Zeichenvertrag und Quellen

Vor der Bearbeitung festgelegt: 192×192 pro Zelle, sechs Frames, zwei Reihen,
1152×384 transparent, unveränderter Anker [96,132], unveränderte Hitbox [32,24].
Die 12-FPS-Taktung bleibt erhalten. Keine Karten, andere Charaktere oder
anderen Zustandsanimationen wurden bearbeitet.

Die Beinpalette verwendet vorhandene Materialfarben in großen Pixelgruppen:
Kontur #181820, dunkles Türkis #103840 / #184848, Leder #382820 / #503020,
Glanz #684828 (hinten #583828), Sohle #202028. Die bestehende Figur hat dunklere
Konturen und mehr Texturfarben als der native Ritter. Diese geerbte
Stilabweichung bleibt zur Wahrung der verlangten Identität erhalten; eine
vollständige Umzeichnung des Oberkörpers war nicht Teil dieser Änderung.

- `art/generated-source/expansion/shaman-run-upper.png`: ursprüngliche
  native Oberkörperpixel mit von Hand freigestelltem Rocksaum. Alte Beinpixel
  sind entfernt. Kopf, Gesicht, Bart, Dutt und Stab bleiben erhalten.
- `shaman-run-pixels.json` daneben: einzeln editierbare Pixelzeichnungen für
  linkes/rechtes Bein jeder Front- und Rückenpose. `o/t/T/d/b/h/s` bezeichnen
  Kontur, Stoff und Leder/Sohle; `.` ist transparent. Rückenposen besitzen
  eigene Fersenzeichnungen und eine eigene Lederpalette.
- `shaman-run.png`: vollständiges, überprüftes natives Quellsheet.
- `scripts/author-shaman-run.mjs`: setzt diese gezeichneten Pixel unverändert
  zusammen. Kein Spiegeln, keine Gliedmaßentransformation, keine Skalierung.
- `scripts/natural-walk.mjs`: kopiert das Quellsheet bei prebuild/pretest in
  beide Produktionspfade. `scripts/expansion-art.mjs` verwendet dieselbe Quelle
  auch bei vollständiger Neukompilierung. Die Registry vermerkt `walkSource`
  und die aktuellen sichtbaren Grenzen.

Die originalen lizenzierten Tiny-Swords-PNGs und die ursprünglichen
Schamanenatlanten bleiben unverändert. Die neuen Beinzeichnungen wurden lokal
auf dem nativen Pixelraster erstellt; keine neuen externen Assets oder
Bildgenerierung wurden verwendet.

## Einzelbildprüfung

Links/rechts sind persistente Beinbezeichnungen im Quellsheet; keine Spiegelung
von Frame zu Frame. In der Front-Dreiviertelansicht liegt das mit „right“
bezeichnete Bein auf der rechten Bildseite. Das hintere Sheet behält die
entsprechenden seitlichen Hüftpositionen bei.

| Frame | Kontakt / Bewegung | Unterste Pixel links / rechts |
| --- | --- | --- |
| 1 | rechtes Bein gestreckt vorne, linkes angewinkelt hinten | 124 / 132 |
| 2 | rechts trägt, linke Ferse angehoben | 124 / 132 |
| 3 | linkes Knie schwingt durch, rechter Fuß rollt ab | 127 / 131 |
| 4 | linkes Bein gestreckt vorne, rechtes angewinkelt hinten | 132 / 124 |
| 5 | links trägt, rechte Ferse angehoben | 132 / 124 |
| 6 | rechtes Knie schwingt durch, linker Fuß rollt ab | 131 / 128 |

Diese sichtbaren Kontur- und Sohlenhöhen wurden in beiden Ansichten geprüft.
Die ersten Entwürfe hatten zu schmale Stiefel und eine Überschneidung in der
Durchschwungpose; beide wurden in den tatsächlichen Pixelzeichnungen korrigiert.
Beim Übergang 6→1 setzt rechts auf (128→132), während links wieder abhebt
(131→124). Hüften, Knie und Waden bleiben verbunden. Kein Stiefel ist
abgeschnitten, und beide Stiefelmasken bleiben getrennt. Die Bewegungsbilder
wurden neben der nativen Ritterfolge und den Ingame-Aufnahmen verglichen.

## Reproduktion und Prüfnachweise

```sh
npm run art:shaman:author   # optional: editable layers → reviewed source PNG
npm run art:shaman:preview # 3x contact sheets, animated HTML; GIFs if ffmpeg exists
npm run art:style:check
npm test
npm run build
npm run art:references
npm run test:shaman
NOBBY_ARTIFACT_DIR=artifacts/shaman-run/expansion npm run test:expansion
```

Die erneute Zusammenstellung des Quell-PNGs war byte-identisch. Die normale
Buildkette benötigt weder ffmpeg noch Netz-/Bildgenerierung.

Ergebnis: 132 Tests bestanden; Style-Prüfung, Build und Referenzgalerie bestanden.
Der Build meldet weiterhin die bereits bestehende Warnung zu großen JS-Chunks.
Der erste sandboxierte Testlauf konnte keinen lokalen HTTP-Port öffnen; der
anschließende freigegebene vollständige Lauf bestand.

Der neue Regressionstest prüft sichtbare Konturen und Sohlen im **tatsächlich
verwendeten** PNG, getrennte Boots, die Verbindung zum Oberkörper, den
6→1-Wechsel und identische gezeichnete/kompilierte Pixel. Eine absichtlich
wiederholte rechte Kontaktpose wird ausdrücklich abgelehnt. Bildkoordinaten
belegen Fußstellungen und Kontaktphasen; ästhetische Qualität wird zusätzlich
visuell beurteilt, nicht aus diesen Tests abgeleitet.

Der Browsertest erfasst acht Zeitpunkte je Ansicht während echter Tastatur-
bewegung (Front und Rücken), prüft Ortsänderung und erstellt eine Videoaufnahme.
Die Einzelbilder und der 3x-Ingame-Filmstreifen zeigen den Beinwechsel im Spiel.
Keine Browserfehler. Der vorhandene Expansion-Test bestand mit elf Prüfgruppen,
keinen Browserfehlern und keinen fehlenden Dateien, einschließlich
Beschwörung, Kampf, Speicherständen, Kartenwechsel und Touch.

Ansehbare Nachweise in `artifacts/shaman-run/`:

- `index.html`: laufende Front-/Rückenansicht neben dem nativen Ritter, pausierbar.
- `front.gif` / `rear.gif`: animierte 4x-Nearest-Vorschauen.
- `shaman-frames-3x.png`: alle zwölf Frames in Reihenfolge.
- `knight-frames-3x.png`: native Bewegungsreferenz.
- `game-filmstrip-3x.png` und `game-front-*.png` / `game-rear-*.png`:
  tatsächliche Bewegung im Spiel; Zeitabstände enthalten Screenshot-Latenz,
  also keine Behauptung einer exakt frameweisen Engine-Aufzeichnung.
- `reference-*.png`: native Referenzgalerie bei unvergrößerter Darstellung.
- `browser-report.json` / `expansion/report.json`: Browsertestergebnisse.

Alle vorgefundenen lokalen Karten-, Weltdatei- und Screenshotänderungen wurden
vorher/nachher per SHA-256 verglichen und sind unverändert. Sie gehören nicht
zum Commit dieses Fixes. Ein perfektes stilistisches Gleichziehen mit dem
Ritter wird wegen des bewusst erhaltenen Oberkörpers nicht behauptet.

## GitHub-Status

PR: https://github.com/nfekete82/nobby_world/pull/14

Der erste GitHub-Actions-Lauf `38873652593` konnte **keinen Runner starten**.
GitHub meldete: fehlgeschlagene Kontozahlungen oder ein zu erhöhendes
Ausgabenlimit. Der Job hatte keine ausgeführten Steps und keine Logs.
Dies ist keine bestandene CI-Prüfung und kein gemeldeter Code-/Art-Testfehler.
Die oben genannten Prüfergebnisse stammen aus den vollständig erfolgreichen
lokalen Läufen. Billing-Einstellungen wurden nicht verändert.

## Proportionskorrektur nach Rückmeldung

Der erste gezeichnete Zyklus hatte zu dünne, zu lange wirkende Unterschenkel.
Die Rückmeldung trifft zu: Die Lederstreifen waren etwa 5–6 Pixel breit und
über rund zwölf Pixel sichtbar, während der ursprüngliche Schamane kompakte,
breite Stiefel unter einer voluminöseren Kleidung trägt. Die erste Review hat
zwar den Beinwechsel korrekt geprüft, diese Proportionen jedoch nicht gut
genug beurteilt.

Vor der Korrektur festgelegt: weiterhin 192×192, 6×2 Frames, [96,132] Anker,
[32,24] Hitbox, bisherige Türkis-/Lederpalette und unveränderte Kontaktphasen.
Neue Pixelzeichnungen sollen breitere, gebogene Hosenbeine mit etwa 9–12
Pixeln Querschnitt und kurze, breite Stiefel mit etwa 6–8 sichtbaren Pixeln
Höhe ergeben. Knie und Waden erhalten Volumen; der Stoff reicht tiefer über
die Unterschenkel. Kein Strecken oder Skalieren der Figur.

Referenzen bleiben der native `enemy-warrior` / `Warrior_Run.png` für kompakte
Tiny-Swords-Proportionen sowie ursprüngliche `shaman`-Stand-/Laufposen für
Kleidung, Körpergröße und Stiefelvolumen. Alte Prüfbilder werden bewahrt;
aktuelle Nachweise entstehen separat in `artifacts/shaman-run-proportions/`.

Ergebnis der Proportionskorrektur: Beide Ansichten wurden auf dem nativen
Pixelraster neu gezeichnet. Die Standbeine haben jetzt 7–9 sichtbare Stoffpixel
Querschnitt am unteren Knie-/Wadenbereich statt schmaler Lederstäbe; das Leder
beginnt erst bei y=125/126 und bildet einen kurzen, breiten Stiefel. Die Knie
biegen sich zwischen Hüfte und Fuß. Die Fußkontakte und der 6→1-Wechsel
bleiben erhalten. Beim breiteren Knie musste der angehobene rechte Stiefel
in Frame 4 ebenfalls neu platziert werden, damit beide Silhouetten getrennt
bleiben. Alle Oberkörperpixel bleiben unverändert.

Die neue Produktionsbild-Regression prüft zusätzlich Mindestbreite der
Stoffwaden und maximale sichtbare Lederhöhe. Nach Korrektur des Prüffensters
für den weiter außen liegenden rechten Stiefel bestehen **133 Tests**.
`art:style:check`, Build, `art:references`, der Front-/Rücken-Browsertest und
der vorhandene Expansion-Browsertest bestehen ebenfalls. Die gezeichnete
Quelle lässt sich erneut byte-identisch zusammensetzen.

`artifacts/shaman-run-proportions/proportion-comparison-3x.png` zeigt oben
die beanstandete dünne Version, mittig die Korrektur und unten die ursprüngliche
Schamanen-Laufgrafik vor dem ersten Fix. Die aktuelle Zwölfframe-Vorschau,
Front-/Rücken-GIFs und Ingame-Aufnahmen liegen im selben neuen Ordner.
Die Referenzgalerie und die tatsächlichen Ingame-Bildfolgen wurden nebeneinander
geprüft: Die korrigierten Beine sind breiter und optisch kompakter, der
Links-rechts-Wechsel bleibt sichtbar. Die zuvor dokumentierte höhere
Detaildichte des Oberkörpers bleibt erhalten. Sämtliche vorgefundenen lokalen
Änderungen und die früheren Screenshot-Nachweise bleiben unverändert.

Für die neuen Aufnahmen:

```sh
NOBBY_ARTIFACT_DIR=artifacts/shaman-run-proportions npm run art:shaman:preview
NOBBY_ARTIFACT_DIR=artifacts/shaman-run-proportions npm run test:shaman
```
