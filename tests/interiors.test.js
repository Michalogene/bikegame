import test from 'node:test';
import assert from 'node:assert/strict';
import { pointInsideBuilding, toBuildingLocal } from '../src/world/InteriorSystem.js';

const building = { x: 10, z: -4, angle: Math.PI * 0.5, width: 12, depth: 8 };

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
