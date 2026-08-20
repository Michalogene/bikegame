# Architecture

## Runtime

Afterdark County is deliberately split into small ES modules. `GameApp` owns orchestration; individual systems own rendering, state, world generation, interaction, AI, UI, and persistence. Three.js r160 is loaded through a pinned browser import map; all gameplay code remains repository-owned ES modules.

## State model

`GameState` contains serializable game data and composes `Inventory`, `SurvivalSystem`, mission progress, time, player transform, terrain edits, placed structures, and opened container IDs. Three.js objects are never serialized directly.

## World model

The initial Pine Ridge map combines deterministic procedural distribution with authored POIs. `EditableTerrain` owns a deformable heightfield. `WorldBuilder` places roads, buildings, props, vegetation, natural boundaries, loot containers, and lights. `ColliderMap` provides stable broad-phase collision and line-of-sight checks without coupling gameplay logic to rendering meshes.

## Simulation

A fixed-step `GameLoop` updates player motion, survival, enemies, missions, interactions, building placement, time, and autosave. Rendering and camera interpolation remain frame-rate independent.

## Extensibility seams

- Item and recipe definitions are data-driven.
- POIs are built from reusable procedural factories.
- Save data is versioned and migrated centrally.
- Terrain modifications are stored as compact local edits.
- Enemy director and mission system communicate through `EventBus`.
- UI panels consume state and emit semantic commands rather than mutating scene objects directly.
