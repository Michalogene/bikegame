// @ts-check

import * as THREE from '../core/three.js';
import { Random } from '../core/Random.js';

/** @param {string} inner @param {string} outer */
function makeGlowTexture(inner, outer) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.24, outer);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class EffectsSystem {
  /** @param {import('../state/GameState.js').GameState} state @param {import('../world/WorldBuilder.js').WorldBuilder} world @param {import('../entities/Player.js').Player} player */
  constructor(state, world, player) {
    this.state = state;
    this.world = world;
    this.player = player;
    this.random = new Random(0xefec7118);
    this.root = new THREE.Group();
    this.root.name = 'Gameplay effects';
    this.world.root.add(this.root);
    this.effects = [];
    this.decals = [];
    this.recoil = 0;
    this.meleePulse = 0;
    this.glowTexture = makeGlowTexture('rgba(255,245,195,1)', 'rgba(255,152,54,.62)');
    this.bloodTexture = makeGlowTexture('rgba(125,14,12,.94)', 'rgba(65,4,4,.64)');
    this.createAimMarker();
    this.createFlashlightVolume();
    this.bindEvents();
  }

  createAimMarker() {
    const material = new THREE.MeshBasicMaterial({
      color: 0xd98b35,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.aimRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 32), material);
    this.aimRing.rotation.x = -Math.PI * 0.5;
    this.aimRing.renderOrder = 6;
    this.aimRing.visible = false;
    const dotMaterial = material.clone();
    dotMaterial.opacity = 0.88;
    this.aimDot = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), dotMaterial);
    this.aimDot.position.z = 0.006;
    this.aimRing.add(this.aimDot);
    this.root.add(this.aimRing);
  }

  createFlashlightVolume() {
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdda1,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const geometry = new THREE.CylinderGeometry(3.35, 0.12, 12.2, 26, 1, true);
    this.flashlightBeam = new THREE.Mesh(geometry, beamMaterial);
    this.flashlightBeam.rotation.x = Math.PI * 0.5;
    this.flashlightBeam.position.set(0.22, 1.72, 6.3);
    this.flashlightBeam.renderOrder = 3;
    this.player.root.add(this.flashlightBeam);
  }

  bindEvents() {
    this.disposers = [
      this.state.bus.on('combat:shot', () => this.createMuzzleFlash()),
      this.state.bus.on('combat:melee', (payload) => this.createMeleeArc(Boolean(payload?.hit))),
      this.state.bus.on('enemy:damaged', (payload) => {
        const enemy = payload?.enemy;
        if (!enemy?.position) return;
        this.spawnBurst(enemy.position.x, enemy.position.y + 1.35, enemy.position.z, {
          color: 0xb62b21,
          count: Math.min(15, 7 + Math.round(Number(payload.amount) * 0.08)),
          speed: 3.4,
          life: 0.58,
          gravity: 5.4,
          size: 0.14
        });
      }),
      this.state.bus.on('enemy:killed', (payload) => {
        const enemy = payload?.enemy;
        if (!enemy?.position) return;
        this.spawnBurst(enemy.position.x, enemy.position.y + 1.2, enemy.position.z, {
          color: 0x7d1512,
          count: 22,
          speed: 4.7,
          life: 0.9,
          gravity: 6.2,
          size: 0.18
        });
        this.addBloodDecal(enemy.position.x, enemy.position.z, enemy.tier >= 2 ? 1.45 : 1.0);
      }),
      this.state.bus.on('terrain:dug', (edit) => {
        this.spawnBurst(edit.x, this.world.terrain.getHeight(edit.x, edit.z) + 0.35, edit.z, {
          color: 0x72513a,
          count: 28,
          speed: 3.8,
          life: 1.05,
          gravity: 7.4,
          size: 0.2
        });
        this.createGroundPulse(edit.x, edit.z, 0xb88c63, 0.95, 2.6);
      }),
      this.state.bus.on('build:placed', (structure) => {
        this.spawnBurst(structure.x, this.world.terrain.getHeight(structure.x, structure.z) + 0.28, structure.z, {
          color: 0xb6a27c,
          count: 20,
          speed: 2.9,
          life: 0.8,
          gravity: 5.8,
          size: 0.16
        });
        this.createGroundPulse(structure.x, structure.z, 0xe09a4a, 0.7, 2.1);
      }),
      this.state.bus.on('audio:step', (payload) => {
        if (!payload?.sprint || this.random.next() > 0.62) return;
        this.spawnBurst(payload.x, this.world.terrain.getHeight(payload.x, payload.z) + 0.08, payload.z, {
          color: 0x746b58,
          count: 4,
          speed: 0.9,
          life: 0.38,
          gravity: 2.4,
          size: 0.09
        });
      }),
      this.state.bus.on('player:damaged', () => {
        this.spawnBurst(this.player.position.x, this.player.position.y + 1.65, this.player.position.z, {
          color: 0x9d1f1a,
          count: 9,
          speed: 2.6,
          life: 0.5,
          gravity: 4.2,
          size: 0.13
        });
      }),
      this.state.bus.on('loot:item', (payload) => {
        const container = payload?.container;
        if (!container) return;
        this.spawnBurst(container.x, this.world.terrain.getHeight(container.x, container.z) + 1.05, container.z, {
          color: 0xd9b464,
          count: 8,
          speed: 1.4,
          life: 0.72,
          gravity: -0.3,
          size: 0.1
        });
      }),
      this.state.bus.on('container:open', (container) => {
        if (container) this.createGroundPulse(container.x, container.z, 0xc8a46d, 0.48, 1.8);
      })
    ];
  }

  createMuzzleFlash() {
    const yaw = this.player.root.rotation.y;
    const x = this.player.position.x + Math.sin(yaw) * 0.9;
    const z = this.player.position.z + Math.cos(yaw) * 0.9;
    const group = new THREE.Group();
    group.position.set(x, this.player.position.y + 1.82, z);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color: 0xffcf75,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(1.3, 1.3, 1);
    const light = new THREE.PointLight(0xff9a35, 7.5, 7, 2);
    group.add(sprite, light);
    this.root.add(group);
    this.effects.push({ kind: 'flash', object: group, life: 0.095, maxLife: 0.095 });
    this.recoil = 1;
  }

  /** @param {boolean} hit */
  createMeleeArc(hit) {
    const material = new THREE.MeshBasicMaterial({
      color: hit ? 0xffd18a : 0xcbb991,
      transparent: true,
      opacity: hit ? 0.92 : 0.58,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const arc = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.48, 30, 1, -1.05, 2.1), material);
    arc.rotation.x = -Math.PI * 0.5;
    arc.rotation.y = this.player.root.rotation.y;
    arc.position.set(this.player.position.x, this.world.terrain.getHeight(this.player.position.x, this.player.position.z) + 0.22, this.player.position.z);
    this.root.add(arc);
    this.effects.push({ kind: 'arc', object: arc, life: 0.22, maxLife: 0.22 });
    this.meleePulse = 1;
  }

  /** @param {number} x @param {number} y @param {number} z @param {{ color: number, count: number, speed: number, life: number, gravity: number, size: number }} options */
  spawnBurst(x, y, z, options) {
    if (this.effects.length > 48) this.removeEffect(this.effects[0]);
    const positions = new Float32Array(options.count * 3);
    const velocities = new Float32Array(options.count * 3);
    for (let index = 0; index < options.count; index += 1) {
      const offset = index * 3;
      const angle = this.random.range(0, Math.PI * 2);
      const horizontal = this.random.range(options.speed * 0.25, options.speed);
      velocities[offset] = Math.cos(angle) * horizontal;
      velocities[offset + 1] = this.random.range(options.speed * 0.25, options.speed * 1.15);
      velocities[offset + 2] = Math.sin(angle) * horizontal;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: options.color,
      size: options.size,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.94,
      depthWrite: false
    });
    const points = new THREE.Points(geometry, material);
    points.position.set(x, y, z);
    this.root.add(points);
    this.effects.push({
      kind: 'particles',
      object: points,
      velocities,
      gravity: options.gravity,
      life: options.life,
      maxLife: options.life,
      baseSize: options.size
    });
  }

  /** @param {number} x @param {number} z @param {number} color @param {number} life @param {number} radius */
  createGroundPulse(x, z, color, life, radius) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const pulse = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.27, 32), material);
    pulse.rotation.x = -Math.PI * 0.5;
    pulse.position.set(x, this.world.terrain.getHeight(x, z) + 0.12, z);
    this.root.add(pulse);
    this.effects.push({ kind: 'pulse', object: pulse, life, maxLife: life, radius });
  }

  /** @param {number} x @param {number} z @param {number} scale */
  addBloodDecal(x, z, scale) {
    const material = new THREE.MeshBasicMaterial({
      map: this.bloodTexture,
      color: 0x6c0d0b,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const decal = new THREE.Mesh(new THREE.CircleGeometry(1, 24), material);
    decal.rotation.x = -Math.PI * 0.5;
    decal.rotation.z = this.random.range(0, Math.PI * 2);
    decal.scale.set(scale * this.random.range(0.75, 1.2), scale * this.random.range(0.46, 0.78), 1);
    decal.position.set(x, this.world.terrain.getHeight(x, z) + 0.085, z);
    this.root.add(decal);
    this.decals.push(decal);
    while (this.decals.length > 22) {
      const oldest = this.decals.shift();
      oldest?.geometry?.dispose?.();
      oldest?.material?.dispose?.();
      oldest?.removeFromParent();
    }
  }

  /** @param {number} dt @param {{ x: number, z: number } | null} aimPoint @param {number} elapsed @param {{ night: number }} lighting */
  update(dt, aimPoint, elapsed, lighting) {
    this.updateAimMarker(aimPoint, elapsed);
    this.flashlightBeam.visible = this.state.flashlightOn;
    this.flashlightBeam.material.opacity = (0.025 + lighting.night * 0.072) * (0.94 + Math.sin(elapsed * 13.7) * 0.025);
    this.recoil = Math.max(0, this.recoil - dt * 8.5);
    this.meleePulse = Math.max(0, this.meleePulse - dt * 6.2);
    this.player.model.position.z = -this.recoil * 0.07;
    this.player.model.rotation.x = -this.recoil * 0.025 + this.meleePulse * 0.018;

    for (const effect of [...this.effects]) {
      effect.life -= dt;
      const normalized = Math.max(0, effect.life / effect.maxLife);
      if (effect.kind === 'particles') this.updateParticles(effect, dt, normalized);
      if (effect.kind === 'flash') {
        effect.object.scale.setScalar(0.65 + (1 - normalized) * 1.2);
        for (const child of effect.object.children) {
          if (child.material) child.material.opacity = normalized;
          if (child.isLight) child.intensity = normalized * 7.5;
        }
      }
      if (effect.kind === 'arc') {
        effect.object.material.opacity = normalized * 0.78;
        effect.object.scale.setScalar(0.85 + (1 - normalized) * 0.8);
        effect.object.rotation.y += dt * 4.6;
      }
      if (effect.kind === 'pulse') {
        effect.object.material.opacity = normalized * 0.62;
        const scale = 0.6 + (1 - normalized) * effect.radius;
        effect.object.scale.setScalar(scale);
      }
      if (effect.life <= 0) this.removeEffect(effect);
    }
  }

  /** @param {{ x: number, z: number } | null} aimPoint @param {number} elapsed */
  updateAimMarker(aimPoint, elapsed) {
    const selected = this.state.inventory.selectedId;
    const visible = Boolean(aimPoint && ['revolver', 'shovel'].includes(selected ?? ''));
    this.aimRing.visible = visible;
    if (!visible || !aimPoint) return;
    this.aimRing.position.set(aimPoint.x, this.world.terrain.getHeight(aimPoint.x, aimPoint.z) + 0.12, aimPoint.z);
    const distance = Math.hypot(aimPoint.x - this.player.position.x, aimPoint.z - this.player.position.z);
    const valid = selected === 'revolver' ? distance <= 34 : distance <= 6.2;
    this.aimRing.material.color.set(valid ? (selected === 'shovel' ? 0xd0a16d : 0xe38b35) : 0xaa3027);
    this.aimDot.material.color.copy(this.aimRing.material.color);
    const pulse = 0.92 + Math.sin(elapsed * 5.4) * 0.09;
    this.aimRing.scale.setScalar(pulse);
    this.aimRing.material.opacity = valid ? 0.68 : 0.42;
  }

  /** @param {any} effect @param {number} dt @param {number} normalized */
  updateParticles(effect, dt, normalized) {
    const positions = effect.object.geometry.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const offset = index * 3;
      effect.velocities[offset + 1] -= effect.gravity * dt;
      positions.setXYZ(
        index,
        positions.getX(index) + effect.velocities[offset] * dt,
        positions.getY(index) + effect.velocities[offset + 1] * dt,
        positions.getZ(index) + effect.velocities[offset + 2] * dt
      );
    }
    positions.needsUpdate = true;
    effect.object.material.opacity = normalized * 0.9;
    effect.object.material.size = effect.baseSize * (0.45 + normalized * 0.75);
  }

  /** @param {any} effect */
  removeEffect(effect) {
    const index = this.effects.indexOf(effect);
    if (index >= 0) this.effects.splice(index, 1);
    effect.object.traverse?.((child) => {
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose?.());
      else child.material?.dispose?.();
    });
    effect.object.geometry?.dispose?.();
    effect.object.material?.dispose?.();
    effect.object.removeFromParent();
  }

  dispose() {
    for (const dispose of this.disposers) dispose();
    for (const effect of [...this.effects]) this.removeEffect(effect);
    this.flashlightBeam.removeFromParent();
    this.flashlightBeam.geometry.dispose();
    this.flashlightBeam.material.dispose();
    this.root.removeFromParent();
    this.root.traverse((child) => {
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    });
    this.glowTexture?.dispose?.();
    this.bloodTexture?.dispose?.();
  }
}
