# Afterdark County progress

## Current state

- Branch: `chatgpt/afterdark-county`
- Milestone: playable Pine Ridge vertical slice with first composition and lighting pass
- Build: production build succeeds on GitHub Actions
- Tests: static/syntax checks, critical `checkJs`, 11 deterministic unit tests, and Chromium gameplay smoke pass
- Browser proof: Pine Ridge renders, the HUD reaches ready state, no page errors are reported, and simulated movement changes the survivor position
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
- Completed visual pass 1: camera now frames Pine Ridge ahead of the survivor, the default isometric quadrant matches the reference composition more closely, night exposure and cool fill are more readable, the gas-station canopy has a dark roof with warm underside lighting, and the oversized brand/vignette were reduced.

## Current work

- Visual pass 2: compare the new browser screenshot directly against the references and improve the largest remaining scene-readability, environment-density, facade, character-silhouette, minimap, and UI gaps.

## Next priorities

1. Inspect the post-pass Chromium screenshot and correct any over-bright, over-dark, cropped, or poorly composed regions.
2. Improve Pine Ridge terrain layering, road shoulders, decals, facade depth, roof silhouettes, windows, and prop clusters.
3. Upgrade survivor and infected silhouettes, animation readability, flashlight presentation, and combat impact feedback.
4. Improve the minimap with recognizable roads, POIs, explored terrain, objective markers, and a clearer player arrow.
5. Add fuller weather, environmental ambience, and legally compatible field-recorded audio.
6. Expand beyond Pine Ridge with forest, farm, school, lumber yard, and river POIs using streamed chunks.
7. Replace steering-only enemy navigation with a dynamic navigation solution that responds to trenches and player structures.
8. Add storage transfer UI, equipment slots, durability, and more meaningful blueprint progression.
9. Add drivable/repairable vehicles after the core slice is visually stable.

## Known issues

See `KNOWN_ISSUES.md`.

## Visual quality status

The playable scene now has the intended default camera quadrant, stronger nighttime readability, a less obstructive gas-station canopy, reduced vignette, and a HUD hierarchy closer to the supplied reference. It is still materially below the reference in handcrafted texture detail, terrain decals, facade complexity, character animation, prop density, minimap fidelity, atmospheric VFX, and audio depth. Those gaps remain active work and are not considered complete.

## Last verified checkpoint

- Browser-verified playable foundation: `ce513736caa893ab1958fcb704d3f3f6ad579dc3`
- Visual pass 1 checkpoint: `ec598d1f617dc932966ba01c221d5b7287e4afd8`
- Verification at visual-pass creation: build, 11 tests, and Chromium smoke succeeded before the visual commit was pushed.
