// @ts-check

import * as THREE from '../core/three.js';
import { clamp, lerp } from '../core/math.js';

export class RendererSystem {
  /** @param {HTMLElement} root */
  constructor(root) {
    this.root = root;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x10232d);
    this.scene.fog = new THREE.FogExp2(0x10232d, 0.0074);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(root.clientWidth, root.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.27;
    this.renderer.domElement.setAttribute('aria-label', 'Afterdark County 3D world');
    root.append(this.renderer.domElement);

    this.hemisphere = new THREE.HemisphereLight(0x8caac5, 0x29372c, 1.42);
    this.scene.add(this.hemisphere);

    this.keyLight = new THREE.DirectionalLight(0xabc5df, 2.62);
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

    this.fillLight = new THREE.DirectionalLight(0x4d779d, 1.02);
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
    this.hemisphere.intensity = lerp(1.04, 1.54, daylight) * (1 - storm * 0.16);
    this.hemisphere.color.setRGB(
      lerp(0.43, 0.7, daylight),
      lerp(0.57, 0.81, daylight),
      lerp(0.72, 0.94, daylight)
    );
    this.hemisphere.groundColor.setRGB(0.13, lerp(0.17, 0.22, daylight), 0.12);
    this.keyLight.intensity = lerp(2.65, 3.35, daylight) * (1 - storm * 0.3);
    this.keyLight.color.setRGB(
      lerp(0.61, 1.0, daylight),
      lerp(0.73, 0.88, daylight),
      lerp(0.93, 0.71, daylight)
    );
    this.fillLight.intensity = 0.7 + night * 0.62;
    const fogColor = new THREE.Color().setRGB(
      lerp(0.055, 0.27, daylight),
      lerp(0.095, 0.35, daylight),
      lerp(0.12, 0.39, daylight)
    );
    this.scene.background.copy(fogColor);
    this.scene.fog.color.copy(fogColor);
    this.scene.fog.density = lerp(0.0074, 0.0053, daylight) + storm * 0.0038;
    this.renderer.toneMappingExposure = lerp(1.28, 1.09, daylight) - storm * 0.035;
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
