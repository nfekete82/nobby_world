# Nobby World 🌲

**v0.7 – Tiny Swords Comic Combat & Two Spells** · Private browser game with a controllable, animated magic hero.

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
| Fire blue magic at slime | Left-click / tap a monster |
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

- Nine animated **violet forest slimes** with overhead HP bars, approaching the hero when nearby
- Click/tap a slime to cast a **small blue homing fireball**, with glowing trail, burst and floating damage
- 26 damage per hit, 9 mana per spell, 290ms firing cooldown, maximum range 690 world units
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
- Slimes patrol their territory, chase within a bounded radius, return if they wander too far,
  stagger on impact and telegraph incoming melee strikes with a red ring.

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

**Important:** Frost never deals damage, never triggers knockback, XP or loot, and **Arcane Focus does not increase its damage**. There is no third combat spell. Slime base movement speed increased from **43–61** to **78–96 world units/second**. Frost controls their increased pressure; its translucent crystalline aura lasts until the debuff expires. Existing saved `nova` spell selections transparently fall back to the Arcane Orb without losing purchased equipment or progress.

**Comic styling:** Health and mana bars are now larger with chunky dark outlines, segmented vivid fills and a stylized XP bar. The two oversized magic buttons feature brighter fantasy-frame ornaments, distinctive ice/arcane colors and active-state glow. In combat, projectiles have prominent energy glints; spell impacts flash as a comic starburst; damage, healing and XP numbers pop with stronger outlines. Floating frost text explicitly reads `LANGSAM!` rather than showing fake damage.

**Inventory:** Press `I` or the top-right Inventory button. The panel contains three equipment slots and a backpack slot for healing potions. Gear bought from Galdor is automatically equipped but can now be removed and equipped again. Bonuses apply only when equipped: focus damage, boots movement speed, charm maximum HP.

Every fourth slime kill drops one green **healing potion** in addition to normal loot. It is auto-collected when close. Drink it from the inventory or press `4` to heal 40 HP, up to your maximum.

**Sound:** Lightweight Web Audio synthesis adds distinct effects for casting, slowing, hits, taking damage, loot pickups, merchant purchases, drinking potions and leveling up. The top-right controls provide on/off and adjustable volume; `M` toggles mute. Audio is initialized only after user interaction and gracefully disabled if Web Audio is not supported.

**Persistence:** v0.7 retains the same browser key `nobby_world_save_v1` and loads old v0.5 saves. New fields contain equipped states, healing potions, selected spell and sound preferences. Existing purchases from v0.5 are treated as equipped by default, so their bonuses survive upgrading. No external backend or database is needed.

Use `npm test` to run all **26 headless logic tests**. Full visual and audio checks still require opening the game in a real browser.

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
