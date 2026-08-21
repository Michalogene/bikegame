// @ts-check

/** @param {number} x1 @param {number} z1 @param {number} x2 @param {number} z2 */
function distance(x1, z1, x2, z2) {
  return Math.hypot(x2 - x1, z2 - z1);
}

/**
 * @param {{ x: number, z: number }[]} points
 * @param {{ x: number, z: number }} death
 * @param {{ position: { x: number, z: number }, dead?: boolean }[]} enemies
 * @param {(x: number, z: number) => boolean} blocked
 */
export function rankRespawnPoints(points, death, enemies, blocked) {
  return points
    .filter((point) => !blocked(point.x, point.z))
    .map((point) => {
      const deathDistance = distance(point.x, point.z, death.x, death.z);
      const enemyDistance = enemies
        .filter((enemy) => !enemy.dead)
        .reduce((minimum, enemy) => Math.min(minimum, distance(point.x, point.z, enemy.position.x, enemy.position.z)), 999);
      const score = Math.min(deathDistance, 42) * 1.4 + Math.min(enemyDistance, 32) * 2.1 + (deathDistance >= 14 ? 20 : -35);
      return { ...point, deathDistance, enemyDistance, score };
    })
    .sort((a, b) => b.score - a.score);
}

export class RespawnSystem {
  /** @param {any} systems */
  constructor(systems) {
    Object.assign(this, systems);
    this.timer = null;
    this.delayMs = 2800;
    this.deathPosition = null;
    this.disposers = [
      this.state.bus.on('player:died', (payload) => this.onDeath(payload))
    ];
  }

  /** @param {any} payload */
  onDeath(payload) {
    if (this.state.respawn.pending) return;
    this.deathPosition = { x: this.player.position.x, z: this.player.position.z };
    this.state.markDead?.(payload?.source ?? 'Unknown');
    this.state.respawn.pending = true;
    this.state.respawn.deathX = this.deathPosition.x;
    this.state.respawn.deathZ = this.deathPosition.z;
    this.input.setEnabled?.(false);
    this.input.reset?.();
    this.time.pause?.('death');
    this.hud.closeAllGameplayPanels?.({ restoreFocus: false });
    this.interaction.reset?.();
    this.building.cancel?.();
    this.player.stopAiming?.();
    this.player.velocity.x = 0;
    this.player.velocity.z = 0;
    this.clearTimer();
    this.timer = setTimeout(() => this.respawnNow(), this.delayMs);
  }

  clearTimer() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  /** @param {{ x?: number, z?: number, forceInside?: boolean, manual?: boolean }} [options] */
  respawnNow(options = {}) {
    this.clearTimer();
    const point = Number.isFinite(options.x) && Number.isFinite(options.z)
      ? { x: Number(options.x), z: Number(options.z), id: options.forceInside ? 'forced-interior' : 'forced' }
      : this.selectPoint();

    this.hud.closeAllGameplayPanels?.({ restoreFocus: false });
    this.interaction.reset?.();
    this.building.cancel?.();
    this.player.stopAiming?.();
    this.player.velocity.x = 0;
    this.player.velocity.z = 0;
    this.relocate(point.x, point.z);
    this.state.revive?.(72);
    this.state.dead = false;
    this.state.respawn.pending = false;
    this.state.respawn.lastSpawnId = point.id ?? null;
    this.state.respawn.protectionUntil = this.state.playSeconds + 4;
    this.state.respawn.count += 1;
    this.time.resume?.('death');
    this.input.setEnabled?.(true);
    this.input.reset?.();
    this.hud.hideGameOver?.();
    this.interiors.reconcileFromWorldPosition?.({ immediate: true });
    this.camera.snapTo?.(this.player.position);
    this.renderer?.renderer?.domElement?.focus?.();
    this.save.save(this.state);
    this.state.bus.emit('player:respawned', {
      x: point.x,
      z: point.z,
      spawnId: point.id ?? null,
      manual: Boolean(options.manual),
      insideBuilding: this.interiors.activeBuildingId
    });
    return point;
  }

  selectPoint() {
    const death = this.deathPosition ?? {
      x: this.state.respawn.deathX ?? this.player.position.x,
      z: this.state.respawn.deathZ ?? this.player.position.z
    };
    const ranked = rankRespawnPoints(
      this.world.spawnPoints ?? [],
      death,
      this.enemies?.enemies ?? [],
      (x, z) => this.world.collider.isBlocked(x, z, 0.85) || this.world.terrain.travelFactor(x, z) < 0.32
    );
    return ranked[0] ?? this.world.spawnPoints?.[0] ?? { id: 'fallback', x: -3.2, z: 8 };
  }

  /** @param {number} x @param {number} z */
  relocate(x, z) {
    const y = this.world.terrain.getHeight(x, z);
    this.player.root.position.set(x, y, z);
    this.state.player.x = x;
    this.state.player.z = z;
    this.interiors.reset?.({ immediate: true });
    this.interiors.reconcileFromWorldPosition?.({ immediate: true });
    this.camera.snapTo?.(this.player.position);
  }

  dispose() {
    this.clearTimer();
    for (const dispose of this.disposers) dispose();
  }
}
