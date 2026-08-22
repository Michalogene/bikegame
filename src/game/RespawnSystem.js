// @ts-check

/**
 * Score candidate respawn points. Higher values are safer.
 * @param {{ x: number, z: number }} death
 * @param {{ x: number, z: number }[]} candidates
 * @param {any[]} enemies
 * @param {(x: number, z: number) => boolean} blocked
 */
export function rankRespawnPoints(death, candidates, enemies, blocked) {
  return candidates
    .filter((point) => !blocked(point.x, point.z))
    .map((point) => {
      const deathDistance = Math.hypot(point.x - death.x, point.z - death.z);
      const enemyDistance = Math.min(
        120,
        ...enemies
          .filter((enemy) => !enemy.dead)
          .map((enemy) => Math.hypot(point.x - enemy.position.x, point.z - enemy.position.z))
      );
      const distancePenalty = deathDistance < 14 ? (14 - deathDistance) * 8 : 0;
      const enemyPenalty = enemyDistance < 10 ? (10 - enemyDistance) * 14 : 0;
      return {
        ...point,
        deathDistance,
        enemyDistance,
        score: deathDistance + enemyDistance * 1.65 - distancePenalty - enemyPenalty
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Restore the serializable state that gates movement and simulation.
 * @param {import('../state/GameState.js').GameState} state
 * @param {number} now
 */
export function reviveSerializableState(state, now = Date.now()) {
  state.dead = false;
  state.survival.health = Math.max(68, state.survival.health || 0);
  state.survival.stamina = Math.max(72, state.survival.stamina || 0);
  state.survival.bleeding = 0;
  state.respawn.pending = false;
  state.respawn.remaining = 0;
  state.respawn.protectedUntil = now + 4000;
  return state;
}

export class RespawnSystem {
  /**
   * @param {{
   *   state: import('../state/GameState.js').GameState,
   *   world: import('../world/WorldBuilder.js').WorldBuilder,
   *   player: import('../entities/Player.js').Player,
   *   input: import('../input/InputManager.js').InputManager,
   *   camera: import('../render/CameraRig.js').CameraRig,
   *   interiors: import('../world/InteriorSystem.js').InteriorSystem,
   *   interaction: import('./InteractionSystem.js').InteractionSystem,
   *   building: import('./BuildingSystem.js').BuildingSystem,
   *   hud: import('../ui/Hud.js').Hud,
   *   save: import('../state/SaveSystem.js').SaveSystem,
   *   bus: import('../core/EventBus.js').EventBus
   * }} options
   */
  constructor(options) {
    Object.assign(this, options);
    this.delay = 3.2;
    this.remaining = 0;
    this.lastDeath = null;
    this.lastSpawn = null;
    this.disposers = [
      this.bus.on('player:died', (payload) => this.begin(payload)),
      this.bus.on('development:respawn', (payload) => this.respawn(payload ?? { manual: true }))
    ];

    if (this.state.dead || this.state.survival.health <= 0) {
      this.state.dead = true;
      this.begin({ source: 'Loaded dead save' });
    }
  }

  /** @param {any} payload */
  begin(payload = {}) {
    if (this.state.respawn.pending) return false;
    this.state.dead = true;
    this.state.survival.health = 0;
    this.state.respawn.pending = true;
    this.state.respawn.remaining = this.delay;
    this.remaining = this.delay;
    this.lastDeath = {
      x: this.player.position.x,
      z: this.player.position.z,
      source: payload?.source ?? 'Unknown'
    };
    this.state.respawn.lastDeath = { ...this.lastDeath };
    this.input.enabled = false;
    this.input.reset?.();
    this.interaction.closeContainer();
    this.building.cancel?.();
    this.hud.closeAllGameplayPanels?.();
    this.save.save(this.state);
    return true;
  }

  /** @param {number} dt */
  update(dt) {
    if (!this.state.respawn.pending) return;
    this.remaining = Math.max(0, this.remaining - dt);
    this.state.respawn.remaining = this.remaining;
    if (this.remaining <= 0) this.respawn({ manual: false });
  }

  /** @param {{ manual?: boolean, target?: { x: number, z: number, rotation?: number } }} [options] */
  respawn(options = {}) {
    const target = options.target ?? this.chooseTarget();
    this.remaining = 0;
    reviveSerializableState(this.state);

    this.interaction.closeContainer();
    this.building.cancel?.();
    this.hud.closeAllGameplayPanels?.();
    this.hud.gameOverVisible = false;
    this.hud.elements?.gameOver?.classList?.remove('visible');

    this.player.stopAiming?.();
    this.player.velocity.x = 0;
    this.player.velocity.z = 0;
    this.player.moving = false;
    this.player.sprinting = false;
    this.player.root.position.set(
      target.x,
      this.world.terrain.getHeight(target.x, target.z),
      target.z
    );
    this.player.root.rotation.y = target.rotation ?? 0;
    this.state.player.x = target.x;
    this.state.player.z = target.z;
    this.state.player.rotation = target.rotation ?? 0;

    this.input.reset?.();
    this.input.enabled = true;
    this.interiors.syncFromPlayer({ immediate: true });
    this.camera.smoothedTarget.copy(this.player.position);
    this.camera.target.copy(this.player.position);
    this.camera.update(this.player.position, 1);
    this.lastSpawn = { x: target.x, z: target.z, id: target.id ?? 'safe-point' };
    this.state.respawn.lastSpawn = { ...this.lastSpawn };

    this.rendererCanvas?.focus?.();
    this.save.save(this.state);
    this.bus.emit('player:respawned', {
      ...this.lastSpawn,
      manual: options.manual === true,
      protectedUntil: this.state.respawn.protectedUntil
    });
    this.bus.emit('toast', options.manual ? 'Development respawn completed' : 'You wake up somewhere safer.');
    return target;
  }

  chooseTarget() {
    const death = this.lastDeath ?? {
      x: this.player.position.x,
      z: this.player.position.z
    };
    const candidates = this.world.spawnPoints?.length
      ? this.world.spawnPoints
      : [{ id: 'fallback', x: -3.2, z: 8, rotation: Math.PI * 0.25 }];
    const ranked = rankRespawnPoints(
      death,
      candidates,
      this.enemies ?? [],
      (x, z) => this.world.collider.isBlocked(x, z, 0.78)
        || this.world.terrain.travelFactor(x, z) < 0.42
    );
    return ranked[0] ?? candidates[0];
  }

  /** @param {any[]} enemies */
  setEnemies(enemies) {
    this.enemies = enemies;
  }

  get rendererCanvas() {
    return this.input?.target ?? null;
  }

  dispose() {
    for (const dispose of this.disposers) dispose();
    this.state.respawn.pending = false;
    this.remaining = 0;
  }
}
