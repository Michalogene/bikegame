# Afterdark County

Afterdark County is a modular isometric browser survival game vertical slice set in the abandoned rural district of Pine Ridge. The current build combines a dense procedural Three.js world with survival management, contextual loot, combat, Nightfall enemy pressure, crafting, camp construction, persistent saves, and real local terrain excavation.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:8080` in a recent desktop browser with WebGL 2 support.

`npm install` installs the exact Three.js r160 dependency, and the project copies its browser module into `vendor/` before development and production builds. The built game has no runtime network or paid-service dependency.

## Controls

- `WASD`: move
- `Shift`: sprint
- `E`: interact / open the closest container
- `F`: toggle flashlight
- `1–8`: select hotbar slot
- Left click: use the selected item, attack, fire, or confirm a building placement
- Right click: dig when the shovel is selected; cancel building placement otherwise
- `Q` / `R`: rotate the camera or a construction ghost
- Mouse wheel: zoom
- `Tab` / `I`: inventory
- `C`: crafting book
- `M`: county map
- `B`: camp construction
- `Esc`: close the current panel or cancel placement

## Verification

```bash
npm run verify
```

The verification pipeline runs repository-wide syntax/static checks, TypeScript checking on the critical serializable game logic, deterministic unit tests, and the static production build. CI additionally launches headless Chromium, verifies that Pine Ridge renders without page errors, simulates player movement, and captures a screenshot artifact.

## Current playable systems

- Orthographic isometric camera with smoothing, rotation, and zoom
- Dense Pine Ridge slice with Food Mart, houses, barn, roads, vehicles, utilities, forest, props, interiors, and natural boundaries
- Player movement, sprinting, collisions, procedural animation, aiming, and flashlight
- Contextual containers and persistent loot
- Weighted inventory, hotbar, consumables, equipment, and crafting
- Health, stamina, hunger, hydration, temperature, bleeding, and death
- Melee and firearm combat with ammunition, feedback, enemy detection, pursuit, attacks, deaths, and drops
- Dynamic time, warm/cold lighting balance, Nightfall waves, and temperature changes
- Campfire, barricade, storage, and snare placement
- Editable heightfield excavation with persistent trench data and movement penalties
- Missions, minimap, reference-inspired HUD, panels, audio feedback, and autosave

## Project status

This repository is an actively developed vertical slice, not a finished commercial game. See `PROGRESS.md` and `KNOWN_ISSUES.md` for the verified state and next priorities.
