# Nobby World 🌲

**v0.2 – Tiny Swords Forest** · Private browser game with a controllable, animated magic hero.

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

**Important:** the importer requires your original, personally obtained `Tiny Swords (Free Pack).zip` in `~/Downloads/` (or specify the full path as an argument). It imports **all 428 usable PNG/Aseprite files**, ignoring macOS metadata. Only the required sprites are rendered in v0.2; the others are available for future levels. The pack is intentionally not committed to Git because its license prohibits redistributing standalone assets.

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
| Walk to destination | Click / tap |
| Sprint | Shift |
| Magical heal animation | E |
| Fullscreen | F |

## Graphics implemented

- Pixel Frog Tiny Swords 64px grass tiles cut from the original terrain tileset, with a natural winding path
- Animated original Tiny Swords trees (four variants), bushes and rocks
- Animated Monk as the **wizard-like protagonist**, with idle, run and heal animations, plus an optional magical effect
- Tiny Swords houses and fire FX as forest landmarks
- Existing camera, click-to-move, collisions and nav-grid retained

### Visual constraints

The supplied current **Free Pack** is cartoon fantasy pixel art, not Diablo's grim realistic style. The Monk animations face one primary direction; horizontal mirroring is a stopgap, not true 8-direction animation. Do not claim directional sprites exist when they don't. Combat, monsters, inventory and RPG progression are not yet implemented.

## Project structure

- `index.html`: game and canvas renderer, no build step
- `Dockerfile` and `.dockerignore`: build a local Nginx image with only the game and assets
- `compose.yaml`: OrbStack / Docker Compose Nginx, localhost port 8088, no bind mounts
- `scripts/import_tiny_swords.py`: local ZIP extraction; no Python dependencies
- `assets/tiny-swords/`: imported user-owned assets, intentionally gitignored
- `CREDITS.md`: credit, license and link

## Next

Choose a genuine player-wizard character sheet with directional animations, then develop interactions, combat and progression after animation and collision polish.

**Authoring project:** [nfekete82/nobby_world](https://github.com/nfekete82/nobby_world) (private).
