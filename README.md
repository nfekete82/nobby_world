# Nobby World — 3D Adventure

An original stylized 3D browser RPG: animated models, warm light and shadows,
hand-painted ImageGen materials, a winding stream and wooden bridge, organic lake
banks, rocky plateaus, a small village, forest clearings and desert creatures.
Nobby keeps his brown hair, blue/gold robe and cyan crystal staff.

The accepted target is a real 3D world inspired by the user's Secret-of-Mana remake
reference. The supplied Tiny Swords pack informs simplified fantasy proportions;
its 2D sprites are not used as substitutes for 3D models. The previous pixel renderer
is retained as a fallback if WebGL initialization fails.

## Play

```sh
npm start
```

Open http://localhost:8088. No build step, CDN or ZIP import is needed. Chrome,
Safari or another browser with WebGL 2 is required for the 3D renderer.
For the existing OrbStack/Docker setup:

```sh
docker compose up -d --build --force-recreate
```

Reload with Cmd+Shift+R after updating. Existing browser saves remain compatible.

## Controls

| Action | Control |
| --- | --- |
| Move | WASD, arrows, click/tap ground |
| Sprint | Shift |
| Attack | Click/tap a 3D enemy |
| Arcane Orb | 1; 9 mana, 26 base damage |
| Frost Slow | 2; 14 mana, zero damage, 3-second slow |
| Heal | E; 25 mana, restores up to 35 HP |
| Shop near Galdor | B or click him |
| Inventory | I |
| Drink healing potion | 4; restores up to 40 HP |
| Close panels | Escape |
| Toggle sound / fullscreen | M / F |

Spear goblins use melee attacks. Only raiders visibly equipped with bows shoot;
their projectiles are arrows. Slimes, scarabs, guardians and the boss do not shoot.
The boss retains its dodgeable ground slam. XP, levels, gold, equipment, loot,
respawns, mana and saves use the existing simulation and `nobby_world_save_v1`.

The world remains 5200×2800 simulation units. There are at most 88 spaced trees
rather than 335; paths, village, boss/elite areas and stair approaches stay readable.
Land props reject both lakes and the stream. The stream can be crossed at the
wooden bridge; lakes and cliff walls remain solid. Houses now have solid footprints.

## Implementation and artwork

- `index.html`: game simulation, controls, HUD and legacy fallback renderer.
- `assets/3d/world.js`: real WebGL geometry, rigs, lighting, water, terrain picking,
  model animation and effects. One metre corresponds to 100 simulation units.
- `assets/3d/materials.png`, `foliage.png`, `ui.png`: built-in ImageGen artwork.
- `assets/vendor/`: locally bundled Three.js 0.186.1 and MIT license.
- [3D art contract](docs/3D_ART_DIRECTION.md): proportions, world rules and scope.
- [ImageGen prompt set](assets/3d/PROMPTS.md): material and UI generation prompts.

The Tiny Swords ZIP was imported locally for inspection. The ignored pack remains
optional and is not committed. Previous PNGs remain for the 2D fallback and history.
This is an original browser 3D implementation; the commercial reference game's
models and production pipeline are not reproduced.

## Validation

```sh
npm ci
npm test
```

64 regression tests cover the existing systems and revised weapon, bridge, prop
placement and structure rules. Real Chrome/WebGL integration review:

```sh
# Separate terminal:
python3 -m http.server 8093 --bind 127.0.0.1
# Requires Google Chrome installed:
npm run test:visual
```

The browser suite checks real projected mouse combat, WASD, zero-damage frost,
healing, menus, saves, elevated picking, stable geometry allocation, loaded textures
and 390px mobile layout. Its review hook is injected only into intercepted HTML.

[Review report](artifacts/3d/report.json) · [Village](artifacts/3d/village.png) ·
[Bridge](artifacts/3d/bridge.png) · [Boss](artifacts/3d/forest-boss.png) ·
[Lake](artifacts/3d/lake.png) · [Plateau](artifacts/3d/plateau.png) ·
[Desert](artifacts/3d/desert.png) · [Combat](artifacts/3d/combat.png) ·
[Mobile](artifacts/3d/mobile.png).

To re-export the generated transparent UI source: `npm run art:ui` with the review
server running. The older `art:prepare` command is for retained pixel-art assets.
