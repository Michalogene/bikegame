// @ts-check

import * as THREE from '../core/three.js';
import { Random } from '../core/Random.js';
import { dampAngle, distance2D } from '../core/math.js';

class Enemy {
  /** @param {EnemySystem} system @param {string} id @param {number} x @param {number} z @param {number} tier */
  constructor(system, id, x, z, tier) {
    this.system = system;
    this.id = id;
    this.tier = tier;
    this.health = tier >= 2 ? 135 : 92;
    this.maxHealth = this.health;
    this.speed = tier >= 2 ? 3.45 : 2.75 + system.random.range(-0.25, 0.35);
    this.root = this.createModel();
    this.root.position.set(x, system.world.terrain.getHeight(x, z), z);
    this.root.rotation.y = system.random.range(0, Math.PI * 2);
    this.velocity = { x: 0, z: 0 };
    this.state = 'wander';
    this.wanderAngle = system.random.range(0, Math.PI * 2);
    this.wanderTimer = system.random.range(1.5, 4.0);
    this.attackCooldown = system.random.range(0, 0.7);
    this.hitTimer = 0;
    this.dead = false;
    this.deathTimer = 0;
    this.animationTime = system.random.range(0, 10);
    this.lastKnown = { x, z };
    this.system.root.add(this.root);
  }

  createModel() {
    const group = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: this.tier >= 2 ? 0x6a5b49 : 0x707065, roughness: 0.95 });
    const shirt = new THREE.MeshStandardMaterial({ color: this.tier >= 2 ? 0x592d27 : this.system.random.pick([0x4a4136, 0x303a37, 0x474044]), roughness: 1 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x252a29, roughness: 1 });
    const blood = new THREE.MeshStandardMaterial({ color: 0x561a17, roughness: 0.9 });
    this.materials = [skin, shirt, pants];

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(this.tier >= 2 ? 0.5 : 0.42, 0.72, 4, 8), shirt);
    torso.position.y = 1.55;
    torso.rotation.z = this.system.random.range(-0.09, 0.09);
    torso.castShadow = true;
    group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(this.tier >= 2 ? 0.36 : 0.32, 10, 8), skin);
    head.position.set(0.05, 2.47, 0.08);
    head.castShadow = true;
    group.add(head);
    const wound = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 5), blood);
    wound.scale.set(1, 0.45, 0.25);
    wound.position.set(-0.18, 2.48, 0.29);
    group.add(wound);

    this.leftLeg = new THREE.Group();
    this.rightLeg = new THREE.Group();
    for (const [leg, x] of [[this.leftLeg, -0.2], [this.rightLeg, 0.2]]) {
      const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.58, 3, 6), pants);
      limb.position.y = -0.4;
      limb.castShadow = true;
      leg.add(limb);
      leg.position.set(x, 1.1, 0);
      group.add(leg);
    }
    this.leftArm = new THREE.Group();
    this.rightArm = new THREE.Group();
    for (const [arm, x] of [[this.leftArm, -0.5], [this.rightArm, 0.5]]) {
      const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.65, 3, 6), shirt);
      limb.position.y = -0.4;
      limb.castShadow = true;
      arm.add(limb);
      arm.position.set(x, 1.98, 0.16);
      arm.rotation.x = -0.8;
      group.add(arm);
    }
    if (this.tier >= 2) group.scale.setScalar(1.15);
    return group;
  }

  get position() {
    return this.root.position;
  }

  /** @param {number} amount @param {string} [source] */
  damage(amount, source = 'Survivor') {
    if (this.dead) return;
    this.health -= amount;
    this.hitTimer = 0.16;
    this.system.state.bus.emit('enemy:damaged', { enemy: this, amount, source });
    if (this.health <= 0) this.die(source);
  }

  /** @param {string} source */
  die(source) {
    if (this.dead) return;
    this.dead = true;
    this.deathTimer = 0;
    this.system.state.enemyKills += 1;
    this.system.state.experience += this.tier >= 2 ? 48 : 24;
    this.system.state.bus.emit('enemy:killed', { enemy: this, source });
    this.system.state.bus.emit('audio:enemyDeath');
    const loot = this.system.world.generateLoot('enemy');
    if (loot.length) this.system.world.addLootBag(this.position.x, this.position.z, 'Fallen infected', loot);
  }

  /** @param {number} dt @param {import('./Player.js').Player} player @param {boolean} nightfall */
  update(dt, player, nightfall) {
    if (this.dead) {
      this.deathTimer += dt;
      this.root.rotation.z += (-Math.PI * 0.5 - this.root.rotation.z) * Math.min(1, dt * 5);
      this.root.position.y = this.system.world.terrain.getHeight(this.position.x, this.position.z) + 0.2;
      if (this.deathTimer > 22) {
        this.root.visible = false;
      }
      return;
    }

    this.attackCooldown -= dt;
    this.hitTimer = Math.max(0, this.hitTimer - dt);
    for (const material of this.materials) {
      material.emissive?.set(this.hitTimer > 0 ? 0x8f120f : 0x000000);
      if (material.emissiveIntensity !== undefined) material.emissiveIntensity = this.hitTimer > 0 ? 1.5 : 0;
    }

    const px = player.position.x;
    const pz = player.position.z;
    const distance = distance2D(this.position.x, this.position.z, px, pz);
    const detection = (nightfall ? 23 : 12) + player.noise * 1.9 + (player.state.flashlightOn ? 3.5 : 0);
    const canSee = distance < detection && !this.system.world.collider.lineBlocked(this.position.x, this.position.z, px, pz);
    if (canSee || distance < 4.5) {
      this.state = 'chase';
      this.lastKnown.x = px;
      this.lastKnown.z = pz;
    } else if (this.state === 'chase' && distance2D(this.position.x, this.position.z, this.lastKnown.x, this.lastKnown.z) < 1.2) {
      this.state = 'wander';
      this.wanderTimer = 0;
    }

    let targetX = 0;
    let targetZ = 0;
    if (this.state === 'chase') {
      targetX = this.lastKnown.x;
      targetZ = this.lastKnown.z;
    } else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = this.system.random.range(1.8, 4.8);
        this.wanderAngle += this.system.random.range(-1.7, 1.7);
      }
      targetX = this.position.x + Math.sin(this.wanderAngle) * 5;
      targetZ = this.position.z + Math.cos(this.wanderAngle) * 5;
    }

    const dx = targetX - this.position.x;
    const dz = targetZ - this.position.z;
    const length = Math.hypot(dx, dz) || 1;
    let dirX = dx / length;
    let dirZ = dz / length;

    for (const other of this.system.enemies) {
      if (other === this || other.dead) continue;
      const separationDistance = distance2D(this.position.x, this.position.z, other.position.x, other.position.z);
      if (separationDistance > 0.01 && separationDistance < 1.25) {
        dirX += (this.position.x - other.position.x) / separationDistance * 0.55;
        dirZ += (this.position.z - other.position.z) / separationDistance * 0.55;
      }
    }
    const dirLength = Math.hypot(dirX, dirZ) || 1;
    dirX /= dirLength;
    dirZ /= dirLength;

    const currentSpeed = this.state === 'chase' ? this.speed * (nightfall ? 1.17 : 1) : this.speed * 0.43;
    this.velocity.x += (dirX * currentSpeed - this.velocity.x) * Math.min(1, dt * 5.5);
    this.velocity.z += (dirZ * currentSpeed - this.velocity.z) * Math.min(1, dt * 5.5);
    if (distance < 1.55) {
      this.velocity.x *= 0.1;
      this.velocity.z *= 0.1;
      if (this.attackCooldown <= 0) {
        this.attackCooldown = this.tier >= 2 ? 0.9 : 1.25;
        player.state.damage(this.tier >= 2 ? 15 : 8, this.tier >= 2 ? 'Nightfall brute' : 'Infected');
        player.state.bus.emit('audio:enemyAttack');
      }
    }

    const fromX = this.position.x;
    const fromZ = this.position.z;
    let resolved = this.system.world.collider.resolveMovement(
      fromX, fromZ,
      fromX + this.velocity.x * dt,
      fromZ + this.velocity.z * dt,
      this.tier >= 2 ? 0.62 : 0.5
    );
    if (resolved.blocked && this.state === 'chase') {
      const side = this.system.random.chance(0.5) ? 1 : -1;
      const sideX = -dirZ * side;
      const sideZ = dirX * side;
      resolved = this.system.world.collider.resolveMovement(fromX, fromZ, fromX + sideX * currentSpeed * dt, fromZ + sideZ * currentSpeed * dt, 0.5);
    }
    this.position.x = resolved.x;
    this.position.z = resolved.z;
    this.position.y += (this.system.world.terrain.getHeight(this.position.x, this.position.z) - this.position.y) * Math.min(1, dt * 14);
    this.root.rotation.y = dampAngle(this.root.rotation.y, Math.atan2(this.velocity.x, this.velocity.z), 9, dt);

    const motion = Math.hypot(this.velocity.x, this.velocity.z);
    this.animationTime += dt * motion * 2.6;
    const stride = Math.sin(this.animationTime) * Math.min(0.65, motion * 0.18);
    this.leftLeg.rotation.x = stride;
    this.rightLeg.rotation.x = -stride;
    this.leftArm.rotation.x = -0.85 - stride * 0.35;
    this.rightArm.rotation.x = -0.85 + stride * 0.35;
    this.root.position.y += Math.abs(Math.sin(this.animationTime * 0.5)) * 0.012;
    this.system.buildingSystem.triggerSnare(this);
  }
}

export class EnemySystem {
  /** @param {import('../state/GameState.js').GameState} state @param {import('../world/WorldBuilder.js').WorldBuilder} world @param {import('../game/BuildingSystem.js').BuildingSystem} buildingSystem */
  constructor(state, world, buildingSystem) {
    this.state = state;
    this.world = world;
    this.buildingSystem = buildingSystem;
    this.random = new Random(0xdead1178);
    this.root = new THREE.Group();
    this.root.name = 'Enemy population';
    world.root.add(this.root);
    /** @type {Enemy[]} */
    this.enemies = [];
    this.spawnCounter = 0;
    this.waveTimer = 3;
    this.effects = [];
    this.disposers = [
      state.bus.on('nightfall:start', () => {
        this.waveTimer = 0.5;
        for (let index = 0; index < 3; index += 1) this.spawnAround(state.player.x, state.player.z, index === 2 ? 2 : 1);
      })
    ];
    this.spawnInitial();
  }

  spawnInitial() {
    const positions = [
      [-43, -18], [45, -34], [-55, 31], [29, 52], [-20, -57], [58, 42], [14, -63]
    ];
    for (const [index, [x, z]] of positions.entries()) this.spawn(x, z, index === 5 ? 2 : 1);
  }

  /** @param {number} x @param {number} z @param {number} tier */
  spawn(x, z, tier = 1) {
    if (this.enemies.filter((enemy) => !enemy.dead).length >= 34) return null;
    const enemy = new Enemy(this, `infected-${this.spawnCounter += 1}`, x, z, tier);
    this.enemies.push(enemy);
    return enemy;
  }

  /** @param {number} centerX @param {number} centerZ @param {number} tier */
  spawnAround(centerX, centerZ, tier = 1) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const angle = this.random.range(0, Math.PI * 2);
      const distance = this.random.range(30, 47);
      const x = centerX + Math.cos(angle) * distance;
      const z = centerZ + Math.sin(angle) * distance;
      if (Math.abs(x) > 82 || Math.abs(z) > 82 || this.world.collider.isBlocked(x, z, 0.8)) continue;
      return this.spawn(x, z, tier);
    }
    return null;
  }

  /** @param {number} dt @param {import('./Player.js').Player} player */
  update(dt, player) {
    const nightfall = this.state.clock.nightfallActive;
    if (nightfall) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.waveTimer = this.random.range(9, 15);
        const tier = this.random.chance(0.22) ? 2 : 1;
        const count = this.random.int(2, 4);
        for (let index = 0; index < count; index += 1) this.spawnAround(player.position.x, player.position.z, tier);
        this.state.bus.emit('toast', 'Movement detected beyond the treeline.');
      }
    }
    for (const enemy of this.enemies) enemy.update(dt, player, nightfall);
    this.updateEffects(dt);
  }

  /** @param {import('./Player.js').Player} player @param {number} damage @param {number} range */
  melee(player, damage, range) {
    let target = null;
    let bestDistance = range;
    const forwardX = Math.sin(player.root.rotation.y);
    const forwardZ = Math.cos(player.root.rotation.y);
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.position.x - player.position.x;
      const dz = enemy.position.z - player.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > bestDistance) continue;
      const dot = (dx * forwardX + dz * forwardZ) / Math.max(0.001, distance);
      if (dot < 0.05) continue;
      target = enemy;
      bestDistance = distance;
    }
    if (!target) return false;
    target.damage(damage, 'Melee');
    target.position.x += forwardX * 0.45;
    target.position.z += forwardZ * 0.45;
    this.createImpact(target.position.x, target.position.y + 1.3, target.position.z, 0xaa241b);
    return true;
  }

  /** @param {{ x: number, z: number }} from @param {{ x: number, z: number }} aim @param {number} damage @param {number} range */
  shoot(from, aim, damage, range) {
    const dx = aim.x - from.x;
    const dz = aim.z - from.z;
    const length = Math.hypot(dx, dz) || 1;
    const dirX = dx / length;
    const dirZ = dz / length;
    const end = { x: from.x + dirX * range, z: from.z + dirZ * range };
    let target = null;
    let targetDistance = range;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const ex = enemy.position.x - from.x;
      const ez = enemy.position.z - from.z;
      const along = ex * dirX + ez * dirZ;
      if (along < 0 || along > targetDistance) continue;
      const perpendicular = Math.abs(ex * dirZ - ez * dirX);
      if (perpendicular < (enemy.tier >= 2 ? 0.85 : 0.62) && !this.world.collider.lineBlocked(from.x, from.z, enemy.position.x, enemy.position.z)) {
        target = enemy;
        targetDistance = along;
      }
    }
    const hitEnd = target ? { x: target.position.x, z: target.position.z } : end;
    this.createTracer(from.x, from.z, hitEnd.x, hitEnd.z);
    if (target) {
      target.damage(damage, 'Firearm');
      this.createImpact(target.position.x, target.position.y + 1.4, target.position.z, 0xc73928);
      return true;
    }
    this.createImpact(hitEnd.x, this.world.terrain.getHeight(hitEnd.x, hitEnd.z) + 0.1, hitEnd.z, 0xb79765);
    return false;
  }

  /** @param {number} x1 @param {number} z1 @param {number} x2 @param {number} z2 */
  createTracer(x1, z1, x2, z2) {
    const y1 = this.world.terrain.getHeight(x1, z1) + 1.6;
    const y2 = this.world.terrain.getHeight(x2, z2) + 1.0;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2)
    ]);
    const material = new THREE.LineBasicMaterial({ color: 0xffd379, transparent: true, opacity: 0.92 });
    const line = new THREE.Line(geometry, material);
    this.world.root.add(line);
    this.effects.push({ object: line, life: 0.065, maxLife: 0.065 });
  }

  /** @param {number} x @param {number} y @param {number} z @param {number} color */
  createImpact(x, y, z, color) {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 5), material);
    mesh.position.set(x, y, z);
    this.world.root.add(mesh);
    this.effects.push({ object: mesh, life: 0.32, maxLife: 0.32 });
  }

  /** @param {number} dt */
  updateEffects(dt) {
    for (const effect of [...this.effects]) {
      effect.life -= dt;
      const t = Math.max(0, effect.life / effect.maxLife);
      if (effect.object.material) effect.object.material.opacity = t;
      effect.object.scale?.setScalar(1 + (1 - t) * 2.5);
      if (effect.life <= 0) {
        effect.object.removeFromParent();
        effect.object.geometry?.dispose?.();
        effect.object.material?.dispose?.();
        this.effects.splice(this.effects.indexOf(effect), 1);
      }
    }
  }

  get aliveCount() {
    return this.enemies.filter((enemy) => !enemy.dead).length;
  }

  dispose() {
    for (const dispose of this.disposers) dispose();
  }
}
