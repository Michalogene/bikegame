import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { EventBus } from '../src/core/EventBus.js';
import { GameState } from '../src/state/GameState.js';
import { WorldLootSystem, selectWorldLootTarget } from '../src/game/WorldLootSystem.js';

function createWorld() {
  return {
    root: new THREE.Group(),
    terrain: { getHeight() { return 0; } },
    interactables: []
  };
}

test('physical loot target selection combines proximity and facing', () => {
  const front = { id: 'front', type: 'world-loot', x: 0, z: 2, collected: false };
  const behind = { id: 'behind', type: 'world-loot', x: 0, z: -1.6, collected: false };
  const target = selectWorldLootTarget({ x: 0, z: 0, rotation: 0 }, [behind, front], 3.2);
  assert.equal(target.id, 'front');
});

test('pickup is transactional and persists through serialized state', () => {
  const state = new GameState(new EventBus());
  const world = createWorld();
  const system = new WorldLootSystem(state, world);
  const before = state.inventory.count('water_bottle');
  assert.equal(system.has('food-water-front'), true);
  assert.equal(system.pickup('food-water-front'), 1);
  assert.equal(state.inventory.count('water_bottle'), before + 1);
  assert.equal(state.collectedWorldLoot.has('food-water-front'), true);
  assert.equal(system.has('food-water-front'), false);

  const restored = GameState.from(state.serialize(), new EventBus());
  const secondWorld = createWorld();
  const restoredSystem = new WorldLootSystem(restored, secondWorld);
  assert.equal(restoredSystem.has('food-water-front'), false);
  restoredSystem.dispose();
  system.dispose();
});

test('overweight pickup leaves the physical entity in the world', () => {
  const state = new GameState(new EventBus());
  state.inventory.capacity = state.inventory.weight;
  const world = createWorld();
  const system = new WorldLootSystem(state, world);
  assert.equal(system.pickup('food-water-front'), 0);
  assert.equal(system.has('food-water-front'), true);
  assert.equal(state.collectedWorldLoot.has('food-water-front'), false);
  system.dispose();
});
