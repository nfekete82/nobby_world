# Schamane – Pixel-Art-Paint-over (Nobby World)

Der Schamane der Spielerklasse `shaman` wird aus
`art/generated-source/expansion/shaman-reference-frame.png`
(dem transparenten, 192 × 192 Pixel großen Schamanen-Paint-over)
aufgebaut. Der bisherige native Blue Monk bleibt unter
`public/tiny-swords/Units/Blue Units/Monk/` unverändert.

## Integration

`scripts/reference-shaman.mjs` erzeugt folgende zweizeilige Spritesheets
aus derselben Charakteridentität:

| Zustand | Frames | Raster | FPS |
| --- | ---: | --- | ---: |
| stand | 8 | 1536 × 384 | 5 |
| walk | 4 | 768 × 384 | 12 |
| attack | 6 | 1152 × 384 | 16 |
| heal (Beschwören) | 11 | 2112 × 384 | 9 |
| hit | 2 | 384 × 384 | 10 |
| death | 4 | 768 × 384 | 8 |

Die obere Zeile ist die Front-/Seitenansicht, die untere eine abgeleitete
Rückenansicht. Ein Frame hat in jedem Zustand exakt 192 × 192 Pixel. Die
Stand-Frames verwenden die Ritter-Geometrie um Y=136. Spielanker [96,132],
Hitbox [32,24], Class-ID und Speicherformate bleiben bestehen.

**Wichtig:** Die Angriffs-, Heil-, Treffer-, Todes- und Geh-Posen sind
deterministisch aus demselben Paint-over erstellt, nicht eigenständige
handgezeichnete Animationssheets. Die Laufbewegung und Rückenansicht
sollten vor einem endgültigen Art-Release im Spiel visuell geprüft und
bei Bedarf im integrierten Animationseditor überzeichnet werden.

Beim Start über `npm run dev`, bei Tests und beim Build synchronisiert
`scripts/world-data.mjs` die berechneten PNGs und die Registry. Ebenso
erzeugt `npm run art:prepare` die Artefakte wiederholbar. Vom Benutzer im
Karteneditor bearbeitete Assets werden weiterhin zuletzt über
`art/user-assets/manifest.json` überlagert. Die ursprünglichen Lizenz-Pack-
Master werden nie überschrieben.

Kontrollen: `npm test`, `npm run art:style:check`,
`npm run build`. Die neuen Regressionstests überprüfen das 192px-Raster,
Alpha, Fußlinie, Richtungspaare und reproduzierbare Outputs.
