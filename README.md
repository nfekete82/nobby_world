# Nobby World — local 2D RPG workshop

A clean 2D RPG foundation using the official [RPG-JS v5 starter](https://github.com/rpgjs/starter/tree/v5).
The previous custom Canvas/Three.js game has been removed from this branch.

## Run

Use Node.js 24 LTS and npm:

```sh
npm ci
npm start
```

Open http://localhost:8088. If the Docker game is already using that port, run
`npm run dev -- --host 127.0.0.1 --port 5173` for development instead.

```sh
docker compose up -d --build --force-recreate
```

The Docker image builds the TypeScript/Vite application and serves its standalone
single-player build with nginx. No external game server is needed in this mode.

## Local map editor

Double-click `Karteneditor.command` to open the prepared Tiled project and
`Spielvorschau.command` to launch the live game at http://localhost:5173. Saving a
map reloads the preview. Tiled is installed in `.tools/` and excluded from Git and
Docker. On a new Mac (macOS 13+), run `npm run editor:setup` first.

The [German editor guide](editor/ANLEITUNG.md) explains terrain painting, enemy
templates, levels, NPC dialogs, start points and map portals. No Studio account or
cloud API is used. Copy a map with Save As inside `src/tiled/`, or run
`npm run world:new -- meine-welt`. Maps marked `nobbyWorld = true` are registered
automatically; their filename without `.tmx` is their portal target.

Two authored example maps contain melee enemies with HP, AI and gold/XP rewards.
Templates supply Ritter, Berserker, NPC, start and portal objects. Enemy properties
include level, optional HP and detection range. New custom enemy behaviors still
require code. The red warrior uses the supplied Tiny Swords pack with proportional
scaling and idle/run/attack sheets; starter Nobby retains the engine attack preview
and hit feedback, without referencing nonexistent attack/hurt sheets.

Docker on port 8088 remains a built snapshot; rebuilding is required there after
map changes. Use port 5173 while editing.

## Starting point

- Official sample Tiled map and matching Pipoya character/tile assets.
- Player named Nobby; movement with arrow keys and the engine's default inputs.
- NPC interaction and the engine's standard menus.
- The map fills the window with proportional camera zoom and follows Nobby;
  the top-right button toggles browser fullscreen. Escape also exits fullscreen.
- New storage namespace `nobby_world_rpgjs_v1`; old game saves are not migrated.
- Engine packages pinned together at 5.0.0 to avoid the upstream starter's mixed
  5.0/5.1 peer dependency conflict. No `--force` or `--legacy-peer-deps` is required.

The previous 3D game, its 80-enemy world progression and spells are not ported.
The new map portals connect authored maps and are separate from that older system.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/modules/main/` | Player hooks, events and map registration |
| `src/config/` | Client/server configuration |
| `src/tiled/` | Tiled maps and tilesets |
| `editor/`, `nobby-world.tiled-project` | Local editor templates, classes and guide |
| `scripts/world-data.mjs` | Map validation and event-data compilation |
| `src/generated/worlds.json` | Generated runtime map definitions |
| `public/spritesheets/` | Character sprites |
| `src/standalone.ts` | Single-player entry |
| `src/client.ts` | Optional multiplayer entry, not deployed here |

## Verification

```sh
npm run build
npm test
# With the local game running and Google Chrome installed:
npm run test:browser
# With the live Vite server on port 5173:
npm run test:editor
```

The upstream production test checks map and UI stylesheet delivery at both root
and a subpath. Seven map-import tests check templates, properties and validation.
Browser evidence for the base game is in `artifacts/rpgjs/`; local editor integration
evidence is in `artifacts/editor/`. The latter checks native combat, rewards, map
transfers and saved-property live reload using a test-only injected inspection hook.

## Previous version

The original game is preserved on branch
`archive/nobby-world-before-rpgjs-2026-10-15` at commit `66b5c06`.
It is not loaded or included in this new game's Docker build.
See [credits](CREDITS.md) for starter and sample artwork sources.
