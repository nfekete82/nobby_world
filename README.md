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
| World map / nearest enemy | K / map button |
| Enter completed-world portal | R or click portal |
| Drink healing potion | 4; restores up to 40 HP |
| Close panels | Escape |
| Toggle sound / fullscreen | M / F |

Spear goblins use melee attacks. Only raiders visibly equipped with bows shoot;
their projectiles are arrows. Slimes, scarabs, guardians and the boss do not shoot.
The boss retains its dodgeable ground slam. XP, levels, gold, equipment, loot,
mana and saves use the existing simulation and `nobby_world_save_v1`.

The map is now **10400×5600 units**, four times its original area, with six regions:
Smaragdwald, Versunkene Gärten, Trockene Grenzlande, Goldene Wüste, Kristallhöhen
and Dämmerhain. There are **80 enemies**, including six elites and five bosses,
eight lakes, four plateaus, two bridges and a connected network of roads.
At most 210 spaced trees cover the larger world. Roads, encounters and stair
approaches stay clear; land props reject water and paths.

Defeated monsters stay dead for the current world. After the last kill, a glowing
3D portal appears near Nobby. Entering it starts the next world with all 80 enemies
restored at a higher tier. Enemy health, damage and XP increase each world; movement
speed increases up to a cap. Character level and equipment remain; health and mana
refill and uncollected loot is awarded. World tier, defeated IDs and the portal are
saved alongside the existing character data. Old saves start in world 1.
See [progression rules](docs/WORLD_PROGRESSION.md).

The interface uses soft cream panels, green accents, compact resource bars and a
circular spell dock. The world map shows remaining enemies and can guide Nobby to
the nearest one. Menus and the map support desktop and mobile layouts.

## Implementation and artwork

- `index.html`: game simulation, progression, map, controls and legacy fallback renderer.
- `assets/ui/game.css`: unified HUD, dialogs and responsive layout.
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

72 regression tests cover the existing systems and revised weapon, bridge, prop
placement, structure, portal, save migration and reachability rules. Real Chrome/WebGL integration review:

```sh
# Separate terminal:
python3 -m http.server 8093 --bind 127.0.0.1
# Requires Google Chrome installed:
npm run test:visual
```

The browser suite checks real projected mouse combat, WASD, zero-damage frost,
healing, menus, saves, elevated picking, stable geometry allocation, loaded textures
390px mobile layout, real portal clicks, successive worlds and restored world saves. Its review hook is injected only into intercepted HTML.

[Review report](artifacts/worlds/report.json) · [Village](artifacts/worlds/village.png) ·
[Bridge](artifacts/worlds/bridge.png) · [Boss](artifacts/worlds/forest-boss.png) ·
[Lake](artifacts/worlds/lake.png) · [Plateau](artifacts/worlds/plateau.png) ·
[Desert](artifacts/worlds/desert.png) · [Combat](artifacts/worlds/combat.png) ·
[Mobile](artifacts/worlds/mobile.png).

To re-export the generated transparent UI source: `npm run art:ui` with the review
server running. The older `art:prepare` command is for retained pixel-art assets.
