# Known issues

## Verification limitations

- The full WebGL smoke test is executed in CI after dependencies are installed; the current offline authoring container cannot install the npm dependency directly. The CI artifact records the rendered screenshot and browser diagnostics.
- The environment/effects/minimap pass after `96fde38539676fdafe87162c4ada352d54550ad4` has passed local syntax and static-budget checks but still needs a fresh Chromium screenshot proof.
- Visual comparison remains a human-guided polish process; the smoke test detects initialization and browser errors but does not claim parity with the supplied references.

## Visual quality

- Procedural survivor and infected models communicate actions clearly but remain below the animation and silhouette fidelity of the references.
- Building geometry and procedural materials still need additional unique facade damage, grime layers, decals, roof variation, and interior dressing.
- The new puddles, cracks, shoulders, clutter, mist, rain, and lightning substantially improve breakup but are authored for the Pine Ridge slice rather than generated from a general county-wide biome system.
- The tactical minimap uses an authored district abstraction; future streamed regions will require chunk-derived map geometry and discovery persistence.
- The county is currently a substantial Pine Ridge vertical slice rather than the intended multi-region world.
- Audio is synthesized; licensed environmental field recordings would materially improve atmosphere.

## Gameplay and systems

- Navigation uses collision-aware steering rather than a full dynamic navigation mesh. Dense player-built mazes can still confuse enemies.
- Terrain excavation changes mesh geometry and local movement cost, but colliders and placed structures do not conform if the ground beneath them is excavated later.
- Storage structures are persistent world objects but do not yet expose a dedicated two-pane transfer interface.
- Firearms use direct ray-style targeting rather than physical projectile ballistics.
- Vehicles are environmental props only.
- Nightfall now drives rain, mist density, wind motion, and lightning presentation, but weather does not yet change traction, wetness, fire behavior, sound propagation, or survival values.
- Particle and weather density are currently fixed rather than exposed through graphics-quality settings.
