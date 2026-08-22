# Architecture

## Runtime composition

`GameApp` is the composition root. It owns the fixed-step simulation loop and connects independent systems for rendering, input, world generation, player control, enemies, combat, survival, interaction, crafting, construction, missions, audio, UI, and persistence.

Three.js scene objects remain inside render/world/entity systems. `GameState` contains only serializable gameplay data, which keeps saves deterministic and prevents WebGL objects from leaking into persistence.

## Simulation

`GameLoop` advances gameplay at 60 fixed updates per second and renders independently. Player movement, survival drain, enemy behavior, Nightfall timing, combat cooldowns, building placement, and autosave therefore remain stable across frame rates.

## World

`WorldBuilder` combines authored Pine Ridge points of interest with seeded procedural dressing:

- `EditableTerrain` owns a colored heightfield and persistent local deformation.
- `ColliderMap` provides stable circle and oriented-rectangle collision queries, visibility tests, and placement validation.
- `WorldFactories` assembles buildings, vehicles, fences, utilities, containers, and props from reusable procedural components.
- Repeated vegetation is instanced where practical.
- POIs and interactables are exposed through semantic data rather than scene traversal.

The terrain edit API is deliberately localized so a future chunked or voxel-backed implementation can replace the current heightfield without rewriting the shovel, save, mission, or AI interfaces.

## State and data

Item, loot, recipe, buildable, and mission definitions are data-driven. `Inventory` handles capacity, stacks, costs, hotbar assignments, and serialization. `GameState` owns player vitals, time, world persistence, mission progress, and statistics.

`SaveSystem` stores a versioned JSON snapshot in local storage. Terrain edits, structures, opened containers, inventory, vitals, time, missions, and the player transform survive reloads.

## Communication

Systems publish semantic events through `EventBus`, for example `loot:container`, `terrain:dug`, `build:campfire`, `nightfall:start`, and `player:damaged`. Missions, HUD feedback, audio, and persistence can react without direct dependencies on the originating scene object.

## Presentation

The Three.js renderer uses an orthographic isometric camera, physically based procedural materials, shadowed key lighting, local warm lights, fog, tone mapping, and dynamic day/night exposure. The DOM HUD is a separate accessible layer styled to follow the hierarchy and proportions of the supplied visual references.

## Verification boundaries

All JavaScript modules receive syntax validation. TypeScript `checkJs` covers critical pure logic modules where it yields reliable signal without requiring the full external Three.js type package. Unit tests cover inventory, state persistence, consumables, damage, crafting, day rollover, and Nightfall transitions.
