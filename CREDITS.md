# Sources and credits

- Engine: [RSamaium/RPG-JS](https://github.com/RSamaium/RPG-JS), MIT.
  Packages retain their bundled licenses. Starter snapshot:
  `bc5be54ecba24d0ebca1b7dae423d8b6dad286b8` (`rpgjs/starter`, v5).
- Game artwork: **Tiny Swords (Free Pack), Pixel Frog**, from the archive supplied
  by the project owner. [Official pack and license](https://pixelfrog-assets.itch.io/tiny-swords).
  Only project assets and the small inputs needed to rebuild them are retained;
  the archive, Aseprite files and unused factions/units are not redistributed here.
  The current pack allows personal/commercial game use and modification, but
  prohibits redistributing/repackaging the assets as an asset pack. It is not CC0.
- Original Tiny Swords PNGs retain their pixels. Terrain/UI compilation rearranges
  existing cells. Nobby, Mira, their animation sheets, earth texture and bridge
  were adapted/generated with OpenAI ImageGen against the supplied references.
  Their original outputs, briefs, provenance and deterministic packing are under
  `art/`, `scripts/compile-art.mjs` and `src/art/registry.json`.
- [Pixel Frog tilemap guide](https://pixelfrog-assets.itch.io/tiny-swords/devlog/1138989/tilemap-guide)
  documents the 64px grid and terrain/foam layer order.
- Local editor: [Tiled 1.12.2](https://github.com/mapeditor/tiled/releases/tag/v1.12.2).
  The installed application is excluded from Git and Docker.

Pipoya starter graphics and the old SVG portal have been removed from the running
project. Historical screenshots deliberately retain the previous appearance.
The original 3D game remains in its separate Git archive branch.

Shaman, skeleton companions, scorpion, serpent, polar bear and animated desert,
winter and jungle scenery were created with built-in OpenAI ImageGen against
project style references. Source atlases and deterministic native sprite packing
are included in `art/generated-source/expansion/` and `scripts/expansion-art.mjs`.
The supplied portrait was used only as a character reference, not bundled.
See `docs/EXPANSION_ART_PROMPTS.md` for the prompt set and provenance.

The shaman's revised six-phase run uses locally hand-authored native pixel
legs/heels and the existing character's upper-body pixels. Editable sources,
reference comparisons and provenance are documented in
`docs/SHAMAN_RUN_REVIEW.md`; no additional external artwork was imported.
