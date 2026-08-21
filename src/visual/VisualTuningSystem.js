// @ts-check

import * as THREE from '../core/three.js';

function createRadialTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const gradient = context.createRadialGradient(64, 64, 1, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,255,255,.92)');
  gradient.addColorStop(0.28, 'rgba(255,255,255,.48)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFlashlightTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.clearRect(0, 0, 256, 512);
  const gradient = context.createLinearGradient(0, 512, 0, 0);
  gradient.addColorStop(0, 'rgba(255,255,255,.62)');
  gradient.addColorStop(0.12, 'rgba(255,255,255,.45)');
  gradient.addColorStop(0.58, 'rgba(255,255,255,.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(112, 510);
  context.quadraticCurveTo(128, 492, 144, 510);
  context.lineTo(246, 10);
  context.quadraticCurveTo(128, -5, 10, 10);
  context.closePath();
  context.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class VisualTuningSystem {
  /** @param {import('../world/WorldBuilder.js').WorldBuilder} world @param {import('../effects/EffectsSystem.js').EffectsSystem} effects @param {import('../entities/Player.js').Player} player */
  constructor(world, effects, player) {
    this.world = world;
    this.effects = effects;
    this.player = player;
    this.compositionRoot = new THREE.Group();
    this.compositionRoot.name = 'Pine Ridge composition lighting';
    this.world.root.add(this.compositionRoot);
    this.compositionLights = [];
    this.lightPools = [];
    this.poolTexture = createRadialTexture();
    this.flashlightTexture = createFlashlightTexture();
    this.refineRoadMarkings();
    this.refineMaterials();
    this.refineFlashlight();
    this.createCompositionLighting();
  }

  refineRoadMarkings() {
    const roadLine = this.world.materials.roadLine;
    roadLine.color.set(0x978e70);
    roadLine.roughness = 1;
    roadLine.metalness = 0;
    roadLine.emissive.set(0x070604);
    roadLine.emissiveIntensity = 0.025;
    this.world.root.traverse((child) => {
      if (!child.isMesh || child.material !== roadLine || child.geometry?.type !== 'BoxGeometry') return;
      const parameters = child.geometry.parameters ?? {};
      const width = Number(parameters.width) || 0;
      const depth = Number(parameters.depth) || 0;
      if (depth > width) {
        child.scale.x *= 0.62;
        child.scale.z *= 0.36;
      } else {
        child.scale.x *= 0.36;
        child.scale.z *= 0.62;
      }
      child.position.y = Math.min(child.position.y, 0.14);
      child.castShadow = false;
    });
  }

  refineMaterials() {
    this.world.materials.asphalt.color.set(0x505753);
    this.world.materials.asphalt.roughness = 1;
    this.world.materials.darkWall.color.offsetHSL(0, -0.025, 0.05);
    this.world.materials.wall.color.offsetHSL(0, -0.018, 0.025);
    this.world.materials.roof.color.offsetHSL(0, -0.02, 0.045);
    this.world.materials.foliage.color.offsetHSL(0, -0.025, 0.04);
    this.world.materials.foliageLight.color.offsetHSL(0, -0.018, 0.035);
  }

  refineFlashlight() {
    const volume = this.effects.flashlightBeam;
    volume.visible = false;
    volume.material.opacity = 0;

    const material = new THREE.MeshBasicMaterial({
      map: this.flashlightTexture,
      color: 0xffd59c,
      transparent: true,
      opacity: 0.08,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    this.groundBeam = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 13.2), material);
    this.groundBeam.rotation.x = Math.PI * 0.5;
    this.groundBeam.position.set(0.18, 0.18, 6.55);
    this.groundBeam.renderOrder = 2;
    this.player.root.add(this.groundBeam);

    this.player.flashlight.color.set(0xffdda4);
    this.player.flashlight.intensity = 20;
    this.player.flashlight.distance = 28;
    this.player.flashlight.angle = Math.PI * 0.16;
    this.player.flashlight.penumbra = 0.68;
    this.player.flashlight.decay = 1.65;
    this.player.flashlightTarget.position.set(0, 0.42, 10.5);
  }

  createCompositionLighting() {
    this.addWarmLight(12.2, 4.8, 1.6, 9.2, 17);
    this.addWarmLight(24.4, 4.8, 1.6, 9.2, 17);
    this.addWarmLight(17.7, 5.3, 7.6, 10.5, 18);
    this.addWarmLight(-21.4, 3.2, -4.2, 5.8, 11);

    this.addLightPool(12.2, 2.4, 8.2, 6.6, 0.42);
    this.addLightPool(24.4, 2.4, 8.2, 6.6, 0.42);
    this.addLightPool(17.7, 7.6, 11.5, 8.5, 0.48);
    this.addLightPool(-21.4, -4.1, 5.4, 4.3, 0.28);
  }

  /** @param {number} x @param {number} y @param {number} z @param {number} intensity @param {number} distance */
  addWarmLight(x, y, z, intensity, distance) {
    const light = new THREE.PointLight(0xffae61, intensity, distance, 1.8);
    light.position.set(x, y, z);
    light.userData.baseIntensity = intensity;
    this.compositionRoot.add(light);
    this.compositionLights.push(light);
  }

  /** @param {number} x @param {number} z @param {number} width @param {number} depth @param {number} opacity */
  addLightPool(x, z, width, depth, opacity) {
    const material = new THREE.MeshBasicMaterial({
      map: this.poolTexture,
      color: 0xffa85d,
      transparent: true,
      opacity,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    pool.rotation.x = -Math.PI * 0.5;
    pool.position.set(x, this.world.terrain.getHeight(x, z) + 0.16, z);
    pool.scale.set(width, depth, 1);
    pool.userData.baseOpacity = opacity;
    pool.renderOrder = 1;
    this.compositionRoot.add(pool);
    this.lightPools.push(pool);
  }

  /** @param {{ night: number, storm: number }} lighting @param {number} elapsed */
  update(lighting, elapsed) {
    const nightFactor = 0.16 + lighting.night * 0.94;
    for (const light of this.compositionLights) {
      light.intensity = light.userData.baseIntensity * nightFactor * (1 - lighting.storm * 0.08);
    }
    for (const pool of this.lightPools) {
      pool.material.opacity = pool.userData.baseOpacity * nightFactor * (1 - lighting.storm * 0.06);
    }

    this.effects.flashlightBeam.visible = false;
    this.effects.flashlightBeam.material.opacity = 0;
    this.groundBeam.visible = this.player.state.flashlightOn && lighting.night > 0.16;
    this.groundBeam.material.opacity = (0.025 + lighting.night * 0.072) * (0.96 + Math.sin(elapsed * 11.7) * 0.018);
    this.player.flashlight.intensity = (12 + lighting.night * 10) * (1 - lighting.storm * 0.08);
  }

  dispose() {
    this.groundBeam.removeFromParent();
    this.groundBeam.geometry.dispose();
    this.groundBeam.material.dispose();
    this.compositionRoot.removeFromParent();
    this.compositionRoot.traverse((child) => {
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose?.());
      else child.material?.dispose?.();
    });
    this.poolTexture?.dispose?.();
    this.flashlightTexture?.dispose?.();
  }
}
