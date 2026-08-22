// @ts-check

export class InputManager {
  /** @param {HTMLElement} target */
  constructor(target) {
    this.target = target;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseButtons = new Set();
    this.mousePressed = new Set();
    this.pointer = { x: 0, y: 0 };
    this.wheelDelta = 0;
    this.enabled = true;
    this.onGesture = null;
    this.lastInputAt = performance.now();

    this.handleKeyDown = (event) => {
      if (!this.enabled || event.repeat && this.keys.has(event.code)) return;
      this.lastInputAt = performance.now();
      if (!this.keys.has(event.code)) this.pressed.add(event.code);
      this.keys.add(event.code);
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
      this.onGesture?.();
    };
    this.handleKeyUp = (event) => {
      this.lastInputAt = performance.now();
      this.keys.delete(event.code);
    };
    this.handlePointerMove = (event) => {
      this.lastInputAt = performance.now();
      const rect = this.target.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    };
    this.handlePointerDown = (event) => {
      if (!this.enabled) return;
      this.lastInputAt = performance.now();
      this.mouseButtons.add(event.button);
      this.mousePressed.add(event.button);
      this.onGesture?.();
      if (event.button === 2) event.preventDefault();
    };
    this.handlePointerUp = (event) => {
      this.lastInputAt = performance.now();
      this.mouseButtons.delete(event.button);
    };
    this.handleWheel = (event) => {
      if (!this.enabled) return;
      this.lastInputAt = performance.now();
      this.wheelDelta += Math.sign(event.deltaY);
      event.preventDefault();
    };
    this.handleContextMenu = (event) => event.preventDefault();
    this.handleBlur = () => this.resetTransient();

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('blur', this.handleBlur);
    target.addEventListener('pointermove', this.handlePointerMove);
    target.addEventListener('pointerdown', this.handlePointerDown);
    target.addEventListener('wheel', this.handleWheel, { passive: false });
    target.addEventListener('contextmenu', this.handleContextMenu);
  }

  /** @param {string} code */
  isDown(code) {
    return this.enabled && this.keys.has(code);
  }

  /** @param {string} code */
  consumePressed(code) {
    if (!this.enabled || !this.pressed.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }

  /** @param {number} button */
  consumeMousePressed(button) {
    if (!this.enabled || !this.mousePressed.has(button)) return false;
    this.mousePressed.delete(button);
    return true;
  }

  get movement() {
    const x = Number(this.isDown('KeyD')) - Number(this.isDown('KeyA'));
    const z = Number(this.isDown('KeyS')) - Number(this.isDown('KeyW'));
    const length = Math.hypot(x, z) || 1;
    return { x: x / length, z: z / length, moving: x !== 0 || z !== 0 };
  }

  resetTransient() {
    this.keys.clear();
    this.pressed.clear();
    this.mouseButtons.clear();
    this.mousePressed.clear();
    this.wheelDelta = 0;
  }

  reset() {
    this.resetTransient();
    this.pointer.x = 0;
    this.pointer.y = 0;
  }

  endFrame() {
    this.pressed.clear();
    this.mousePressed.clear();
    this.wheelDelta = 0;
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('blur', this.handleBlur);
    this.target.removeEventListener('pointermove', this.handlePointerMove);
    this.target.removeEventListener('pointerdown', this.handlePointerDown);
    this.target.removeEventListener('wheel', this.handleWheel);
    this.target.removeEventListener('contextmenu', this.handleContextMenu);
  }
}
