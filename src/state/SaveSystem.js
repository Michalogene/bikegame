// @ts-check

import { GameState } from './GameState.js';

const STORAGE_KEY = 'afterdark-county-save-v3';
const LEGACY_KEYS = ['afterdark-county-save-v2'];

export class SaveSystem {
  /** @param {import('../core/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;
    this.lastSaveAt = 0;
    this.autosaveInterval = 20;
    this.elapsed = 0;
    this.suspendWrites = false;
  }

  load() {
    try {
      let raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (!raw) {
        for (const key of LEGACY_KEYS) {
          raw = globalThis.localStorage?.getItem(key);
          if (raw) break;
        }
      }
      if (!raw) return new GameState(this.bus);
      const state = GameState.from(JSON.parse(raw), this.bus);
      this.save(state);
      return state;
    } catch {
      this.bus.emit('toast', 'Save data was invalid; a new survivor was created.');
      return new GameState(this.bus);
    }
  }

  /** @param {GameState} state */
  save(state) {
    if (this.suspendWrites) return false;
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
      for (const key of LEGACY_KEYS) globalThis.localStorage?.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  clearForReload() {
    this.suspendWrites = true;
    return this.clear();
  }
}
