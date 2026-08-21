// @ts-check

import * as THREE from '../core/three.js';
import { clamp, lerp } from '../core/math.js';

export class RendererSystem {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1c24);
    this.scene.fog = new THREE.FogExp2(0x0d1c24, 0.0085);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(root.clientWidth, root.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.domElement.setAttribute('aria-label', 'Afterdark County 3D world');
    root.append(this.renderer.domElement);

    this.hemisphere = new THREE.HemisphereLight(0x829fba, 0x243128, 1.32);
    this.scene.add(this.hemisphere);

    this.keyLight = new THREE.DirectionalLight(0xa6bfd9, 2.55);
    this.keyLight.position.set(-42, 58, 30);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.left = -76;
    this.keyLight.shadow.camera.right = 76;
    this.keyLight.shadow.camera.top = 76;
    this.keyLight.shadow.camera.bottom = -76;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 165;
    this.keyLight.shadow.bias = -0.00045;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0x466e91, 0.92);
    this.fillLight.position.set(38, 24, -45);
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
    this.hemisphere.intensity = lerp(0.96, 1.5, daylight) * (1 - storm * 0.18);
    this.hemisphere.color.setRGB(
      lerp(0.4, 0.69, daylight),
      lerp(0.53, 0.8, daylight),
      lerp(0.68, 0.93, daylight)
    );
    this.hemisphere.groundColor.setRGB(0.11, lerp(0.15, 0.21, daylight), 0.105);
    this.keyLight.intensity = lerp(2.6, 3.35, daylight) * (1 - storm * 0.32);
    this.keyLight.color.setRGB(
      lerp(0.58, 1.0, daylight),
      lerp(0.7, 0.88, daylight),
      lerp(0.9, 0.71, daylight)
    );
    this.fillLight.intensity = 0.58 + night * 0.52;
    const fogColor = new THREE.Color().setRGB(
      lerp(0.045, 0.27, daylight),
      lerp(0.082, 0.35, daylight),
      lerp(0.105, 0.39, daylight)
    );
    this.scene.background.copy(fogColor);
    this.scene.fog.color.copy(fogColor);
    this.scene.fog.density = lerp(0.0084, 0.0054, daylight) + storm * 0.0042;
    this.renderer.toneMappingExposure = lerp(1.22, 1.08, daylight) - storm * 0.05;
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
