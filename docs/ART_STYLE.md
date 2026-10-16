# Nobby World — Master Pixel Art Style Guide

**Status:** authoritative art contract for future graphics. Existing game sources remain the truth for exact sizes; this document does not overwrite previous art, TMX maps or gameplay.

## 1. Master visual language

Our **primary master** is the native, included **Pixel Frog / Tiny Swords** pack: trees, bush, warrior, tower, castle, terrain and monk. See `art/style-references.json`. This is not “generic pixel art”: new assets must look as if created by the same artist for the same game. The original native pack images are protected references, not assets to recolor or replace casually.

- Camera: top-down/three-quarter Tiny Swords perspective, with visible building fronts and readable walkable ground. Keep viewpoint, vanishing cues and object silhouettes uniform across all biomes.
- Shapes: rounded/blocky, readable chibi silhouettes; **large deliberately placed pixel clusters**, not thin photorealistic texture or noisy single-pixel confetti.
- Outlines: crisp, stable, dark slate-blue outlines; starting reference `src/art/registry.json > palette.outline = #293544`. Outline weight and silhouette contrast must resemble nearby native sprites, **not** arbitrary fixed 1px/3px borders on everything.
- Shading: limited flat color steps (generally ~3–4 shades per material); compact clusters, highlights consistently **upper-left**, shadows lower-right. Ambient shadows remain short and matte, not airbrushed.
- Crispness: binary/pixel-hard silhouette on authored sprites; `nearest` sampling for runtime rendering, pixel-snapped positioning whenever practical. Avoid blur, gradients, bilinear upscale, glow halos, smooth vector edges, pseudo-3D and glossy plastic materials.
- Density: small decorative motifs must remain subordinate to the main body of an object. Compare detail at **native sprite size**, not just zoomed out in an illustration.

### Identity and character continuity

The existing playable mage Nobby and shaman Nobby are the character identity references. Preserve the **brown hair, beard, man bun**, facial proportions and game-readable costume silhouettes when editing or adding poses. Keep mage and shaman visually distinct as *classes*, but proportional to the same native actors. Skeletons share the same world proportions, feet, light and shading. Do not substitute an independently styled full-body portrait for the in-game sprite.

## 2. Technical pixel contract

| Component | Existing implementation contract |
| --- | --- |
| Terrain/collision tile | **64 × 64 source px**; TMX and registry agree |
| Actors | Default native frame **192 × 192 px**, common foot **[96,132]**, hitbox **[32,24]**; consult registry for exceptions |
| Props | Use each existing native frame/foot/hitbox from `src/art/registry.json`; do **not** force props to actor dimensions |
| Sprite sheets | Exactly `frameWidth × frames` and `frameHeight × (rows ?? 1)`; aligned per frame and facing |
| Animation | Stable baseline, no wandering body, consistent scale and outfit per pose; no cut-off weapons, particles or body parts |
| Runtime scaling | Nearest-neighbor filtering, no blurry fractional object scaling or size corrections via editor rectangles |
| Atlas and metadata | `src/art/registry.json` owns runtime frames, anchors, collision and visibleBounds; verify with preflight |

The runtime config already sets `TextureStyle.defaultOptions.scaleMode='nearest'` and `TextureSource.defaultOptions.scaleMode='nearest'` in `src/art/pixel-rendering.ts`. Changes must preserve both.

## 3. Biomes share technique, not identical colors

| Biome | Color intent and continuity |
| --- | --- |
| Forest/grass | Sage and olive grass, deep forest greens, cool blue-slate outlines; native Tiny Swords trees/bushes first |
| Desert | **Distinctly warm yellow-gold sand**, ochre/rust/cream accents, jade cactus; no greenish dirt or grassy dominant pixels |
| Snow | Bright ivory snow, cool muted blue-violet shadows, snowy native-scale evergreens, dark readable contours |
| Jungle | Saturated but restrained leaf-greens/turquoise; native-size foliage clusters, tree trunk and canopy geometry as Tiny Swords |
| Stone/buildings | Matte warm masonry/wood; dark slate outlines, roofs, windows and trim with consistent native perspective |

Never solve biome distinction by changing the fundamental art style. Forest, desert, snow and jungle must have identical camera/view angle, pixel density and lighting direction.

## 4. Terrain transitions are first-class assets

- Paint terrain using real 64px tiles/autotile edges, corners and transition masks: grass↔path, path↔desert, desert↔rock, cliff ledge and snow↔soil.
- Keep paths coherent and bridges visibly traversable. Terrain visuals and collision/pathfinding must **agree**, including water and stepped heights.
- Avoid placing trees, cacti, houses, shadows or any other objects into otherwise reusable seamless ground tiles.
- Preserve editor categories, layer semantics, sprite object IDs and user-made maps; no destructive world re-generation.

## 5. Source of truth and approved references

1. `art/style-references.json` identifies actual checked-in **native master** and **secondary authored** assets. It is validated automatically against the runtime registry.
2. `art/pack-manifest.json` pins original Tiny Swords PNG hashes for proven native art. Do not change an original PNG in-place.
3. `art/generated-source/` contains editable illustration sources; compiled PNGs are in `public/tiny-swords/`.
4. Existing background: `docs/TINY_SWORDS_ART_DIRECTION.md`, `docs/BIOME_ART_DIRECTION.md`, `docs/STYLE_AND_AGGRO_REVIEW.md`, and `art/PROMPTS.md`.
5. The optional existing before/after report is `artifacts/expansion/style-comparison-v2.png`. Generate a current reference contact sheet via `npm run art:references` and open `artifacts/art-direction/style-reference.html`.

For every new asset, record: purpose/biome, 1–3 master references, source provenance/license, native frame dimensions, animation counts, foot anchor and acceptance screenshots. Update the reference manifest **only after** the new sprite has passed visual review; **do not** auto-promote every generated asset to “master”.

## 6. Definition of done

```sh
npm ci
npm run art:style:check
npm test
npm run build
npm run art:references
# For changed scenes/characters/biomes:
npm run test:expansion
```

`art:style:check` combines the existing production preflight with a reference/renderer/original-pack guard. CI runs it on PRs. It catches wrong spritesheets, misplaced assets, invalid PNGs and modified native masters. `npm run art:references` generates a locally viewable side-by-side asset gallery. **Visual inspection of the gallery plus in-game screenshots is still mandatory:** no test can reliably assert matching art direction, shape language or aesthetic quality.

## Shaman and actor animation stability

The shaman, mage, Mira, and allied skeleton use the approved stable standing
poses in `src/art/animation-policy.mjs`. Standing animations must not include
running/jumping silhouettes. Shaman idle runs at **1.5 FPS** (source compiler
and registry agree), not the old 4 FPS. Compiled actor sheets retain their
full **192×192** cells and fixed **[96,132] foot**, so **do not set
`trimTransparentBounds: true` for actors**: per-frame trimming can cause jitter.
Props continue to use their historical trim behavior. Walking, fighting,
casting, summoning and death animations always retain all authored frames.
When new actor art is introduced, review *both* front and rear frames and
check idle/stride/junction transitions in the actual game, not just static PNGs.

## Calm wildlife and summon responsiveness

- Shaman idle: **0.5 FPS**, native 192px fixed-foot poses; running and summoning remain quick.
- Sheep grazing: only the head/neck bows by four original pixels, stays down
  for four frames, and rises. The wool, torso and feet never bob. The graze route
  waits for the full ten-frame native-pixel sequence before walking again.
- Skeletons: instant consecutive summons with no cooldown or AI startup wait,
  still costing 10 mana each, limited to three companions and one pending server
  spawn operation. Base health and level scaling are stronger; lifespan is two
  minutes unless defeated or cleaned up at a map/player transition.

## Natural walking (shaman and sheep)

- Shaman walks at **12 FPS** through six individually painted full poses in
  each facing row. `art/generated-source/expansion/shaman-run.png` is the
  reviewed native 1152×384 source; `scripts/natural-walk.mjs` copies it without
  transforms into both production paths. Its editable pixel layers and
  preserved upper-body pixels are alongside it. Never mirror, shift or crop
  old boots to manufacture new steps. Frames 1/4 plant opposite legs; frames
  2/5 release the other heel; frames 3/6 pass the bent swing leg. The rear
  uses separately painted heels. Keep 192px cells, [96,132] feet and [32,24]
  hitboxes. Face, beard, bun, robe, arms and staff retain authored motion.
- Sheep have an **independent eight-frame stepping sheet** from
  `scripts/sheep-art.mjs` (`sheep-walk.png`), which alternates two genuine
  moving hoof regions while fixing the original fleece, head and body.
  Walking and grazing are distinct states. Build/pretest regenerate this
  deterministic derived image from the already-licensed Tiny Swords sheep,
  never edit/re-commit the original source image.
- Verify both row directions of shaman walking and observe sheep actually
  moving through pastures in a running browser, not solely PNG structural tests.

## Knight-reference gait and companion combat focus

- **Shaman walking:** use native `Warrior_Run.png` as the six-phase movement
  reference at 12 FPS. Do not freeze the torso or normalize individual poses
  during compilation. See the authored source and `docs/SHAMAN_RUN_REVIEW.md`.
- **Skeleton combat:** once engaged, a skeleton keeps its live enemy target
  even when Nobby moves far away. Never replace it with a nearer target
  while still alive and within the bounded per-skeleton `leash`. Acquire
  another authored hostile when a target dies or leaves the permitted radius.
  Follow the owner only when no valid combat target remains. Neutral animals,
  other players, friendly skeletons and unreachable tiles are never targets.

### Authored shaman gait regression coverage

Frame count, FPS and changed pixels do not prove alternating legs. The tests
inspect independently reviewed visible toe/sole coordinates in the real game
PNG, test lifted versus grounded feet in both views, reject a deliberately
repeated leading-leg cycle, check boot separation and check the 6→1 wrap.
Open `artifacts/shaman-run/index.html` for the animated side-by-side reference
and inspect actual movement screenshots before accepting future edits.
