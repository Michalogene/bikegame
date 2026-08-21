// @ts-check

import { AudioSystem } from '../audio/AudioSystem.js';
import { EventBus } from '../core/EventBus.js';
import { GameLoop } from '../core/GameLoop.js';
import { CharacterPresentation } from '../entities/CharacterPresentation.js';
import { EnemySystem } from '../entities/EnemySystem.js';
import { EffectsSystem } from '../effects/EffectsSystem.js';
import { Player } from '../entities/Player.js';
import { BuildingSystem } from '../game/BuildingSystem.js';
import { CombatSystem } from '../game/CombatSystem.js';
import { CraftingSystem } from '../game/CraftingSystem.js';
import { InteractionSystem } from '../game/InteractionSystem.js';
import { MissionSystem } from '../game/MissionSystem.js';
import { RespawnSystem } from '../game/RespawnSystem.js';
import { TimeSystem } from '../game/TimeSystem.js';
import { WorldLootSystem } from '../game/WorldLootSystem.js';
import { InputManager } from '../input/InputManager.js';
import { CameraFeedback } from '../render/CameraFeedback.js';
import { CameraRig } from '../render/CameraRig.js';
import { RendererSystem } from '../render/Renderer.js';
import { SaveSystem } from '../state/SaveSystem.js';
import { Hud } from '../ui/Hud.js';
import { MinimapRenderer } from '../ui/MinimapRenderer.js';
import { VisualTuningSystem } from '../visual/VisualTuningSystem.js';
import { InteriorSystem } from '../world/InteriorSystem.js';
import { WorldBuilder } from '../world/WorldBuilder.js';
import { WorldPolish } from '../world/WorldPolish.js';

export class GameApp {
  /** @param {{ gameRoot: HTMLElement, uiRoot: HTMLElement }} roots */
  constructor(roots) {
    this.gameRoot = roots.gameRoot;
    this.uiRoot = roots.uiRoot;
    this.bus = new EventBus();
    this.save = new SaveSystem(this.bus);
    this.state = this.save.load();
    this.renderer = new RendererSystem(this.gameRoot);
    this.world = new WorldBuilder(this.renderer.scene, this.state);
    this.worldPolish = new WorldPolish(this.world);
    this.time = new TimeSystem(this.state);
    this.missions = new MissionSystem(this.state);
    this.crafting = new CraftingSystem(this.state);
    this.building = new BuildingSystem(this.state, this.world);
    this.player = new Player(this.state, this.world);
    this.enemies = new EnemySystem(this.state, this.world, this.building);
    this.combat = new CombatSystem(this.state, this.world, this.enemies, this.building);
    this.worldLoot = new WorldLootSystem(this.state, this.world);
    this.interaction = new InteractionSystem(this.state, this.world);
    this.effects = new EffectsSystem(this.state, this.world, this.player);
    this.characters = new CharacterPresentation(this.state, this.world, this.player, this.enemies);
    this.visualTuning = new VisualTuningSystem(this.world, this.effects, this.player);
    this.minimapRenderer = new MinimapRenderer({
      state: this.state,
      world: this.world,
      building: this.building,
      missions: this.missions,
      enemies: this.enemies
    });
    this.camera = new CameraRig(this.gameRoot);
    this.interiors = new InteriorSystem(this.world, this.player, this.camera);
    this.cameraFeedback = new CameraFeedback(this.bus, this.camera);
    this.camera.smoothedTarget.copy(this.player.position);
    this.input = new InputManager(this.renderer.renderer.domElement);
    this.audio = new AudioSystem(this.bus);
    this.input.onGesture = () => this.audio.unlock();
    this.hud = new Hud({
      root: this.uiRoot,
      state: this.state,
      world: this.world,
      time: this.time,
      missions: this.missions,
      crafting: this.crafting,
      building: this.building,
      interaction: this.interaction,
      onNewGame: () => this.newGame()
    });
    this.hud.setEnemySystem(this.enemies);
    this.hud.drawMinimap = (canvas, large) => this.minimapRenderer.draw(canvas, large);
    this.respawnSystem = new RespawnSystem({
      state: this.state,
      world: this.world,
      player: this.player,
      input: this.input,
      camera: this.camera,
      interiors: this.interiors,
      interaction: this.interaction,
      building: this.building,
      hud: this.hud,
      save: this.save,
      bus: this.bus
    });
    this.respawnSystem.setEnemies(this.enemies.enemies);
    this.interiors.syncFromPlayer({ immediate: true });
    this.loop = new GameLoop({
      fixedUpdate: (dt) => this.fixedUpdate(dt),
      render: (alpha, dt) => this.render(alpha, dt)
    });
    this.elapsed = 0;
    this.dead = this.state.dead;
    this.aimPoint = null;
    this.firstFrame = true;
    this.bindLifecycle();
  }

  bindLifecycle() {
    this.handlePageHide = () => this.save.save(this.state);
    this.handleVisibility = () => {
      if (document.hidden) this.save.save(this.state);
    };
    window.addEventListener('pagehide', this.handlePageHide);
    document.addEventListener('visibilitychange', this.handleVisibility);
    this.disposers = [
      this.bus.on('settings:volume', (value) => this.audio.setVolume(Number(value))),
      this.bus.on('player:died', () => {
        this.dead = true;
        this.save.save(this.state);
      }),
      this.bus.on('player:respawned', () => {
        this.dead = false;
        this.interiors.syncFromPlayer({ immediate: true });
        this.renderer.renderer.domElement.focus?.();
      }),
      this.bus.on('combat:shot', () => {
        for (const enemy of this.enemies.enemies) {
          if (enemy.dead) continue;
          const distance = Math.hypot(enemy.position.x - this.player.position.x, enemy.position.z - this.player.position.z);
          if (distance < 28) {
            enemy.state = 'chase';
            enemy.lastKnown.x = this.player.position.x;
            enemy.lastKnown.z = this.player.position.z;
          }
        }
      })
    ];
  }

  start() {
    this.renderer.renderer.domElement.tabIndex = 0;
    this.renderer.renderer.domElement.focus?.();
    this.loop.start();
  }

  /** @param {number} dt */
  fixedUpdate(dt) {
    this.elapsed += dt;
    this.respawnSystem.update(dt);
    this.dead = this.state.dead;
    this.handleGlobalInput();
    const panelOpen = Boolean(this.hud.activePanel);
    const canSimulate = !panelOpen && !this.state.dead;
    this.aimPoint = this.camera.pointerToGround(this.input.pointer, 0);

    if (canSimulate) {
      this.time.update(dt);
      this.combat.update(dt);
      this.building.update(dt);

      if (this.building.activeKind) {
        this.building.updatePlacement(this.aimPoint);
        this.player.stopAiming();
        if (this.input.consumeMousePressed(0)) this.building.place();
        if (this.input.consumeMousePressed(2)) this.building.cancel();
        this.player.update(dt, { x: 0, z: 0, moving: false }, false);
        this.interaction.update(this.player.position.x, this.player.position.z, this.player.root.rotation.y);
      } else {
        const movement = this.input.movement;
        const worldDirection = movement.moving ? this.camera.inputToWorld(movement.x, movement.z) : { x: 0, z: 0 };
        this.player.stopAiming();
        this.player.update(
          dt,
          { ...worldDirection, moving: movement.moving },
          this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight')
        );
        if (this.aimPoint && (this.state.inventory.selectedId === 'revolver' || this.input.mouseButtons.has(0))) {
          this.player.aimAt(this.aimPoint.x, this.aimPoint.z, dt);
        }
        const nearby = this.interaction.update(
          this.player.position.x,
          this.player.position.z,
          this.player.root.rotation.y
        );
        this.hud.setNearby(nearby);
        if (this.input.consumePressed('KeyE')) this.interaction.interact();
        if (this.input.consumePressed('KeyF')) this.player.toggleFlashlight();
        if (this.input.consumeMousePressed(0)) this.combat.primary(this.player, this.aimPoint);
        if (this.input.consumeMousePressed(2)) this.combat.secondary(this.player, this.aimPoint);
      }

      this.enemies.update(dt, this.player);
      const nearFire = this.building.nearFire(this.player.position.x, this.player.position.z);
      this.state.updateSurvival(dt, {
        moving: this.player.moving,
        sprinting: this.player.sprinting,
        nearFire
      });
      this.save.update(dt, this.state);
    } else {
      this.hud.setNearby(null);
    }
  }

  handleGlobalInput() {
    for (let index = 0; index < 8; index += 1) {
      if (this.input.consumePressed(`Digit${index + 1}`)) {
        this.state.inventory.select(index);
        this.bus.emit('inventory:changed');
      }
    }
    if (this.input.consumePressed('Tab') || this.input.consumePressed('KeyI')) this.hud.togglePanel('inventory');
    if (this.input.consumePressed('KeyC')) this.hud.togglePanel('crafting');
    if (this.input.consumePressed('KeyM')) this.hud.togglePanel('map');
    if (this.input.consumePressed('KeyB')) this.hud.togglePanel('camp');
    if (this.input.consumePressed('Escape')) {
      if (this.building.activeKind) this.building.cancel();
      else this.hud.closeTopPanel?.();
    }
    if (this.input.consumePressed('KeyQ')) {
      if (this.building.activeKind) this.building.rotate(-1);
      else this.camera.rotate(-1);
    }
    if (this.input.consumePressed('KeyR')) {
      if (this.building.activeKind) this.building.rotate(1);
      else this.camera.rotate(1);
    }
    if (this.input.wheelDelta) this.camera.changeZoom(this.input.wheelDelta);
  }

  /**
   * Central relocation API used by respawn, development tools and future fast travel.
   * @param {number} x
   * @param {number} z
   * @param {{ rotation?: number, focus?: boolean }} [options]
   */
  relocatePlayer(x, z, options = {}) {
    this.building.cancel?.();
    this.interaction.closeContainer();
    this.hud.closeAllGameplayPanels?.();
    this.player.stopAiming?.();
    this.player.velocity.x = 0;
    this.player.velocity.z = 0;
    const y = this.world.terrain.getHeight(x, z);
    this.player.root.position.set(x, y, z);
    if (Number.isFinite(options.rotation)) this.player.root.rotation.y = Number(options.rotation);
    this.state.player.x = x;
    this.state.player.z = z;
    this.state.player.rotation = this.player.root.rotation.y;
    this.input.reset?.();
    this.interiors.syncFromPlayer({ immediate: true });
    this.camera.snapTo?.(this.player.position);
    if (options.focus !== false) this.renderer.renderer.domElement.focus?.();
    return this.interiors.activeBuilding;
  }

  /** @param {{ manual?: boolean, target?: { x: number, z: number, rotation?: number } }} [options] */
  respawnPlayer(options = {}) {
    return this.respawnSystem.respawn(options);
  }

  /** @param {number} _alpha @param {number} dt */
  render(_alpha, dt) {
    this.interiors.update(dt);
    this.camera.update(this.player.position, dt);
    this.cameraFeedback.update(dt, this.elapsed);
    const lighting = this.time.lighting;
    this.renderer.updateLighting(lighting);
    this.world.update(this.player.position, lighting.night, this.elapsed);
    this.worldPolish.update(this.player.position, lighting, this.elapsed, dt);
    this.characters.update(dt, this.elapsed, lighting);
    this.effects.update(dt, this.aimPoint, this.elapsed, lighting);
    this.visualTuning.update(lighting, this.elapsed);
    this.worldLoot.update(dt, this.interaction.nearby);
    this.hud.update(dt);
    this.renderer.render(this.camera.camera);
    this.input.endFrame();
    if (this.firstFrame) {
      this.firstFrame = false;
      requestAnimationFrame(() => document.querySelector('#boot-screen')?.classList.add('hidden'));
    }
  }

  newGame() {
    this.save.clearForReload();
    window.location.reload();
  }

  dispose() {
    this.loop.stop();
    this.save.save(this.state);
    for (const dispose of this.disposers) dispose();
    this.respawnSystem.dispose();
    this.missions.dispose();
    this.cameraFeedback.dispose();
    this.characters.dispose();
    this.enemies.dispose();
    this.audio.dispose();
    this.hud.dispose();
    this.input.dispose();
    this.interiors.dispose();
    this.camera.dispose();
    this.visualTuning.dispose();
    this.effects.dispose();
    this.worldLoot.dispose();
    this.worldPolish.dispose();
    this.renderer.dispose();
    window.removeEventListener('pagehide', this.handlePageHide);
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }
}
