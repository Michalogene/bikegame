// @ts-check

import * as THREE from '../core/three.js';

export class VisualTuningSystem {
  /** @param {import('../world/WorldBuilder.js').WorldBuilder} world @param {import('../effects/EffectsSystem.js').EffectsSystem} effects @param {import('../entities/Player.js').Player} player */
  constructor(world, effects, player) {
    this.world = world;
    this.effects = effects;
    this.player = player;
    this.refineRoadMarkings();
    this.refineMaterials();
    this.refineFlashlight();
  }

  refineRoadMarkings() {
    const roadLine = this.world.materials.roadLine;
    roadLine.color.set(0xa69f7c);
    roadLine.roughness = 1;
    roadLine.metalness = 0;
    roadLine.emissive.set(0x080704);
    roadLine.emissiveIntensity = 0.035;
    this.world.root.traverse((child) => {
      if (!child.isMesh || child.material !== roadLine || child.geometry?.type !== 'BoxGeometry') return;
      const parameters = child.geometry.parameters ?? {};
      const width = Number(parameters.width) || 0;
      const depth = Number(parameters.depth) || 0;
      if (depth > width) {
        child.scale.x *= 0.72;
        child.scale.z *= 0.5;
      } else {
        child.scale.x *= 0.5;
        child.scale.z *= 0.72;
      }
      child.position.y = Math.min(child.position.y, 0.145);
      child.castShadow = false;
    });
  }

  refineMaterials() {
    this.world.materials.asphalt.color.set(0x777c74);
    this.world.materials.asphalt.roughness = 1;
    this.world.materials.darkWall.color.offsetHSL(0, -0.03, 0.035);
    this.world.materials.roof.color.offsetHSL(0, -0.02, 0.025);
    this.world.materials.foliage.color.offsetHSL(0, -0.03, 0.025);
    this.world.materials.foliageLight.color.offsetHSL(0, -0.02, 0.025);
  }

  refineFlashlight() {
    const beam = this.effects.flashlightBeam;
    beam.geometry.dispose();
    beam.geometry = new THREE.CylinderGeometry(1.5, 0.055, 11.4, 20, 1, true);
    beam.position.set(0.18, 1.68, 5.78);
    beam.material.color.set(0xffd39a);
    beam.material.opacity = 0.012;
    beam.material.depthTest = true;
    beam.material.depthWrite = false;
    beam.material.blending = THREE.AdditiveBlending;
    this.player.flashlight.intensity = 13;
    this.player.flashlight.distance = 26;
    this.player.flashlight.angle = Math.PI * 0.14;
    this.player.flashlight.penumbra = 0.72;
    this.player.flashlight.decay = 1.7;
  }

  /** @param {{ night: number, storm: number }} lighting @param {number} elapsed */
  update(lighting, elapsed) {
    const beam = this.effects.flashlightBeam;
    beam.visible = this.player.state.flashlightOn && lighting.night > 0.2;
    beam.material.opacity = (0.003 + lighting.night * 0.014) * (0.96 + Math.sin(elapsed * 11.7) * 0.02);
    beam.scale.x = 0.98 + lighting.storm * 0.06;
    beam.scale.z = 0.98 + lighting.storm * 0.06;
    this.player.flashlight.intensity = (8.5 + lighting.night * 7.5) * (1 - lighting.storm * 0.1);
  }
}
