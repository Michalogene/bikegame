import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERIOR_STATES,
  InteriorSystem,
  deriveInteriorState,
  pointInsideBuilding,
  resolveInteriorBuilding,
  toBuildingLocal
} from '../src/world/InteriorSystem.js';

const building = { id: 'test-building', x: 10, z: -4, angle: Math.PI * 0.5, width: 12, depth: 8 };

test('building local conversion respects rotation', () => {
  const local = toBuildingLocal(building, 10, 1);
  assert.ok(Math.abs(local.x - 5) < 1e-9);
  assert.ok(Math.abs(local.z) < 1e-9);
});

test('interior volume supports strict entry and padded exit hysteresis', () => {
  assert.equal(pointInsideBuilding(building, 10, -4), true);
  assert.equal(pointInsideBuilding(building, 10, 2.2, -0.2), false);
  assert.equal(pointInsideBuilding(building, 10, 2.2, 0.5), true);
  assert.equal(pointInsideBuilding(building, 20, -4), false);
});

test('world-position resolver prefers the building actually containing the player', () => {
  const other = { id: 'other', x: 40, z: 40, angle: 0, width: 8, depth: 8 };
  const map = new Map([[building.id, building], [other.id, other]]);
  assert.equal(resolveInteriorBuilding(map, 10, -4)?.id, building.id);
  assert.equal(resolveInteriorBuilding(map, 40, 40)?.id, other.id);
  assert.equal(resolveInteriorBuilding(map, 0, 0), null);
});

test('state transitions remain reversible', () => {
  assert.equal(deriveInteriorState(INTERIOR_STATES.OUTSIDE, true, 0.2), INTERIOR_STATES.ENTERING);
  assert.equal(deriveInteriorState(INTERIOR_STATES.ENTERING, true, 1), INTERIOR_STATES.INSIDE);
  assert.equal(deriveInteriorState(INTERIOR_STATES.INSIDE, false, 0.7), INTERIOR_STATES.EXITING);
  assert.equal(deriveInteriorState(INTERIOR_STATES.EXITING, true, 0.4), INTERIOR_STATES.ENTERING);
  assert.equal(deriveInteriorState(INTERIOR_STATES.EXITING, false, 0), INTERIOR_STATES.OUTSIDE);
});

test('ten repeated direct transitions restore the roof exactly every time', () => {
  const material = { opacity: 1, transparent: false, depthWrite: true, depthTest: true };
  const mesh = { visible: true, castShadow: true, receiveShadow: true };
  const testBuilding = {
    id: 'food-mart', label: 'Food Mart', x: 0, z: 0, angle: 0, width: 10, depth: 10,
    interiorZoom: 0.88,
    roofFadeTargets: [{ material, mesh, baseOpacity: 1, baseTransparent: false, baseDepthWrite: true, baseDepthTest: true, baseCastShadow: true, baseReceiveShadow: true, baseVisible: true }],
    wallFadeSides: []
  };
  const bus = { emit() {} };
  const world = { buildings: new Map([[testBuilding.id, testBuilding]]), state: { bus } };
  const player = { position: { x: 20, y: 0, z: 20 } };
  const camera = {
    camera: { position: { x: 20, z: 20 } },
    interiorBlend: 0,
    targetInteriorBlend: 0,
    compositionMode: 'outdoor',
    setInteriorMode(active) { this.compositionMode = active ? 'interior' : 'outdoor'; }
  };
  const interiors = new InteriorSystem(world, player, camera);

  for (let cycle = 1; cycle <= 10; cycle += 1) {
    player.position.x = 0;
    player.position.z = 0;
    interiors.syncFromPlayer({ immediate: true });
    assert.equal(interiors.activeBuildingId, 'food-mart', `entry ${cycle}`);
    assert.equal(interiors.state, INTERIOR_STATES.INSIDE, `inside state ${cycle}`);
    assert.equal(mesh.visible, false, `roof hidden ${cycle}`);
    assert.equal(material.opacity, 0, `roof opacity ${cycle}`);

    player.position.x = 20;
    player.position.z = 20;
    interiors.syncFromPlayer({ immediate: true });
    assert.equal(interiors.activeBuildingId, null, `exit ${cycle}`);
    assert.equal(interiors.state, INTERIOR_STATES.OUTSIDE, `outside state ${cycle}`);
    assert.equal(mesh.visible, true, `roof restored ${cycle}`);
    assert.equal(material.opacity, 1, `opacity restored ${cycle}`);
    assert.equal(material.transparent, false, `material restored ${cycle}`);
    assert.equal(material.depthWrite, true, `depth write restored ${cycle}`);
  }
});
