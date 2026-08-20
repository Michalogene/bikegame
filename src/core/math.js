// @ts-check

/** @param {number} value @param {number} min @param {number} max */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** @param {number} a @param {number} b @param {number} t */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** @param {number} from @param {number} to @param {number} rate @param {number} dt */
export function damp(from, to, rate, dt) {
  return lerp(from, to, 1 - Math.exp(-rate * dt));
}

/** @param {number} a @param {number} b */
export function shortestAngle(a, b) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}

/** @param {number} current @param {number} target @param {number} rate @param {number} dt */
export function dampAngle(current, target, rate, dt) {
  return current + shortestAngle(current, target) * (1 - Math.exp(-rate * dt));
}

/** @param {number} x1 @param {number} z1 @param {number} x2 @param {number} z2 */
export function distance2D(x1, z1, x2, z2) {
  return Math.hypot(x2 - x1, z2 - z1);
}

/** @param {number} value */
export function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

/** @param {number} value @param {number} places */
export function roundTo(value, places = 1) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

/** @param {number} x @param {number} z @param {number} seed */
export function hashNoise(x, z, seed = 1) {
  const value = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}

/** @param {number} x @param {number} z @param {number} scale @param {number} seed */
export function valueNoise(x, z, scale = 1, seed = 1) {
  const sx = x / scale;
  const sz = z / scale;
  const x0 = Math.floor(sx);
  const z0 = Math.floor(sz);
  const tx = smoothstep(sx - x0);
  const tz = smoothstep(sz - z0);
  const a = hashNoise(x0, z0, seed);
  const b = hashNoise(x0 + 1, z0, seed);
  const c = hashNoise(x0, z0 + 1, seed);
  const d = hashNoise(x0 + 1, z0 + 1, seed);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}

/** @param {number} x @param {number} z @param {number} ax @param {number} az @param {number} bx @param {number} bz */
export function distanceToSegment(x, z, ax, az, bx, bz) {
  const vx = bx - ax;
  const vz = bz - az;
  const lengthSquared = vx * vx + vz * vz || 1;
  const t = clamp(((x - ax) * vx + (z - az) * vz) / lengthSquared, 0, 1);
  return distance2D(x, z, ax + vx * t, az + vz * t);
}

/** @param {number} x @param {number} z @param {number} angle */
export function rotate2D(x, z, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - z * s, z: x * s + z * c };
}
