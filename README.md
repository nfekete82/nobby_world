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

## Start

Run from the `nobby_world` directory:

```sh
python3 -m http.server 8080
```

Open http://localhost:8080 . Alternatively, open `index.html` in a browser.

## Project layout

- `index.html`: fully playable canvas/JavaScript game (no npm or build required)
- `assets/woods.png`: original forest sprite sheet, 352 × 192 px
- `CREDITS.md`: asset and license notes

## Next iteration

1. Decide on the final art style. This pack is **16-pixel pixel art**, not a high-resolution Diablo-style isometric art set.
2. Add a hero sprite sheet with 8-direction walk and idle animations that matches the selected art direction.
3. Move to a modular game framework (Phaser + TypeScript, or Godot for 2.5D lighting) after the visual direction is locked.
4. Add richer terrain layers, lighting, animation, then combat and loot.

Repository: `nfekete82/nobby_world` (intended independent **private** GitHub repo). No relation to `panda-ape-adventure`.
