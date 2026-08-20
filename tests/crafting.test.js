import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/EventBus.js';
import { GameState } from '../src/state/GameState.js';
import { CraftingSystem } from '../src/game/CraftingSystem.js';

test('crafting consumes materials and creates output', () => {
  const bus = new EventBus();
  const state = new GameState(bus);
  const crafting = new CraftingSystem(state);
  const woodBefore = state.inventory.count('wood');
  const stoneBefore = state.inventory.count('stone');
  let completed = 0;
  bus.on('craft:complete', () => completed += 1);
  assert.equal(crafting.craft('campfire_kit'), true);
  assert.equal(state.inventory.count('wood'), woodBefore - 4);
  assert.equal(state.inventory.count('stone'), stoneBefore - 4);
  assert.equal(state.inventory.count('campfire_kit'), 1);
  assert.equal(completed, 1);
});

test('crafting fails without materials and leaves inventory unchanged', () => {
  const state = new GameState(new EventBus());
  const crafting = new CraftingSystem(state);
  state.inventory.remove('rope', state.inventory.count('rope'));
  state.inventory.remove('scrap_metal', state.inventory.count('scrap_metal'));
  const snapshot = state.inventory.serialize();
  assert.equal(crafting.craft('snare_kit'), false);
  assert.deepEqual(state.inventory.serialize(), snapshot);
});
