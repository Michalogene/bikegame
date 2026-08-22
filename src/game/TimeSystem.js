// @ts-check

import { clamp, smoothstep } from '../core/math.js';

export class TimeSystem {
  /** @param {import('../state/GameState.js').GameState} state */
  constructor(state) {
    this.state = state;
    this.lastMinute = Math.floor(state.clock.minute);
    /** @type {Set<string>} */
    this.pauseReasons = new Set();
    if (state.clock.paused) this.pauseReasons.add('manual');
  }

  /** @param {number} dt */
  update(dt) {
    if (this.paused) return;
    const clock = this.state.clock;
    clock.minute += dt * clock.speed;
    if (clock.minute >= 1440) {
      clock.minute -= 1440;
      clock.day += 1;
    }
    const minute = Math.floor(clock.minute);
    if (minute !== this.lastMinute) {
      this.lastMinute = minute;
      this.state.bus.emit('clock:minute', { day: clock.day, minute });
    }

    const absolute = clock.day * 1440 + clock.minute;
    if (!clock.nightfallActive && clock.minute >= 23 * 60 && clock.lastNightfallDay < clock.day) {
      clock.nightfallActive = true;
      clock.lastNightfallDay = clock.day;
      clock.nightfallEndsAt = absolute + 92;
      this.state.bus.emit('nightfall:start', { day: clock.day });
      this.state.bus.emit('toast', 'NIGHTFALL — hostile movement is surging across Pine Ridge.');
    }
    if (clock.nightfallActive && absolute >= clock.nightfallEndsAt) {
      clock.nightfallActive = false;
      this.state.bus.emit('nightfall:end', { day: clock.day });
      if (!this.state.dead && this.state.survival.health > 0) this.state.bus.emit('nightfall:survived');
    }
  }

  /** @param {string} [reason] */
  pause(reason = 'manual') {
    this.pauseReasons.add(reason);
    this.state.clock.paused = this.pauseReasons.has('manual') || this.pauseReasons.has('development');
  }

  /** @param {string} [reason] */
  resume(reason = 'manual') {
    this.pauseReasons.delete(reason);
    this.state.clock.paused = this.pauseReasons.has('manual') || this.pauseReasons.has('development');
  }

  /** @param {boolean} paused @param {string} [reason] */
  setPaused(paused, reason = 'manual') {
    if (paused) this.pause(reason);
    else this.resume(reason);
  }

  /** @param {number} minute @param {number | null} [day] */
  setTime(minute, day = null) {
    const normalized = ((Number(minute) % 1440) + 1440) % 1440;
    this.state.clock.minute = normalized;
    if (Number.isFinite(day)) this.state.clock.day = Math.max(1, Math.floor(Number(day)));
    this.lastMinute = Math.floor(normalized);
    this.state.bus.emit('clock:minute', { day: this.state.clock.day, minute: this.lastMinute });
  }

  get paused() {
    return this.pauseReasons.size > 0;
  }

  get hour() {
    return this.state.clock.minute / 60;
  }

  get lighting() {
    const hour = this.hour;
    const dawn = smoothstep((hour - 5.5) / 2.0);
    const dusk = 1 - smoothstep((hour - 18.0) / 2.3);
    const daylight = clamp(dawn * dusk, 0, 1);
    return {
      daylight,
      night: 1 - daylight,
      storm: this.state.clock.nightfallActive ? 0.32 : 0
    };
  }

  get formattedTime() {
    const total = Math.floor(this.state.clock.minute) % 1440;
    const hours24 = Math.floor(total / 60);
    const minutes = total % 60;
    const suffix = hours24 >= 12 ? 'PM' : 'AM';
    const hours = hours24 % 12 || 12;
    return `${hours}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  get minutesUntilNightfall() {
    const current = this.state.clock.minute;
    if (this.state.clock.nightfallActive) return Math.max(0, Math.ceil(this.state.clock.nightfallEndsAt - (this.state.clock.day * 1440 + current)));
    return Math.ceil(current < 23 * 60 ? 23 * 60 - current : 1440 - current + 23 * 60);
  }

  get nightfallLabel() {
    const minutes = this.minutesUntilNightfall;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours}h ${String(remainder).padStart(2, '0')}m`;
  }

  get temperature() {
    const daylight = this.lighting.daylight;
    return Math.round(5 + daylight * 11 - (this.state.clock.nightfallActive ? 2 : 0));
  }
}
