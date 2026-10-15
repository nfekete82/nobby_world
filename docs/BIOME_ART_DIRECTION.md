# Ein gemeinsamer Stil für alle Biome

Die Originalgrafiken des lizenzierten **Tiny Swords**-Packs bleiben unverändert.
Neue Wüsten- und Schneeobjekte werden im selben native-resolution Pixel-Look
aufgebaut: schieferblaue Pixelkonturen, Licht von links oben, mehrere
Schattenflächen, organische Silhouetten, kleine gebündelte Highlights und
transparentes Umfeld. **Keine glatten SVG-/Vektorobjekte im Level.**

## Was neu ist

- Kakteen: abgerundete Arme, unregelmäßige Schattierung, Rippen, kleine Dornen.
- Sandsteinhäuser: Dachziegel, Holzrahmen, Putzstruktur, abgesetzte Sockel.
- Zelt / Tempel: textile Falten bzw. Säulen, Schatten und Steinmuster.
- Felsen: polygonale, verschattete Flächen statt Ovale.
- Schneetanne: verzweigte, gezackte Äste und Schneekappen statt Dreiecksstapeln.
- Neue Deko: Agave, Wüstenstrauch und Feigenkaktus direkt im Ingame-Editor.

Der Generator liegt in `scripts/biome-props-style.mjs`; er wird von
`scripts/biome-props.mjs` verwaltet. Die Bilder entstehen als transparente,
binär-alphakanalige PNGs unter `public/tiny-swords/biomes/`.
Die Dateien sind generierte Build-Artefakte und werden bei lokalem Start,
`npm run art:prepare` und `npm run build` automatisch aus dem Quellcode
neu erstellt. Das Resultat ist reproduzierbar, ohne Netzwerk oder Bildgenerator.

**Raster:** Gelände 64×64, Kakteen 64×128, Gebäude 128×192 und Tanne
128×192 px. Framegröße, Objekt-IDs, registrierte Fußpunkte und Kollisionen
bleiben erhalten; die Karten selbst werden nicht überschrieben.

## Prüfen

```sh
npm ci
npm test
npm run build
```

Der Test `test/biome-sprite-style.test.mjs` prüft native Abmessungen,
transparente Ränder, mehrere sichtbare Schattierungsfarben und deterministisches
Rendern. Im Ingame-Karteneditor unter **Wüste → Objekte** sind neue Pflanzen
einschließlich der Feigenkakteen auswählbar.

Die visuelle Referenz ist das bestehende Tiny-Swords-Waldset; neue Requisiten
nehmen dessen Konturstärken, Farben und Perspektive auf, ohne das Original
zu überschreiben.

## Green Woodland Revision

Die bisher prozedural erzeugten Wüstenhäuser sehen trotz Schattierung anders
aus als die originalen Bäume. Deshalb werden `desert-house`,
`desert-tent` und `desert-temple` jetzt **direkt aus dem originalen
Pixel-Frog-Tiny-Swords-Haus-1, Haus-2 und Monastery** kompiliert. Die
Originalpixelformen, Dächer und Schattierungen bleiben erhalten; nur blaue
Dachflächen werden zu Moosgrün umgefärbt. Das Tempelgebäude besitzt dadurch
native **192×320 px** und eine passende Hitbox. Bestehende Objekt-IDs bleiben
unverändert. Der Name `desert-tent` bleibt aus Save-Kompatibilität bestehen;
visuell ist es jetzt ein Dorfhaus aus dem gleichen Originalpack.

Der Bereich `Wüste` nutzt jetzt einen warmen **grünen Wiesenfarbton**, keine
beige Sandfläche mehr. Die Editor-Biom-Namen bleiben für Kompatibilität
erhalten. Wasser bleibt Wasser, damit Ufer, Brücken und Kollisionen nicht
durch eine rein visuelle Grünfärbung unlogisch werden.

Source of truth: `scripts/green-native-buildings.mjs`,
`scripts/biome-props.mjs`, `scripts/biome-art.mjs`.
