// @ts-check

import * as THREE from '../core/three.js';
import { dampAngle } from '../core/math.js';

export class Player {
  /** @param {import('../state/GameState.js').GameState} state @param {import('../world/WorldBuilder.js').WorldBuilder} world */
  constructor(state, world) {
    this.state = state;
    this.world = world;
    this.radius = 0.56;
    this.speed = 4.3;
    this.sprintSpeed = 7.0;
    this.velocity = { x: 0, z: 0 };
    this.moving = false;
    this.sprinting = false;
    this.noise = 0;
    this.animationTime = 0;
    this.stepTimer = 0;
    this.aiming = false;
    this.root = new THREE.Group();
    this.root.name = 'Survivor player';
    this.model = this.createModel();
    this.root.add(this.model);
    this.root.position.set(state.player.x, world.terrain.getHeight(state.player.x, state.player.z), state.player.z);
    this.root.rotation.y = state.player.rotation;
    world.root.add(this.root);

    this.flashlight = new THREE.SpotLight(0xffe0a4, 14, 23, Math.PI * 0.18, 0.55, 1.55);
    this.flashlight.position.set(0.24, 2.15, 0.25);
    this.flashlight.castShadow = false;
    this.flashlightTarget = new THREE.Object3D();
    this.flashlightTarget.position.set(0, 0.55, 8);
    this.root.add(this.flashlight, this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    this.flashlight.visible = state.flashlightOn;
  }

  createModel() {
    const group = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0x8b674c, roughness: 0.9 });
    const jacket = new THREE.MeshStandardMaterial({ color: 0x343b35, roughness: 0.96 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x2c3232, roughness: 0.96 });
    const leather = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.9 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x131817, roughness: 0.85 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 0.72, 4, 8), jacket);
    torso.position.y = 1.75;
    torso.castShadow = true;
    group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), skin);
    head.position.y = 2.75;
    head.scale.z = 0.9;
    head.castShadow = true;
    group.add(head);
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.22, 12), dark);
    capTop.position.y = 3.03;
    group.add(capTop);
    const capBill = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.34), dark);
    capBill.position.set(0, 2.99, 0.27);
    group.add(capBill);

    this.leftLeg = new THREE.Group();
    this.rightLeg = new THREE.Group();
    for (const [leg, x] of [[this.leftLeg, -0.22], [this.rightLeg, 0.22]]) {
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.63, 3, 7), pants);
      upper.position.y = -0.45;
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.62), leather);
      boot.position.set(0, -1.0, 0.12);
      upper.castShadow = true;
      boot.castShadow = true;
      leg.add(upper, boot);
      leg.position.set(x, 1.35, 0);
      group.add(leg);
    }

    this.leftArm = new THREE.Group();
    this.rightArm = new THREE.Group();
    for (const [arm, x] of [[this.leftArm, -0.58], [this.rightArm, 0.58]]) {
      const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.62, 3, 7), jacket);
      limb.position.y = -0.38;
      limb.castShadow = true;
      arm.add(limb);
      arm.position.set(x, 2.25, 0);
      group.add(arm);
    }

    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.05, 0.42), leather);
    backpack.position.set(0, 1.95, -0.48);
    backpack.rotation.x = -0.08;
    backpack.castShadow = true;
    group.add(backpack);
    const bedroll = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 1.0, 10), new THREE.MeshStandardMaterial({ color: 0x626143, roughness: 1 }));
    bedroll.rotation.z = Math.PI * 0.5;
    bedroll.position.set(0, 2.56, -0.55);
    group.add(bedroll);

    const held = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.72, 8), dark);
    held.rotation.x = Math.PI * 0.5;
    held.position.set(0.22, 1.72, 0.52);
    group.add(held);
    return group;
  }

  /** @param {number} dt @param {{ x: number, z: number, moving: boolean }} direction @param {boolean} wantsSprint */
  update(dt, direction, wantsSprint) {
    this.moving = direction.moving;
    this.sprinting = wantsSprint && this.moving && this.state.survival.stamina > 2;
    const terrainFactor = this.world.terrain.travelFactor(this.root.position.x, this.root.position.z);
    const targetSpeed = (this.sprinting ? this.sprintSpeed : this.speed) * terrainFactor;
    const acceleration = this.sprinting ? 14 : 18;
    this.velocity.x += (direction.x * targetSpeed - this.velocity.x) * Math.min(1, acceleration * dt);
    this.velocity.z += (direction.z * targetSpeed - this.velocity.z) * Math.min(1, acceleration * dt);
    if (!this.moving) {
      this.velocity.x *= Math.max(0, 1 - dt * 12);
      this.velocity.z *= Math.max(0, 1 - dt * 12);
    }

    const fromX = this.root.position.x;
    const fromZ = this.root.position.z;
    const targetX = fromX + this.velocity.x * dt;
    const targetZ = fromZ + this.velocity.z * dt;
    const resolved = this.world.collider.resolveMovement(fromX, fromZ, targetX, targetZ, this.radius, 'player');
    this.root.position.x = resolved.x;
    this.root.position.z = resolved.z;
    if (resolved.blocked) {
      if (resolved.x === fromX) this.velocity.x = 0;
      if (resolved.z === fromZ) this.velocity.z = 0;
    }
    const ground = this.world.terrain.getHeight(this.root.position.x, this.root.position.z);
    this.root.position.y += (ground - this.root.position.y) * Math.min(1, dt * 18);

    const actualSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (actualSpeed > 0.25 && !this.aiming) {
      const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
      this.root.rotation.y = dampAngle(this.root.rotation.y, targetRotation, 13, dt);
    }
    this.state.player.x = this.root.position.x;
    this.state.player.z = this.root.position.z;
    this.state.player.rotation = this.root.rotation.y;

    this.animationTime += dt * actualSpeed * 2.0;
    const stride = Math.sin(this.animationTime) * Math.min(0.75, actualSpeed * 0.12);
    this.leftLeg.rotation.x = stride;
    this.rightLeg.rotation.x = -stride;
    this.leftArm.rotation.x = -stride * 0.65;
    this.rightArm.rotation.x = stride * 0.45 - 0.25;
    this.model.position.y = Math.abs(Math.sin(this.animationTime * 0.5)) * Math.min(0.08, actualSpeed * 0.012);
    this.model.rotation.z = Math.sin(this.animationTime * 0.5) * Math.min(0.025, actualSpeed * 0.004);

    this.noise = actualSpeed * (this.sprinting ? 1.6 : 0.75) + (this.state.flashlightOn ? 0.2 : 0);
    if (actualSpeed > 1) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.sprinting ? 0.28 : 0.43;
        this.state.bus.emit('audio:step', { x: this.root.position.x, z: this.root.position.z, sprint: this.sprinting });
      }
    }
  }

  /** @param {number} x @param {number} z @param {number} dt */
  aimAt(x, z, dt = 1 / 60) {
    const dx = x - this.root.position.x;
    const dz = z - this.root.position.z;
    if (Math.hypot(dx, dz) < 0.1) return;
    this.aiming = true;
    this.root.rotation.y = dampAngle(this.root.rotation.y, Math.atan2(dx, dz), 22, dt);
  }

  stopAiming() {
    this.aiming = false;
  }

  setFlashlight(value) {
    this.state.flashlightOn = value;
    this.flashlight.visible = value;
  }

  toggleFlashlight() {
    this.setFlashlight(!this.state.flashlightOn);
    this.state.bus.emit('toast', this.state.flashlightOn ? 'Flashlight on' : 'Flashlight off');
  }

  get position() {
    return this.root.position;
  }
}
