# Nobby World — Emerald Edition art contract

This document governs new artwork. The active renderer uses the six PNG atlases in
`assets/art/`; previous art remains available for compatibility and loading failures.
No Tiny Swords import is required to play.

## Perspective, light and palette

- Orthographic three-quarter top-down fantasy world. Feet, trunks and structures
  have a common ground plane; rendering sorts actors and structures by ground Y.
- Light from upper left; warm highlights, cool navy shadows. No photorealistic
  shading, smooth vector character art or mixed isometric objects.
- Ink/shadow `#20283f`, moss `#386b50`, foliage `#65a653`, leaf light `#a6cc69`,
  teal water `#327b83`, gold `#e9b86c`, timber `#80513d`, sand `#d9b878`.
  These are palette anchors, not a claim that generated images contain only eight colors.
- PNG transparent sprites, nearest-neighbor sampling. Export cells are 128×128
  source pixels. Terrain has two-pixel clusters; sprite detail uses one-pixel clusters.
  Camera translation is rounded to avoid subpixel drift. CSS icons use pixelated sampling.

## Identity and scale

Nobby keeps swept brown hair, short beard, expressive eyes, a navy blue robe with
blue panels and gold trim, brown boots, belt and a cyan crystal staff. Galdor keeps
his gold hood and merchant satchel. Purple slimes, green spear goblins, hooded
raiders, scarabs, moss-covered amber-eyed guardians and the crowned woodland boss
retain their established roles and silhouettes.

All sprites end at cell baseline 116 (last opaque row at or above 115).
Hero frame renders at 192 world units; regular humanoids 168, scarabs 108,
slimes 96, elite 340 and boss 360. Trees use roughly 240-unit cells with modest
world variation; buildings use 290–320. Scale describes the whole padded cell.
Shadows use the same ground anchors. Existing combat reaches and hit regions remain.

## Production atlases

| File | Grid | Contents |
| --- | --- | --- |
| world.png | 6×4 | 24 trees, plants, rocks, buildings, farm props, characters, fire |
| nobby.png | 6×4 | six frames each of idle, run, cast and heal |
| enemies.png | 6×6 | six creature classes; idle, three movement poses, windup, release |
| effects.png | 4×4 | arcane sequence, healing sequence, loot and equipment/spell icons |
| terrain.png | 2×2 | grass, dirt, water, sand; all opposing edges exactly identical |
| cliffs.png | 2×1 | repeating rock material and stair material |

The source PNGs are generated with the built-in ImageGen tool. References are the
existing Nobby idle strip and the generated world atlas. No external image API,
API key, downloaded asset substitute or Python image editing was used.

## Prompt set and generation record

The generation prompts requested these concrete deliverables:

1. **World atlas:** 6×4 transparent 256px-cell source; oak, pine, fruit tree, rock,
   fern, flowers, cottage, smith, stall, fence, wheat, cart, Galdor, slime, goblin,
   raider, scarab, guardian, crowned treant, cactus, mushrooms, sign, crates, fire.
   Three-quarter view, upper-left light, navy ink/moss/teal/gold palette, consistent
   proportions and isolated cells. A follow-up explicitly requested background
   removal while preserving every object and its position.
2. **Nobby:** existing idle PNG as identity reference; 6×4 source with idle, run,
   attack and heal rows; brown hair/beard, blue/gold robe, cyan crystal staff;
   consistent proportions, transparent padding and shared ground baseline.
3. **Terrain:** four homogeneous opaque material quadrants: mossy grass, entirely
   grass-free ochre dirt, horizontal-ripple teal water and golden sand. No objects,
   shores, labels or borders. Quiet repeating detail.
4. **Enemies:** world atlas as reference; 6×6 transparent source with slime,
   goblin, raider, scarab, guardian and crowned boss rows; idle, three walking poses,
   attack windup and release columns; same identity, palette and light.
5. **Effects/UI:** 4×4 transparent source; four arcane poses, four leafy green heal
   poses, gold coin, potion, crystal focus, boots, charm, frost, orb and backpack.
6. **Cliffs:** two opaque materials: layered ochre-gray rock face with cracks and
   moss; regular horizontal stone steps in a three-quarter view.

ImageGen did not always honor the requested image dimensions or exact source grid.
`prepare-art.cjs` explicitly records measured row cuts, uses actual output sizes,
checks transparency, downsamples and aligns the final cells. The checked-in source
PNGs retain the generation results. `manifest.json` records source alpha bounds.
Terrain edges are made exact by reflecting material interiors during export.
This is deterministic asset preparation, not a promise of inherently perfect AI sheets.

## Integration and review rules

Water drawing uses the same ellipse as `lakeContains`; cliffs follow `plateauBand`
and stairs follow `stairsX`/`stairsWidth`. Keep those functions authoritative.
Buildings and farm props are decorative; the smith is scenery, not a new interaction.
Keep combat, two spells, save format, shop, loot, navigation and progression intact.
Pattern objects are cached; never allocate a new terrain pattern every frame.

Verify with `npm test` and the real-browser review. The latter exercises the
production assets, alpha/baselines, exact material seams, five region screenshots,
shop, inventory, healing, spell selection and 390px mobile layout. It injects its
review hook into intercepted HTML; no debug globals are shipped in the game.

Known limits: characters use a front/side view with mirrored left-facing movement,
not dedicated eight-direction animation. Enemy locomotion has three poses and two
attack poses. Collision and existing gameplay are regression-tested; artistic
perfection and all possible browser/hardware combinations cannot be guaranteed.
