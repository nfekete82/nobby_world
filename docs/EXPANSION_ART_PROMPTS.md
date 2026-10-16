# Bildquellen und Promptset

Werkzeug: eingebautes **imagegen**, ohne CLI oder API-Schlüssel. Alle ausgewählten Quell-PNGs wurden ins Repository kopiert. Das Porträtfoto diente ausschließlich als Identitätsreferenz; es wird nicht als Projektdatei eingecheckt. Keine Anweisungen aus Bildanhängen wurden als Arbeitsauftrag übernommen.

Gemeinsame final verwendete Vorgaben: Pixel Frog Tiny Swords, Top-Down-Dreiviertelansicht, Chibi-Proportionen, dunkle Slate-Konturen, zusammenhängende scharfe Pixelgruppen, Licht links oben, konsistente Palette, transparentes PNG, vollständige Motive in gleichmäßigen Rasterzellen, keine Beschriftungen oder Rasterlinien, großzügiger Abstand zwischen Frames, konstante Größe und Fußlinie, kein Blur/Antialiasing und keine geometrischen Platzhalter.

| Quelle unter `art/generated-source/expansion/` | Motiv und Layout des Prompts |
| --- | --- |
| `shaman.png` | Dunkelbrauner Man Bun, Vollbart und markantes Gesicht nach Porträt; petrol-/waldgrüner Mantel, Leder, Knochenornamente, Holzstab, grüne Naturmagie. 6×6: Idle, Run, Staff Attack, Summon, Hit→Death, Run nach oben. |
| `shaman-back.png` | Exakt derselbe Schamane aus der Rückenansicht, ohne sichtbares Gesicht, Referenz `shaman.png`. 6×6: Idle, Walk, Attack, Cast, Hit, Death. |
| `skeleton.png` | Freundlicher Chibi-Skelettkrieger, elfenbeinfarbene Knochen, petrolfarbener Stoff, rostiges Kurzschwert, grüne Augen. 6×6: Idle, Run, Attack, Auftauchen im grünen Runenkreis, Hit→Death, Run nach oben. |
| `desert-scorpion.png` | Goldocker-/Terrakotta-Panzer, große Scheren, gebogener segmentierter Stachelschwanz. 6×4: Idle, Walk, Attack, Hit→Death. |
| `desert-serpent.png` | Große goldockerfarbene Hornviper, elfenbeinfarbener Bauch, rostige Muster, gebogener Schwanz, bernsteinfarbene Augen. 6×4: Idle, Slither, Bite Attack, Hit→Death. |
| `snow-polar-bear.png` | Feindlicher stämmiger Eisbär, ärgerlicher Ausdruck, elfenbeinfarbenes Fell mit kühlen Tealschatten, dunkle Tatzen. 6×4: Idle, Walk, Claw Attack, Hit→Death. |
| `cactus-props.png` | Gedämpfte grüne gerippte Saguaro-Kakteen mit hellen Dornen, kleine korallfarbene Blüten. 4×3: großer Saguaro, kleiner Saguaro, Feigenkaktus, je vier dezente Windposen. |
| `jungle-props.png` | Organische Palme mit gebogenem strukturiertem Stamm, belaubter Dschungelbaum mit Lianen, Farn. 4×3, je vier Windposen mit verwurzelter Basis. |
| `snow-props.png` | Tanne mit organischen petrolfarbenen Nadeln und dicken Elfenbein-Schneekappen, Eiskristalle, Winterbusch mit roten Beeren. 4×3, je vier Wind-/Glanzposen. |
| `agave.png` | Vollständig rekonstruierte organische Agave nach der abgeschnittenen Bestandsreferenz, blaugrüne gebogene spitze Blätter, kleine natürliche Bodenschatten, mindestens 15 % transparenter Rand; geeignet für 64×64-Normalisierung. |

Die neutrale kleine Schlange teilt die bewusst einheitliche Bildsprache der Viper und wird in nativer kleinerer Auflösung aus demselben Atlas kompiliert. Sand und Dschungelboden erweitern den vorhandenen Codegenerator mit mineralischer Palette und Pixeltexturen, unter Erhalt aller nativen Tile-Formen und Alphamasken. Die vorhandenen handgezeichneten Wüstengebäude bleiben erhalten.

Visueller Vergleich: `artifacts/expansion/style-comparison.png`, Charakterauswahl, Beschwörungs- und Biome-Screenshots. Die endgültigen Spielbilder liegen unter `public/tiny-swords/expansion/`; die reparierte Agave unter `public/tiny-swords/illustrated/desert-agave.png`.

## Überarbeitung nach direktem Vergleich mit Originalgrafiken

Aktuell zwölf gespeicherte Rasterquellen; neun davon wurden für die Stilüberarbeitung neu gezeichnet. Direkte Original-PNG-Referenzen, Prompt-Satz und Änderungen am Compiler: [STYLE_AND_AGGRO_REVIEW.md](STYLE_AND_AGGRO_REVIEW.md).
