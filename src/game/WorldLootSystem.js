// @ts-check

import * as THREE from '../core/three.js';
import { getItem } from '../data/items.js';

export const WORLD_LOOT_ANCHORS = Object.freeze([
  { id: 'food-water-front', zone: 'food-mart', itemId: 'water_bottle', quantity: 1, x: 13.6, z: -10.7, y: 1.1, yaw: 0.18 },
  { id: 'food-beans-aisle', zone: 'food-mart', itemId: 'canned_beans', quantity: 1, x: 16.2, z: -6.4, y: 0.95, yaw: -0.12 },
  { id: 'food-soup-aisle', zone: 'food-mart', itemId: 'canned_soup', quantity: 1, x: 19.5, z: -3.0, y: 0.95, yaw: 0.1 },
  { id: 'food-energy-counter', zone: 'food-mart', itemId: 'energy_bar', quantity: 1, x: 24.1, z: -3.8, y: 1.22, yaw: 0.2 },
  { id: 'food-bandage-counter', zone: 'food-mart', itemId: 'bandage', quantity: 1, x: 26.1, z: -5.7, y: 1.2, yaw: -0.18 },
  { id: 'food-battery-back', zone: 'food-mart', itemId: 'battery', quantity: 1, x: 25.5, z: -10.5, y: 1.0, yaw: 0.08 },
  { id: 'food-fuel-backroom', zone: 'food-mart', itemId: 'fuel_can', quantity: 1, x: 28.3, z: -8.8, y: 0.35, yaw: 0.14 },
  { id: 'food-ammo-register', zone: 'food-mart', itemId: 'ammo_9mm', quantity: 1, x: 22.8, z: -5.2, y: 1.2, yaw: -0.1 },
  { id: 'food-siphon-notes', zone: 'food-mart', itemId: 'siphon_notes', quantity: 1, x: 27.15, z: -10.25, y: 1.06, yaw: -0.08 },

  { id: 'school-bandage-infirmary', zone: 'school', itemId: 'bandage', quantity: 1, x: 52.4, z: -34.2, y: 1.05, yaw: 0.1 },
  { id: 'school-medkit-cabinet', zone: 'school', itemId: 'medkit', quantity: 1, x: 54.3, z: -33.4, y: 1.15, yaw: -0.12 },
  { id: 'school-water-classroom', zone: 'school', itemId: 'water_bottle', quantity: 1, x: 32.4, z: -49.0, y: 0.92, yaw: 0.16 },
  { id: 'school-energy-desk', zone: 'school', itemId: 'energy_bar', quantity: 1, x: 38.0, z: -46.7, y: 0.95, yaw: -0.08 },
  { id: 'school-battery-lockers', zone: 'school', itemId: 'battery', quantity: 1, x: 43.8, z: -41.0, y: 0.72, yaw: 0.2 },
  { id: 'school-crowbar-gym', zone: 'school', itemId: 'crowbar', quantity: 1, x: 33.8, z: -33.6, y: 0.45, yaw: Math.PI * 0.5 },
  { id: 'school-gym-key', zone: 'school', itemId: 'gym_key', quantity: 1, x: 46.6, z: -41.1, y: 0.82, yaw: -0.16 },

  { id: 'home-water-kitchen', zone: 'west-home', itemId: 'water_bottle', quantity: 1, x: -29.4, z: -12.2, y: 0.95, yaw: 0.1 },
  { id: 'home-beans-table', zone: 'west-home', itemId: 'canned_beans', quantity: 1, x: -25.7, z: -9.0, y: 0.9, yaw: -0.14 },
  { id: 'home-bandage-bedroom', zone: 'west-home', itemId: 'bandage', quantity: 1, x: -24.0, z: -12.0, y: 0.82, yaw: 0.2 }
]);

/**
 * Choose the most sensible nearby loose item by combining proximity and facing.
 * @param {{ x: number, z: number, rotation?: number }} actor
 * @param {any[]} candidates
 * @param {number} [maxDistance]
 */
export function selectWorldLootTarget(actor, candidates, maxDistance = 3.2) {
  const forwardX = Math.sin(actor.rotation ?? 0);
  const forwardZ = Math.cos(actor.rotation ?? 0);
  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (!candidate || candidate.collected || candidate.type !== 'world-loot') continue;
    const dx = candidate.x - actor.x;
    const dz = candidate.z - actor.z;
    const distance = Math.hypot(dx, dz);
    if (distance > maxDistance) continue;
    const dot = distance > 0.001 ? (dx / distance) * forwardX + (dz / distance) * forwardZ : 1;
    const facingPenalty = (1 - dot) * 0.72;
    const score = distance + facingPenalty;
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

/** @param {string} itemId @param {any} material */
function createItemGeometry(itemId, material) {
  const group = new THREE.Group();

  if (itemId === 'water_bottle' || itemId === 'antiseptic' || itemId === 'alcohol') {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 10), material);
    bottle.position.y = 0.35;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 10), material.clone());
    cap.material.color.offsetHSL(0, 0, 0.18);
    cap.position.y = 0.76;
    group.add(bottle, cap);
  } else if (itemId === 'canned_beans' || itemId === 'canned_soup' || itemId === 'battery') {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.46, 12), material);
    can.position.y = 0.23;
    group.add(can);
  } else if (itemId === 'flashlight') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.74, 10), material);
    body.rotation.z = Math.PI * 0.5;
    body.position.y = 0.16;
    group.add(body);
  } else if (itemId === 'crowbar') {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.35, 8), material);
    bar.rotation.z = Math.PI * 0.5;
    bar.position.y = 0.12;
    group.add(bar);
  } else if (itemId === 'fuel_can') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.9, 0.34), material);
    body.position.y = 0.45;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 6, 12, Math.PI), material);
    handle.rotation.z = Math.PI;
    handle.position.set(0, 0.95, 0);
    group.add(body, handle);
  } else if (itemId === 'bandage' || itemId === 'medkit') {
    const size = itemId === 'medkit' ? [0.72, 0.36, 0.56] : [0.48, 0.18, 0.36];
    const pack = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    pack.position.y = size[1] * 0.5;
    group.add(pack);
  } else if (itemId === 'rope') {
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 8, 18), material);
    rope.rotation.x = Math.PI * 0.5;
    rope.position.y = 0.09;
    group.add(rope);
  } else if (itemId === 'gym_key') {
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.07, 0.12), material);
    shaft.position.set(0.16, 0.08, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.045, 8, 18), material);
    ring.rotation.x = Math.PI * 0.5;
    ring.position.set(-0.18, 0.08, 0);
    group.add(shaft, ring);
  } else if (itemId === 'siphon_notes') {
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.035, 0.44), material);
    paper.position.y = 0.03;
    group.add(paper);
  } else {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.24, 0.38), material);
    pack.position.y = 0.12;
    group.add(pack);
  }

  group.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return group;
}

export class WorldLootSystem {
  /**
   * @param {import('../state/GameState.js').GameState} state
   * @param {import('../world/WorldBuilder.js').WorldBuilder} world
   */
  constructor(state, world) {
    this.state = state;
    this.world = world;
    this.root = new THREE.Group();
    this.root.name = 'Physical world loot';
    this.world.root.add(this.root);
    /** @type {Map<string, any>} */
    this.entities = new Map();
    this.elapsed = 0;
    this.spawnAnchors(WORLD_LOOT_ANCHORS);
  }

  /** @param {readonly any[]} anchors */
  spawnAnchors(anchors) {
    for (const anchor of anchors) {
      if (this.state.collectedWorldLoot.has(anchor.id) || this.entities.has(anchor.id)) continue;
      const definition = getItem(anchor.itemId);
      if (!definition) continue;

      const color = new THREE.Color(definition.color ?? '#c7bda8');
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.72,
        metalness: ['ammo', 'component', 'weapon'].includes(definition.category) ? 0.24 : 0.04,
        emissive: color.clone().multiplyScalar(0.08),
        emissiveIntensity: 0.35
      });
      const model = createItemGeometry(anchor.itemId, material);
      model.rotation.y = anchor.yaw ?? 0;

      const haloMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.45, 24), haloMaterial);
      halo.rotation.x = -Math.PI * 0.5;
      halo.position.y = 0.025;

      const group = new THREE.Group();
      group.name = `World loot: ${anchor.id}`;
      group.add(model, halo);
      const ground = this.world.getWalkableHeight?.(anchor.x, anchor.z)
        ?? this.world.terrain.getHeight(anchor.x, anchor.z);
      group.position.set(anchor.x, ground + (anchor.y ?? 0.12), anchor.z);
      group.userData.worldLootId = anchor.id;
      this.root.add(group);

      const entity = {
        id: anchor.id,
        type: 'world-loot',
        label: `Pick up ${definition.name}`,
        itemId: anchor.itemId,
        quantity: anchor.quantity ?? 1,
        x: anchor.x,
        z: anchor.z,
        radius: 3.0,
        zone: anchor.zone,
        mesh: group,
        model,
        halo,
        haloMaterial,
        baseY: group.position.y,
        collected: false,
        pickup: () => this.pickup(anchor.id)
      };
      this.entities.set(anchor.id, entity);
      this.world.interactables.push(entity);
    }
  }

  /** @param {string} id */
  pickup(id) {
    const entity = this.entities.get(id);
    if (!entity || entity.collected) return 0;
    const accepted = this.state.inventory.add(entity.itemId, entity.quantity);
    if (accepted <= 0) {
      this.state.bus.emit('toast', 'Your pack is too heavy.');
      return 0;
    }

    this.state.inventory.assignFirstOpenHotbar(entity.itemId);
    entity.quantity -= accepted;
    const definition = getItem(entity.itemId);
    this.state.bus.emit('inventory:changed');
    this.state.bus.emit('loot:item', {
      itemId: entity.itemId,
      quantity: accepted,
      worldLootId: entity.id,
      physical: true
    });
    this.state.bus.emit('world-loot:picked', {
      id: entity.id,
      itemId: entity.itemId,
      quantity: accepted,
      zone: entity.zone
    });
    this.state.bus.emit('audio:loot');
    this.state.bus.emit('toast', `${definition?.name ?? entity.itemId} recovered`);

    if (entity.quantity <= 0) this.collect(entity);
    return accepted;
  }

  /** @param {any} entity */
  collect(entity) {
    entity.collected = true;
    this.state.collectedWorldLoot.add(entity.id);
    const index = this.world.interactables.indexOf(entity);
    if (index >= 0) this.world.interactables.splice(index, 1);
    entity.mesh.removeFromParent();
    this.entities.delete(entity.id);
  }

  /**
   * @param {number} dt
   * @param {any | null} selected
   */
  update(dt, selected) {
    this.elapsed += dt;
    for (const entity of this.entities.values()) {
      const distance = Math.hypot(
        entity.x - this.state.player.x,
        entity.z - this.state.player.z
      );
      const active = selected === entity;
      const near = distance < 4.2;
      const targetOpacity = active ? 0.52 : near ? 0.14 : 0;
      entity.haloMaterial.opacity += (targetOpacity - entity.haloMaterial.opacity) * Math.min(1, dt * 12);
      entity.halo.scale.setScalar(0.94 + Math.sin(this.elapsed * 3.4 + entity.x) * 0.06);
      entity.model.position.y = near ? Math.sin(this.elapsed * 1.8 + entity.z) * 0.025 : 0;
      entity.halo.visible = entity.haloMaterial.opacity > 0.005;
    }
  }

  /** @param {string} id */
  has(id) {
    return this.entities.has(id);
  }

  dispose() {
    const owned = new Set(this.entities.values());
    this.world.interactables = this.world.interactables.filter((entry) => !owned.has(entry));
    this.root.traverse((child) => {
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose?.());
      else child.material?.dispose?.();
    });
    this.root.removeFromParent();
    this.entities.clear();
  }
}
