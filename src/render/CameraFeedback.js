// @ts-check

export class CameraFeedback {
  /** @param {import('../core/EventBus.js').EventBus} bus @param {import('./CameraRig.js').CameraRig} cameraRig */
  constructor(bus, cameraRig) {
    this.cameraRig = cameraRig;
    this.trauma = 0;
    this.kick = 0;
    this.phase = Math.random() * 100;
    this.disposers = [
      bus.on('combat:shot', () => this.add(0.14, 0.18)),
      bus.on('combat:melee', (payload) => this.add(payload?.hit ? 0.09 : 0.045, 0.05)),
      bus.on('player:damaged', () => this.add(0.36, 0.25)),
      bus.on('terrain:dug', () => this.add(0.09, 0.035)),
      bus.on('build:placed', () => this.add(0.06, 0)),
      bus.on('nightfall:start', () => this.add(0.24, 0.1)),
      bus.on('enemy:killed', () => this.add(0.06, 0))
    ];
  }

  /** @param {number} trauma @param {number} kick */
  add(trauma, kick = 0) {
    this.trauma = Math.min(1, this.trauma + trauma);
    this.kick = Math.min(1, this.kick + kick);
  }

  /** @param {number} dt @param {number} elapsed */
  update(dt, elapsed) {
    this.trauma = Math.max(0, this.trauma - dt * 1.9);
    this.kick = Math.max(0, this.kick - dt * 7.5);
    if (this.trauma <= 0.001 && this.kick <= 0.001) return;
    const camera = this.cameraRig.camera;
    const shake = this.trauma * this.trauma;
    const high = elapsed * 41 + this.phase;
    const low = elapsed * 19 + this.phase * 0.37;
    camera.position.x += (Math.sin(high) * 0.7 + Math.sin(low * 1.37) * 0.3) * shake * 0.3;
    camera.position.y += (Math.cos(high * 0.83) * 0.65 + Math.sin(low) * 0.35) * shake * 0.2;
    camera.position.z += Math.sin(high * 1.13) * shake * 0.24 - this.kick * 0.18;
    camera.rotation.z += Math.sin(low * 0.72) * shake * 0.005;
    camera.updateMatrixWorld();
  }

  dispose() {
    for (const dispose of this.disposers) dispose();
  }
}
