// @ts-check

import { distance2D } from '../core/math.js';
import { getItem } from '../data/items.js';

export class CombatSystem {
  /** @param {import('../state/GameState.js').GameState} state @param {import('../world/WorldBuilder.js').WorldBuilder} world @param {import('../entities/EnemySystem.js').EnemySystem} enemies @param {import('./BuildingSystem.js').BuildingSystem} building */
  constructor(state, world, enemies, building) {
    this.state = state;
    this.world = world;
    this.enemies = enemies;
    this.building = building;
    this.cooldown = 0;
    this.digCooldown = 0;
  }

  /** @param {number} dt */
  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.digCooldown = Math.max(0, this.digCooldown - dt);
  }

  /** @param {import('../entities/Player.js').Player} player @param {{ x: number, z: number } | null} aim */
  primary(player, aim) {
    const id = this.state.inventory.selectedId;
    const item = id ? getItem(id) : null;
    if (!item || this.state.inventory.count(id) <= 0) {
      this.state.bus.emit('toast', 'That hotbar slot is empty.');
      return false;
    }
    if (item.category === 'consumable' || item.category === 'medical') return this.state.consume(id);
    if (id === 'flashlight') {
      player.toggleFlashlight();
      return true;
    }
    if (item.category === 'buildable' && item.buildable) return this.building.start(item.buildable);
    if (this.cooldown > 0) return false;

    if (id === 'revolver') {
      if (!aim) return false;
      if (this.state.inventory.remove('ammo_9mm', 1) <= 0) {
        this.cooldown = 0.35;
        this.state.bus.emit('toast', 'The revolver is empty. Find 9mm ammunition.');
        this.state.bus.emit('audio:dryFire');
        return false;
      }
      this.cooldown = 0.48;
      this.state.shotsFired += 1;
      player.aimAt(aim.x, aim.z, 1 / 20);
      this.enemies.shoot(player.position, aim, item.damage ?? 60, item.range ?? 32);
      this.state.bus.emit('audio:gunshot');
      this.state.bus.emit('combat:shot', { x: player.position.x, z: player.position.z });
      this.state.bus.emit('inventory:changed');
      return true;
    }

    if (item.damage) {
      this.cooldown = id === 'hunting_knife' ? 0.42 : 0.68;
      const hit = this.enemies.melee(player, item.damage, item.range ?? 2.2);
      this.state.bus.emit(hit ? 'audio:meleeHit' : 'audio:meleeSwing');
      this.state.bus.emit('combat:melee', { hit, item: id });
      return true;
    }
    this.state.bus.emit('toast', `${item.name} has no immediate action.`);
    return false;
  }

  /** @param {import('../entities/Player.js').Player} player @param {{ x: number, z: number } | null} aim */
  secondary(player, aim) {
    const id = this.state.inventory.selectedId;
    if (id !== 'shovel' || !aim || this.digCooldown > 0) return false;
    if (distance2D(player.position.x, player.position.z, aim.x, aim.z) > 6.2) {
      this.state.bus.emit('toast', 'Move closer to excavate that ground.');
      return false;
    }
    if (this.world.collider.isBlocked(aim.x, aim.z, 0.5)) {
      this.state.bus.emit('toast', 'The ground is obstructed here.');
      return false;
    }
    const edit = { x: Math.round(aim.x * 2) / 2, z: Math.round(aim.z * 2) / 2, radius: 2.65, depth: 0.72 };
    const changed = this.world.terrain.dig(edit.x, edit.z, edit.radius, edit.depth);
    if (!changed) {
      this.state.bus.emit('toast', 'This trench has reached stable bedrock.');
      return false;
    }
    this.digCooldown = 0.85;
    this.state.terrainEdits.push(edit);
    if (this.state.terrainEdits.length > 180) this.state.terrainEdits.shift();
    this.state.bus.emit('terrain:dug', edit);
    this.state.bus.emit('audio:dig');
    this.state.bus.emit('toast', 'Soil excavated — the trench now slows movement.');
    return true;
  }
}
