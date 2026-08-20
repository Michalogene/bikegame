# Afterdark County progress

## Current state

- Branch: `chatgpt/afterdark-county`
- Milestone: Phase A — repository audit and resilient architecture
- Build: project skeleton established; playable slice implementation in progress
- Tests: verification scripts scaffolded
- Primary reference: nighttime Pine Ridge isometric scene and HUD
- Terrain reference: shovel-dug defensive trench scene

## Completed

- Audited repository and preserved the existing `main` and `codex/afterdark-county-v1` branches.
- Created dedicated ChatGPT branch.
- Established modular ES-module architecture and zero-paid-service runtime.
- Pinned Three.js r160 under its MIT license and documented the dependency.
- Added build, static verification, unit test, and CI scaffolding.
- Added persistent project-memory documentation.

## Current work

- First playable Pine Ridge vertical slice: renderer, terrain, player, camera, survival loop, HUD, loot, and day/night.

## Next priorities

1. Build editable terrain and dense Pine Ridge environment.
2. Implement player controller, collision, isometric camera, and interaction.
3. Connect survival, inventory, hotbar, loot, crafting, and mission systems.
4. Add enemies, combat, Nightfall director, and base placement.
5. Implement actual terrain excavation with shovel and trench slowdown.
6. Rebuild HUD and panels to match the reference hierarchy.
7. Run browser smoke tests and visual polish passes.

## Known issues

See `KNOWN_ISSUES.md`.

## Visual quality status

Architecture only at this checkpoint. World, lighting, UI, and animation passes are still pending and therefore well below the references.

## Last verified checkpoint

Pending first architecture commit.
