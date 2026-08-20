import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/EventBus.js';
import { GameState, SAVE_VERSION } from '../src/state/GameState.js';

test('consumables update survival and inventory', () => {
  const state = new GameState(new EventBus());
  state.survival.hydration = 20;
  const before = state.inventory.count('water_bottle');
  assert.equal(state.consume('water_bottle'), true);
  assert.equal(state.inventory.count('water_bottle'), before - 1);
  assert.equal(state.survival.hydration, 52);
  assert.equal(state.consume('wood'), false);
});

test('damage can cause bleeding and emits death once health reaches zero', () => {
  const bus = new EventBus();
  const state = new GameState(bus);
  let deaths = 0;
  bus.on('player:died', () => deaths += 1);
  state.damage(12, 'test');
  assert.equal(state.survival.health, 66);
  assert.ok(state.survival.bleeding > 0);
  state.damage(100, 'test');
  assert.equal(state.survival.health, 0);
  assert.equal(deaths, 1);
});

test('game state round-trips persistent world data', () => {
  const bus = new EventBus();
  const state = new GameState(bus);
  state.player.x = 12.5;
  state.openedContainers.add('fuel-mart-counter');
  state.terrainEdits.push({ x: 1, z: 2, radius: 2.4, depth: 0.3 });
  state.structures.fire = { id: 'fire', x: 4, z: 5, rotation: 0, kind: 'campfire' };
  state.missions.search_pine_ridge.progress = 2;
  const serialized = state.serialize();
  const restored = GameState.from(serialized, new EventBus());
  assert.equal(serialized.version, SAVE_VERSION);
  assert.equal(restored.player.x, 12.5);
  assert.equal(restored.openedContainers.has('fuel-mart-counter'), true);
  assert.deepEqual(restored.terrainEdits[0], { x: 1, z: 2, radius: 2.4, depth: 0.3 });
  assert.equal(restored.structures.fire.kind, 'campfire');
  assert.equal(restored.missions.search_pine_ridge.progress, 2);
});
