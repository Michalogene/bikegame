// @ts-check

import { damp, rotate2D } from '../core/math.js';

/**
 * Convert a world-space point into a building's local X/Z coordinate system.
 * @param {{ x: number, z: number, angle?: number }} building
 * @param {number} x
 * @param {number} z
 */
export function toBuildingLocal(building, x, z) {
  return rotate2D(x - building.x, z - building.z, -(building.angle ?? 0));
}

/**
 * @param {{ x: number, z: number, angle?: number, width: number, depth: number }} building
 * @param {number} x
 * @param {number} z
 * @param {number} [padding]
 */
export function pointInsideBuilding(building, x, z, padding = 0) {
  const local = toBuildingLocal(building, x, z);
  return Math.abs(local.x) <= building.width * 0.5 + padding
    && Math.abs(local.z) <= building.depth * 0.5 + padding;
}

/**
 * @typedef {{
 *   material: any,
 *   mesh: any,
 *   baseOpacity: number,
 *   baseDepthWrite: boolean,
 *   baseCastShadow: boolean
 * }} FadeTarget
 */

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
    this.candidateBuilding = null;
    this.candidateTime = 0;
    this.enterDelay = 0.08;
    this.exitPadding = 0.72;
    this.enterInset = -0.12;
    this.lastStatusSignature = '';
  }

  /** @param {number} dt */
  update(dt) {
    const x = this.player.position.x;
    const z = this.player.position.z;
    let next = this.activeBuilding;

    if (next && !pointInsideBuilding(next, x, z, this.exitPadding)) {
      next = null;
    }

    if (!next) {
      const candidate = this.world.getBuildingAt(x, z, this.enterInset);
      if (candidate === this.candidateBuilding) {
        this.candidateTime += dt;
      } else {
        this.candidateBuilding = candidate;
        this.candidateTime = 0;
      }
      if (candidate && this.candidateTime >= this.enterDelay) next = candidate;
    } else {
      this.candidateBuilding = next;
      this.candidateTime = this.enterDelay;
    }

    if (next !== this.activeBuilding) this.setActiveBuilding(next);
    this.updateFades(dt);
  }

  /** @param {any | null} building */
  setActiveBuilding(building) {
    const previous = this.activeBuilding;
    this.activeBuilding = building;
    this.camera.setInteriorMode(Boolean(building), building?.interiorZoom ?? 0.84, building?.id ?? null);

    if (previous) {
      this.world.state.bus.emit('interior:exit', {
        id: previous.id,
        label: previous.label
      });
    }
    if (building) {
      this.world.state.bus.emit('interior:enter', {
        id: building.id,
        label: building.label
      });
    }
  }

  /** @param {number} dt */
  updateFades(dt) {
    for (const building of this.world.buildings.values()) {
      const inside = building === this.activeBuilding;
      const cameraVector = {
        x: this.camera.camera.position.x - building.x,
        z: this.camera.camera.position.z - building.z
      };

      for (const target of building.roofFadeTargets ?? []) {
        const destination = inside ? Math.min(target.baseOpacity, 0.035) : target.baseOpacity;
        this.fadeTarget(target, destination, dt, 10.5);
      }

      for (const side of building.wallFadeSides ?? []) {
        const normal = rotate2D(side.normal.x, side.normal.z, building.angle ?? 0);
        const towardCamera = normal.x * cameraVector.x + normal.z * cameraVector.z > 0;
        const destination = inside
          ? side.targets.map((target) => Math.min(target.baseOpacity, towardCamera ? 0.13 : 0.82))
          : side.targets.map((target) => target.baseOpacity);
        side.targets.forEach((target, index) => this.fadeTarget(target, destination[index], dt, 9));
      }
    }
  }

  /** @param {FadeTarget} target @param {number} destination @param {number} dt @param {number} speed */
  fadeTarget(target, destination, dt, speed) {
    const opacity = damp(Number(target.material.opacity ?? target.baseOpacity), destination, speed, dt);
    target.material.opacity = opacity;
    target.material.transparent = opacity < 0.999 || target.baseOpacity < 0.999;
    target.material.depthWrite = opacity > 0.42 ? target.baseDepthWrite : false;
    target.mesh.castShadow = opacity > 0.42 ? target.baseCastShadow : false;
    target.mesh.visible = opacity > 0.012;
  }

  get activeBuildingId() {
    return this.activeBuilding?.id ?? null;
  }

  get status() {
    return this.activeBuilding
      ? { inside: true, id: this.activeBuilding.id, label: this.activeBuilding.label }
      : { inside: false, id: null, label: 'OUTSIDE' };
  }

  dispose() {
    this.camera.setInteriorMode(false);
    this.activeBuilding = null;
    this.candidateBuilding = null;
  }
}
