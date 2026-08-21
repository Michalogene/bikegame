// @ts-check

import { rotate2D } from '../core/math.js';

/** @param {{ x: number, z: number, angle: number, width: number, depth: number }} building @param {number} x @param {number} z @param {number} [margin] */
export function pointInBuilding(building, x, z, margin = 0) {
  const local = rotate2D(x - building.x, z - building.z, -building.angle);
  return Math.abs(local.x) <= building.width * 0.5 + margin
    && Math.abs(local.z) <= building.depth * 0.5 + margin;
}

/** @param {{ x: number, z: number, angle: number, width: number, depth: number }} building @param {{ x: number, z: number }} cameraPosition */
export function cameraFacingWalls(building, cameraPosition) {
  const local = rotate2D(cameraPosition.x - building.x, cameraPosition.z - building.z, -building.angle);
  const xWeight = Math.abs(local.x) / Math.max(0.1, building.width * 0.5);
  const zWeight = Math.abs(local.z) / Math.max(0.1, building.depth * 0.5);
  const xSide = local.x >= 0 ? 'right' : 'left';
  const zSide = local.z >= 0 ? 'front' : 'back';
  if (xWeight >= zWeight) {
    return zWeight > xWeight * 0.46 ? [xSide, zSide] : [xSide];
  }
  return xWeight > zWeight * 0.46 ? [zSide, xSide] : [zSide];
}

/** @param {any} object */
function collectMeshes(object) {
  const meshes = [];
  if (!object) return meshes;
  if (object.isMesh) meshes.push(object);
  object.traverse?.((child) => {
    if (child.isMesh && child !== object) meshes.push(child);
  });
  return meshes;
}

/** @param {any} mesh */
function prepareMesh(mesh) {
  if (mesh.userData.interiorFadePrepared) return;
  const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const cloned = source.map((material) => {
    const copy = material.clone();
    copy.transparent = true;
    copy.userData.interiorOriginalOpacity = Number.isFinite(copy.opacity) ? copy.opacity : 1;
    copy.userData.interiorOriginalDepthWrite = copy.depthWrite !== false;
    return copy;
  });
  mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
  mesh.userData.interiorFadePrepared = true;
  mesh.userData.interiorOriginalCastShadow = mesh.castShadow;
}

/** @param {any} mesh @param {number} target @param {number} dt @param {number} rate */
function fadeMesh(mesh, target, dt, rate) {
  prepareMesh(mesh);
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const factor = 1 - Math.exp(-rate * dt);
  let lowestOpacity = 1;
  for (const material of materials) {
    const original = material.userData.interiorOriginalOpacity ?? 1;
    const targetOpacity = original * target;
    material.opacity += (targetOpacity - material.opacity) * factor;
    const nextDepthWrite = material.opacity > original * 0.52
      ? material.userData.interiorOriginalDepthWrite !== false
      : false;
    if (material.depthWrite !== nextDepthWrite) {
      material.depthWrite = nextDepthWrite;
      material.needsUpdate = true;
    }
    lowestOpacity = Math.min(lowestOpacity, material.opacity);
  }
  const nextCastShadow = lowestOpacity > 0.35 && mesh.userData.interiorOriginalCastShadow !== false;
  if (mesh.castShadow !== nextCastShadow) mesh.castShadow = nextCastShadow;
  const nextRenderOrder = lowestOpacity < 0.55 ? 4 : 0;
  if (mesh.renderOrder !== nextRenderOrder) mesh.renderOrder = nextRenderOrder;
}

export class BuildingInteriorSystem {
  /** @param {import('./WorldBuilder.js').WorldBuilder} world @param {import('../render/CameraRig.js').CameraRig} camera @param {import('../core/EventBus.js').EventBus} bus */
  constructor(world, camera, bus) {
    this.world = world;
    this.camera = camera;
    this.bus = bus;
    this.activeBuilding = null;
    this.pendingBuilding = null;
    this.pendingTime = 0;
    this.enterDelay = 0.07;
    this.enterMargin = -0.34;
    this.exitMargin = 0.62;
    this.prepared = new Map();
    for (const building of world.buildings) this.prepareBuilding(building);
  }

  /** @param {any} building */
  prepareBuilding(building) {
    const roofMeshes = [];
    for (const object of building.roofElements ?? []) roofMeshes.push(...collectMeshes(object));
    const walls = {};
    for (const side of ['front', 'back', 'left', 'right']) {
      walls[side] = [];
      for (const object of building.walls?.[side] ?? []) walls[side].push(...collectMeshes(object));
    }
    for (const mesh of [...roofMeshes, ...Object.values(walls).flat()]) prepareMesh(mesh);
    this.prepared.set(building.id, { roofMeshes, walls });
  }

  /** @param {{ x: number, z: number }} playerPosition @param {number} dt */
  update(playerPosition, dt) {
    const current = this.activeBuilding;
    if (current && !pointInBuilding(current, playerPosition.x, playerPosition.z, this.exitMargin)) {
      this.setActiveBuilding(null);
    }

    if (!this.activeBuilding) {
      const candidate = this.world.buildings.find((building) => pointInBuilding(
        building,
        playerPosition.x,
        playerPosition.z,
        this.enterMargin
      )) ?? null;
      if (candidate === this.pendingBuilding) {
        this.pendingTime += dt;
      } else {
        this.pendingBuilding = candidate;
        this.pendingTime = 0;
      }
      if (candidate && this.pendingTime >= this.enterDelay) this.setActiveBuilding(candidate);
    } else {
      this.pendingBuilding = null;
      this.pendingTime = 0;
    }

    this.camera.setInteriorMode(Boolean(this.activeBuilding));
    const cameraPosition = this.camera.camera.position;
    for (const building of this.world.buildings) {
      const prepared = this.prepared.get(building.id);
      if (!prepared) continue;
      const isActive = building === this.activeBuilding;
      const cutawaySides = isActive ? new Set(cameraFacingWalls(building, cameraPosition)) : new Set();
      for (const mesh of prepared.roofMeshes) fadeMesh(mesh, isActive ? 0.045 : 1, dt, isActive ? 9.5 : 6.5);
      for (const side of ['front', 'back', 'left', 'right']) {
        const target = isActive && cutawaySides.has(side) ? 0.14 : 1;
        for (const mesh of prepared.walls[side]) fadeMesh(mesh, target, dt, isActive ? 8.5 : 6.5);
      }
    }
  }

  /** @param {any | null} building */
  setActiveBuilding(building) {
    if (building === this.activeBuilding) return;
    const previous = this.activeBuilding;
    this.activeBuilding = building;
    this.pendingBuilding = null;
    this.pendingTime = 0;
    if (previous) this.bus.emit('building:exit', { building: previous });
    if (building) this.bus.emit('building:enter', { building });
    this.bus.emit('building:changed', {
      previousId: previous?.id ?? null,
      buildingId: building?.id ?? null,
      name: building?.name ?? null
    });
  }

  get activeBuildingId() {
    return this.activeBuilding?.id ?? null;
  }

  get statusLabel() {
    return this.activeBuilding ? `Inside: ${this.activeBuilding.name}` : 'Outside';
  }

  dispose() {
    this.setActiveBuilding(null);
    this.camera.setInteriorMode(false);
    for (const prepared of this.prepared.values()) {
      for (const mesh of [...prepared.roofMeshes, ...Object.values(prepared.walls).flat()]) {
        fadeMesh(mesh, 1, 1, 100);
      }
    }
    this.prepared.clear();
  }
}
