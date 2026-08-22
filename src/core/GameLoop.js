// @ts-check

export class GameLoop {
  /** @param {{ fixedUpdate: (dt: number) => void, render: (alpha: number, dt: number) => void }} delegate */
  constructor(delegate) {
    this.delegate = delegate;
    this.fixedStep = 1 / 60;
    this.maxFrame = 0.1;
    this.accumulator = 0;
    this.lastTime = performance.now();
    this.running = false;
    this.frameHandle = 0;
    this.tick = this.tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameHandle = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
  }

  /** @param {number} now */
  tick(now) {
    if (!this.running) return;
    const frameDt = Math.min(this.maxFrame, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.accumulator += frameDt;
    while (this.accumulator >= this.fixedStep) {
      this.delegate.fixedUpdate(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }
    this.delegate.render(this.accumulator / this.fixedStep, frameDt);
    this.frameHandle = requestAnimationFrame(this.tick);
  }
}
