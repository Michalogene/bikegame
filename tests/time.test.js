import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/EventBus.js';
import { GameState } from '../src/state/GameState.js';
import { TimeSystem } from '../src/game/TimeSystem.js';

test('clock rolls into the next day', () => {
  const state = new GameState(new EventBus());
  state.clock.day = 3;
  state.clock.minute = 1439.5;
  state.clock.speed = 1;
  const time = new TimeSystem(state);
  time.update(1);
  assert.equal(state.clock.day, 4);
  assert.equal(state.clock.minute, 0.5);
});

test('Nightfall starts once per day and ends after its duration', () => {
  const bus = new EventBus();
  const state = new GameState(bus);
  state.clock.day = 3;
  state.clock.minute = 22 * 60 + 59.5;
  state.clock.speed = 1;
  state.clock.lastNightfallDay = 2;
  let started = 0;
  let ended = 0;
  bus.on('nightfall:start', () => started += 1);
  bus.on('nightfall:end', () => ended += 1);
  const time = new TimeSystem(state);
  time.update(1);
  assert.equal(state.clock.nightfallActive, true);
  assert.equal(started, 1);
  time.update(92);
  assert.equal(state.clock.nightfallActive, false);
  assert.equal(ended, 1);
});

test('formatted clock and countdown stay readable', () => {
  const state = new GameState(new EventBus());
  state.clock.minute = 22 * 60 + 47;
  const time = new TimeSystem(state);
  assert.equal(time.formattedTime, '10:47 PM');
  assert.equal(time.nightfallLabel, '0h 13m');
});
