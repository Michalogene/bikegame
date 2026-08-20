// @ts-check

export class EventBus {
  constructor() {
    /** @type {Map<string, Set<(payload: any) => void>>} */
    this.listeners = new Map();
  }

  /** @param {string} event @param {(payload: any) => void} handler */
  on(event, handler) {
    const bucket = this.listeners.get(event) ?? new Set();
    bucket.add(handler);
    this.listeners.set(event, bucket);
    return () => this.off(event, handler);
  }

  /** @param {string} event @param {(payload: any) => void} handler */
  off(event, handler) {
    this.listeners.get(event)?.delete(handler);
  }

  /** @param {string} event @param {any} [payload] */
  emit(event, payload) {
    for (const handler of this.listeners.get(event) ?? []) handler(payload);
  }

  clear() {
    this.listeners.clear();
  }
}
