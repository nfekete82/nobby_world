# Nobby World — 3D art and world contract

The accepted target is **a real 3D world**, replacing the previous pixel-art-only
proposal. The user's Secret-of-Mana remake screenshot guides framing, atmosphere,
readable paths and water/bridge composition. The supplied Tiny Swords ZIP was
inspected and imported locally as a reference for clear, simplified fantasy shapes
and proportions. Its 2D sprites are not presented as 3D models and are not
redistributed in Git.

## Active renderer

`assets/3d/world.js` implements the WebGL world using locally bundled Three.js
0.186.1. No CDN, build step, game engine download or Tiny Swords import is required
at runtime. The existing simulation in `index.html` supplies live actor, combat,
terrain and save state. One metre equals 100 existing game units.

The models are original, code-defined 3D geometry with joint groups, not camera-facing
character images. Nobby retains swept brown hair, beard, blue robe, gold trim,
brown boots and the cyan crystal staff. Galdor has a gold hood and satchel.
Goblins visibly carry spears; desert raiders carry bows and quivers. Slimes,
scarabs, the rooted guardian and crowned treant boss have distinct spatial forms.
Walking, full facing rotation, casting, healing and attack poses animate the rigs.

## Direction and scale

- Warm, cheerful, simplified sculpted fantasy. Hand-painted material detail,
  soft upper-left sunlight, cool green ambient shade, readable silhouettes.
- Orthographic camera looking north/down at approximately 49 degrees. Full 3D
  depth, real meshes and dynamic shadow maps; camera follows within map boundaries.
- Nobby: approximately 1.3 m body, 1.5 m staff tip. Regular humanoids share the same
  rig size. Trees are approximately 2.5–3 m; houses approximately 2.5 m; elite about
  2.5 m; boss about 3.6 m. Doors, paths and bridge use the same spatial unit system.
- Blue/slate roofs, cream plaster, warm timber, moss/clover green grass, teal water,
  gray-green stone, ochre sand and restrained gold/cyan magic.
- All material textures are original built-in ImageGen PNGs, used as albedo maps.
  Color management uses sRGB textures and ACES output. UI uses the same warm family.

## World rules

There are at most 88 trees with at least 210 simulation units between trunk centers,
compared with 335 in the prior renderer. Starting village, road, elite/boss clearing,
water banks, plateau stairs and their approaches are reserved. Plants belong to
appropriate biomes; all land props reject both lakes and the stream.

Lake outlines use shared harmonic radii rather than perfect ellipses. Shore geometry
and water collision derive from the same function. A winding stream crosses the
main path east of the starting village; a real wooden bridge supplies the only
crossing. Terrain is depressed under water. Lily pads are intentional water plants;
cacti, shrubs and land rocks are not allowed inside water collision regions.

Plateau tops derive from `plateauBand`, with real rock walls and stair meshes.
Height rendering follows the shared staircase corridor. Houses have solid footprints.
Mouse picking intersects actual model meshes, plateau tops, steps, bridge and ground;
it does not reuse the old flat-canvas coordinate transform.

## Combat contract

Only actors whose equipment is a bow can fire enemy projectiles. Setting `ranged`
on a spear wielder is insufficient. Bow shots render as 3D arrows. Spear goblins
pursue and attack at melee reach. Slimes, beetles, guardians and the boss do not shoot.
The boss retains its dodgeable ground slam. Arcane damage, frost's zero damage,
healing, mana, XP, loot, equipment, respawns and versioned browser saves remain.
Frost adds an icy ring/crystals; healing adds rising green sparks. Damage/status
labels project from world positions into the interface.

## Performance and verification

Shared geometry/materials, spatially partitioned instancing and fixed effect pools
avoid rebuilding models every frame. DPR is capped at 1.5. Offscreen sectors are
culled. Foreground tree crowns fade when they obscure Nobby. The large legacy 2D ground cache is released once WebGL is active.
The legacy renderer is retained as a fallback if WebGL initialization fails; an
explicit status message identifies that fallback.

`npm test` covers 64 simulation regressions, including the revised weapon rule,
water/bridge paths, prop placement and building footprints. `npm run test:visual`
uses real Chrome/WebGL to verify material loading, WASD, projected mouse combat,
frost, menus, healing, save writes, elevated picking, stable geometry allocation
and mobile layout. See `artifacts/3d/report.json` and its screenshots.

This is an original stylized browser 3D implementation inspired by the supplied
composition, not a reproduction of the commercial game's models or its production
pipeline. Hardware performance is not guaranteed by a headless browser run.
