// @ts-check

import { rotate2D } from '../core/math.js';

export class ColliderMap {
  constructor() {
    /** @type {{ id: string, kind: 'rect' | 'circle', x: number, z: number, halfX?: number, halfZ?: number, radius?: number, angle?: number, dynamic?: boolean }[]} */
    this.colliders = [];
  }

  /** @param {string} id @param {number} x @param {number} z @param {number} width @param {number} depth @param {number} [angle] */
  addRect(id, x, z, width, depth, angle = 0) {
    this.remove(id);
    this.colliders.push({ id, kind: 'rect', x, z, halfX: width * 0.5, halfZ: depth * 0.5, angle });
  }

  /** @param {string} id @param {number} x @param {number} z @param {number} radius */
  addCircle(id, x, z, radius) {
    this.remove(id);
    this.colliders.push({ id, kind: 'circle', x, z, radius });
  }

  /** @param {string} id */
  remove(id) {
    const index = this.colliders.findIndex((collider) => collider.id === id);
    if (index >= 0) this.colliders.splice(index, 1);
  }

  /** @param {number} x @param {number} z @param {number} radius @param {string | null} [ignoreId] */
  isBlocked(x, z, radius, ignoreId = null) {
    for (const collider of this.colliders) {
      if (collider.id === ignoreId) continue;
      if (collider.kind === 'circle') {
        if (Math.hypot(x - collider.x, z - collider.z) < radius + (collider.radius ?? 0)) return true;
        continue;
      }
      const local = rotate2D(x - collider.x, z - collider.z, -(collider.angle ?? 0));
      const closestX = Math.max(-(collider.halfX ?? 0), Math.min(collider.halfX ?? 0, local.x));
      const closestZ = Math.max(-(collider.halfZ ?? 0), Math.min(collider.halfZ ?? 0, local.z));
      if (Math.hypot(local.x - closestX, local.z - closestZ) < radius) return true;
    }
    return false;
  }

  /** @param {number} fromX @param {number} fromZ @param {number} toX @param {number} toZ @param {number} radius @param {string | null} [ignoreId] */
  resolveMovement(fromX, fromZ, toX, toZ, radius, ignoreId = null) {
    if (!this.isBlocked(toX, toZ, radius, ignoreId)) return { x: toX, z: toZ, blocked: false };
    if (!this.isBlocked(toX, fromZ, radius, ignoreId)) return { x: toX, z: fromZ, blocked: true };
    if (!this.isBlocked(fromX, toZ, radius, ignoreId)) return { x: fromX, z: toZ, blocked: true };
    return { x: fromX, z: fromZ, blocked: true };
  }

  /** @param {number} x @param {number} z @param {number} width @param {number} depth @param {number} [angle] */
  isAreaClear(x, z, width, depth, angle = 0) {
    const radius = Math.hypot(width, depth) * 0.5;
    const samples = [
      [0, 0], [-width * 0.45, -depth * 0.45], [width * 0.45, -depth * 0.45],
      [-width * 0.45, depth * 0.45], [width * 0.45, depth * 0.45]
    ];
    return samples.every(([sx, sz]) => {
      const rotated = rotate2D(sx, sz, angle);
      return !this.isBlocked(x + rotated.x, z + rotated.z, Math.min(0.55, radius * 0.2));
    });
  }

  /** @param {number} ax @param {number} az @param {number} bx @param {number} bz */
  lineBlocked(ax, az, bx, bz) {
    const distance = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(2, Math.ceil(distance / 0.8));
    for (let index = 1; index < steps; index += 1) {
      const t = index / steps;
      if (this.isBlocked(ax + (bx - ax) * t, az + (bz - az) * t, 0.12)) return true;
    }
    return false;
  }
}
