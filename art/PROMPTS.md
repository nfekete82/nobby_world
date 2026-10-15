# ImageGen artwork provenance

Generated on 2026-10-15 with the built-in OpenAI ImageGen tool, transparent PNG
output for characters/bridge. Original tool outputs are preserved unchanged in
`generated-source/`; the running game references compiled project files only.
The following are the production briefs used for the requests, with reference
roles recorded explicitly. No personal photographs were used.

| Output | References | Production brief |
| --- | --- | --- |
| `nobby-idle.png` | Tiny Swords blue Monk idle; Nobby identity | Six equally spaced idle cells, one row. Swept brown hair and beard, blue robe/gold clasp, compact chibi proportions, slate outline, upper-left light. Gentle breathing, fixed size/baseline, transparent padding, no scenery/text. |
| `nobby-run.png` | Generated Nobby idle; Tiny Swords Monk run | Four run-cycle poses of the same character and costume. One row, same proportions and foot baseline, leg/arm alternation, crisp pixel clusters, transparent background. |
| `nobby-cast.png` | Generated Nobby idle; Tiny Swords Monk heal | Eleven healing poses, arms rising and settling, restrained green/mint particles, same head/robe/feet, one row, generous transparent margins. |
| `mira-idle.png` | Tiny Swords Monk idle; original Mira identity | Six idle poses, blond hair/braids and pale green hood/clothes, same chibi body scale as Nobby and the supplied pack. Preserve identifying colors, fixed baseline, transparent background. |
| `earth.png` | Tiny Swords grass tile atlas | Seamless flat warm ochre earth texture at native 64px tile detail. Small readable pixel clusters, sparse stones, upper-left light, no objects, seams or perspective. |
| `bridge.png` | Tiny Swords House1; grass tile atlas | Horizontal timber bridge for a 256×128 native footprint, warm planks and low rails with slate outlines. Walkable middle band, no water, landscape, text or character. Transparent background. |
| `nobby-attack.png` | Generated Nobby healing sheet | Preserve Nobby's brown hair/beard and blue/gold robe. Eleven equal cells: rest, wind up, hand swing to the right with a blue-white close-range magic crescent, recoil and return to rest. No projectile, weapon, extra character, text or floor. Same body proportions/baseline, transparent padding, Tiny Swords pixel clusters. |

## Mechanical compilation

`npm run art:prepare` uses `pngjs` only. It measures alpha components and body feet,
uses one scale per sequence (70px rest-body height), places every pose into native
192×192 cells at foot `[96,132]`, samples nearest neighbors, quantizes generated
characters/bridge to colors measured from the original pack and makes alpha binary.
The attack compiler follows each connected body/arc past source-cell boundaries
so neighboring crescents cannot bleed into a frame. It never synthesizes artwork.
Original pack character/prop pixels are never resized or recolored.

The nine-slice UI panels are compiled from the separated source atlas. The earth
center is edge-matched and combined with the pack's grass edge masks. Bridge
pixels are packed into a 4×2 tile image. Regeneration does not invoke ImageGen and
does not modify TMX maps. `registry.json` records native dimensions, visible bounds,
frame counts, animation timing, feet, hitboxes and generation input paths.

Source archive digest and retained source PNG hashes are in `pack-manifest.json`.
