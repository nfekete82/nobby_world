# Artwork and software provenance

## Active 3D world

`assets/3d/world.js` defines original Nobby World geometry, character rigs, buildings,
vegetation and effects. The user's Nobby artwork guides his identity. The user's
Secret-of-Mana remake screenshot guides composition and atmosphere; no models or
textures from that game were extracted.

`assets/3d/materials.png`, `foliage.png`, and `ui-source.png` were generated for this
project with built-in OpenAI ImageGen. `ui.png` is their normalized transparent UI
export. See [prompt set](assets/3d/PROMPTS.md) and [art contract](docs/3D_ART_DIRECTION.md).

Three.js 0.186.1 is bundled locally in `assets/vendor/` under the MIT license.
Copyright Three.js Authors. The full notice is in
[THREE-LICENSE.txt](assets/vendor/THREE-LICENSE.txt).
Source: https://github.com/mrdoob/three.js.

## Retained 2D artwork

`assets/art/` contains the preceding ImageGen pixel-art pass and its source PNGs.
`assets/custom/` and `assets/woods.png` are the existing user-supplied assets,
retained for compatibility/fallback rendering. The original woods archive contained
no license text.

The supplied Tiny Swords Free Pack ZIP was inspected and imported locally as an
art reference. Pixel Frog: https://pixelfrog-assets.itch.io/tiny-swords. The original
pack is ignored by Git and is not required or fetched by the active 3D renderer.
