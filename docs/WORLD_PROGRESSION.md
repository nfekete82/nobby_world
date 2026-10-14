# World progression

Each world contains the same 80 authored encounters across six connected regions.
This is a larger fixed map with successive difficulty tiers, not procedural maps.
Ordinary enemies, elites and bosses all count toward completion. The HUD and map
show the remaining enemies; the map can route to the nearest living enemy.

Kills add stable encounter IDs to the defeated set. There is no timed enemy
respawn. The last kill opens a 3D portal on reachable ground near the hero. Clicking
the portal or pressing R approaches it and enters when close enough. Entry is
blocked during death or open menus. Repeated input cannot skip a world.

For world level `L`, let `t = L - 1`. Relative to each encounter's regional base:

| Attribute | Multiplier |
| --- | --- |
| Maximum HP | `1 + 0.32t + 0.025t²`, rounded up |
| Damage, including boss slams | `1 + 0.20t + 0.01t²`, rounded up before slam scaling |
| Speed | `1 + min(0.40, 0.025t)` |
| XP | `1 + 0.12t`, rounded |

The transition collects remaining gold and potion drops, preserves character XP,
level, gold, equipment and inventory, restores HP/mana, returns Nobby to the village
and resets all encounters. Old projectiles, boss attacks and movement targets are
cleared. Only enemies visibly equipped with bows shoot at any world tier.

The existing `nobby_world_save_v1` format now includes a `world` object with level,
defeated IDs and portal position. Old saves migrate to world 1 without discarding
character progress. Invalid defeated IDs are ignored; an open portal requires a
fully cleared encounter set. Partial damage to living enemies is not persisted.

Verification: 72 simulation tests include stage scaling, transition gates, save
migration, portal restoration and flood-fill reachability of every encounter.
Chrome review exercises keyboard and actual 3D portal clicks, fresh enemy picking
after respawn, world 3 after reload, menus and mobile map layout. Evidence is in
`artifacts/worlds/`.
