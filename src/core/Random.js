// @ts-check

export class Random {
  /** @param {number} seed */
  constructor(seed = 0xafdac0) {
    this.seed = seed >>> 0;
  }

  next() {
    let value = (this.seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  /** @param {number} min @param {number} max */
  range(min, max) {
    return min + (max - min) * this.next();
  }

  /** @param {number} min @param {number} max */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  /** @template T @param {T[]} values */
  pick(values) {
    return values[Math.floor(this.next() * values.length)];
  }
}
