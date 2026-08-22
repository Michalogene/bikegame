import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/EventBus.js';
import { GameState } from '../src/state/GameState.js';
import { rankRespawnPoints, reviveSerializableState } from '../src/game/RespawnSystem.js';

test('respawn ranking excludes blocked points and avoids death and enemies', () => {
  const candidates = [
    { id: 'blocked', x: 50, z: 50 },
    { id: 'death', x: 1, z: 1 },
    { id: 'enemy', x: 20, z: 0 },
    { id: 'safe', x: -35, z: 28 }
  ];
  const enemies = [{ dead: false, position: { x: 19, z: 0 } }];
  const ranked = rankRespawnPoints({ x: 0, z: 0 }, candidates, enemies, (x, z) => x === 50 && z === 50);
  assert.equal(ranked.some((entry) => entry.id === 'blocked'), false);
  assert.equal(ranked[0].id, 'safe');
});

test('revive restores the serializable state that enables simulation', () => {
  const state = new GameState(new EventBus());
  state.dead = true;
  state.survival.health = 0;
  state.survival.stamina = 0;
  state.survival.bleeding = 40;
  state.respawn.pending = true;
  state.respawn.remaining = 2;
  reviveSerializableState(state, 1000);
  assert.equal(state.dead, false);
  assert.ok(state.survival.health >= 68);
  assert.ok(state.survival.stamina >= 72);
  assert.equal(state.survival.bleeding, 0);
  assert.equal(state.respawn.pending, false);
  assert.equal(state.respawn.remaining, 0);
  assert.equal(state.respawn.protectedUntil, 5000);
});

test('three consecutive death and revive cycles do not accumulate pending state', () => {
  const state = new GameState(new EventBus());
  for (let cycle = 0; cycle < 3; cycle += 1) {
    state.dead = true;
    state.survival.health = 0;
    state.respawn.pending = true;
    state.respawn.remaining = 3.2;
    reviveSerializableState(state, 10_000 + cycle * 5000);
    assert.equal(state.dead, false, `cycle ${cycle + 1}`);
    assert.equal(state.respawn.pending, false, `pending ${cycle + 1}`);
    assert.equal(state.respawn.remaining, 0, `timer ${cycle + 1}`);
  }
});
