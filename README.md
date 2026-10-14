# Nobby World 🌲

A standalone browser-based dark-forest action-RPG exploration prototype.

## Current version

**v0.1: one hero walking through a forest.** This is the initial milestone, not a finished Diablo clone.

- Mouse click / tap: automatic pathfinding to a destination
- WASD / arrow keys: move
- Shift: sprint
- F / fullscreen button: fullscreen mode
- Trees have collision; camera follows the hero; map renders in depth order.
- Forest trees, stones and plants use the **uploaded** `pixel_16_woods v2 free` spritesheet (`assets/woods.png`).
- The hero remains a programmatically animated placeholder because the pack contains **no character sprites or animation frames**.

## Local development (Docker Compose, recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) running on macOS.

```sh
cd ~/Projects/nobby_world
git pull --ff-only origin main
docker compose up -d
```

Play at **http://localhost:8088/**. The project has its own Compose name (`nobby-world`) and serves only `index.html` and `assets/` through Nginx. The port is accessible **only from your Mac** (`127.0.0.1`), not the LAN.

Commands:

```sh
docker compose ps                # status
docker compose logs -f game      # logs
docker compose restart           # restart
docker compose down              # stop
```

Changes to `index.html` and files in `assets/` are served immediately: just reload the browser. No rebuild is required.

**Without Docker**, from the same directory:

```sh
python3 -m http.server 8088
```

Then open http://localhost:8088/ (only one of these servers may use the port at a time).

## Project layout

- `index.html`: fully playable canvas/JavaScript game (no npm or build required)
- `compose.yaml`: Nginx container, local port 8088 with live bind mounts
- `assets/woods.png`: original forest sprite sheet, 352 × 192 px
- `CREDITS.md`: asset and license notes

## Next iteration

1. Decide on the final art style. This pack is **16-pixel pixel art**, not a high-resolution Diablo-style isometric art set.
2. Add a hero sprite sheet with 8-direction walk and idle animations that matches the selected art direction.
3. Move to a modular game framework (Phaser + TypeScript, or Godot for 2.5D lighting) after the visual direction is locked.
4. Add richer terrain layers, lighting, animation, then combat and loot.

Repository: `nfekete82/nobby_world` (intended independent **private** GitHub repo). No relation to `panda-ape-adventure`.
