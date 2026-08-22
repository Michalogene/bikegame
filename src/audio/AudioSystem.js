// @ts-check

export class AudioSystem {
  /** @param {import('../core/EventBus.js').EventBus} bus */
  constructor(bus) {
    this.bus = bus;
    this.context = null;
    this.master = null;
    this.enabled = true;
    this.volume = 0.48;
    this.noiseBuffer = null;
    this.disposers = [
      bus.on('audio:step', (payload) => this.step(Boolean(payload?.sprint))),
      bus.on('audio:loot', () => this.tone(520, 0.06, 0.045, 'triangle')),
      bus.on('audio:container', () => this.noise(0.08, 0.045, 1200)),
      bus.on('audio:craft', () => this.sequence([280, 360, 460], 0.055, 0.045)),
      bus.on('audio:build', () => this.sequence([120, 165, 220], 0.07, 0.06)),
      bus.on('audio:dig', () => this.noise(0.14, 0.08, 520)),
      bus.on('audio:gunshot', () => this.gunshot()),
      bus.on('audio:dryFire', () => this.tone(130, 0.035, 0.05, 'square')),
      bus.on('audio:meleeSwing', () => this.noise(0.065, 0.045, 1700)),
      bus.on('audio:meleeHit', () => this.noise(0.11, 0.07, 520)),
      bus.on('audio:enemyAttack', () => this.noise(0.16, 0.08, 420)),
      bus.on('audio:enemyDeath', () => this.tone(74, 0.33, 0.07, 'sawtooth')),
      bus.on('audio:trap', () => this.sequence([760, 430, 210], 0.05, 0.06))
    ];
  }

  unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer();
    }
    if (this.context.state === 'suspended') this.context.resume();
  }

  createNoiseBuffer() {
    if (!this.context) return null;
    const length = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    return buffer;
  }

  /** @param {number} value */
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.value = this.volume;
  }

  /** @param {number} frequency @param {number} duration @param {number} gain @param {OscillatorType} [type] @param {number} [delay] */
  tone(frequency, duration, gain, type = 'sine', delay = 0) {
    if (!this.context || !this.master || !this.enabled) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const volume = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * 0.82), now + duration);
    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(gain, now + 0.008);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(volume);
    volume.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  /** @param {number[]} frequencies @param {number} duration @param {number} gain */
  sequence(frequencies, duration, gain) {
    frequencies.forEach((frequency, index) => this.tone(frequency, duration, gain, 'triangle', index * duration * 0.72));
  }

  /** @param {number} duration @param {number} gain @param {number} cutoff */
  noise(duration, gain, cutoff) {
    if (!this.context || !this.master || !this.noiseBuffer || !this.enabled) return;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const volume = this.context.createGain();
    const now = this.context.currentTime;
    volume.gain.setValueAtTime(gain, now);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(volume);
    volume.connect(this.master);
    source.start(now);
    source.stop(now + duration);
  }

  step(sprint) {
    this.noise(sprint ? 0.055 : 0.04, sprint ? 0.028 : 0.018, sprint ? 650 : 480);
  }

  gunshot() {
    this.noise(0.16, 0.19, 1800);
    this.tone(78, 0.22, 0.1, 'sawtooth');
  }

  dispose() {
    for (const dispose of this.disposers) dispose();
    this.context?.close();
  }
}
