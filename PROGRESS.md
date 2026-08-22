# Afterdark County progress

## Current state

- Branch: `chatgpt/afterdark-county`
- Milestone: playable Pine Ridge vertical slice in an autonomous visual and game-feel improvement loop
- Build: production build succeeds at the latest composition/lighting checkpoint
- Tests: 11 deterministic unit tests pass
- Browser proof: the latest implementation completed two consecutive Chromium smoke runs before its checkpoint commit; an independent pull-request run is being triggered by this update
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
- Completed environment pass 2: layered road shoulders, gravel, potholes, cracks, puddles, oil stains, gutters, roof utilities, bollards, pallets, dumpster, propane storage, roadside clutter, instanced ground cover, drifting mist, fireflies, Nightfall rain, and lightning.
- Added a dedicated gameplay-effects layer with context-sensitive aim feedback, muzzle flash, melee arc, blood/soil/construction particles, ground pulses, and bounded decals.
- Rebuilt minimap rendering around a local player-centered tactical view and a full district map with roads, buildings, forest, trenches, camp structures, objectives, POIs, hostile contacts, coordinates, flashlight cone, and a clearer player arrow.
- Added a non-destructive CSS polish layer for stronger hierarchy, panel depth, hotbar feedback, status readability, minimap framing, and Nightfall presentation.
- Upgraded survivor and infected silhouettes, held-equipment presentation, hit reactions, and camera feedback.
- Rebalanced camera framing, night fill, fog, exposure, road markings, warm POI lights, and ground light pools so the scene composes more like the supplied reference.
- Removed the opaque flashlight volume and replaced it with a restrained projected ground beam plus the real spotlight.
- Hardened the Chromium input proof with foreground focus, native DevTools key events, movement retries, and detailed failure diagnostics.
- Stopped committing generated screenshots and smoke reports; visual proofs are retained as short-lived CI artifacts instead.

## Current work

- Obtain and inspect the independent Chromium screenshot for the composition/lighting checkpoint, then address the largest remaining perceptual weakness revealed by that proof.

## Next priorities

1. Inspect the latest CI screenshot against both supplied references and correct any camera, exposure, clipping, flashlight, minimap, or HUD regression.
2. Deepen the Food Mart and residential facades with authored damage, trim, signs, roof silhouettes, windows, exterior utilities, and localized grime.
3. Improve visitable interiors with room separation, shelves, furniture, loot staging, interior light pools, and roof/wall cutaway readability.
4. Increase the variety and narrative logic of prop clusters without materially increasing draw calls.
5. Add quality-scaled rain, mist, particles, shadows, and vegetation density.
6. Add fuller legally compatible environmental audio and more spatial combat/interaction feedback.
7. Expand beyond Pine Ridge with forest, farm, school, lumber yard, and river POIs using streamed chunks.
8. Replace steering-only enemy navigation with a dynamic solution that responds to trenches and player structures.
9. Add storage transfer UI, equipment slots, durability, and more meaningful blueprint progression.
10. Add repairable/drivable vehicles after the core slice is visually stable.

## Known issues

See `KNOWN_ISSUES.md`.

## Visual quality status

Pine Ridge now has a coherent nighttime composition, denser roadside detail, stronger warm/cold lighting separation, clearer silhouettes, less intrusive flashlight presentation, richer feedback effects, and a substantially more informative map/HUD than the first verified pass. It remains materially below the references in unique texture work, facade damage, interior richness, character animation fidelity, authored audio, advanced occlusion handling, world scale, and the amount of hand-authored environmental storytelling. No parity claim is made.

## Last verified checkpoint

- Browser-verified playable foundation: `ce513736caa893ab1958fcb704d3f3f6ad579dc3`
- Browser-verified visual pass 1: `ec598d1f617dc932966ba01c221d5b7287e4afd8`
- Environment/atmosphere pass 2: `96fde38539676fdafe87162c4ada352d54550ad4`
- Tactical map, feedback, and HUD pass: `b3f06867b7b4096ca7de56adefa2f7c4b8db8494`
- Character/framing pass: `a9d3d5dc4bfce187bbe4433e3f2c5353c20dd0f6`
- Composition, lighting, and input-stability pass: `d308c9a1c1f1a3331073950f08843d512d369d1e` (verification pipeline and two consecutive Chromium smoke runs passed before commit)
