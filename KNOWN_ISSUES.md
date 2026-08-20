# Known issues

## Verification limitations

- The full WebGL smoke test is executed in CI after dependencies are installed; the current offline authoring container cannot install the npm dependency directly. The CI artifact records the rendered screenshot and browser diagnostics.
- Visual comparison remains a human-guided polish process; the smoke test detects initialization and browser errors but does not claim parity with the supplied references.

## Visual quality

- Procedural survivor and infected models communicate actions clearly but remain below the animation fidelity of the references.
- Building geometry and procedural materials need additional facade variation, decals, damage layers, and interior dressing.
- Terrain transitions and road shoulders require another blending/decal pass.
- The county is currently a substantial Pine Ridge vertical slice rather than the intended multi-region world.
- Audio is synthesized; licensed environmental field recordings would materially improve atmosphere.

## Gameplay and systems

- Navigation uses collision-aware steering rather than a full baked navigation mesh. Dense player-built mazes can still confuse enemies.
- Terrain excavation changes mesh geometry and local movement cost, but colliders and placed structures do not conform if the ground beneath them is excavated later.
- Storage structures are persistent world objects but do not yet expose a dedicated two-pane transfer interface.
- Firearms use direct ray-style targeting rather than physical projectile ballistics.
- Vehicles are environmental props only.
- Weather is represented through lighting/fog pressure during Nightfall; full rain and wind simulation remain future work.
