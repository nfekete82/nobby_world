# Nobby World — RPG-JS restart

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

## Starting point

- Official sample Tiled map and matching Pipoya character/tile assets.
- Player named Nobby; movement with arrow keys and the engine's default inputs.
- NPC interaction and the engine's standard menus.
- New storage namespace `nobby_world_rpgjs_v1`; old game saves are not migrated.
- Engine packages pinned together at 5.0.0 to avoid the upstream starter's mixed
  5.0/5.1 peer dependency conflict. No `--force` or `--legacy-peer-deps` is required.

This is a working engine baseline. The previous 80 enemies, portals, spells, custom
3D models and expanded map are not carried into this restart. New game systems and
Nobby's final artwork can now be developed within RPG-JS.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/modules/main/` | Player hooks, events and map registration |
| `src/config/` | Client/server configuration |
| `src/tiled/` | Tiled maps and tilesets |
| `public/spritesheets/` | Character sprites |
| `src/standalone.ts` | Single-player entry |
| `src/client.ts` | Optional multiplayer entry, not deployed here |

## Verification

```sh
npm run build
npm test
# With the local game running and Google Chrome installed:
npm run test:browser
```

The upstream production test checks map and UI stylesheet delivery at both root
and a subpath. Browser evidence for the restart is recorded in `artifacts/rpgjs/`.

## Previous version

The original game is preserved on branch
`archive/nobby-world-before-rpgjs-2026-10-15` at commit `66b5c06`.
It is not loaded or included in this new game's Docker build.
See [credits](CREDITS.md) for starter and sample artwork sources.
