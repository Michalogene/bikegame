// @ts-check

/** @param {number} value @param {number} min @param {number} max */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** @param {number} from @param {number} to @param {number} t */
export const lerp = (from, to, t) => from + (to - from) * t;

/** @param {number} current @param {number} target @param {number} sharpness @param {number} dt */
export const damp = (current, target, sharpness, dt) => lerp(current, target, 1 - Math.exp(-sharpness * dt));

/** @param {number} x @param {number} z */
export function hash2(x, z) {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

/** Smooth deterministic value noise. @param {number} x @param {number} z */
export function valueNoise2D(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = x - x0;
  const tz = z - z0;
  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);
  const a = lerp(hash2(x0, z0), hash2(x0 + 1, z0), sx);
  const b = lerp(hash2(x0, z0 + 1), hash2(x0 + 1, z0 + 1), sx);
  return lerp(a, b, sz);
}

/** @param {number} x @param {number} z */
export function fractalNoise2D(x, z) {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let normalizer = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    total += (valueNoise2D(x * frequency, z * frequency) * 2 - 1) * amplitude;
    normalizer += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return total / normalizer;
}

/** @param {number} ax @param {number} az @param {number} bx @param {number} bz */
export const distance2D = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

/** @param {number} value @param {number} edge0 @param {number} edge1 */
export function smoothstep(value, edge0, edge1) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
