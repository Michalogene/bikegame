// @ts-check

import { GameState } from './GameState.js';

const STORAGE_KEY = 'afterdark-county-save-v2';

export class SaveSystem {
  /** @param {import('../core/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;
    this.lastSaveAt = 0;
    this.autosaveInterval = 20;
    this.elapsed = 0;
  }

  load() {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (!raw) return new GameState(this.bus);
      return GameState.from(JSON.parse(raw), this.bus);
    } catch {
      this.bus.emit('toast', 'Save data was invalid; a new survivor was created.');
      return new GameState(this.bus);
    }
  }

  /** @param {GameState} state */
  save(state) {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state.serialize()));
      this.lastSaveAt = Date.now();
      this.bus.emit('save:complete');
      return true;
    } catch {
      this.bus.emit('toast', 'Unable to save in this browser.');
      return false;
    }
  }

  /** @param {number} dt @param {GameState} state */
  update(dt, state) {
    this.elapsed += dt;
    if (this.elapsed >= this.autosaveInterval) {
      this.elapsed = 0;
      this.save(state);
    }
  }

  clear() {
    try {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }
}
