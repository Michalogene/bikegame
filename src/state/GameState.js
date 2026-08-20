// @ts-check

import { clamp, roundTo } from '../core/math.js';
import { getItem } from '../data/items.js';
import { MISSION_DEFINITIONS } from '../data/missions.js';
import { Inventory } from './Inventory.js';

export const SAVE_VERSION = 2;

export class GameState {
  /** @param {import('../core/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;
    this.inventory = new Inventory(60);
    this.player = { x: -7, z: 8, rotation: Math.PI * 0.25 };
    this.survival = {
      health: 78,
      stamina: 64,
      hydration: 68,
      hunger: 55,
      temperature: 8,
      bleeding: 0
    };
    this.clock = {
      day: 3,
      minute: 22 * 60 + 47,
      speed: 0.75,
      nightfallActive: false,
      nightfallEndsAt: 0,
      lastNightfallDay: 2
    };
    this.flashlightOn = true;
    this.openedContainers = new Set();
    /** @type {Record<string, { id: string, x: number, z: number, rotation: number, kind: string }>} */
    this.structures = {};
    /** @type {{ x: number, z: number, radius: number, depth: number }[]} */
    this.terrainEdits = [];
    this.discoveredPoi = new Set(['pine-ridge']);
    this.enemyKills = 0;
    this.shotsFired = 0;
    this.playSeconds = 0;
    this.level = 7;
    this.experience = 430;
    /** @type {Record<string, { progress: number, complete: boolean }>} */
    this.missions = {};
    for (const mission of MISSION_DEFINITIONS) {
      this.missions[mission.id] = { progress: 0, complete: false };
    }
    this.seedStartingInventory();
  }

  seedStartingInventory() {
    const starting = {
      flashlight: 1,
      hunting_knife: 1,
      water_bottle: 2,
      canned_beans: 3,
      bandage: 2,
      ammo_9mm: 12,
      rope: 2,
      shovel: 1,
      revolver: 1,
      wood: 8,
      scrap_metal: 4,
      stone: 6,
      cloth: 3,
      alcohol: 1,
      nails: 4
    };
    for (const [id, qty] of Object.entries(starting)) this.inventory.add(id, qty);
  }

  get selectedItem() {
    const id = this.inventory.selectedId;
    return id ? getItem(id) : null;
  }

  /** @param {number} dt @param {{ moving: boolean, sprinting: boolean, nearFire: boolean }} context */
  updateSurvival(dt, context) {
    this.playSeconds += dt;
    const s = this.survival;
    s.hydration = clamp(s.hydration - dt * (context.sprinting ? 0.032 : 0.012), 0, 100);
    s.hunger = clamp(s.hunger - dt * (context.sprinting ? 0.016 : 0.008), 0, 100);
    if (context.sprinting && context.moving) {
      s.stamina = clamp(s.stamina - dt * 15, 0, 100);
    } else {
      const recovery = s.hydration > 8 && s.hunger > 8 ? 9.5 : 3.5;
      s.stamina = clamp(s.stamina + dt * recovery, 0, 100);
    }
    const ambient = this.isNight ? 5.5 : 15;
    const targetTemperature = context.nearFire ? 18 : ambient;
    s.temperature += (targetTemperature - s.temperature) * Math.min(1, dt * 0.18);
    if (s.bleeding > 0) {
      s.bleeding = clamp(s.bleeding - dt * 0.45, 0, 100);
      s.health = clamp(s.health - dt * (0.06 + s.bleeding * 0.003), 0, 100);
    }
    if (s.hydration <= 0 || s.hunger <= 0 || s.temperature < 0) {
      s.health = clamp(s.health - dt * 0.7, 0, 100);
    }
    if (s.health <= 0) this.bus.emit('player:died');
  }

  /** @param {string} itemId */
  consume(itemId) {
    const item = getItem(itemId);
    if (!item || !['consumable', 'medical'].includes(item.category) || this.inventory.count(itemId) <= 0) return false;
    this.inventory.remove(itemId, 1);
    const s = this.survival;
    if (item.hydration) s.hydration = clamp(s.hydration + item.hydration, 0, 100);
    if (item.hunger) s.hunger = clamp(s.hunger + item.hunger, 0, 100);
    if (item.stamina) s.stamina = clamp(s.stamina + item.stamina, 0, 100);
    if (item.healing) s.health = clamp(s.health + item.healing, 0, 100);
    if (item.bleeding) s.bleeding = clamp(s.bleeding + item.bleeding, 0, 100);
    this.bus.emit('inventory:changed');
    this.bus.emit('survival:changed');
    this.bus.emit('toast', `${item.name} used`);
    return true;
  }

  /** @param {number} amount @param {string} [source] */
  damage(amount, source = 'Unknown') {
    if (amount <= 0 || this.survival.health <= 0) return;
    this.survival.health = clamp(this.survival.health - amount, 0, 100);
    if (amount >= 9) this.survival.bleeding = clamp(this.survival.bleeding + amount * 0.45, 0, 100);
    this.bus.emit('player:damaged', { amount, source });
    if (this.survival.health <= 0) this.bus.emit('player:died', { source });
  }

  /** @param {number} amount */
  heal(amount) {
    this.survival.health = clamp(this.survival.health + amount, 0, 100);
  }

  get isNight() {
    const hour = this.clock.minute / 60;
    return hour >= 19.5 || hour < 6.5;
  }

  get carryWeightText() {
    return `${roundTo(this.inventory.weight, 1)} / ${this.inventory.capacity} KG`;
  }

  get resourceSummary() {
    return {
      hydration: Math.round(this.survival.hydration),
      hunger: Math.round(this.survival.hunger),
      wood: this.inventory.count('wood'),
      parts: this.inventory.count('scrap_metal') + this.inventory.count('gear_parts')
    };
  }

  serialize() {
    return {
      version: SAVE_VERSION,
      inventory: this.inventory.serialize(),
      player: { ...this.player },
      survival: { ...this.survival },
      clock: { ...this.clock },
      flashlightOn: this.flashlightOn,
      openedContainers: [...this.openedContainers],
      structures: Object.values(this.structures).map((structure) => ({ ...structure })),
      terrainEdits: this.terrainEdits.map((edit) => ({ ...edit })),
      discoveredPoi: [...this.discoveredPoi],
      enemyKills: this.enemyKills,
      shotsFired: this.shotsFired,
      playSeconds: this.playSeconds,
      level: this.level,
      experience: this.experience,
      missions: structuredClone(this.missions)
    };
  }

  /** @param {any} data @param {import('../core/EventBus.js').EventBus} bus */
  static from(data, bus) {
    const state = new GameState(bus);
    if (!data || typeof data !== 'object') return state;
    state.inventory = Inventory.from(data.inventory);
    if (data.player) Object.assign(state.player, data.player);
    if (data.survival) Object.assign(state.survival, data.survival);
    if (data.clock) Object.assign(state.clock, data.clock);
    state.flashlightOn = data.flashlightOn !== false;
    state.openedContainers = new Set(Array.isArray(data.openedContainers) ? data.openedContainers : []);
    state.structures = {};
    for (const structure of Array.isArray(data.structures) ? data.structures : []) {
      if (structure?.id) state.structures[structure.id] = { ...structure };
    }
    state.terrainEdits = Array.isArray(data.terrainEdits) ? data.terrainEdits.map((edit) => ({ ...edit })) : [];
    state.discoveredPoi = new Set(Array.isArray(data.discoveredPoi) ? data.discoveredPoi : ['pine-ridge']);
    state.enemyKills = Number(data.enemyKills) || 0;
    state.shotsFired = Number(data.shotsFired) || 0;
    state.playSeconds = Number(data.playSeconds) || 0;
    state.level = Number(data.level) || 7;
    state.experience = Number(data.experience) || 430;
    if (data.missions && typeof data.missions === 'object') {
      for (const mission of MISSION_DEFINITIONS) {
        const saved = data.missions[mission.id];
        if (saved) state.missions[mission.id] = {
          progress: Math.max(0, Number(saved.progress) || 0),
          complete: Boolean(saved.complete)
        };
      }
    }
    return state;
  }
}
