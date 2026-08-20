// @ts-check

import * as THREE from '../core/three.js';
import { clamp, distanceToSegment, smoothstep, valueNoise } from '../core/math.js';

export class EditableTerrain {
  /** @param {import('./Materials.js').MaterialLibrary} materials */
  constructor(materials) {
    this.size = 180;
    this.segments = 90;
    this.step = this.size / this.segments;
    this.geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    this.geometry.rotateX(-Math.PI * 0.5);
    this.position = this.geometry.getAttribute('position');
    this.colors = new Float32Array(this.position.count * 3);
    this.baseHeights = new Float32Array(this.position.count);
    this.heights = new Float32Array(this.position.count);
    this.dirtGroup = new THREE.Group();
    this.dirtGroup.name = 'Excavated soil';
    this.mesh = new THREE.Mesh(this.geometry, materials.ground);
    this.mesh.receiveShadow = true;
    this.mesh.name = 'Editable county terrain';
    this.buildBaseTerrain();
    this.root = new THREE.Group();
    this.root.add(this.mesh, this.dirtGroup);
  }

  /** @param {number} x @param {number} z */
  baseHeightAt(x, z) {
    const broad = (valueNoise(x, z, 34, 4) - 0.5) * 3.8;
    const fine = (valueNoise(x, z, 9, 8) - 0.5) * 0.9;
    const ridge = Math.max(0, (Math.hypot(x, z) - 64) / 25) * 8;
    let height = broad + fine + ridge;
    const verticalRoad = Math.max(0, 1 - Math.abs(x) / 9);
    const horizontalRoad = Math.max(0, 1 - Math.abs(z - 8) / 8);
    const roadBlend = smoothstep(Math.max(verticalRoad, horizontalRoad));
    height *= 1 - roadBlend * 0.92;
    const townBlend = smoothstep(Math.max(0, 1 - Math.hypot(x - 7, z - 2) / 52));
    height *= 1 - townBlend * 0.63;
    return height;
  }

  buildBaseTerrain() {
    const color = new THREE.Color();
    for (let index = 0; index < this.position.count; index += 1) {
      const x = this.position.getX(index);
      const z = this.position.getZ(index);
      const height = this.baseHeightAt(x, z);
      this.baseHeights[index] = height;
      this.heights[index] = height;
      this.position.setY(index, height);
      const wet = valueNoise(x, z, 12, 22);
      const roadEdge = Math.min(Math.abs(x), Math.abs(z - 8));
      if (height > 4.2) color.setRGB(0.24, 0.25, 0.22);
      else if (wet < 0.31) color.setRGB(0.19, 0.24, 0.19);
      else color.setRGB(0.27, 0.28, 0.22);
      if (roadEdge < 8.5) color.lerp(new THREE.Color(0x4b4a40), 0.12);
      this.colors[index * 3] = color.r;
      this.colors[index * 3 + 1] = color.g;
      this.colors[index * 3 + 2] = color.b;
    }
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  /** @param {number} x @param {number} z */
  getHeight(x, z) {
    const gx = clamp((x + this.size * 0.5) / this.step, 0, this.segments - 0.001);
    const gz = clamp((z + this.size * 0.5) / this.step, 0, this.segments - 0.001);
    const x0 = Math.floor(gx);
    const z0 = Math.floor(gz);
    const tx = gx - x0;
    const tz = gz - z0;
    const row = this.segments + 1;
    const a = this.heights[z0 * row + x0];
    const b = this.heights[z0 * row + x0 + 1];
    const c = this.heights[(z0 + 1) * row + x0];
    const d = this.heights[(z0 + 1) * row + x0 + 1];
    return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz;
  }

  /** @param {number} x @param {number} z */
  getExcavationDepth(x, z) {
    const gx = clamp(Math.round((x + this.size * 0.5) / this.step), 0, this.segments);
    const gz = clamp(Math.round((z + this.size * 0.5) / this.step), 0, this.segments);
    const index = gz * (this.segments + 1) + gx;
    return Math.max(0, this.baseHeights[index] - this.heights[index]);
  }

  /** @param {number} x @param {number} z @param {number} radius @param {number} depth @param {boolean} [spawnSoil] */
  dig(x, z, radius = 2.7, depth = 0.72, spawnSoil = true) {
    let changed = false;
    for (let index = 0; index < this.position.count; index += 1) {
      const vx = this.position.getX(index);
      const vz = this.position.getZ(index);
      const distance = Math.hypot(vx - x, vz - z);
      if (distance > radius) continue;
      const influence = smoothstep(1 - distance / radius);
      const floor = this.baseHeights[index] - 3.2;
      const next = Math.max(floor, this.heights[index] - depth * influence);
      if (next < this.heights[index] - 0.001) {
        this.heights[index] = next;
        this.position.setY(index, next);
        const darkness = Math.min(0.18, (this.baseHeights[index] - next) * 0.065);
        this.colors[index * 3] = Math.max(0.09, this.colors[index * 3] - darkness);
        this.colors[index * 3 + 1] = Math.max(0.07, this.colors[index * 3 + 1] - darkness);
        this.colors[index * 3 + 2] = Math.max(0.05, this.colors[index * 3 + 2] - darkness * 0.8);
        changed = true;
      }
    }
    if (!changed) return false;
    this.position.needsUpdate = true;
    this.geometry.getAttribute('color').needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
    if (spawnSoil) this.addSoilMound(x, z, radius);
    return true;
  }

  /** @param {number} x @param {number} z @param {number} radius */
  addSoilMound(x, z, radius) {
    const geometry = new THREE.DodecahedronGeometry(0.55, 0);
    const material = new THREE.MeshStandardMaterial({ color: 0x4b3426, roughness: 1 });
    const group = new THREE.Group();
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2 + 0.35;
      const distance = radius * 0.82 + (index % 2) * 0.5;
      const mesh = new THREE.Mesh(geometry, material);
      const px = x + Math.cos(angle) * distance;
      const pz = z + Math.sin(angle) * distance;
      mesh.position.set(px, this.getHeight(px, pz) + 0.35, pz);
      mesh.scale.set(1.4 + (index % 3) * 0.35, 0.65, 1.1 + ((index + 1) % 3) * 0.22);
      mesh.rotation.y = angle;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    this.dirtGroup.add(group);
  }

  /** @param {{ x: number, z: number, radius: number, depth: number }[]} edits */
  applyEdits(edits) {
    for (const edit of edits) this.dig(edit.x, edit.z, edit.radius, edit.depth, false);
  }

  /** @param {number} x @param {number} z */
  travelFactor(x, z) {
    const depth = this.getExcavationDepth(x, z);
    return depth > 0.5 ? 0.72 : 1;
  }

  /** @param {number} x @param {number} z */
  isNearRoad(x, z) {
    return Math.abs(x) < 7 || Math.abs(z - 8) < 6 || distanceToSegment(x, z, 0, -80, 0, 80) < 7;
  }
}
