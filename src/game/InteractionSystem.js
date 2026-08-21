// @ts-check

import { selectWorldLootTarget } from './WorldLootSystem.js';

export class InteractionSystem {
  /** @param {import('../state/GameState.js').GameState} state @param {import('../world/WorldBuilder.js').WorldBuilder} world */
  constructor(state, world) {
    this.state = state;
    this.world = world;
    this.nearby = null;
    this.activeContainer = null;
  }

  /** @param {number} x @param {number} z @param {number} [rotation] */
  update(x, z, rotation = this.state.player.rotation) {
    const local = this.world.interactables.filter((entry) => {
      if (entry.type === 'container' && entry.items.length === 0) return false;
      if (entry.used || entry.collected) return false;
      return Math.hypot(entry.x - x, entry.z - z) <= Math.max(4.2, entry.radius ?? 3.4);
    });
    const worldLoot = selectWorldLootTarget({ x, z, rotation }, local, 3.2);
    this.nearby = worldLoot ?? this.world.getNearestInteractable(x, z, 3.6, { excludeTypes: ['world-loot'] });
    return this.nearby;
  }

  interact() {
    const target = this.nearby;
    if (!target) return false;
    if (target.type === 'world-loot') return target.pickup() > 0;
    if (target.type === 'container') {
      this.activeContainer = target;
      target.opened = true;
      this.state.openedContainers.add(target.id);
      this.state.bus.emit('container:open', target);
      this.state.bus.emit('audio:container');
      return true;
    }
    if (target.type === 'salvage' && !target.used) {
      target.used = true;
      const rewards = [['scrap_metal', 4], ['gear_parts', 2], ['fuel_can', 1]];
      for (const [id, qty] of rewards) this.state.inventory.add(id, qty);
      this.state.bus.emit('inventory:changed');
      this.state.bus.emit('loot:container', target);
      this.state.bus.emit('toast', 'Recovered metal, mechanical parts and fuel.');
      return true;
    }
    return false;
  }

  closeContainer() {
    if (!this.activeContainer) return false;
    const previous = this.activeContainer;
    this.activeContainer = null;
    this.state.bus.emit('container:close', previous);
    return true;
  }

  /** @param {string} itemId @param {number} [quantity] */
  take(itemId, quantity = 1) {
    const container = this.activeContainer;
    if (!container) return 0;
    const entry = container.items.find((item) => item.id === itemId);
    if (!entry) return 0;
    const requested = Math.min(quantity, entry.qty);
    const accepted = this.state.inventory.add(itemId, requested);
    if (accepted <= 0) {
      this.state.bus.emit('toast', 'Your pack is too heavy.');
      return 0;
    }
    entry.qty -= accepted;
    if (entry.qty <= 0) container.items.splice(container.items.indexOf(entry), 1);
    this.state.inventory.assignFirstOpenHotbar(itemId);
    this.state.bus.emit('inventory:changed');
    this.state.bus.emit('loot:item', { itemId, quantity: accepted, container });
    this.state.bus.emit('audio:loot');
    if (container.items.length === 0) {
      this.state.bus.emit('loot:container', container);
      this.closeContainer();
    } else {
      this.state.bus.emit('container:changed', container);
    }
    return accepted;
  }

  takeAll() {
    const container = this.activeContainer;
    if (!container) return 0;
    let total = 0;
    for (const entry of [...container.items]) total += this.take(entry.id, entry.qty);
    return total;
  }
}
