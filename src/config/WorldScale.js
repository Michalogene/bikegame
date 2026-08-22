// @ts-check

/**
 * Afterdark County uses a metric world contract: one world unit is approximately one metre.
 * Keep gameplay distances and authored geometry here so new POIs do not drift back toward
 * the oversized prototype proportions.
 */
export const WORLD_SCALE = Object.freeze({
  metersPerUnit: 1,
  player: Object.freeze({
    height: 1.82,
    sourceHeight: 3.12,
    visualScale: 1.82 / 3.12,
    radius: 0.34,
    walkSpeed: 2.65,
    sprintSpeed: 5.55,
    cameraTargetHeight: 1.18,
    flashlight: Object.freeze({
      x: 0.14,
      y: 1.27,
      z: 0.14,
      targetHeight: 0.62,
      targetDistance: 12.5,
      range: 22
    }),
    shadowRadius: 0.48
  }),
  enemy: Object.freeze({
    regularScale: 0.68,
    bruteScale: 0.76,
    regularRadius: 0.36,
    bruteRadius: 0.44,
    attackRange: 1.08,
    regularSpeed: 2.35,
    bruteSpeed: 2.9
  }),
  interaction: Object.freeze({
    worldLoot: 1.55,
    standard: 1.85,
    large: 2.2,
    highlight: 2.35
  }),
  house: Object.freeze({
    doorWidth: 0.96,
    doorHeight: 2.08,
    interiorDoorWidth: 0.98,
    bedLength: 2.06,
    bedWidth: 1.48,
    tableHeight: 0.76,
    sofaWidth: 2.2,
    sofaDepth: 0.94,
    sofaHeight: 0.88
  }),
  school: Object.freeze({
    id: 'abandoned-school',
    x: 42,
    z: -42,
    width: 46,
    depth: 32,
    wallHeight: 4.35,
    corridorWidth: 3.4
  }),
  barn: Object.freeze({
    id: 'old-barn',
    x: -22,
    z: 52,
    width: 28,
    depth: 20,
    wallHeight: 6.2
  }),
  vehicle: Object.freeze({
    pickupLength: 6.4,
    sedanLength: 5.4
  }),
  camera: Object.freeze({
    defaultZoom: 31.5,
    defaultHeightRatio: 1.12,
    framingOffset: 10.8,
    lateralFraming: 2.6
  })
});
