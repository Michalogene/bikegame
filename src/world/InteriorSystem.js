// @ts-check

import { clamp, damp, rotate2D } from '../core/math.js';

export const INTERIOR_STATES = Object.freeze({
  OUTSIDE: 'OUTSIDE',
  ENTERING: 'ENTERING',
  INSIDE: 'INSIDE',
  EXITING: 'EXITING'
});

/**
 * Convert a world-space point into a building local X/Z coordinate system.
 * @param {{ x: number, z: number, angle?: number }} building
 * @param {number} x
 * @param {number} z
 */
export function toBuildingLocal(building, x, z) {
  return rotate2D(x - building.x, z - building.z, -(building.angle ?? 0));
}

/**
 * @param {{ x: number, z: number, angle?: number, width: number, depth: number }} volume
 * @param {number} x
 * @param {number} z
 * @param {number} [padding]
 */
export function pointInsideBuilding(volume, x, z, padding = 0) {
  const local = toBuildingLocal(volume, x, z);
  return Math.abs(local.x) <= volume.width * 0.5 + padding
    && Math.abs(local.z) <= volume.depth * 0.5 + padding;
}

/** @param {any} building */
export function buildingVolumes(building) {
  const volumes = building?.interiorVolumes ?? building?.volumes;
  return Array.isArray(volumes) && volumes.length ? volumes : [building];
}

/**
 * @param {any} building
 * @param {number} x
 * @param {number} z
 * @param {number} [padding]
 */
export function pointInsideAnyVolume(building, x, z, padding = 0) {
  return buildingVolumes(building).some((volume) => pointInsideBuilding({
    x: Number.isFinite(volume.x) ? volume.x : building.x,
    z: Number.isFinite(volume.z) ? volume.z : building.z,
    angle: Number.isFinite(volume.angle) ? volume.angle : building.angle,
    width: volume.width,
    depth: volume.depth
  }, x, z, padding));
}

/**
 * Resolve membership directly from world position.
 * @param {Map<string, any> | any[]} collection
 * @param {number} x
 * @param {number} z
 * @param {number} [padding]
 * @param {any | null} [preferred]
 */
export function resolveInteriorBuilding(collection, x, z, padding = 0, preferred = null) {
  if (preferred && pointInsideAnyVolume(preferred, x, z, padding)) return preferred;
  const values = collection instanceof Map ? collection.values() : collection ?? [];
  for (const building of values) {
    if (building && pointInsideAnyVolume(building, x, z, padding)) return building;
  }
  return null;
}

/**
 * Pure transition helper used by regression tests.
 * @param {string} current
 * @param {boolean} hasActiveBuilding
 * @param {number} weight
 */
export function deriveInteriorState(current, hasActiveBuilding, weight) {
  if (hasActiveBuilding) return weight >= 0.985 ? INTERIOR_STATES.INSIDE : INTERIOR_STATES.ENTERING;
  if (weight > 0.015 || current === INTERIOR_STATES.ENTERING || current === INTERIOR_STATES.INSIDE) {
    return INTERIOR_STATES.EXITING;
  }
  return INTERIOR_STATES.OUTSIDE;
}

export class InteriorSystem {
  /**
   * @param {import('./WorldBuilder.js').WorldBuilder} world
   * @param {import('../entities/Player.js').Player} player
   * @param {import('../render/CameraRig.js').CameraRig} camera
   */
  constructor(world, player, camera) {
    this.world = world;
    this.player = player;
    this.camera = camera;
    this.activeBuilding = null;
    this.previousBuilding = null;
    this.candidateBuilding = null;
    this.candidateTime = 0;
    this.enterDelay = 0.09;
    this.exitPadding = 0.72;
    this.enterInset = -0.12;
    this.state = INTERIOR_STATES.OUTSIDE;
    /** @type {Map<string, number>} */
    this.presentation = new Map();

    for (const building of this.world.buildings.values()) this.ensureBuildingTargets(building);
  }

  /** @param {number} dt */
  update(dt) {
    const next = this.resolveMembership(this.player.position.x, this.player.position.z, dt);
    if (next !== this.activeBuilding) this.changeMembership(next);
    this.updatePresentations(dt);
    this.updateCameraContract();
  }

  /**
   * Reconcile all presentation state directly from the real player position.
   * Used after load, spawn, respawn, teleport and future fast travel.
   * @param {{ immediate?: boolean }} [options]
   */
  syncFromPlayer(options = {}) {
    const building = resolveInteriorBuilding(
      this.world.buildings,
      this.player.position.x,
      this.player.position.z,
      0,
      null
    );
    this.candidateBuilding = building;
    this.candidateTime = this.enterDelay;
    if (building !== this.activeBuilding) this.changeMembership(building, { emit: false });

    if (options.immediate !== false) {
      for (const candidate of this.world.buildings.values()) {
        this.ensureBuildingTargets(candidate);
        const weight = candidate === building ? 1 : 0;
        this.presentation.set(candidate.id, weight);
        this.applyBuildingPresentation(candidate, weight);
      }
      this.previousBuilding = null;
      this.state = building ? INTERIOR_STATES.INSIDE : INTERIOR_STATES.OUTSIDE;
      this.updateCameraContract(true);
    }
    return building;
  }

  /**
   * Reset transient presentation. By default membership is recomputed from the player's position.
   * @param {{ immediate?: boolean, forceOutside?: boolean }} [options]
   */
  reset(options = {}) {
    this.candidateBuilding = null;
    this.candidateTime = 0;
    if (!options.forceOutside) return this.syncFromPlayer({ immediate: options.immediate !== false });

    this.previousBuilding = this.activeBuilding;
    this.activeBuilding = null;
    if (options.immediate !== false) {
      for (const building of this.world.buildings.values()) {
        this.presentation.set(building.id, 0);
        this.applyBuildingPresentation(building, 0);
      }
      this.previousBuilding = null;
      this.state = INTERIOR_STATES.OUTSIDE;
      this.updateCameraContract(true);
    }
    return null;
  }

  /** @param {any} building */
  registerBuilding(building) {
    if (!building?.id) return null;
    if (!this.world.buildings.has(building.id)) this.world.buildings.set(building.id, building);
    this.ensureBuildingTargets(building);
    const active = pointInsideAnyVolume(building, this.player.position.x, this.player.position.z, 0);
    const weight = active ? 1 : 0;
    this.presentation.set(building.id, weight);
    if (active) this.activeBuilding = building;
    this.applyBuildingPresentation(building, weight);
    this.updateCameraContract(true);
    return building;
  }

  /** @param {number} x @param {number} z @param {number} dt */
  resolveMembership(x, z, dt) {
    if (this.activeBuilding && pointInsideAnyVolume(this.activeBuilding, x, z, this.exitPadding)) {
      this.candidateBuilding = this.activeBuilding;
      this.candidateTime = this.enterDelay;
      return this.activeBuilding;
    }

    const strict = resolveInteriorBuilding(this.world.buildings, x, z, this.enterInset, null);
    if (strict !== this.candidateBuilding) {
      this.candidateBuilding = strict;
      this.candidateTime = strict ? 0 : this.enterDelay;
    } else if (strict) {
      this.candidateTime += dt;
    }
    return strict && this.candidateTime >= this.enterDelay ? strict : null;
  }

  /** @param {any | null} building @param {{ emit?: boolean }} [options] */
  changeMembership(building, options = {}) {
    const previous = this.activeBuilding;
    if (previous === building) return;
    this.previousBuilding = previous;
    this.activeBuilding = building;

    if (options.emit !== false && previous) {
      this.world.state.bus.emit('interior:exit', { id: previous.id, label: previous.label });
    }
    if (options.emit !== false && building) {
      this.world.state.bus.emit('interior:enter', { id: building.id, label: building.label });
    }
  }

  /** @param {number} dt */
  updatePresentations(dt) {
    let largestWeight = 0;
    for (const building of this.world.buildings.values()) {
      this.ensureBuildingTargets(building);
      const target = building === this.activeBuilding ? 1 : 0;
      const current = this.presentation.get(building.id) ?? 0;
      const next = Math.abs(current - target) < 0.001
        ? target
        : damp(current, target, target > current ? 11.5 : 9.5, dt);
      this.presentation.set(building.id, next);
      largestWeight = Math.max(largestWeight, next);
      if (target > 0 || current > 0.001 || next > 0.001) this.applyBuildingPresentation(building, next);
    }
    this.state = deriveInteriorState(this.state, Boolean(this.activeBuilding), largestWeight);
    if (!this.activeBuilding && largestWeight <= 0.001) this.previousBuilding = null;
  }

  /** @param {boolean} [immediate] */
  updateCameraContract(immediate = false) {
    const building = this.activeBuilding;
    this.camera.setInteriorMode(Boolean(building), building?.interiorZoom ?? 0.88, building?.id ?? null);
    if (immediate) {
      this.camera.interiorBlend = building ? 1 : 0;
      this.camera.targetInteriorBlend = building ? 1 : 0;
      this.camera.compositionMode = building ? 'interior' : 'outdoor';
    }
  }

  /** @param {any} building */
  ensureBuildingTargets(building) {
    if (!Array.isArray(building.roofFadeTargets)) building.roofFadeTargets = [];
    if (!Array.isArray(building.wallFadeSides)) building.wallFadeSides = [];
    if (!Array.isArray(building.occlusionTargets)) {
      building.occlusionTargets = building.wallFadeSides.flatMap((side) => side.targets ?? []);
    }
    for (const target of [...building.roofFadeTargets, ...building.occlusionTargets]) {
      if (!target?.mesh || !target.material) continue;
      if (target.baseVisible === undefined) target.baseVisible = target.mesh.visible !== false;
      if (target.baseOpacity === undefined) target.baseOpacity = Number.isFinite(target.material.opacity) ? target.material.opacity : 1;
      if (target.baseTransparent === undefined) target.baseTransparent = target.material.transparent === true;
      if (target.baseDepthWrite === undefined) target.baseDepthWrite = target.material.depthWrite !== false;
      if (target.baseDepthTest === undefined) target.baseDepthTest = target.material.depthTest !== false;
      if (target.baseCastShadow === undefined) target.baseCastShadow = target.mesh.castShadow !== false;
      if (target.baseReceiveShadow === undefined) target.baseReceiveShadow = target.mesh.receiveShadow !== false;
    }
    if (!this.presentation.has(building.id)) this.presentation.set(building.id, 0);
  }

  /** @param {any} building @param {number} weight */
  applyBuildingPresentation(building, weight) {
    const clamped = clamp(weight, 0, 1);
    const inside = building === this.activeBuilding;
    const roofHidden = clamped >= 0.985;

    for (const target of building.roofFadeTargets ?? []) {
      this.setTargetPresentation(target, target.baseOpacity * (1 - clamped), roofHidden);
    }

    const cameraVector = {
      x: this.camera.camera.position.x - building.x,
      z: this.camera.camera.position.z - building.z
    };
    for (const side of building.wallFadeSides ?? []) {
      const normal = rotate2D(side.normal.x, side.normal.z, building.angle ?? 0);
      const towardCamera = normal.x * cameraVector.x + normal.z * cameraVector.z > 0;
      const strength = inside ? (towardCamera ? 0.84 : 0.12) : 0;
      for (const target of side.targets ?? []) {
        this.setTargetPresentation(target, target.baseOpacity * (1 - clamped * strength), false);
      }
    }
  }

  /** @param {any} target @param {number} opacity @param {boolean} fullyHidden */
  setTargetPresentation(target, opacity, fullyHidden) {
    if (!target?.mesh || !target.material) return;
    const restored = opacity >= target.baseOpacity - 0.001;
    target.material.opacity = restored ? target.baseOpacity : clamp(opacity, 0, target.baseOpacity);
    target.material.transparent = restored ? Boolean(target.baseTransparent) : true;
    target.material.depthWrite = restored ? target.baseDepthWrite : target.material.opacity > 0.44 && target.baseDepthWrite;
    target.material.depthTest = target.baseDepthTest !== false;
    target.mesh.castShadow = restored ? target.baseCastShadow : target.material.opacity > 0.44 && target.baseCastShadow;
    target.mesh.receiveShadow = target.baseReceiveShadow !== false;
    target.mesh.visible = fullyHidden ? false : target.baseVisible !== false;
  }

  get activeBuildingId() {
    return this.activeBuilding?.id ?? null;
  }

  get status() {
    return this.activeBuilding
      ? { inside: true, id: this.activeBuilding.id, label: this.activeBuilding.label, state: this.state }
      : { inside: false, id: null, label: 'OUTSIDE', state: this.state };
  }

  dispose() {
    for (const building of this.world.buildings.values()) {
      this.presentation.set(building.id, 0);
      this.applyBuildingPresentation(building, 0);
    }
    this.camera.setInteriorMode(false);
    this.activeBuilding = null;
    this.previousBuilding = null;
    this.candidateBuilding = null;
    this.state = INTERIOR_STATES.OUTSIDE;
  }
}
