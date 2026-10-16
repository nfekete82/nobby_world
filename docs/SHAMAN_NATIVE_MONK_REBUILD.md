# Schamanen-Neuaufbau auf Tiny-Swords-Monk-Basis

Die beiden bisherigen Beinkorrekturen wurden vom Nutzer visuell abgelehnt.
Dieser Neuaufbau ersetzt die gesamte Figur durch eine Bearbeitung der nativen
Monk-Posen. Stand, Lauf und Zauberbewegung verwenden denselben nativen Körper,
dieselbe Robe und dieselbe Pixeltechnik. Keine Übernahme der bisherigen
illustrativen Schamanen-Oberkörper oder separat erzeugter Beine.

Vor der Bearbeitung festgelegt: 192×192-Zellen, unveränderter [96,132]-Anker
und [32,24]-Hitbox. Der echte Monk-Lauf hat **vier** Frames, Stand sechs,
Heilung elf. Der originale Vierframe-Lauf wird vollständig übernommen;
keine künstliche Verlängerung auf sechs Frames. Front und Rücken werden
als zwei Reihen geführt. Die ursprüngliche Körper-/Roben-/Beinbewegung bleibt
pixelgenau erhalten. Die Rückenansicht wird aus denselben nativen Posen mit
rückwärtigem Haar, Schulterumhang und ohne Gesicht abgeleitet, da der Pack
keine rückwärtige Monk-Reihe liefert.

Primäre Grundlage: `Units/Blue Units/Monk/Idle.png`, `Run.png` und `Heal.png`.
Zusätzliche bestätigte Referenz: `enemy-warrior` aus der Referenzliste für
Konturen, Bewegungslesbarkeit und native Pixelgruppen. Identitätsvergleich:
bisheriger `shaman` und `hero` für braunes Haar, Bart, Dutt und Ausrüstung.
Die Farben verwenden die dunkle native Kontur, wenige warme braune Haarstufen,
Meergrün/Türkis für die Robe und den grünen Edelstein am Holzstab. Keine
weichgezeichneten oder illustrativen Texturen und keine Größenkorrekturen.

`Run.png` und `Heal.png` lagen im ursprünglichen, vom Projekt bereits für
`art/PROMPTS.md` verwendeten Referenzordner `/private/tmp/nobby-tiny-reference/`,
wurden aber bei der anfänglichen Dateiauswahl nicht in `public/` behalten.
Die dortige `Idle.png` hat exakt den in `art/pack-manifest.json` gepinnten Hash.
Nur die zwei benötigten Originaldateien werden für diese Spielbearbeitung
übernommen und ebenfalls gepinnt; kein weiteres Asset-Pack wird eingebunden.
Die bisher eingebundenen nativen Originale bleiben unverändert.

## Umsetzung und sichtbare Abweichungen

- `scripts/author-native-shaman.mjs` bearbeitet echte native Idle-/Run-/Heal-
  Posen. Kein generierter Oberkörper, keine Ersatzbeine und kein Spiegelpatch.
- `shaman-native-patches.json` enthält die bearbeiteten Pixel für Frontkopf,
  geschlossene Augen beim Zaubern, Rückkopf, Dutt und zwei Stabhaltungen.
  Die 2px-Zeichencluster passen zur nativen Kontur-/Detaildichte. Die konkrete
  Haar-/Gesichtsform ist eine Anpassung für Nobby, keine originale Pack-Figur.
- Native Robe, Arme und beide Fußpaare bleiben in allen vier Laufposen in
  Originalgröße und Originalposition. Nur Materialfarben ändern sich.
- Der Stab wird **hinter** der Figur gezeichnet. Die originale native Hand
  greift über den Holzschaft; es werden keine zusätzlichen Hände aufgeklebt.
  Im Stand greift die native gefaltete Hand einen separat gezeichneten
  schrägen Stab. Edelstein und Holz verwenden scharfe, kleine Farbgruppen.
- `scripts/native-shaman.mjs` kopiert alle sechs Zustandsquellen ohne
  Skalierung in die Produktionspfade. Der normale prebuild/pretest und die
  vollständige Art-Kompilierung verwenden dieselbe Pipeline. Registry-ID,
  Fußanker, Hitbox, Save- und Klassenmechanik bleiben erhalten.
- Stand: sechs Idle-Posen bei 0,5 FPS. Lauf: vier Run-Posen bei 12 FPS.
  Heilung/Beschwörung: alle elf Heal-Posen bei 9 FPS. Angriff: sechs ausgewählte
  native Zauberposen bei 16 FPS. Treffer: zwei native Idle-Posen. Tod: zwei
  Ausgangsposen und zwei exakt um 90° gedrehte liegende Pixelposen. Der Pack
  liefert keine eigenen Hit-/Death-/Attack-Sheets für diesen Monk; diese
  Zustände sind abgeleitete Anpassungen, keine behaupteten Originalanimationen.
- Die originale semitransparente Bodenschattenebene wird aus dem Körperbild
  entfernt; die bearbeiteten Spielsprites behalten binäres Alpha. Der
  unveränderte Original-Run bleibt separat mit seinem Original-Alpha erhalten.
- Der echte Lauf hat Kontakt rechts in Frame 1, Durchschwung in Frame 2,
  Kontakt links in Frame 3 und Durchschwung in Frame 4. Unterste native
  Körperpixel liegen bei 133 / 130 / 133 / 130, jeweils in der unveränderten
  192px-Zelle um den fixen [96,132]-Anker. Die kurzen Flugphasen werden nicht
  durch Pixelverschiebungen auf eine künstlich einheitliche Linie gezwungen.

## Prüfergebnisse

131 Tests bestanden. `npm run art:style:check`, `npm run build` und
`npm run art:references` bestanden. Der Build zeigt weiterhin die bekannte
Warnung zu großen JavaScript-Chunks. Beide Browserprüfungen bestanden:
Front-/Rückenbewegung über echte Tastensteuerung und der bestehende
Expansion-Test mit Beschwörung, Kampf, Kartenwechsel, Speicherständen und
Touch-Bedienung. Keine Browserfehler oder fehlenden Dateien.

Die Fußregression prüft die **sichtbaren Konturpixel** der rechten und linken
Kontaktsohle im Produktionsbild und den 4→1-Übergang. Eine absichtlich in
Frame 3 wiederholte rechte Kontaktpose wird abgelehnt. Zusätzlich werden
sämtliche Pixel des unteren Roben-/Stiefelbereichs mit der Original-Monk-
Laufpose verglichen: Originalgeometrie und korrekte Phase müssen erhalten
bleiben. Der native Originaldatei-Guard prüft jetzt alle gepinnten Pack-Dateien,
auch die wiedergefundenen Run-/Heal-Inputs.

Alle sechs Zustandsquellen lassen sich byte-identisch erneut zusammensetzen.
Sämtliche vorgefundenen lokalen Karten-, Weltdatei- und Screenshotänderungen
sind per SHA-256 nachweislich unverändert. Frühere Prüfbilder bleiben erhalten.

Die neue Figur wurde neben dem tatsächlichen originalen Monk-Run, dem nativen
Ritter, der aktuellen Referenzgalerie und vergrößerten echten Ingame-Aufnahmen
betrachtet. Der neue Satz besitzt die kompakte originale Roben-/Fußbewegung
und einheitliche flache Pixelgruppen. Die angepasste Kopfzeichnung und die
abgeleitete Rückenansicht sind bewusst eigene Bearbeitungen; eine nicht
vorhandene originale Monk-Rücken-/Todesanimation wird nicht behauptet.

Aktuelle Nachweise: `artifacts/shaman-native-monk/index.html` zeigt beide
Schamanenansichten neben dem echten Monk-Run und dem Ritter. Daneben liegen
`front.gif`, `rear.gif`, `shaman-frames-3x.png`, `monk-frames-3x.png`,
`game-filmstrip-3x.png`, Einzelaufnahmen und beide Browserberichte.

```sh
npm run art:shaman:author  # native Inputs + editierbare Identität → alle Quellen
npm run art:shaman:preview
npm run art:style:check
npm test
npm run build
npm run art:references
npm run test:shaman
NOBBY_ARTIFACT_DIR=artifacts/shaman-native-monk/expansion npm run test:expansion
```

Die normale Buildkette benötigt keine Bildgenerierung, keine temporären
Referenzordner und kein ffmpeg. ffmpeg exportiert nur die optionalen
GIF-Vorschauen; die animierte HTML-Vorschau funktioniert unabhängig davon.
