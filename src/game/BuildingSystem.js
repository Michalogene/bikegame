// @ts-check

import * as THREE from '../core/three.js';
import { distance2D } from '../core/math.js';
import { BUILDABLES } from '../data/recipes.js';
import { box, createCrate, enableShadows } from '../world/WorldFactories.js';

export class BuildingSystem {
  /** @param {import('../state/GameState.js').GameState} state @param {import('../world/WorldBuilder.js').WorldBuilder} world */
  constructor(state, world) {
    this.state = state;
    this.world = world;
    this.activeKind = null;
    this.rotation = 0;
    this.ghost = null;
    this.ghostPosition = { x: 0, z: 0 };
    this.validPlacement = false;
    /** @type {Map<string, any>} */
    this.structures = new Map();
    this.elapsed = 0;
    for (const saved of Object.values(state.structures)) this.restore(saved);
  }

  listBuildables() {
    return Object.values(BUILDABLES).map((definition) => ({
      ...definition,
      available: this.state.inventory.count(definition.kit) > 0
    }));
  }

  /** @param {string} kind */
  start(kind) {
    const definition = BUILDABLES[kind];
    if (!definition) return false;
    if (this.state.inventory.count(definition.kit) <= 0) {
      this.state.bus.emit('toast', `Craft a ${definition.name} kit first.`);
      return false;
    }
    this.cancel();
    this.activeKind = kind;
    this.rotation = 0;
    this.ghost = this.createVisual(kind, true);
    this.world.structureRoot.add(this.ghost);
    this.state.bus.emit('build:mode', { kind });
    return true;
  }

  cancel() {
    if (this.ghost) this.ghost.removeFromParent();
    this.ghost = null;
    this.activeKind = null;
    this.validPlacement = false;
    this.state.bus.emit('build:cancel');
  }

  rotate(direction = 1) {
    if (!this.activeKind) return;
    this.rotation += direction * Math.PI * 0.25;
  }

  /** @param {{ x: number, z: number } | null} point */
  updatePlacement(point) {
    if (!this.ghost || !this.activeKind || !point) return;
    const definition = BUILDABLES[this.activeKind];
    const x = Math.round(point.x * 2) / 2;
    const z = Math.round(point.z * 2) / 2;
    const y = this.world.terrain.getHeight(x, z);
    this.ghostPosition = { x, z };
    this.ghost.position.set(x, y + 0.04, z);
    this.ghost.rotation.y = this.rotation;
    const [width, depth] = definition.footprint;
    const notRoadCenter = !(Math.abs(x) < 5.8 || Math.abs(z - 8) < 4.6);
    const notDeepTrench = this.world.terrain.getExcavationDepth(x, z) < 0.85;
    this.validPlacement = this.world.collider.isAreaClear(x, z, width, depth, this.rotation) && notRoadCenter && notDeepTrench;
    this.applyGhostColor(this.ghost, this.validPlacement ? 0x72b776 : 0xc64c3d);
  }

  place() {
    if (!this.activeKind || !this.validPlacement) {
      this.state.bus.emit('toast', 'Cannot place that structure here.');
      return false;
    }
    const definition = BUILDABLES[this.activeKind];
    if (this.state.inventory.remove(definition.kit, 1) <= 0) {
      this.state.bus.emit('toast', 'The required construction kit is missing.');
      this.cancel();
      return false;
    }
    const id = `${this.activeKind}-${Date.now().toString(36)}-${this.structures.size}`;
    const saved = {
      id,
      kind: this.activeKind,
      x: this.ghostPosition.x,
      z: this.ghostPosition.z,
      rotation: this.rotation
    };
    this.state.structures[id] = saved;
    this.restore(saved);
    this.state.bus.emit(`build:${this.activeKind}`, saved);
    this.state.bus.emit('build:placed', saved);
    this.state.bus.emit('inventory:changed');
    this.state.bus.emit('audio:build');
    this.state.bus.emit('toast', `${definition.name} placed`);
    this.cancel();
    return true;
  }

  /** @param {{ id: string, kind: string, x: number, z: number, rotation: number }} saved */
  restore(saved) {
    const definition = BUILDABLES[saved.kind];
    if (!definition || this.structures.has(saved.id)) return;
    const visual = this.createVisual(saved.kind, false);
    visual.position.set(saved.x, this.world.terrain.getHeight(saved.x, saved.z) + 0.04, saved.z);
    visual.rotation.y = saved.rotation;
    visual.userData.structureId = saved.id;
    visual.userData.kind = saved.kind;
    this.world.structureRoot.add(visual);
    const record = { ...saved, visual, triggered: false };
    this.structures.set(saved.id, record);
    const [width, depth] = definition.footprint;
    if (saved.kind === 'barricade' || saved.kind === 'storage' || saved.kind === 'campfire') {
      this.world.collider.addRect(`structure-${saved.id}`, saved.x, saved.z, width, depth, saved.rotation);
    }
    if (saved.kind === 'storage') {
      const container = {
        id: `storage-${saved.id}`,
        label: 'Player storage crate',
        x: saved.x,
        z: saved.z,
        radius: 2.6,
        type: 'container',
        items: [],
        opened: false,
        mesh: visual
      };
      this.world.containers.set(container.id, container);
      this.world.interactables.push(container);
    }
  }

  /** @param {string} kind @param {boolean} ghost */
  createVisual(kind, ghost) {
    const group = new THREE.Group();
    const materials = this.world.materials;
    if (kind === 'campfire') {
      const stoneGeometry = new THREE.DodecahedronGeometry(0.35, 0);
      for (let index = 0; index < 10; index += 1) {
        const angle = (index / 10) * Math.PI * 2;
        const stone = new THREE.Mesh(stoneGeometry, materials.rock);
        stone.position.set(Math.cos(angle) * 0.92, 0.28, Math.sin(angle) * 0.92);
        stone.scale.set(1.2, 0.75, 1.0);
        group.add(stone);
      }
      for (const angle of [-0.7, 0.7]) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.85, 8), materials.darkWood);
        log.rotation.z = Math.PI * 0.5;
        log.rotation.y = angle;
        log.position.y = 0.32;
        group.add(log);
      }
      const flameMaterial = new THREE.MeshStandardMaterial({ color: 0xffa43a, emissive: 0xff5b16, emissiveIntensity: 3.4, roughness: 0.5, transparent: true, opacity: 0.9 });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.35, 8), flameMaterial);
      flame.position.y = 1.05;
      flame.userData.flame = true;
      group.add(flame);
      const light = new THREE.PointLight(0xff8b36, ghost ? 0 : 13, 18, 2.1);
      light.position.y = 1.7;
      light.castShadow = false;
      light.userData.campLight = true;
      group.add(light);
    } else if (kind === 'barricade') {
      for (const x of [-1.85, -0.62, 0.62, 1.85]) {
        const post = box(0.24, 2.25, 0.24, materials.darkWood);
        post.position.set(x, 1.1, 0);
        group.add(post);
      }
      for (const y of [0.65, 1.35, 1.95]) {
        const plank = box(4.5, 0.34, 0.28, materials.wood);
        plank.position.set(0, y, 0);
        plank.rotation.z = y === 1.35 ? 0.08 : -0.035;
        group.add(plank);
      }
      for (const x of [-1.3, 1.3]) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.1, 6), materials.metal);
        spike.rotation.x = Math.PI * 0.5;
        spike.position.set(x, 0.8, 0.7);
        group.add(spike);
      }
    } else if (kind === 'storage') {
      group.add(createCrate(materials));
      const lid = box(1.72, 0.16, 1.46, materials.darkWood);
      lid.position.set(0, 1.28, -0.1);
      lid.rotation.x = -0.18;
      group.add(lid);
    } else if (kind === 'snare') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 6, 28), materials.metal);
      ring.rotation.x = Math.PI * 0.5;
      ring.position.y = 0.08;
      group.add(ring);
      for (let index = 0; index < 8; index += 1) {
        const angle = (index / 8) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.65, 6), materials.rust);
        spike.position.set(Math.cos(angle) * 0.72, 0.29, Math.sin(angle) * 0.72);
        spike.rotation.z = Math.PI;
        group.add(spike);
      }
    }
    enableShadows(group);
    if (ghost) {
      group.traverse((child) => {
        if (!child.isMesh) return;
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.42;
        child.material.depthWrite = false;
      });
    }
    return group;
  }

  /** @param {any} group @param {number} color */
  applyGhostColor(group, color) {
    group.traverse((child) => {
      if (!child.isMesh || !child.material?.color) return;
      child.material.color.set(color);
      child.material.emissive?.set(color);
      if (child.material.emissiveIntensity !== undefined) child.material.emissiveIntensity = 0.18;
    });
  }

  /** @param {number} dt */
  update(dt) {
    this.elapsed += dt;
    for (const structure of this.structures.values()) {
      if (structure.kind !== 'campfire') continue;
      structure.visual.traverse((child) => {
        if (child.userData.flame) {
          child.scale.y = 0.82 + Math.sin(this.elapsed * 9 + structure.x) * 0.16;
          child.scale.x = 0.92 + Math.sin(this.elapsed * 13 + structure.z) * 0.08;
        }
        if (child.userData.campLight) child.intensity = 11 + Math.sin(this.elapsed * 8.3 + structure.x) * 2.2;
      });
    }
  }

  /** @param {number} x @param {number} z */
  nearFire(x, z) {
    for (const structure of this.structures.values()) {
      if (structure.kind === 'campfire' && distance2D(x, z, structure.x, structure.z) < 7) return true;
    }
    return false;
  }

  /** @param {{ position: { x: number, z: number }, damage: (amount: number, source?: string) => void }} enemy */
  triggerSnare(enemy) {
    for (const structure of this.structures.values()) {
      if (structure.kind !== 'snare' || structure.triggered) continue;
      if (distance2D(enemy.position.x, enemy.position.z, structure.x, structure.z) < 1.4) {
        structure.triggered = true;
        enemy.damage(48, 'Noise snare');
        structure.visual.scale.y = 0.35;
        this.state.bus.emit('toast', 'A noise snare was triggered.');
        this.state.bus.emit('audio:trap');
        return true;
      }
    }
    return false;
  }
}
