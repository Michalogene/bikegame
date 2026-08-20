# Afterdark County progress

## Current state

- Branch: `chatgpt/afterdark-county`
- Milestone: playable Pine Ridge vertical slice with the second environment, mapping, UI, and game-feel pass in progress
- Build: the last browser-verified production build succeeds; the newest visual modules pass local JavaScript syntax and repository size/style checks and still require the next Chromium proof
- Tests: 11 deterministic unit tests and the existing Chromium gameplay smoke passed at the prior verified checkpoint
- Browser proof: the verified checkpoint renders Pine Ridge, reaches HUD-ready state without page errors, and responds to simulated player movement
- Primary references: supplied nighttime Pine Ridge scene/HUD and trench excavation scene

## Completed

- Preserved existing repository history and isolated work on the dedicated ChatGPT branch.
- Established modular ES-module architecture, verification scripts, browser CI, and persistent project documentation.
- Built the Pine Ridge vertical slice with roads, Food Mart, homes, barn, vehicles, utilities, interiors, forest, natural boundaries, props, contextual containers, and warm local lighting.
- Implemented orthographic isometric camera movement, rotation, zoom, damping, player collisions, sprinting, procedural movement, aiming, and flashlight.
- Connected weighted inventory, eight-slot hotbar, contextual loot, consumables, health, stamina, hunger, hydration, temperature, bleeding, and death.
- Added melee/firearm combat, ammunition, infected perception/pursuit/attacks/death/drops, Nightfall spawning pressure, and traps.
- Added crafting, camp construction ghosts, placement validation, persistent campfires, barricades, storage crates, and snares.
- Added real local heightfield excavation, persistent terrain edits, soil mounds, trench movement penalties, and the shovel objective.
- Added dynamic time/lighting, missions, circular minimap, reference-inspired HUD and panels, synthesized audio feedback, autosave, and save restoration.
- Added deterministic tests for inventory, crafting, state persistence, survival actions, damage, day rollover, and Nightfall transitions.
- Added an automated Chromium smoke proof that verifies the rendered canvas, HUD, boot completion, render calls, input-driven movement, console cleanliness, and screenshot generation.
- Completed visual pass 1: stronger default composition, more readable night exposure, improved cold fill, a less obstructive station canopy, and a quieter vignette/brand treatment.
- Completed environment pass 2 foundation: layered road shoulders, gravel, potholes, cracks, puddles, oil stains, gutters, roof utilities, bollards, pallets, a dumpster, propane storage, roadside clutter, instanced ground cover, drifting mist, fireflies, Nightfall rain, and lightning.
- Added a dedicated gameplay-effects layer with a visible flashlight volume, context-sensitive aim marker, muzzle flash, melee arc, blood/soil/construction particles, ground pulses, and bounded decals.
- Rebuilt minimap rendering around a local player-centered tactical view and a full district map with recognizable roads, buildings, forest, trenches, camp structures, objectives, POIs, hostile contacts, coordinates, flashlight cone, and a clearer player arrow.
- Added a non-destructive CSS polish layer for stronger hierarchy, panel depth, hotbar feedback, status readability, minimap framing, and Nightfall presentation.

## Current work

- Run the second-pass browser smoke/screenshot proof, correct any runtime-only WebGL or composition regressions, then improve survivor and infected silhouettes.

## Next priorities

1. Execute Chromium verification for the new environment, effects, minimap, and CSS modules and inspect the generated screenshot against the references.
2. Correct any over-bright rain, mist occlusion, decal depth conflict, minimap clipping, or HUD overlap discovered by the browser proof.
3. Upgrade survivor and infected silhouettes, held-equipment presentation, animation readability, flashlight origin, and hit reactions.
4. Improve Food Mart and residential facade damage, interior dressing, roof silhouettes, windows, and hand-authored prop clusters.
5. Add quality-scaled weather density and fuller environmental ambience with legally compatible field-recorded audio.
6. Expand beyond Pine Ridge with forest, farm, school, lumber yard, and river POIs using streamed chunks.
7. Replace steering-only enemy navigation with a dynamic navigation solution that responds to trenches and player structures.
8. Add storage transfer UI, equipment slots, durability, and more meaningful blueprint progression.
9. Add drivable/repairable vehicles after the core slice is visually stable.

## Known issues

See `KNOWN_ISSUES.md`.

## Visual quality status

Pine Ridge now has substantially more surface breakup, roadside density, facade utility detail, atmosphere, weather, feedback effects, and map legibility than the first verified pass. It remains materially below the references in handcrafted texture detail, unique building damage, character animation, interior richness, cinematic camera reactions, authored audio, and overall county scale. The new pass has not yet received a fresh Chromium screenshot proof, so parity is not claimed.

## Last verified checkpoint

- Browser-verified playable foundation: `ce513736caa893ab1958fcb704d3f3f6ad579dc3`
- Browser-verified visual pass 1: `ec598d1f617dc932966ba01c221d5b7287e4afd8`
- Visual-pass bookkeeping cleanup: `fecc416299cc3d51c8dd5492c68ad033d6de1427`
- Environment/atmosphere pass 2 checkpoint: `96fde38539676fdafe87162c4ada352d54550ad4` (syntax/static authoring checks passed; browser proof pending)
