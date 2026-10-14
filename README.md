# Nobby World — Emerald Edition

A standalone browser action RPG with a coherent fantasy pixel-art world. Play as
Nobby, explore the Smaragdwald, climb plateaus via their stairs and follow the road
through the badlands to the desert. Existing savegames remain compatible.

## Run

```sh
npm start
```

Open http://localhost:8088. No build, external asset download or Tiny Swords ZIP is
needed for the active Emerald artwork. For OrbStack/Docker:

```sh
docker compose up -d --build --force-recreate
```

Reload with Cmd+Shift+R after updating cached artwork.

## Controls

| Action | Control |
| --- | --- |
| Move | WASD, arrows, click/tap ground |
| Sprint | Shift |
| Attack | Click/tap enemy |
| Arcane Orb | 1; 9 mana, 26 base damage |
| Frost Slow | 2; 14 mana, zero damage, 3-second slow |
| Heal | E; 25 mana, restores up to 35 HP |
| Shop near Galdor | B or click him |
| Inventory | I |
| Drink healing potion | 4; restores up to 40 HP |
| Close panels | Escape |
| Toggle sound / fullscreen | M / F |

The world is 5200×2800 units, with impassable lakes and stair-only plateau access.
There are nine slimes, four goblins, three ranged desert raiders, four scarabs, a
Wurzelhüter elite and the Moorkönig boss. Aggression, ranged attacks, boss ground
warnings, respawns, XP, levels, gold, equipment and automatic browser saving retain
the previous mechanics. Saves use `nobby_world_save_v1` in localStorage.

## Artwork

Six ImageGen-created production atlases in `assets/art/` cover 100 sprite cells
plus grass, road, water, sand, cliff and stair materials. Nobby has separate idle,
run, attack and heal rows. The world includes trees, plants, rocks, a cottage,
smith workshop, market stall, fences, wheat, crates, cart and campfires. Buildings
are scenery; the existing merchant is the trading interaction.

The [art contract](docs/ART_DIRECTION.md) defines perspective, palette, light,
scale, pivots, generation provenance, export rules and limitations. Sources and
measured alpha bounds are checked in with the runtime atlases. Original custom
assets and legacy rendering remain for compatibility; the active renderer does
not request the optional Tiny Swords pack.

## Validation

```sh
npm test
```

61 regression tests cover combat, frost's zero damage, progression, shop, inventory,
saving, navigation, water and elevation. Real Chrome review and atlas preparation
require Playwright installed in your development environment and a local server:

```sh
python3 -m http.server 8093 --bind 127.0.0.1
# In another terminal; PLAYWRIGHT_MODULE may point to an existing installation.
npm run art:prepare
npm run test:visual
```

[Browser review report](artifacts/visual/report.json) and actual screenshots:
[village](artifacts/visual/village.png), [boss](artifacts/visual/boss.png),
[lake](artifacts/visual/lake.png), [mountain](artifacts/visual/mountain.png),
[desert](artifacts/visual/desert.png), [shop](artifacts/visual/shop.png),
[inventory](artifacts/visual/inventory.png), [heal](artifacts/visual/heal.png),
[mobile](artifacts/visual/mobile.png). The review uses a temporary intercepted
script hook; the game does not expose debug globals.

Characters use mirrored side movement rather than dedicated eight-direction
sprites. Enemy movement has three poses; attack has windup/release. See the art
contract for the scope of visual checks.

Private repository: [nfekete82/nobby_world](https://github.com/nfekete82/nobby_world).
