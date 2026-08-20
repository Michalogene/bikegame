// @ts-check

import { getItem } from '../data/items.js';
import { MISSION_DEFINITIONS } from '../data/missions.js';

const GLYPHS = {
  map: '⌖', inventory: '▣', crafting: '⚒', missions: '▤', camp: '♜', settings: '⚙'
};

/** @param {string} value */
function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
}

/** @param {number} value */
function pct(value) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

export class Hud {
  /** @param {{ root: HTMLElement, state: import('../state/GameState.js').GameState, world: import('../world/WorldBuilder.js').WorldBuilder, time: import('../game/TimeSystem.js').TimeSystem, missions: import('../game/MissionSystem.js').MissionSystem, crafting: import('../game/CraftingSystem.js').CraftingSystem, building: import('../game/BuildingSystem.js').BuildingSystem, interaction: import('../game/InteractionSystem.js').InteractionSystem, onNewGame: () => void }} options */
  constructor(options) {
    Object.assign(this, options);
    this.activePanel = null;
    this.enemies = null;
    this.nearby = null;
    this.inventorySignature = '';
    this.missionSignature = '';
    this.lastPanelSignature = '';
    this.toastTimer = 0;
    this.damageTimer = 0;
    this.saveTimer = 0;
    this.mapElapsed = 0;
    this.gameOverVisible = false;
    this.buildMarkup();
    this.bindEvents();
    this.renderStatic();
    this.renderHotbar();
    this.renderObjectives();
  }

  buildMarkup() {
    this.root.innerHTML = `
      <div class="hud" aria-label="Afterdark County HUD">
        <header class="top-hud panel-glass">
          <section class="survivor-card">
            <div class="portrait" aria-hidden="true"><i></i></div>
            <div class="survivor-copy">
              <strong>SURVIVOR_1178</strong>
              <span>LVL <b id="level-value">7</b></span>
              <div class="xp-track"><i id="xp-fill"></i></div>
            </div>
          </section>
          <section class="resource-strip" aria-label="Current resources">
            <div title="Hydration"><span class="resource-icon water">●</span><b id="resource-water">68</b></div>
            <div title="Food"><span class="resource-icon food">Ψ</span><b id="resource-food">55</b></div>
            <div title="Lumber"><span class="resource-icon wood">▰</span><b id="resource-wood">8</b></div>
            <div title="Mechanical resources"><span class="resource-icon parts">⚙</span><b id="resource-parts">4</b></div>
          </section>
          <section class="clock-card">
            <b>DAY <span id="day-value">3</span></b>
            <strong id="time-value">10:47 PM</strong>
            <span id="phase-icon">☾</span>
          </section>
          <nav class="top-navigation" aria-label="Game panels">
            ${['map', 'inventory', 'crafting', 'missions', 'camp', 'settings'].map((panel) => `
              <button type="button" data-panel="${panel}"><span>${GLYPHS[panel]}</span><b>${panel.toUpperCase()}</b></button>
            `).join('')}
          </nav>
        </header>

        <section class="brand-mark" aria-label="Afterdark County">
          <strong>AFTERDARK</strong><span>COUNTY</span>
        </section>

        <aside class="right-status">
          <div class="minimap-shell panel-glass">
            <strong id="zone-name">PINE RIDGE</strong>
            <canvas id="minimap" width="320" height="320" aria-label="Pine Ridge minimap"></canvas>
            <span class="minimap-north">N</span>
          </div>
          <div class="safe-zone"><i></i><span id="safe-zone-label">SAFE ZONE</span></div>
          <div class="nightfall-card panel-glass" id="nightfall-card">
            <div class="moon-orb">☾</div>
            <div><strong id="nightfall-title">NIGHTFALL</strong><span>Temperature: <b id="temperature-value">8°C</b></span></div>
            <b id="nightfall-time">0h 13m</b>
          </div>
        </aside>

        <aside class="objectives panel-glass">
          <h2>CURRENT OBJECTIVES</h2>
          <div id="objective-list"></div>
        </aside>

        <aside class="survival-bars panel-glass" aria-label="Survival status">
          <div class="status-row health"><span>♥</span><div><i id="health-bar"></i></div><b id="health-value">78/100</b></div>
          <div class="status-row stamina"><span>ϟ</span><div><i id="stamina-bar"></i></div><b id="stamina-value">64/100</b></div>
          <div class="status-row hydration"><span>●</span><div><i id="hydration-bar"></i></div><b id="hydration-value">68/100</b></div>
        </aside>

        <section class="hotbar" id="hotbar" aria-label="Hotbar"></section>
        <div class="selected-item-label" id="selected-item-label">Heavy Flashlight</div>
        <div class="carry-weight panel-glass"><span>▰</span><b id="carry-weight">31.4 / 60 KG</b></div>
        <div class="interaction-prompt panel-glass" id="interaction-prompt"><kbd>E</kbd><span>INTERACT</span></div>
        <div class="control-hint"><span>WASD MOVE</span><span>SHIFT SPRINT</span><span>Q / R ROTATE</span><span>WHEEL ZOOM</span></div>
        <div class="autosave-indicator" id="autosave-indicator">SAVED</div>
        <div class="toast" id="toast" role="status" aria-live="polite"></div>
        <div class="damage-flash" id="damage-flash"></div>
        <div class="nightfall-overlay" id="nightfall-overlay"><strong>NIGHTFALL</strong><span>The county is awake.</span></div>

        <div class="panel-backdrop" id="panel-backdrop" aria-hidden="true">
          <section class="game-panel panel-glass" id="game-panel" role="dialog" aria-modal="true">
            <header><div><span id="panel-icon">▣</span><div><strong id="panel-title">INVENTORY</strong><small id="panel-subtitle">Manage recovered supplies</small></div></div><button type="button" data-close-panel aria-label="Close panel">×</button></header>
            <div class="panel-content" id="panel-content"></div>
          </section>
        </div>

        <div class="game-over" id="game-over">
          <div class="game-over-card panel-glass">
            <span>AFTERDARK COUNTY</span>
            <strong>YOU DIDN'T MAKE IT THROUGH THE NIGHT</strong>
            <p>Your last autosave remains available. Start a new survivor to clear it.</p>
            <button type="button" data-new-game>START NEW SURVIVOR</button>
          </div>
        </div>
      </div>
    `;

    this.elements = {
      level: this.root.querySelector('#level-value'), xp: this.root.querySelector('#xp-fill'),
      resourceWater: this.root.querySelector('#resource-water'), resourceFood: this.root.querySelector('#resource-food'),
      resourceWood: this.root.querySelector('#resource-wood'), resourceParts: this.root.querySelector('#resource-parts'),
      day: this.root.querySelector('#day-value'), time: this.root.querySelector('#time-value'), phase: this.root.querySelector('#phase-icon'),
      minimap: this.root.querySelector('#minimap'), safeZone: this.root.querySelector('#safe-zone-label'),
      nightfallCard: this.root.querySelector('#nightfall-card'), nightfallTitle: this.root.querySelector('#nightfall-title'),
      nightfallTime: this.root.querySelector('#nightfall-time'), temperature: this.root.querySelector('#temperature-value'),
      objectiveList: this.root.querySelector('#objective-list'),
      healthBar: this.root.querySelector('#health-bar'), healthValue: this.root.querySelector('#health-value'),
      staminaBar: this.root.querySelector('#stamina-bar'), staminaValue: this.root.querySelector('#stamina-value'),
      hydrationBar: this.root.querySelector('#hydration-bar'), hydrationValue: this.root.querySelector('#hydration-value'),
      hotbar: this.root.querySelector('#hotbar'), selectedLabel: this.root.querySelector('#selected-item-label'),
      carryWeight: this.root.querySelector('#carry-weight'), prompt: this.root.querySelector('#interaction-prompt'),
      autosave: this.root.querySelector('#autosave-indicator'), toast: this.root.querySelector('#toast'),
      damageFlash: this.root.querySelector('#damage-flash'), nightfallOverlay: this.root.querySelector('#nightfall-overlay'),
      backdrop: this.root.querySelector('#panel-backdrop'), panel: this.root.querySelector('#game-panel'),
      panelIcon: this.root.querySelector('#panel-icon'), panelTitle: this.root.querySelector('#panel-title'),
      panelSubtitle: this.root.querySelector('#panel-subtitle'), panelContent: this.root.querySelector('#panel-content'),
      gameOver: this.root.querySelector('#game-over')
    };
  }

  bindEvents() {
    this.root.addEventListener('click', (event) => {
      const target = /** @type {HTMLElement} */ (event.target);
      const panelButton = target.closest('[data-panel]');
      if (panelButton) {
        this.togglePanel(panelButton.getAttribute('data-panel'));
        return;
      }
      if (target.closest('[data-close-panel]') || target === this.elements.backdrop) {
        this.closePanel();
        return;
      }
      const hotbar = target.closest('[data-hotbar-index]');
      if (hotbar) {
        this.state.inventory.select(Number(hotbar.getAttribute('data-hotbar-index')));
        this.renderHotbar();
        return;
      }
      const take = target.closest('[data-take-item]');
      if (take) {
        this.interaction.take(take.getAttribute('data-take-item'), Number(take.getAttribute('data-quantity')) || 1);
        this.renderPanel(true);
        return;
      }
      if (target.closest('[data-take-all]')) {
        this.interaction.takeAll();
        this.renderPanel(true);
        return;
      }
      const use = target.closest('[data-use-item]');
      if (use) {
        const id = use.getAttribute('data-use-item');
        const item = getItem(id);
        if (item?.category === 'consumable' || item?.category === 'medical') this.state.consume(id);
        else if (item?.buildable) this.building.start(item.buildable);
        this.renderPanel(true);
        return;
      }
      const select = target.closest('[data-select-item]');
      if (select) {
        const id = select.getAttribute('data-select-item');
        const index = this.state.inventory.hotbar.findIndex((entry) => entry === id);
        if (index >= 0) this.state.inventory.select(index);
        this.closePanel();
        this.renderHotbar();
        return;
      }
      const craft = target.closest('[data-craft-recipe]');
      if (craft) {
        this.crafting.craft(craft.getAttribute('data-craft-recipe'));
        this.renderPanel(true);
        return;
      }
      const build = target.closest('[data-build-kind]');
      if (build) {
        if (this.building.start(build.getAttribute('data-build-kind'))) this.closePanel();
        return;
      }
      if (target.closest('[data-new-game]')) this.onNewGame();
    });

    this.root.addEventListener('input', (event) => {
      const target = /** @type {HTMLInputElement} */ (event.target);
      if (target.matches('[data-audio-volume]')) this.state.bus.emit('settings:volume', Number(target.value));
      if (target.matches('[data-time-speed]')) this.state.clock.speed = Number(target.value);
    });

    this.disposers = [
      this.state.bus.on('toast', (message) => this.showToast(String(message))),
      this.state.bus.on('inventory:changed', () => { this.inventorySignature = ''; this.renderHotbar(); this.renderPanel(true); }),
      this.state.bus.on('mission:complete', () => { this.missionSignature = ''; this.renderObjectives(); }),
      this.state.bus.on('mission:progress', () => { this.missionSignature = ''; this.renderObjectives(); }),
      this.state.bus.on('container:open', () => this.openPanel('loot')),
      this.state.bus.on('container:close', () => { if (this.activePanel === 'loot') this.closePanel(); }),
      this.state.bus.on('container:changed', () => this.renderPanel(true)),
      this.state.bus.on('player:damaged', () => { this.damageTimer = 0.34; }),
      this.state.bus.on('save:complete', () => { this.saveTimer = 1.4; }),
      this.state.bus.on('nightfall:start', () => this.showNightfall()),
      this.state.bus.on('player:died', () => this.showGameOver())
    ];
  }

  renderStatic() {
    this.elements.level.textContent = String(this.state.level);
  }

  /** @param {any} enemies */
  setEnemySystem(enemies) {
    this.enemies = enemies;
  }

  /** @param {any} nearby */
  setNearby(nearby) {
    this.nearby = nearby;
  }

  /** @param {number} dt */
  update(dt) {
    const s = this.state.survival;
    const resources = this.state.resourceSummary;
    this.elements.resourceWater.textContent = String(resources.hydration);
    this.elements.resourceFood.textContent = String(resources.hunger);
    this.elements.resourceWood.textContent = String(resources.wood);
    this.elements.resourceParts.textContent = String(resources.parts);
    this.elements.day.textContent = String(this.state.clock.day);
    this.elements.time.textContent = this.time.formattedTime;
    this.elements.phase.textContent = this.state.isNight ? '☾' : '☀';
    this.elements.temperature.textContent = `${this.time.temperature}°C`;
    this.elements.nightfallTime.textContent = this.time.nightfallLabel;
    this.elements.nightfallTitle.textContent = this.state.clock.nightfallActive ? 'NIGHTFALL ACTIVE' : 'NIGHTFALL';
    this.elements.nightfallCard.classList.toggle('active', this.state.clock.nightfallActive);
    this.elements.safeZone.textContent = this.building.nearFire(this.state.player.x, this.state.player.z) ? 'CAMP SAFE RADIUS' : 'SAFE ZONE';

    this.elements.healthBar.style.width = pct(s.health);
    this.elements.staminaBar.style.width = pct(s.stamina);
    this.elements.hydrationBar.style.width = pct(s.hydration);
    this.elements.healthValue.textContent = `${Math.round(s.health)}/100`;
    this.elements.staminaValue.textContent = `${Math.round(s.stamina)}/100`;
    this.elements.hydrationValue.textContent = `${Math.round(s.hydration)}/100`;
    this.elements.carryWeight.textContent = this.state.carryWeightText;
    this.elements.xp.style.width = `${(this.state.experience % 500) / 5}%`;

    const promptVisible = Boolean(this.nearby) && !this.activePanel;
    this.elements.prompt.classList.toggle('visible', promptVisible);
    if (promptVisible) this.elements.prompt.querySelector('span').textContent = this.nearby.label.toUpperCase();

    this.toastTimer -= dt;
    this.elements.toast.classList.toggle('visible', this.toastTimer > 0);
    this.damageTimer -= dt;
    this.elements.damageFlash.style.opacity = String(Math.max(0, this.damageTimer / 0.34) * 0.55);
    this.saveTimer -= dt;
    this.elements.autosave.classList.toggle('visible', this.saveTimer > 0);
    this.mapElapsed += dt;
    if (this.mapElapsed > 0.08) {
      this.mapElapsed = 0;
      this.drawMinimap(this.elements.minimap, false);
      const largeMap = this.root.querySelector('#large-map');
      if (largeMap) this.drawMinimap(largeMap, true);
    }

    const hotbarSignature = JSON.stringify({ entries: this.state.inventory.serialize().entries, selected: this.state.inventory.selected });
    if (hotbarSignature !== this.inventorySignature) this.renderHotbar();
    const missionSignature = JSON.stringify(this.state.missions);
    if (missionSignature !== this.missionSignature) this.renderObjectives();
    if (this.activePanel) this.renderPanel();
  }

  renderHotbar() {
    const inventory = this.state.inventory;
    this.inventorySignature = JSON.stringify({ entries: inventory.serialize().entries, selected: inventory.selected });
    this.elements.hotbar.innerHTML = inventory.hotbar.map((id, index) => {
      const item = id ? getItem(id) : null;
      const quantity = id ? inventory.count(id) : 0;
      const displayQuantity = id === 'revolver' ? inventory.count('ammo_9mm') : quantity;
      const empty = !item || quantity <= 0;
      return `<button type="button" class="hotbar-slot ${index === inventory.selected ? 'selected' : ''} ${empty ? 'empty' : ''}" data-hotbar-index="${index}" title="${escapeHtml(item?.name ?? 'Empty slot')}">
        <span class="slot-number">${index + 1}</span>
        <span class="slot-glyph" style="--item-color:${item?.color ?? '#777'}">${item?.glyph ?? '·'}</span>
        ${displayQuantity > 1 || id === 'revolver' ? `<b class="slot-quantity">${displayQuantity}</b>` : ''}
      </button>`;
    }).join('');
    const selected = inventory.selectedId ? getItem(inventory.selectedId) : null;
    this.elements.selectedLabel.textContent = selected ? selected.name : 'Empty slot';
  }

  renderObjectives() {
    const missions = this.missions.list().sort((a, b) => a.priority - b.priority);
    this.missionSignature = JSON.stringify(this.state.missions);
    this.elements.objectiveList.innerHTML = missions.map((mission, index) => `
      <div class="objective-row ${mission.complete ? 'complete' : ''} ${!mission.complete && index === missions.findIndex((entry) => !entry.complete) ? 'active' : ''}">
        <i>${mission.complete ? '✓' : ''}</i>
        <span>${escapeHtml(mission.title)}</span>
        ${mission.target > 1 && !mission.complete ? `<b>${mission.progress}/${mission.target}</b>` : ''}
      </div>
    `).join('');
  }

  /** @param {string | null} panel */
  togglePanel(panel) {
    if (this.activePanel === panel) this.closePanel();
    else this.openPanel(panel);
  }

  /** @param {string} panel */
  openPanel(panel) {
    this.activePanel = panel;
    this.lastPanelSignature = '';
    this.elements.backdrop.classList.add('visible');
    this.elements.backdrop.setAttribute('aria-hidden', 'false');
    this.renderPanel(true);
  }

  closePanel() {
    if (this.activePanel === 'loot') this.interaction.closeContainer();
    this.activePanel = null;
    this.elements.backdrop.classList.remove('visible');
    this.elements.backdrop.setAttribute('aria-hidden', 'true');
  }

  /** @param {boolean} [force] */
  renderPanel(force = false) {
    if (!this.activePanel) return;
    const signature = `${this.activePanel}:${JSON.stringify(this.state.inventory.serialize())}:${JSON.stringify(this.state.missions)}:${this.interaction.activeContainer?.items?.map((item) => `${item.id}:${item.qty}`).join('|') ?? ''}:${this.building.activeKind ?? ''}`;
    if (!force && signature === this.lastPanelSignature) return;
    this.lastPanelSignature = signature;
    const metadata = {
      inventory: ['▣', 'INVENTORY', 'Manage recovered supplies and equipment'],
      crafting: ['⚒', 'CRAFTING BOOK', 'Convert salvage into survival equipment'],
      missions: ['▤', 'MISSIONS', 'Track the objectives guiding this survivor'],
      camp: ['♜', 'CAMP', 'Place prepared structures in the world'],
      map: ['⌖', 'COUNTY MAP', 'Discovered roads, landmarks and threats'],
      settings: ['⚙', 'SETTINGS', 'Tune audio and simulation preferences'],
      loot: ['□', 'SEARCH CONTAINER', this.interaction.activeContainer?.label ?? 'Recovered supplies']
    }[this.activePanel] ?? ['•', this.activePanel.toUpperCase(), ''];
    this.elements.panelIcon.textContent = metadata[0];
    this.elements.panelTitle.textContent = metadata[1];
    this.elements.panelSubtitle.textContent = metadata[2];
    if (this.activePanel === 'inventory') this.elements.panelContent.innerHTML = this.inventoryPanel();
    if (this.activePanel === 'crafting') this.elements.panelContent.innerHTML = this.craftingPanel();
    if (this.activePanel === 'missions') this.elements.panelContent.innerHTML = this.missionsPanel();
    if (this.activePanel === 'camp') this.elements.panelContent.innerHTML = this.campPanel();
    if (this.activePanel === 'map') this.elements.panelContent.innerHTML = this.mapPanel();
    if (this.activePanel === 'settings') this.elements.panelContent.innerHTML = this.settingsPanel();
    if (this.activePanel === 'loot') this.elements.panelContent.innerHTML = this.lootPanel();
  }

  inventoryPanel() {
    const inventory = this.state.inventory;
    const items = inventory.list();
    const selected = inventory.selectedId ? getItem(inventory.selectedId) : null;
    return `<div class="inventory-panel-layout">
      <aside class="paperdoll-card">
        <div class="paperdoll"><i class="paper-head"></i><i class="paper-body"></i><i class="paper-pack"></i></div>
        <strong>SURVIVOR_1178</strong>
        <span>${this.state.carryWeightText}</span>
        <div class="inventory-stats"><div><b>${Math.round(this.state.survival.health)}</b><span>HEALTH</span></div><div><b>${this.state.enemyKills}</b><span>KILLS</span></div><div><b>${Math.round(this.state.playSeconds / 60)}</b><span>MINUTES</span></div></div>
        ${selected ? `<div class="selected-detail"><span style="--item-color:${selected.color}">${selected.glyph}</span><div><strong>${escapeHtml(selected.name)}</strong><p>${escapeHtml(selected.description)}</p></div></div>` : ''}
      </aside>
      <section class="inventory-grid-section">
        <div class="section-heading"><strong>BACKPACK</strong><span>${items.length} item types · ${inventory.weight.toFixed(1)} kg</span></div>
        <div class="item-grid">${items.map((entry) => {
          const item = entry.definition;
          const usable = ['consumable', 'medical', 'buildable'].includes(item.category);
          return `<article class="item-card ${inventory.selectedId === item.id ? 'equipped' : ''}">
            <span class="item-glyph" style="--item-color:${item.color}">${item.glyph}</span>
            <div><strong>${escapeHtml(item.name)}</strong><small>${item.category.toUpperCase()}</small><p>${escapeHtml(item.description)}</p></div>
            <b class="item-count">×${entry.qty}</b>
            <span class="item-weight">${(item.weight * entry.qty).toFixed(2)} KG</span>
            <div class="item-actions"><button type="button" data-select-item="${item.id}">SELECT</button>${usable ? `<button type="button" data-use-item="${item.id}">${item.category === 'buildable' ? 'PLACE' : 'USE'}</button>` : ''}</div>
          </article>`;
        }).join('')}</div>
      </section>
    </div>`;
  }

  craftingPanel() {
    const recipes = this.crafting.list();
    return `<div class="crafting-layout"><aside class="craft-book-index"><strong>FIELD MANUAL</strong><p>Recipes remain available once learned. Crafted construction kits are placed from the Camp panel or directly from inventory.</p><div class="craft-categories"><span>MEDICINE</span><span>CAMP</span><span>DEFENSE</span></div></aside><section class="recipe-list">${recipes.map((recipe) => `
      <article class="recipe-card ${recipe.canCraft ? 'available' : ''}"><span>${recipe.glyph}</span><div><strong>${escapeHtml(recipe.name)}</strong><small>${escapeHtml(recipe.category)}</small><p>${escapeHtml(recipe.description)}</p><div class="recipe-cost">${Object.entries(recipe.cost).map(([id, qty]) => { const item = getItem(id); const have = this.state.inventory.count(id); return `<i class="${have >= qty ? 'enough' : ''}">${item?.glyph ?? '•'} ${item?.name ?? id} ${have}/${qty}</i>`; }).join('')}</div></div><button type="button" data-craft-recipe="${recipe.id}" ${recipe.canCraft ? '' : 'disabled'}>CRAFT</button></article>
    `).join('')}</section></div>`;
  }

  missionsPanel() {
    return `<div class="mission-board">${this.missions.list().map((mission, index) => `
      <article class="mission-card ${mission.complete ? 'complete' : ''}"><span>${mission.complete ? '✓' : String(index + 1).padStart(2, '0')}</span><div><strong>${escapeHtml(mission.title)}</strong><p>${escapeHtml(mission.description)}</p><div class="mission-progress"><i style="width:${mission.target ? Math.min(100, mission.progress / mission.target * 100) : 0}%"></i></div><small>${mission.complete ? 'COMPLETED' : `${mission.progress} / ${mission.target}`}</small></div></article>
    `).join('')}</div>`;
  }

  campPanel() {
    const buildables = this.building.listBuildables();
    return `<div class="camp-layout"><aside><strong>CONSTRUCTION MODE</strong><p>Select a prepared kit, then move the translucent blueprint across the world. Left click confirms placement. Q/R rotates. Escape cancels.</p><div class="camp-status"><span>Placed structures</span><b>${this.building.structures.size}</b></div></aside><section class="buildable-grid">${buildables.map((entry) => `
      <article class="buildable-card ${entry.available ? 'available' : ''}"><span>${getItem(entry.kit)?.glyph ?? '□'}</span><div><strong>${escapeHtml(entry.name)}</strong><p>${escapeHtml(entry.description)}</p><small>${entry.available ? `${this.state.inventory.count(entry.kit)} KIT AVAILABLE` : 'CRAFT KIT FIRST'}</small></div><button type="button" data-build-kind="${entry.id}" ${entry.available ? '' : 'disabled'}>PLACE</button></article>
    `).join('')}</section></div>`;
  }

  mapPanel() {
    return `<div class="map-layout"><div class="large-map-shell"><canvas id="large-map" width="760" height="620"></canvas><span class="map-north">N</span></div><aside><strong>AFTERDARK COUNTY</strong><p>Only the Pine Ridge district is currently charted. Roads beyond the rockfall and dense forest remain inaccessible in this vertical slice.</p><div class="map-legend"><span><i class="legend-player"></i> SURVIVOR</span><span><i class="legend-poi"></i> POINT OF INTEREST</span><span><i class="legend-camp"></i> CAMP STRUCTURE</span><span><i class="legend-hostile"></i> DETECTED HOSTILE</span></div></aside></div>`;
  }

  settingsPanel() {
    return `<div class="settings-layout"><section><strong>AUDIO</strong><label>Master volume <input type="range" min="0" max="1" step="0.05" value="0.48" data-audio-volume></label></section><section><strong>SIMULATION</strong><label>World time speed <input type="range" min="0.2" max="2" step="0.05" value="${this.state.clock.speed}" data-time-speed></label><p>Higher values bring Nightfall sooner. Autosaves occur every 20 seconds.</p></section><section><strong>CONTROLS</strong><div class="control-table"><span>WASD</span><b>Move</b><span>SHIFT</span><b>Sprint</b><span>E</span><b>Interact</b><span>1–8</span><b>Hotbar</b><span>LEFT CLICK</span><b>Use / attack / place</b><span>RIGHT CLICK</span><b>Dig with shovel</b><span>Q / R</span><b>Rotate camera or blueprint</b></div></section></div>`;
  }

  lootPanel() {
    const container = this.interaction.activeContainer;
    if (!container) return `<div class="empty-state">The container is empty.</div>`;
    return `<div class="loot-layout"><aside><span>□</span><strong>${escapeHtml(container.label)}</strong><p>Transfer supplies into your backpack. Carry capacity is enforced.</p><b>${this.state.carryWeightText}</b><button type="button" data-take-all ${container.items.length ? '' : 'disabled'}>TAKE ALL</button></aside><section class="loot-grid">${container.items.length ? container.items.map((entry) => { const item = getItem(entry.id); return `<article><span style="--item-color:${item?.color ?? '#aaa'}">${item?.glyph ?? '•'}</span><div><strong>${escapeHtml(item?.name ?? entry.id)}</strong><small>${item?.category?.toUpperCase() ?? 'ITEM'} · ${(item?.weight ?? 0) * entry.qty} KG</small><p>${escapeHtml(item?.description ?? '')}</p></div><b>×${entry.qty}</b><button type="button" data-take-item="${entry.id}" data-quantity="${entry.qty}">TAKE</button></article>`; }).join('') : '<div class="empty-state">Nothing useful remains.</div>'}</section></div>`;
  }

  /** @param {HTMLCanvasElement} canvas @param {boolean} large */
  drawMinimap(canvas, large) {
    const context = canvas.getContext('2d');
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const radius = Math.min(width, height) * (large ? 0.47 : 0.48);
    const range = large ? 92 : 82;
    const map = (x, z) => ({ x: centerX + x / range * radius, y: centerY + z / range * radius });
    context.clearRect(0, 0, width, height);
    context.save();
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.clip();
    const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#394035');
    gradient.addColorStop(1, '#141b17');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.globalAlpha = 0.28;
    context.fillStyle = '#19261d';
    for (let index = 0; index < 140; index += 1) {
      const angle = index * 2.399;
      const distance = radius * Math.sqrt((index * 0.618) % 1);
      context.beginPath();
      context.arc(centerX + Math.cos(angle) * distance, centerY + Math.sin(angle) * distance, large ? 3.5 : 2, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    context.strokeStyle = '#73705e';
    context.lineWidth = large ? 28 : 12;
    let a = map(0, -90); let b = map(0, 90);
    context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
    context.lineWidth = large ? 23 : 10;
    a = map(-60, 8); b = map(55, 8);
    context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
    context.strokeStyle = '#b2a46e';
    context.lineWidth = large ? 2 : 1;
    context.setLineDash([8, 10]);
    a = map(0, -90); b = map(0, 90);
    context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
    context.setLineDash([]);

    for (const poi of this.world.poi) {
      const point = map(poi.x, poi.z);
      context.fillStyle = '#e7deca';
      context.font = `${large ? 19 : 15}px sans-serif`;
      context.textAlign = 'center';
      context.fillText(poi.glyph, point.x, point.y + 5);
      if (large) {
        context.font = '700 12px Arial Narrow';
        context.fillText(poi.name, point.x, point.y + 22);
      }
    }
    for (const structure of this.building.structures.values()) {
      const point = map(structure.x, structure.z);
      context.fillStyle = '#e39a47';
      context.beginPath(); context.arc(point.x, point.y, large ? 6 : 3.5, 0, Math.PI * 2); context.fill();
    }
    if (this.enemies) {
      for (const enemy of this.enemies.enemies) {
        if (enemy.dead) continue;
        const distance = Math.hypot(enemy.position.x - this.state.player.x, enemy.position.z - this.state.player.z);
        if (!large && distance > 24 && !this.state.clock.nightfallActive) continue;
        const point = map(enemy.position.x, enemy.position.z);
        context.fillStyle = '#c84d3a';
        context.beginPath(); context.arc(point.x, point.y, large ? 4 : 2.2, 0, Math.PI * 2); context.fill();
      }
    }
    const playerPoint = map(this.state.player.x, this.state.player.z);
    context.save();
    context.translate(playerPoint.x, playerPoint.y);
    context.rotate(-this.state.player.rotation);
    context.fillStyle = '#f3eee1';
    context.strokeStyle = '#181a17';
    context.lineWidth = 2;
    context.beginPath(); context.moveTo(0, -10); context.lineTo(7, 8); context.lineTo(0, 5); context.lineTo(-7, 8); context.closePath(); context.fill(); context.stroke();
    context.restore();
    context.restore();

    context.strokeStyle = '#b4a489';
    context.lineWidth = large ? 5 : 3;
    context.beginPath(); context.arc(centerX, centerY, radius - 2, 0, Math.PI * 2); context.stroke();
  }

  /** @param {string} message */
  showToast(message) {
    this.elements.toast.textContent = message;
    this.toastTimer = 3.4;
    this.elements.toast.classList.add('visible');
  }

  showNightfall() {
    this.elements.nightfallOverlay.classList.remove('show');
    requestAnimationFrame(() => this.elements.nightfallOverlay.classList.add('show'));
    setTimeout(() => this.elements.nightfallOverlay.classList.remove('show'), 4200);
  }

  showGameOver() {
    if (this.gameOverVisible) return;
    this.gameOverVisible = true;
    this.closePanel();
    this.elements.gameOver.classList.add('visible');
  }

  dispose() {
    for (const dispose of this.disposers) dispose();
    this.root.innerHTML = '';
  }
}
