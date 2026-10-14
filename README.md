# Nobby World 🌲

**v0.8.0 – Expanded World, Desert, New Enemies & Forest Boss** · Private browser game with a controllable, animated magic hero.

## Start in OrbStack (port 8088)

You already have the repository in `~/Projects/nobby_world`. Pull the changes:

```bash
cd ~/Projects/nobby_world
git pull --ff-only origin main
# Required only once, or after replacing the Tiny Swords ZIP:
python3 scripts/import_tiny_swords.py
docker compose up -d --build --force-recreate
docker compose ps
curl --retry 5 --retry-delay 1 --retry-connrefused -I http://127.0.0.1:8088/
```

Open **http://localhost:8088/**. If the old graphics remain cached, reload with **Cmd+Shift+R**.

**Important:** the importer requires your original, personally obtained `Tiny Swords (Free Pack).zip` in `~/Downloads/` (or specify the full path as an argument). It imports **all 428 usable PNG/Aseprite files**, ignoring macOS metadata. Only the needed sprites are rendered; the others are available for future levels. The pack is intentionally not committed to Git because its license prohibits redistributing standalone assets.

If you don't yet have the ZIP on your Mac: [download the original from Pixel Frog](https://pixelfrog-assets.itch.io/tiny-swords).

### Commands

```bash
docker compose ps
docker compose logs -f game
docker compose down
```

The Nginx image **contains** the game and the locally imported Tiny Swords assets. This intentionally avoids OrbStack/macOS bind-mount 403/permission issues. After modifying `index.html` or files in `assets/`, run `docker compose up -d --build` to update the running game. To troubleshoot, run `docker compose logs --tail=80 game` and `docker compose exec -T game wget -S -O /dev/null http://127.0.0.1/`.

## Controls

| Action | Key |
| --- | --- |
| Walk | WASD / arrow keys |
| Walk to destination | Left-click / tap on ground |
| Follow the eastward road into the badlands/desert | Move right along the main path |
| Cast selected spell at slime and immediately alert it | Left-click / tap a monster |
| Sprint | Shift |
| Heal spell (25 mana; restores up to 35 HP) | E |
| Open Galdor's shop nearby | B or click the merchant |
| Close the shop | Escape / B / × |
| Open/close inventory | I / Escape |
| Select blue Arcane Orb or zero-damage Slow | 1 / 2 |
| Drink health potion | 4 (when injured) |
| Toggle sound | M (or sound button, top right) |
| Fullscreen | F |

## Health & mana HUD

A larger comic-fantasy HUD with thick dark outlines, golden accents and vivid **Health (red)** and **Mana (blue)** bars above the controls displays, both starting at **100 / 100**. Mana regenerates at **8 points per second** while playing, and healing with **E** spends **25 mana** to restore up to **35 health**. Healing does not activate without enough mana. The red health bar responds to incoming monster damage. The interface updates live and works at desktop and mobile widths.

## First combat prototype

- Nine animated **violet forest slimes** plus new goblins, ranged raiders, desert scarabs, elite guardian and a real forest boss.
- Click/tap a slime to cast a **small blue homing fireball**, with glowing trail, burst and floating damage
- 26 damage per hit, 9 mana per orb, 290ms firing cooldown; ranged targeting is no longer artificially limited to 690 world units
- Slimes deal 8 contact damage (with a short player invulnerability period); hero respawns after defeat
- Slimes reappear after 10 seconds
- Normal clicks on empty terrain still use the existing A* pathfinding
- The slimes are drawn in Canvas (no separate monster sprites were included in Tiny Swords Free Pack)

Run regression tests (Node.js 22+): `npm test` or `node --test tests/combat.test.mjs`.

## RPG progression and loot (v0.4)

- A golden **level counter** and **XP progress bar** are built into the bottom-center HP/Mana HUD.
- Kills grant **15 XP**. Level thresholds start at 40 XP and grow by 25 XP per level.
- Level-up adds **+10 maximum HP** and **+5 maximum mana** and refills both resources.
- Enemies scatter **gold coins** on defeat; every third kill also drops a blue mana orb (+18 mana).
- Loot is animated, lasts 40 seconds, and automatically flies to the hero at close range.
- Gold total is shown at the upper right. **Gold, XP and levels are now stored locally in the browser.**
- A blue casting ring and sparks appear around the wizard's hand at the start of each fireball.
- Unprovoked slimes patrol their territory and use a limited sight radius. Once attacked,
  they pursue the hero continuously, plan routes around trees, stagger on impact and telegraph melee strikes with a red ring.

**Note:** The game is still a small single-player prototype; the slimes are drawn in Canvas.

Run regression tests using Node.js 22+:

```sh
npm test
```

## Galdor the merchant and browser savegame (v0.5)

The merchant stands in the starting clearing and uses Pixel Frog's real animated `Pawn_Idle Gold.png` sprite (with a fallback drawing). Press **B** next to him, or click/tap him to interact. If he is farther away, clicking him routes the hero toward his position first. Combat and movement pause during trading.

| Permanent equipment | Price | Effect |
| --- | ---: | --- |
| Arcane Focus | 12 gold | +10 damage per blue fireball (26 → 36) |
| Windrunner Boots | 10 gold | +20% walking and sprinting speed |
| Guardian Charm | 15 gold | +25 maximum HP |

Purchases are one-time, with disabled controls if an item is already owned or the player cannot afford it. All upgrades apply to gameplay immediately.

**Savegame:** Versioned `localStorage` key `nobby_world_save_v1`; persists level, XP, kills, gold, owned equipment, HP, mana and world position. Autosaves after significant changes, periodically while the game is active, immediately on a purchase and during page unload. Corrupt or old-format records are ignored; invalid values are bounded. No cloud synchronization or account login: browser storage is specific to `http://localhost:8088` and the browser profile. Deleting browser site data removes the save. Requires an environment where localStorage works.

The merchant has no player-versus-monster collision damage while the shop is open. Visit the trader to convert gold drops into meaningful equipment.

## Two spells with comic visuals (v0.7)

**Two-slot spell bar:** Click the two large, framed, fantasy-comic buttons just above the HP/Mana HUD or press `1`/`2`. Left-clicking a slime casts the currently selected spell; clicking empty ground continues to pathfind.

| Spell | Mana | Effect |
| --- | ---: | --- |
| `1` Arkane Kugel (Blue Arcane Orb) | 9 | 26 direct damage (36 with equipped Arcane Focus), fast cooldown |
| `2` Verlangsamen (Frost Slow) | 14 | **0 damage**, slows the target to 34% of its usual movement speed for **3 seconds** |

**Important:** Frost never deals damage, never triggers knockback, XP or loot, and **Arcane Focus does not increase its damage**. There is no third combat spell. Slime base movement speed is now **90–110 world units/second** (roughly 15% faster than v0.7). Frost controls their increased pressure; its translucent crystalline aura lasts until the debuff expires. Existing saved `nova` spell selections transparently fall back to the Arcane Orb without losing purchased equipment or progress.

**Comic styling:** Health and mana bars are now larger with chunky dark outlines, segmented vivid fills and a stylized XP bar. The two oversized magic buttons feature brighter fantasy-frame ornaments, distinctive ice/arcane colors and active-state glow. In combat, projectiles have prominent energy glints; spell impacts flash as a comic starburst; damage, healing and XP numbers pop with stronger outlines. Floating frost text explicitly reads `LANGSAM!` rather than showing fake damage.

**Inventory:** Press `I` or the top-right Inventory button. The panel contains three equipment slots and a backpack slot for healing potions. Gear bought from Galdor is automatically equipped but can now be removed and equipped again. Bonuses apply only when equipped: focus damage, boots movement speed, charm maximum HP.

Every fourth slime kill drops one green **healing potion** in addition to normal loot. It is auto-collected when close. Drink it from the inventory or press `4` to heal 40 HP, up to your maximum.

**Sound:** Lightweight Web Audio synthesis adds distinct effects for casting, slowing, hits, taking damage, loot pickups, merchant purchases, drinking potions and leveling up. The top-right controls provide on/off and adjustable volume; `M` toggles mute. Audio is initialized only after user interaction and gracefully disabled if Web Audio is not supported.

**Persistence:** v0.7 retains the same browser key `nobby_world_save_v1` and loads old v0.5 saves. New fields contain equipped states, healing potions, selected spell and sound preferences. Existing purchases from v0.5 are treated as equipped by default, so their bonuses survive upgrading. No external backend or database is needed.

Use `npm test` to run all **32 headless logic tests**. Full visual and audio checks still require opening the game in a real browser.

## More aggressive monster AI (v0.7.1)

- Slimes have slightly increased base movement speeds: 90 / 100 / 110 world units per second.
- A valid arcane or frost cast **immediately provokes the target**, before the projectile lands.
- Once provoked, the slime actively chases the player **regardless of its former home leash and vision distance**. It stays aggressive until defeated or the player dies. Ordinary unprovoked slimes still return to their own territory.
- Monsters use cached, periodically refreshed A* routes to the player when provoked, avoiding tree obstacles. Pathfinding is throttled per monster to protect frame rate.
- Projectile range checks were removed for clicked visible monsters; projectiles get enough flight lifetime to cross a distant part of the level.
- Frozen monsters still deal no spell damage and move at 34% speed for three seconds, even while provoked.
- Ranged-aggro state does not change saved progression and resets on monster respawn.

## The larger adventure world (v0.8.0)

The map is now **5,200 × 2,800 world units**, up from **3,200 × 2,400** (almost twice the playable area). The original start remains at **x=1600** to preserve existing saves. The eastern road guides the player seamlessly through three areas:

| Region | Approx. X range | Features |
| --- | --- | --- |
| 🌲 Smaragdwald | 0–3,100 | Original village/merchant, larger clearings, fewer trees, ordinary slimes and goblins |
| 🪨 Trockene Grenzlande | 3,100–4,050 | A soft grassy-to-sandy transition, stones and highway signs; stronger raiders |
| ☀️ Goldene Wüste | 4,050–5,200 | Procedural sand dunes, cactus clusters, dry bushes, oasis and desert creatures |

Trees are **roughly 25% sparser per forest area** than before, with a broad main path and reserved forest-boss clearing. The generated sand, cacti and oasis require **no new downloaded art pack**. The biome indicator near the top of the screen shows the player's current zone.

### New enemy classes and elite

| Enemy | Region | Health | Behavior |
| --- | --- | ---: | --- |
| Waldschleim | Forest | 66 | Classic melee chaser |
| Waldkobold | Forest | 112 | Faster, stronger close-range opponent |
| Dünenräuber | Badlands/desert | 135 | Shoots ranged orange projectiles that can be dodged |
| Sandkäfer | Desert | 118 | Particularly fast melee attacker |
| Wurzelhüter (elite) | Forest | 255 | Heavy guardian, high damage, larger gold/potion drops |
| **Moorkönig (boss)** | Forest clearing near x=2860 | **560** | Slow but very strong, charged red ground slams and a second phase below 50% HP |

The **Moorkönig** has its own top-center health bar when approached. His area attack draws an expanding warning circle before it can hit. Move out of the circle to dodge. Below 50% health he becomes faster and his attack becomes more dangerous. Defeating him grants **200 XP**, a large gold shower and a healing potion. The elite and boss have longer respawn intervals.

**Graphics:** Goblins and raiders try to use animated **red Warrior and Archer** units from the locally imported Tiny Swords Free Pack. If those specific sprites cannot load, dedicated hand-drawn Canvas alternatives appear automatically. Scarabs, the root guardian and the crowned forest boss currently have custom, stylized Canvas visuals; the paid Tiny Swords Enemy Pack is **not included or redistributed**. <https://pixelfrog-assets.itch.io/tiny-swords>

**Preserved systems:** two-spell combat (Arkane Kugel damages, Verlangsamen deals exactly zero damage), aggressive ranged-hit pursuit, trader, inventory, XP, loot, savegames, OrbStack/Docker, and `localhost:8088`.

Run `npm test` for **39 logic and regression tests**. A visual/frame-rate check in the actual browser is still recommended for the larger map.

## Graphics implemented

- Pixel Frog Tiny Swords 64px grass tiles cut from the original terrain tileset, with a natural winding path
- Animated original Tiny Swords trees (four variants), bushes and rocks
- Animated Monk as the **wizard-like protagonist**, with idle, run and heal animations, plus an optional magical effect
- Tiny Swords houses and fire FX as forest landmarks
- Existing camera, click-to-move, collisions and nav-grid retained

### Visual constraints

The supplied current **Free Pack** is cartoon fantasy pixel art, not Diablo's grim realistic style. The Monk animations face one primary direction; horizontal mirroring is a stopgap, not true 8-direction animation. Do not claim directional sprites exist when they don't. The game is still a small RPG prototype; inventory slots and consumables exist, but a full item-generator and quest system are not yet implemented. Basic slime combat is playable.

## Project structure

- `index.html`: game and canvas renderer, no build step
- `Dockerfile` and `.dockerignore`: build a local Nginx image with only the game and assets
- `compose.yaml`: OrbStack / Docker Compose Nginx, localhost port 8088, no bind mounts
- `scripts/import_tiny_swords.py`: local ZIP extraction; no Python dependencies
- `assets/tiny-swords/`: imported user-owned assets, intentionally gitignored
- `CREDITS.md`: credit, license and link

## Next

With the combat UX simplified, expand to quests, a small boss encounter, upgraded monster sprite sheets and world locations. A savegame export/import and optional music track may be added later.

**Authoring project:** [nfekete82/nobby_world](https://github.com/nfekete82/nobby_world) (private).
