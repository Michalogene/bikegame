import test from 'node:test';
import assert from 'node:assert/strict';
import { Inventory } from '../src/state/Inventory.js';

test('inventory enforces weight capacity and tracks stacks', () => {
  const inventory = new Inventory(2);
  assert.equal(inventory.add('wood', 4), 2);
  assert.equal(inventory.count('wood'), 2);
  assert.equal(inventory.weight, 1.6);
  assert.equal(inventory.add('water_bottle', 1), 0);
  assert.equal(inventory.remove('wood', 1), 1);
  assert.equal(inventory.add('water_bottle', 1), 1);
  assert.equal(inventory.weight, 1.55);
});

test('inventory spends recipe costs atomically', () => {
  const inventory = new Inventory(60);
  inventory.add('cloth', 3);
  inventory.add('alcohol', 1);
  assert.equal(inventory.hasCost({ cloth: 2, alcohol: 1 }), true);
  assert.equal(inventory.spend({ cloth: 2, alcohol: 1 }), true);
  assert.equal(inventory.count('cloth'), 1);
  assert.equal(inventory.count('alcohol'), 0);
  assert.equal(inventory.spend({ cloth: 2 }), false);
  assert.equal(inventory.count('cloth'), 1);
});

test('inventory survives serialization without sharing mutable state', () => {
  const source = new Inventory(42);
  source.add('canned_beans', 3);
  source.hotbar[0] = 'canned_beans';
  source.select(0);
  const restored = Inventory.from(source.serialize());
  assert.equal(restored.capacity, 42);
  assert.equal(restored.count('canned_beans'), 3);
  assert.equal(restored.selectedId, 'canned_beans');
  restored.remove('canned_beans', 1);
  assert.equal(source.count('canned_beans'), 3);
});
