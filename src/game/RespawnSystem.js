// @ts-check

import { Random } from '../core/Random.js';
import { selectRespawnCandidate } from './RespawnPolicy.js';

export class RespawnSystem {
  /** @param {import('../state/GameState.js').GameState} state @param {import('../world/WorldBuilder.js').WorldBuilder} world @param {import('../entities/Player.js').Player} player @param {import('../entities/EnemySystem.js').EnemySystem} enemies */
  constructor(state, world, player, enemies) {
    this.state = state;
    this.world = world;
    this.player = player;
    this.enemies = enemies;
    this.random = new Random(0x5afe1178);
    this.pendingSeconds = 0;
    this.pendingDeadline = 0;
    this.pendingOrigin = null;
    this.pendingReason = null;
    this.lastTick = -1;
    this.lastSelection = null;
    this.timerHandle = null;
    this.reliability = null;
  }

  /** @param {any} reliability */
  attachReliability(reliability) {
    this.reliability = reliability;
  }

  /** @param {{ source?: string } | undefined} payload */
  scheduleDeathRespawn(payload) {
    if (this.state.respawn.pending || this.pendingSeconds > 0) return false;
    const origin = { x: this.player.position.x, z: this.player.position.z };
    this.state.lastDeath = {
      ...origin,
      day: this.state.clock.day,
      minute: this.state.clock.minute,
      source: payload?.source ?? 'Unknown'
    };
    this.pendingOrigin = origin;
    this.pendingReason = 'death';
    this.pendingSeconds = 3.2;
    this.pendingDeadline = performance.now() + this.pendingSeconds * 1000;
    this.lastTick = Math.ceil(this.pendingSeconds);
    this.state.respawn = { pending: true, reason: 'death', scheduledAt: Date.now() };
    this.clearTimer();
    this.timerHandle = globalThis.setTimeout(() => {
      if (this.state.dead && this.state.respawn.pending) this.respawnPendingNow();
    }, this.pendingSeconds * 1000);
    this.state.bus.emit('player:respawn-scheduled', {
      seconds: this.lastTick,
      origin,
      source: payload?.source ?? 'Unknown'
    });
    return true;
  }

  /** @param {number} dt */
  update(dt) {
    if (!this.state.respawn.pending || this.pendingSeconds <= 0) return;
    const realRemaining = this.pendingDeadline > 0 ? (this.pendingDeadline - performance.now()) / 1000 : Infinity;
    this.pendingSeconds = Math.max(0, Math.min(this.pendingSeconds - dt, realRemaining));
    const tick = Math.ceil(this.pendingSeconds);
    if (tick !== this.lastTick) {
      this.lastTick = tick;
      this.state.bus.emit('player:respawn-tick', { seconds: tick });
    }
    if (this.pendingSeconds <= 0) this.respawnPendingNow();
  }

  /** @param {'death' | 'developer' | 'manual'} [reason] @param {{ x: number, z: number } | null} [origin] */
  respawnNow(reason = 'manual', origin = null) {
    const wasDead = this.state.dead;
    const respawnOrigin = origin ?? this.pendingOrigin ?? { x: this.player.position.x, z: this.player.position.z };
    const selection = this.chooseSpawn(respawnOrigin);
    if (!selection) {
      this.state.bus.emit('toast', 'No safe respawn point was available.');
      return null;
    }
    return this.completeRespawn(selection, reason, respawnOrigin, wasDead);
  }

  /** @param {{ id?: string, label?: string, x: number, z: number, rotation?: number }} point @param {'death' | 'developer' | 'manual'} [reason] */
  respawnAt(point, reason = 'developer') {
    const origin = { x: this.player.position.x, z: this.player.position.z };
    const selection = {
      id: point.id ?? `forced-${Math.round(point.x)}-${Math.round(point.z)}`,
      label: point.label ?? 'Development target',
      x: point.x,
      z: point.z,
      rotation: point.rotation ?? this.player.root.rotation.y
    };
    return this.completeRespawn(selection, reason, origin, this.state.dead);
  }

  /** @param {any} selection @param {string} reason @param {{ x: number, z: number }} origin @param {boolean} wasDead */
  completeRespawn(selection, reason, origin, wasDead) {
    this.cancelPending();
    this.lastSelection = selection;
    const countsAsDeath = reason === 'death' || wasDead;
    if (countsAsDeath) this.state.deaths += 1;
    this.state.lastSpawnId = selection.id;
    this.state.revive({
      health: countsAsDeath ? 72 : Math.max(72, this.state.survival.health),
      stamina: countsAsDeath ? 86 : Math.max(86, this.state.survival.stamina),
      protectionSeconds: 4
    });
    this.state.respawn = { pending: false, reason: null, scheduledAt: 0 };
    this.enemies.secureArea(selection.x, selection.z, 15);
    if (this.reliability) this.reliability.afterRespawn(selection, reason);
    else this.player.teleport(selection.x, selection.z, selection.rotation);
    const payload = {
      reason,
      spawn: selection,
      origin,
      distance: Math.hypot(selection.x - origin.x, selection.z - origin.z)
    };
    this.state.bus.emit('player:respawned', payload);
    this.state.bus.emit('toast', `Respawned at ${selection.label ?? selection.id}.`);
    return selection;
  }

  respawnPendingNow() {
    const reason = this.pendingReason ?? (this.state.dead ? 'death' : 'manual');
    return this.respawnNow(reason, this.pendingOrigin);
  }

  /** @param {{ x: number, z: number }} origin */
  chooseSpawn(origin) {
    const candidates = [...this.world.spawnPoints];
    for (let index = 0; index < 14; index += 1) {
      const angle = (index / 14) * Math.PI * 2 + this.random.range(-0.16, 0.16);
      const distance = this.random.range(28, 58);
      candidates.push({
        id: `procedural-${index}`,
        x: Math.max(-78, Math.min(78, origin.x + Math.cos(angle) * distance)),
        z: Math.max(-78, Math.min(78, origin.z + Math.sin(angle) * distance)),
        rotation: angle + Math.PI,
        label: 'County roadside'
      });
    }
    const evaluated = candidates.map((candidate) => ({
      ...candidate,
      blocked: this.world.collider.isBlocked(candidate.x, candidate.z, this.player.radius + 0.22),
      outdoor: this.world.isOutdoorSpawnPoint(candidate.x, candidate.z),
      deathDistance: Math.hypot(candidate.x - origin.x, candidate.z - origin.z),
      enemyDistance: this.enemies.distanceToNearest(candidate.x, candidate.z)
    }));
    return selectRespawnCandidate(evaluated, {
      minimumDeathDistance: 22,
      minimumEnemyDistance: 12,
      lastSpawnId: this.state.lastSpawnId
    });
  }

  clearTimer() {
    if (this.timerHandle !== null) globalThis.clearTimeout(this.timerHandle);
    this.timerHandle = null;
  }

  cancelPending() {
    this.clearTimer();
    this.pendingSeconds = 0;
    this.pendingDeadline = 0;
    this.pendingOrigin = null;
    this.pendingReason = null;
    this.lastTick = -1;
    this.state.respawn = { pending: false, reason: null, scheduledAt: 0 };
  }

  dispose() {
    this.cancelPending();
  }
}
