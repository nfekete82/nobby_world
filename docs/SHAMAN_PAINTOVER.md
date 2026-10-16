# Schamane – echte Tiny Swords Körperposen (Nobby World)

Die Figur **shaman** basiert auf den unveränderten Pixel-Frog-Monk-Originalen:

- `public/tiny-swords/Units/Blue Units/Monk/Idle.png` – sechs ruhige, reale Standposen
- `public/tiny-swords/Units/Blue Units/Monk/Run.png` – vier verschiedene Gehposen mit eigenen Beinen
- `public/tiny-swords/Units/Blue Units/Monk/Heal.png` – elf echte Arm-/Oberkörperposen für Zauber und Beschwörung

`scripts/author-native-shaman.mjs` zeichnet auf **jede einzelne Originalpose**
einen Schamanen mit dunklem Haar, Man Bun, Bart, cremefarbenen Haut-/Stoffakzenten,
roter Robe, Holzstab und cyanfarbenem Kristall. Die Pixel-Grafik wird nicht
interpoliert oder skaliert; die Laufbeine und Armhaltung stammen weiterhin direkt
aus dem nativen Original. Die Rückansicht hat eine gesonderte Haardarstellung.

`scripts/native-shaman.mjs` erzeugt deterministisch diese Spritesheets:

| Zustand | Frames | PNG-Maße | FPS |
| --- | ---: | --- | ---: |
| stand | 6 | 1152×384 | 1,5 |
| walk | 4 | 768×384 | 12 |
| attack | 6 | 1152×384 | 16 |
| heal / Beschwörung | 11 | 2112×384 | 9 |
| hit | 2 | 384×384 | 10 |
| death | 4 | 768×384 | 8 |

**Frame-Raster 192×192**, **Fußanker [96,132]**, **Hitbox [32,24]**,
je zwei Reihen für vorn und hinten. Diese Werte bleiben mit dem Spiel kompatibel.
`art/generated-source/expansion/shaman-native-patches.json` steuert die gezeichnete
Schamanen-Identität und Farbtöne; die ursprünglichen Tiny-Swords-PNGs bleiben unberührt.
Es gibt keine Rückschaltung mehr auf den früheren
`shaman-reference-frame.png`-Ein-Bild-Generator.

Die registrierten/abgeleiteten PNGs werden bei `npm run art:prepare`,
`npm test`, `npm run dev` und `npm run build` neu synchronisiert. Benutzer-
Änderungen aus dem Studio (`art/user-assets/manifest.json`) werden zuletzt
überlagert. Wenn der neue Schamane im Studio nicht sichtbar ist, einen früheren
benutzereigenen `shaman`-Override im Asset-Editor prüfen. Bestehende lokale
Bearbeitungen und uncommitted Worktree-Daten nicht ungesichert überschreiben.

Tests prüfen nicht nur Bildmaße und Alpha, sondern auch die Original-Beinpixel
und **mindestens drei unterschiedliche Fußsilhouetten** während des Laufens.
Eine visuelle Kontrolle im Spiel bleibt notwendig.
