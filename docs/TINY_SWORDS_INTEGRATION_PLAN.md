# Tiny Swords integration contract

## Audit and scope

The active game is RPG-JS 5.0 with two editable TMX maps, Nobby, Mira, two melee
enemy archetypes, map portals, native menus/save slots and the local Tiled workflow.
The old Pipoya terrain and characters, SVG portal and fractional `.4` enemy scaling
are the principal visual inconsistencies. There are no existing boss encounters,
farm simulation or ranged enemies to migrate. Existing IDs, stats, dialog text and
map connectivity must survive the art replacement.

## Binding direction

- Original Tiny Swords terrain uses 64×64 cells. One source pixel is one world unit.
- Character canvases remain 192×192; transparent padding is not character height.
  Typical visible bodies occupy approximately 64–80 pixels. No fractional asset scale.
- Character feet use a fixed canvas anchor and a small ground hitbox. Nature and
  buildings use measured feet and independent ground footprints, never full-image
  collision rectangles. Every prop participates in the same foot-based Y sorting.
- Terrain is seen from above, with the pack's front-facing chibi actors/buildings.
  Warm upper-left light, slate outlines, moss/sage grass, turquoise water, ochre paths,
  blue village roofs and restrained mint/gold magic.
- Rendering uses nearest-neighbor texture sampling, disabled antialiasing and
  integer camera zoom. Maps are large enough to fill the viewport without stretching.

## Implementation sequence

1. Preserve before screenshots; inventory PNG dimensions and alpha bounds.
2. Import original pack graphics and compile a central registry containing frames,
   visible bounds, feet, hitboxes, animation timing and source provenance.
3. Adapt Nobby and Mira with ImageGen while retaining identifying colors/faces.
   Normalize generated sheets mechanically into fixed native frame grids; never
   reference tool-cache paths from the running game.
4. Replace both maps with authored village/river and forest/lake/plateau compositions.
   Preserve gameplay objects and add reusable prop templates to the local editor.
5. Integrate native animation sheets, healing feedback, water/vegetation animation,
   pack-based parchment/wood UI and a readable HUD.
6. Validate references, frame bounds, footprints and spawn/portal accessibility.
   Review real browser scenes and fix visual faults before publishing the PR.

## Missing pack artwork

The free pack contains neither Nobby/Mira's exact identities nor an earth-path
texture. These are generated/adapted against the supplied assets and recorded in
the prompt manifest. Dedicated back-facing monk/warrior views and large monster
boss sheets are not included; use the pack's native directional vocabulary rather
than introducing unrelated graphics. Existing melee enemies remain melee enemies.
