# Afterdark County progress

## Current state

- Branch: `chatgpt/afterdark-county`
- Milestone: playable Pine Ridge survival foundation
- Build: static production build succeeds
- Tests: syntax/static checks, critical `checkJs`, and 11 deterministic unit tests pass
- Primary references: supplied nighttime Pine Ridge scene/HUD and trench excavation scene

## Completed

- Preserved existing repository history and isolated work on the dedicated ChatGPT branch.
- Established modular ES-module architecture, verification scripts, CI, and persistent project documentation.
- Built the dense Pine Ridge vertical slice with roads, Food Mart, homes, barn, vehicles, utilities, interiors, forest, natural boundaries, props, contextual containers, and warm local lighting.
- Implemented orthographic isometric camera movement, rotation, zoom, damping, player collisions, sprinting, procedural movement, aiming, and flashlight.
- Connected weighted inventory, eight-slot hotbar, contextual loot, consumables, health, stamina, hunger, hydration, temperature, bleeding, and death.
- Added melee/firearm combat, ammunition, infected perception/pursuit/attacks/death/drops, Nightfall spawning pressure, and traps.
- Added crafting, camp construction ghosts, placement validation, persistent campfires, barricades, storage crates, and snares.
- Added real local heightfield excavation, persistent terrain edits, soil mounds, trench movement penalties, and the shovel objective.
- Added dynamic time/lighting, missions, circular minimap, reference-inspired HUD and panels, synthesized audio feedback, autosave, and save restoration.
- Added deterministic tests for inventory, crafting, state persistence, survival actions, damage, day rollover, and Nightfall transitions.

## Current work

- First browser visual validation and follow-up stabilization/polish pass.

## Next priorities

1. Run the new CI browser smoke test and correct any runtime-only WebGL or DOM defects.
2. Review the generated Pine Ridge screenshot against the references and prioritize the largest visible gap.
3. Improve Pine Ridge terrain blending, building facades, interiors, roof cutaway behavior, and prop density.
4. Upgrade survivor/infected animation silhouettes and combat impact feedback.
5. Add fuller weather, environmental ambience, and licensed audio.
6. Expand beyond Pine Ridge with forest, farm, school, lumber yard, and river POIs using streamed chunks.
7. Replace steering-only enemy navigation with a dynamic navigation solution that responds to trenches and player structures.
8. Add storage transfer UI, equipment slots, durability, and more meaningful blueprint progression.
9. Add drivable/repairable vehicles after the core slice is visually stable.

## Known issues

See `KNOWN_ISSUES.md`.

## Visual quality status

The current implementation establishes the reference composition, dark rural palette, warm/cold lighting contrast, dense dressing, circular minimap, top navigation, objectives, status bars, hotbar, and weight indicator. It remains materially below the reference in character animation, handcrafted texture detail, facade variety, environmental decals, and cinematic effects. Those gaps remain active work rather than being described as complete.

## Last verified checkpoint

- Remote stable checkpoint before this milestone: `e367b9fc340969e8e27c838b90e935836930a991`
- Current playable milestone: verified locally and awaiting the next pushed Git checkpoint.
