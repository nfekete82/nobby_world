# Nobby World · Wüsten- und Biome-Art

## Verbindliche Optik

Die Waldregion verwendet Pixel Frog Tiny Swords. Für neue Biome gelten:
dunkle, kantige Konturen; Beleuchtung links oben; zusammenhängende
Pixelcluster statt simpler geometrischer Primitive; matte Schatten und
natürliche Farben. Das Raster bleibt 64x64 px, mit nearest-neighbor.

## Originalillustrationen (im Git-Repository enthalten)

Die Art-Sheet-Motive wurden in neun eigenständige transparente PNGs
umgewandelt und sind **als echte Binärdateien eingecheckt**:

- `public/tiny-swords/illustrated/desert-cactus.png`
- `public/tiny-swords/illustrated/desert-cactus-small.png`
- `public/tiny-swords/illustrated/desert-agave.png`
- `public/tiny-swords/illustrated/desert-prickly-pear.png`
- `public/tiny-swords/illustrated/desert-house.png`
- `public/tiny-swords/illustrated/desert-tent.png` – großer Marktstand
- `public/tiny-swords/illustrated/desert-temple.png` – zweistöckiges Wüstenhaus
- `public/tiny-swords/illustrated/desert-shrub.png`
- `public/tiny-swords/illustrated/desert-rock.png`

Alle haben binäres Alpha und einen transparenten Hintergrund. Farb-Halos
aus der ursprünglichen Bildtafel wurden beim Ausschneiden verworfen.
Die Motive sind aus einer KI-Illustration isoliert und besitzen daher
nicht automatisch perfekte Kachelkanten; sie werden als **Objekte**,
nicht als Gelände-Autotiles verwendet.

`scripts/biome-props.mjs` übernimmt diese Quelldateien beim Start, Test,
Art-Prepare und Build in `public/tiny-swords/biomes/`.
Die Quell-Dateien werden nie durch prozedurale Generatoren überschrieben.
Für fehlende Illustrationen bleibt ein deterministischer Fallback
(Pixel-Frog-Gebäude bzw. `scripts/biome-props-style.mjs`).

**Manuelles Herunterladen ist nicht notwendig.**
Das normale `git pull` enthält alle neun PNGs. Der Docker-Build kopiert
`public/`, baut die PNG-Ausgaben und verpackt sie mit dem Spiel.

## Sprite- und Footprint-Abmessungen

- Kaktus: 64x128, Feigenkaktus und Pflanzen: 64x64
- Wüstenhaus: 192x192
- Marktstand (`desert-tent`): 320x192
- Zweistöckiges Haus (`desert-temple`): 256x192

Die bestehenden Objekt-IDs bleiben aus Kompatibilitätsgründen unverändert,
auch wenn die gezeichneten Gebäude nun andere Motive besitzen. Physikalische
Hitboxen bleiben konservativ und werden nicht aus der Bildbreite abgeleitet.

## Wasser und Wege

Die bisher sandfarbene Wüsten-Tilepalette wurde zwischenzeitlich auf
eine grünliche Wiesenpalette geändert. Das Wasser-Tileset erhält über
`scripts/moss-water.mjs` eine matte, moosgrüne Tönung.
Wasserkollisionen, Brücken und vorhandene TMX-Karten werden dadurch nicht
umgeschrieben. Die Gras-Schattenkanten bleiben aus Tiny Swords erhalten.

## Überprüfen

```sh
npm ci
npm test
npm run build
```

`test/biome-sprite-style.test.mjs` prüft nun ausdrücklich, dass alle neun
Original-Illustrationen auf der Platte existieren und in der Runtime-Kopie
**pixelgenau** erhalten bleiben. Der Compiler aktualisiert die Registry bei
`npm run art:prepare`; reguläre Builds aktualisieren die Bilder beim
Zusammenstellen der Welt.
