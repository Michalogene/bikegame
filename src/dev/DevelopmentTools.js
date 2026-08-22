// @ts-check

/** @param {Location | undefined} location */
export function developmentToolsEnabled(location = globalThis.location) {
  if (!location) return false;
  const params = new URLSearchParams(location.search);
  if (params.get('dev') === '0') return false;
  return params.has('dev') || ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
}

export class DevelopmentTools {
  /** @param {{ root: HTMLElement, state: import('../state/GameState.js').GameState, time: import('../game/TimeSystem.js').TimeSystem, respawn: import('../game/RespawnSystem.js').RespawnSystem, interiors: import('../world/BuildingInteriorSystem.js').BuildingInteriorSystem, enemies: import('../entities/EnemySystem.js').EnemySystem, player: import('../entities/Player.js').Player, world: import('../world/WorldBuilder.js').WorldBuilder, camera: import('../render/CameraRig.js').CameraRig }} options */
  constructor(options) {
    Object.assign(this, options);
    this.enabled = developmentToolsEnabled();
    this.visible = false;
    this.elapsed = 0;
    this.handleKeyDown = (event) => {
      if (!this.enabled || event.code !== 'F10') return;
      event.preventDefault();
      this.toggle();
    };
    window.addEventListener('keydown', this.handleKeyDown);
    if (this.enabled) this.build();
  }

  build() {
    const element = document.createElement('section');
    element.id = 'afterdark-dev-panel';
    element.className = 'dev-panel';
    element.setAttribute('aria-label', 'Afterdark County development tools');
    element.innerHTML = `
      <header><div><strong>DEVELOPMENT TOOLS</strong><small>LOCAL BUILD · F10</small></div><button type="button" data-dev-close>×</button></header>
      <div class="dev-readout" id="dev-readout"></div>
      <section><h3>PLAYER</h3><div class="dev-actions"><button type="button" data-dev-respawn>RESPAWN PLAYER</button><button type="button" data-dev-kill>KILL / TEST DEATH</button></div></section>
      <section><h3>INTERIORS</h3><div class="dev-actions dev-wrap">
        <button type="button" data-dev-building="pine-ridge-food-mart">FOOD MART</button>
        <button type="button" data-dev-building="west-home">WEST HOME</button>
        <button type="button" data-dev-building="old-barn">OLD BARN</button>
      </div></section>
      <section><h3>WORLD TIME</h3><div class="dev-time-row"><input type="time" id="dev-time-input" step="60"><button type="button" data-dev-set-time>SET</button></div>
        <div class="dev-actions dev-wrap">
          <button type="button" data-dev-time="360">06:00 DAWN</button>
          <button type="button" data-dev-time="480">08:00 MORNING</button>
          <button type="button" data-dev-time="720">12:00 NOON</button>
          <button type="button" data-dev-time="1080">18:00 EVENING</button>
          <button type="button" data-dev-time="1260">21:00 NIGHT</button>
          <button type="button" data-dev-time="0">00:00 MIDNIGHT</button>
          <button type="button" data-dev-nightfall>23:00 NIGHTFALL</button>
        </div>
        <div class="dev-actions"><button type="button" data-dev-pause>PAUSE WORLD TIME</button><button type="button" data-dev-resume>RESUME WORLD TIME</button></div>
      </section>
      <footer>Development-only panel. It is disabled on non-local production hosts.</footer>
    `;
    this.root.append(element);
    this.element = element;
    this.readout = element.querySelector('#dev-readout');
    this.timeInput = element.querySelector('#dev-time-input');
    element.addEventListener('click', (event) => this.handleClick(event));
    this.refresh();
  }

  /** @param {Event} event */
  handleClick(event) {
    const target = /** @type {HTMLElement} */ (event.target);
    if (target.closest('[data-dev-close]')) this.hide();
    if (target.closest('[data-dev-respawn]')) this.respawn.respawnNow('developer');
    if (target.closest('[data-dev-kill]')) this.state.damage(999, 'Development tool');
    const timeButton = target.closest('[data-dev-time]');
    if (timeButton) this.time.setTime(Number(timeButton.getAttribute('data-dev-time')));
    if (target.closest('[data-dev-nightfall]')) {
      this.time.setTime(23 * 60, { preserveNightfall: true });
      this.time.startNightfall(true);
    }
    if (target.closest('[data-dev-set-time]') && this.timeInput instanceof HTMLInputElement) {
      if (!this.time.setTimeString(this.timeInput.value)) this.state.bus.emit('toast', 'Use a valid 24-hour time.');
    }
    if (target.closest('[data-dev-pause]')) this.time.pause();
    if (target.closest('[data-dev-resume]')) this.time.resume();
    const buildingButton = target.closest('[data-dev-building]');
    if (buildingButton) this.teleportToBuilding(buildingButton.getAttribute('data-dev-building'));
    this.refresh();
  }

  /** @param {string | null} buildingId */
  teleportToBuilding(buildingId) {
    const building = this.world.buildings.find((entry) => entry.id === buildingId);
    if (!building) return;
    const target = this.world.localToWorld(building, 0, building.depth * 0.5 - 1.35);
    this.player.teleport(target.x, target.z, building.angle + Math.PI);
    this.enemies.secureArea(target.x, target.z, 11);
    this.camera.snapTo(this.player.position);
    this.state.bus.emit('toast', `Teleported inside ${building.name}.`);
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  show() {
    if (!this.enabled || !this.element) return;
    this.visible = true;
    this.element.classList.add('visible');
    this.refresh();
  }

  hide() {
    this.visible = false;
    this.element?.classList.remove('visible');
  }

  /** @param {number} dt */
  update(dt) {
    if (!this.enabled || !this.visible) return;
    this.elapsed += dt;
    if (this.elapsed < 0.16) return;
    this.elapsed = 0;
    this.refresh();
  }

  refresh() {
    if (!this.enabled || !this.readout) return;
    const position = this.player.position;
    const nearby = this.enemies.enemies.filter((enemy) => !enemy.dead && Math.hypot(enemy.position.x - position.x, enemy.position.z - position.z) < 15).length;
    const spawn = this.respawn.lastSelection?.label ?? this.state.lastSpawnId ?? 'None';
    this.readout.innerHTML = `
      <span><b>POSITION</b>${position.x.toFixed(1)}, ${position.z.toFixed(1)}</span>
      <span><b>BUILDING</b>${this.interiors.statusLabel}</span>
      <span><b>TIME</b>Day ${this.state.clock.day} · ${this.time.formatted24Hour} · ${this.time.isPaused ? 'PAUSED' : 'RUNNING'}</span>
      <span><b>HOSTILES &lt;15m</b>${nearby} · grace ${this.enemies.activationDelay.toFixed(1)}s</span>
      <span><b>LAST SPAWN</b>${spawn}</span>
    `;
    if (this.timeInput instanceof HTMLInputElement && document.activeElement !== this.timeInput) {
      this.timeInput.value = this.time.formatted24Hour;
    }
    this.element?.classList.toggle('time-paused', this.time.isPaused);
  }

  dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.element?.remove();
  }
}
