// @ts-check

import * as THREE from '../core/three.js';
import { clamp, lerp } from '../core/math.js';

export class RendererSystem {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050b11);
    this.scene.fog = new THREE.FogExp2(0x071016, 0.0125);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(root.clientWidth, root.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.domElement.setAttribute('aria-label', 'Afterdark County 3D world');
    root.append(this.renderer.domElement);

    this.hemisphere = new THREE.HemisphereLight(0x6a86a0, 0x172018, 1.1);
    this.scene.add(this.hemisphere);

    this.keyLight = new THREE.DirectionalLight(0x9fb8d7, 2.2);
    this.keyLight.position.set(-42, 58, 30);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.left = -70;
    this.keyLight.shadow.camera.right = 70;
    this.keyLight.shadow.camera.top = 70;
    this.keyLight.shadow.camera.bottom = -70;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 150;
    this.keyLight.shadow.bias = -0.00045;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0x33506f, 0.45);
    this.fillLight.position.set(38, 22, -45);
    this.scene.add(this.fillLight);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(root);
  }

  resize() {
    const width = Math.max(1, this.root.clientWidth);
    const height = Math.max(1, this.root.clientHeight);
    this.renderer.setSize(width, height, false);
  }

  /** @param {{ daylight: number, night: number, storm: number }} lighting */
  updateLighting(lighting) {
    const daylight = clamp(lighting.daylight, 0, 1);
    const night = clamp(lighting.night, 0, 1);
    const storm = clamp(lighting.storm, 0, 1);
    this.hemisphere.intensity = lerp(0.34, 1.38, daylight) * (1 - storm * 0.3);
    this.hemisphere.color.setRGB(
      lerp(0.28, 0.65, daylight),
      lerp(0.38, 0.77, daylight),
      lerp(0.52, 0.9, daylight)
    );
    this.hemisphere.groundColor.setRGB(0.075, lerp(0.09, 0.17, daylight), 0.075);
    this.keyLight.intensity = lerp(2.05, 3.25, daylight) * (1 - storm * 0.45);
    this.keyLight.color.setRGB(
      lerp(0.53, 1.0, daylight),
      lerp(0.66, 0.87, daylight),
      lerp(0.88, 0.69, daylight)
    );
    this.fillLight.intensity = 0.22 + night * 0.42;
    const fogColor = new THREE.Color().setRGB(
      lerp(0.018, 0.26, daylight),
      lerp(0.045, 0.34, daylight),
      lerp(0.065, 0.38, daylight)
    );
    this.scene.background.copy(fogColor);
    this.scene.fog.color.copy(fogColor);
    this.scene.fog.density = lerp(0.0135, 0.006, daylight) + storm * 0.006;
    this.renderer.toneMappingExposure = lerp(0.82, 1.05, daylight);
  }

  /** @param {any} camera */
  render(camera) {
    this.renderer.render(this.scene, camera);
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
