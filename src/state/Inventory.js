// @ts-check

import { HOTBAR_DEFAULT, getItem } from '../data/items.js';
import { roundTo } from '../core/math.js';

export class Inventory {
  /** @param {number} capacity */
  constructor(capacity = 60) {
    this.capacity = capacity;
    /** @type {Map<string, { id: string, qty: number, durability?: number }>} */
    this.entries = new Map();
    this.hotbar = [...HOTBAR_DEFAULT];
    this.selected = 0;
  }

  /** @param {string} id */
  count(id) {
    return this.entries.get(id)?.qty ?? 0;
  }

  get weight() {
    let total = 0;
    for (const entry of this.entries.values()) {
      const definition = getItem(entry.id);
      if (definition) total += definition.weight * entry.qty;
    }
    return roundTo(total, 2);
  }

  /** @param {string} id @param {number} quantity */
  canAdd(id, quantity = 1) {
    const definition = getItem(id);
    if (!definition) return false;
    return this.weight + definition.weight * quantity <= this.capacity + 0.0001;
  }

  /** @param {string} id @param {number} quantity @returns {number} */
  add(id, quantity = 1) {
    const definition = getItem(id);
    if (!definition || quantity <= 0) return 0;
    const maxByWeight = definition.weight <= 0
      ? quantity
      : Math.max(0, Math.floor((this.capacity - this.weight + 0.0001) / definition.weight));
    const accepted = Math.min(quantity, maxByWeight);
    if (accepted <= 0) return 0;
    const existing = this.entries.get(id) ?? { id, qty: 0, durability: 100 };
    existing.qty += accepted;
    this.entries.set(id, existing);
    return accepted;
  }

  /** @param {string} id @param {number} quantity @returns {number} */
  remove(id, quantity = 1) {
    const existing = this.entries.get(id);
    if (!existing || quantity <= 0) return 0;
    const removed = Math.min(quantity, existing.qty);
    existing.qty -= removed;
    if (existing.qty <= 0) this.entries.delete(id);
    return removed;
  }

  /** @param {Record<string, number | undefined>} cost */
  hasCost(cost) {
    return Object.entries(cost).every(([id, qty]) => this.count(id) >= (Number(qty) || 0));
  }

  /** @param {Record<string, number | undefined>} cost */
  spend(cost) {
    if (!this.hasCost(cost)) return false;
    for (const [id, qty] of Object.entries(cost)) this.remove(id, Number(qty) || 0);
    return true;
  }

  /** @param {number} index */
  select(index) {
    this.selected = Math.max(0, Math.min(this.hotbar.length - 1, index));
  }

  get selectedId() {
    return this.hotbar[this.selected] ?? null;
  }

  /** @param {string} id */
  assignFirstOpenHotbar(id) {
    if (this.hotbar.includes(id)) return;
    const open = this.hotbar.findIndex((slot) => !slot || this.count(slot) <= 0);
    if (open >= 0) this.hotbar[open] = id;
  }

  list() {
    return [...this.entries.values()]
      .map((entry) => ({ ...entry, definition: getItem(entry.id) }))
      .filter((entry) => entry.definition)
      .sort((a, b) => {
        const category = a.definition.category.localeCompare(b.definition.category);
        return category || a.definition.name.localeCompare(b.definition.name);
      });
  }

  serialize() {
    return {
      capacity: this.capacity,
      entries: [...this.entries.values()].map((entry) => ({ ...entry })),
      hotbar: [...this.hotbar],
      selected: this.selected
    };
  }

  /** @param {any} data */
  static from(data) {
    const inventory = new Inventory(Number(data?.capacity) || 60);
    for (const entry of Array.isArray(data?.entries) ? data.entries : []) {
      if (!getItem(entry.id) || !Number.isFinite(entry.qty) || entry.qty <= 0) continue;
      inventory.entries.set(entry.id, {
        id: entry.id,
        qty: Math.max(1, Math.floor(entry.qty)),
        durability: Number.isFinite(entry.durability) ? entry.durability : 100
      });
    }
    if (Array.isArray(data?.hotbar)) {
      inventory.hotbar = Array.from({ length: 8 }, (_, index) => data.hotbar[index] || HOTBAR_DEFAULT[index] || null);
    }
    inventory.select(Number(data?.selected) || 0);
    return inventory;
  }
}
