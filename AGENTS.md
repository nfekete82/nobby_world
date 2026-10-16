# Nobby World — Codex project instructions

These rules apply to **every** change to graphics, maps, shaders, characters, animations, biome props, sprites, UI illustrations and sprite-rendering code.

## Canonical art direction (read before touching art)

1. Read `docs/ART_STYLE.md`, `art/style-references.json`, and `docs/TINY_SWORDS_ART_DIRECTION.md`. For biomes also read `docs/BIOME_ART_DIRECTION.md` and `docs/STYLE_AND_AGGRO_REVIEW.md`.
2. Use the **existing native Pixel Frog Tiny Swords art language** as the master reference. The approved files in `art/style-references.json` are the source of truth. Existing authored Nobby, shaman, skeleton and biome art are secondary *identity/content* references, not permission to introduce another style.
3. Reuse an existing asset, modify an approved pixel-art source, or assemble parts from approved art **before** generating new images. If new art is required, explicitly reference at least one approved **same-category** native sprite and one comparable gameplay asset. Do not invent incompatible palettes, outlines, light, perspective, shading, detail density, or proportions.
4. Keep 64×64 terrain grid, native sprite sizes, fixed feet/hitboxes, correctly separated animation frames and pixel-perfect **nearest** filtering. No smooth scaling, antialiasing, blur, pasted illustration, generic emoji/SVG placeholders, or procedural Canvas primitives as final game art.
5. Desert terrain must be clearly warm yellow/ochre (not green); snow must read as snowy and jungle as lush while sharing exactly the same pixel-art technique. Roads, bridges, slopes and edges require seamless transition tiles and correct walkable collisions.
6. Keep source and compiled sprite sheets separate: `art/generated-source/` holds authored inputs; `scripts/compile-art.mjs` / `scripts/expansion-art.mjs` generate production graphics. `src/art/registry.json` owns frame dimensions, anchors, hitboxes and animation metadata. Do not change source sprite scales by stretching objects in Tiled.
7. Do not copy or redistribute external asset packs unless the project already includes those particular licensed files and redistribution is permitted. Follow `art/pack-manifest.json` and `CREDITS.md`.
8. Preserve map object IDs, layers, player save compatibility, gameplay, pathfinding, editor behavior, monster AI, collision and UI. **Never** run `scripts/design-worlds.mjs --force` or overwrite manually edited TMX maps as part of a graphics task.

## Required workflow for any visual change

- **Before:** identify the target sprite, compare to the relevant `art/style-references.json` entries, and write down intended dimensions, frame count, baseline and material palette.
- **During:** prefer native pixel editing and deterministic compilation; keep shadows at the same side and forms/outline thickness consistent. Don't upscale/downscale with bilinear filtering.
- **After:** run `npm run art:style:check`, `npm test`, `npm run build` and `npm run art:references`. For changes to the runtime scene or UI also perform an in-game browser screenshot review (use the relevant existing `test:* ` script; see package.json).
- Review the generated `artifacts/art-direction/style-reference.html` **next to actual in-game screenshots** at native pixel zoom. Automated structural checks cannot prove that an image is stylistically good. If it looks inconsistent, iterate before declaring done.
- Report which references were used, modified/added files, checks run, visual review status, and any remaining deviations. Never claim visual parity on tests alone.

If existing assets contradict these rules, document the exception and propose a cohesive conversion; do not silently redraw the whole game.
