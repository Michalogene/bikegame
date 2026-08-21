// @ts-check

import * as THREE from '../core/three.js';
import { Random } from '../core/Random.js';

/** @param {number} width @param {number} height @param {number} depth @param {any} material */
function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** @param {any} object */
function enableShadows(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return object;
}

export class CharacterPresentation {
  /** @param {import('../state/GameState.js').GameState} state @param {import('../world/WorldBuilder.js').WorldBuilder} world @param {import('./Player.js').Player} player @param {import('./EnemySystem.js').EnemySystem} enemies */
  constructor(state, world, player, enemies) {
    this.state = state;
    this.world = world;
    this.player = player;
    this.enemies = enemies;
    this.random = new Random(0xc4a4ac73);
    this.selectedId = '';
    this.weaponKick = 0;
    this.meleeSwing = 0;
    this.enemyRecords = new Map();
    this.materials = this.createMaterials();
    this.decorateSurvivor();
    this.createEquipment();
    this.bindEvents();
    this.syncEquipment();
  }

  createMaterials() {
    return {
      canvas: new THREE.MeshStandardMaterial({ color: 0x3f493b, roughness: 0.98 }),
      canvasLight: new THREE.MeshStandardMaterial({ color: 0x696b50, roughness: 1 }),
      leather: new THREE.MeshStandardMaterial({ color: 0x50331f, roughness: 0.92 }),
      darkLeather: new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.96 }),
      clothRed: new THREE.MeshStandardMaterial({ color: 0x702b27, roughness: 1 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x69726f, roughness: 0.5, metalness: 0.58 }),
      darkMetal: new THREE.MeshStandardMaterial({ color: 0x242b29, roughness: 0.58, metalness: 0.42 }),
      blade: new THREE.MeshStandardMaterial({ color: 0xaab1ad, roughness: 0.31, metalness: 0.74 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x714c31, roughness: 0.91 }),
      lens: new THREE.MeshBasicMaterial({ color: 0xffd895 }),
      beard: new THREE.MeshStandardMaterial({ color: 0x3b281f, roughness: 1 }),
      infectedCloth: new THREE.MeshStandardMaterial({ color: 0x3b302d, roughness: 1, side: THREE.DoubleSide }),
      infectedBlood: new THREE.MeshStandardMaterial({ color: 0x641712, roughness: 0.9, emissive: 0x000000 }),
      eye: new THREE.MeshBasicMaterial({ color: 0xff6648, transparent: true, opacity: 0.1 }),
      shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })
    };
  }

  decorateSurvivor() {
    this.survivorRoot = new THREE.Group();
    this.survivorRoot.name = 'Survivor presentation';
    this.player.model.add(this.survivorRoot);

    for (const side of [-1, 1]) {
      const strap = box(0.1, 1.15, 0.07, this.materials.darkLeather);
      strap.position.set(side * 0.29, 2.03, 0.43);
      strap.rotation.z = side * -0.12;
      this.survivorRoot.add(strap);
      const pouch = box(0.34, 0.34, 0.24, this.materials.canvas);
      pouch.position.set(side * 0.39, 1.34, 0.24);
      pouch.rotation.y = side * 0.09;
      this.survivorRoot.add(pouch);
    }

    const buckle = box(0.64, 0.09, 0.09, this.materials.metal);
    buckle.position.set(0, 1.87, 0.49);
    this.survivorRoot.add(buckle);
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.08, 7, 18), this.materials.clothRed);
    scarf.rotation.x = Math.PI * 0.5;
    scarf.position.set(0, 2.47, 0.02);
    scarf.scale.z = 0.74;
    this.survivorRoot.add(scarf);

    const backpackFlap = box(0.77, 0.4, 0.12, this.materials.darkLeather);
    backpackFlap.position.set(0, 2.18, -0.72);
    backpackFlap.rotation.x = -0.17;
    this.survivorRoot.add(backpackFlap);
    for (const side of [-1, 1]) {
      const pocket = box(0.31, 0.48, 0.26, this.materials.canvas);
      pocket.position.set(side * 0.47, 1.77, -0.59);
      this.survivorRoot.add(pocket);
    }

    const canteen = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.43, 10), this.materials.canvasLight);
    body.scale.z = 0.7;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 8), this.materials.darkMetal);
    cap.position.y = 0.26;
    canteen.add(body, cap);
    canteen.position.set(-0.55, 1.17, -0.1);
    canteen.rotation.z = -0.08;
    this.survivorRoot.add(canteen);

    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.34, 10), this.materials.beard);
    beard.position.set(0, 2.57, 0.24);
    beard.rotation.x = Math.PI - 0.17;
    this.survivorRoot.add(beard);
    const patch = box(0.24, 0.2, 0.025, this.materials.clothRed);
    patch.position.set(-0.51, 2.23, 0.13);
    patch.rotation.y = -Math.PI * 0.5;
    this.survivorRoot.add(patch);

    this.playerShadow = new THREE.Mesh(new THREE.CircleGeometry(0.76, 28), this.materials.shadow.clone());
    this.playerShadow.rotation.x = -Math.PI * 0.5;
    this.playerShadow.scale.set(1, 0.58, 1);
    this.playerShadow.position.y = 0.035;
    this.playerShadow.renderOrder = 1;
    this.player.root.add(this.playerShadow);
    enableShadows(this.survivorRoot);
  }

  createEquipment() {
    this.originalHeld = this.player.model.children.find((child) => (
      child.isMesh
      && Math.abs(child.position.y - 1.72) < 0.03
      && Math.abs(child.position.z - 0.52) < 0.03
    )) ?? null;
    if (this.originalHeld) this.originalHeld.visible = false;

    this.equipmentMount = new THREE.Group();
    this.equipmentMount.name = 'Held equipment mount';
    this.equipmentMount.position.set(0.02, -0.85, 0.18);
    this.player.rightArm.add(this.equipmentMount);
    this.equipmentModels = new Map();

    const flashlight = new THREE.Group();
    const flashlightBody = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.62, 10), this.materials.darkMetal);
    flashlightBody.rotation.x = Math.PI * 0.5;
    flashlightBody.position.z = 0.25;
    const flashlightHead = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.22, 12), this.materials.metal);
    flashlightHead.rotation.x = Math.PI * 0.5;
    flashlightHead.position.z = 0.66;
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16), this.materials.lens);
    lens.position.z = 0.78;
    flashlight.add(flashlightBody, flashlightHead, lens);
    this.addEquipment('flashlight', flashlight);

    const knife = new THREE.Group();
    const knifeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.38, 8), this.materials.darkLeather);
    knifeHandle.rotation.x = Math.PI * 0.5;
    knifeHandle.position.z = 0.08;
    const knifeBlade = box(0.1, 0.035, 0.62, this.materials.blade);
    knifeBlade.position.z = 0.54;
    knifeBlade.scale.x = 0.7;
    const knifeTip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 4), this.materials.blade);
    knifeTip.rotation.x = Math.PI * 0.5;
    knifeTip.position.z = 0.95;
    knife.add(knifeHandle, knifeBlade, knifeTip);
    this.addEquipment('hunting_knife', knife);

    const revolver = new THREE.Group();
    const frame = box(0.2, 0.22, 0.46, this.materials.darkMetal);
    frame.position.z = 0.2;
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.22, 10), this.materials.metal);
    cylinder.rotation.z = Math.PI * 0.5;
    cylinder.position.set(0, 0.02, 0.23);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.54, 10), this.materials.metal);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0.08, 0.65);
    const grip = box(0.18, 0.46, 0.2, this.materials.wood);
    grip.position.set(0, -0.27, 0.04);
    grip.rotation.x = -0.22;
    revolver.add(frame, cylinder, barrel, grip);
    this.addEquipment('revolver', revolver);

    const shovel = new THREE.Group();
    const shovelHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.55, 8), this.materials.wood);
    shovelHandle.rotation.x = Math.PI * 0.5;
    shovelHandle.position.z = 0.68;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.22, 8), this.materials.metal);
    collar.rotation.x = Math.PI * 0.5;
    collar.position.z = 1.49;
    const shovelBlade = box(0.48, 0.08, 0.55, this.materials.blade);
    shovelBlade.position.set(0, -0.08, 1.83);
    shovelBlade.rotation.x = -0.24;
    shovelBlade.scale.x = 0.78;
    shovel.add(shovelHandle, collar, shovelBlade);
    this.addEquipment('shovel', shovel);

    const crowbar = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.3, 8), this.materials.darkMetal);
    bar.rotation.x = Math.PI * 0.5;
    bar.position.z = 0.62;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 7, 14, Math.PI * 1.1), this.materials.darkMetal);
    hook.rotation.y = Math.PI * 0.5;
    hook.position.z = 1.31;
    crowbar.add(bar, hook);
    this.addEquipment('crowbar', crowbar);

    const water = new THREE.Group();
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.15, 0.48, 12),
      new THREE.MeshPhysicalMaterial({ color: 0x7aa6b9, transparent: true, opacity: 0.72, roughness: 0.28 })
    );
    const bottleCap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 10), this.materials.darkMetal);
    bottleCap.position.y = 0.28;
    water.add(bottle, bottleCap);
    water.position.set(0, -0.08, 0.28);
    water.rotation.x = Math.PI * 0.5;
    this.addEquipment('water_bottle', water);

    const beans = new THREE.Group();
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.38, 14), this.materials.clothRed);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 5, 14), this.materials.metal);
    rim.rotation.x = Math.PI * 0.5;
    rim.position.y = 0.2;
    beans.add(can, rim);
    beans.position.set(0, -0.05, 0.27);
    beans.rotation.x = Math.PI * 0.5;
    this.addEquipment('canned_beans', beans);

    const medical = new THREE.Group();
    const medicalPouch = box(0.36, 0.24, 0.42, this.materials.canvasLight);
    const crossA = box(0.18, 0.025, 0.05, this.materials.clothRed);
    crossA.position.set(0, 0.13, 0.22);
    const crossB = box(0.05, 0.025, 0.18, this.materials.clothRed);
    crossB.position.set(0, 0.13, 0.22);
    medical.add(medicalPouch, crossA, crossB);
    medical.position.set(0, -0.08, 0.3);
    this.addEquipment('bandage', medical.clone());
    this.addEquipment('medkit', medical);
  }

  /** @param {string} id @param {any} model */
  addEquipment(id, model) {
    enableShadows(model);
    model.visible = false;
    this.equipmentMount.add(model);
    this.equipmentModels.set(id, model);
  }

  bindEvents() {
    this.disposers = [
      this.state.bus.on('inventory:changed', () => this.syncEquipment()),
      this.state.bus.on('combat:shot', () => { this.weaponKick = 1; }),
      this.state.bus.on('combat:melee', () => { this.meleeSwing = 1; }),
      this.state.bus.on('enemy:damaged', (payload) => {
        const record = payload?.enemy ? this.enemyRecords.get(payload.enemy.id) : null;
        if (record) record.hit = 1;
      })
    ];
  }

  syncEquipment() {
    const id = this.state.inventory.selectedId ?? '';
    if (id === this.selectedId) return;
    this.selectedId = id;
    for (const [itemId, model] of this.equipmentModels) model.visible = itemId === id;
  }

  /** @param {any} enemy */
  decorateEnemy(enemy) {
    if (this.enemyRecords.has(enemy.id)) return;
    const root = new THREE.Group();
    root.name = `Infected presentation ${enemy.id}`;
    const eyeMaterial = this.materials.eye.clone();
    const eyes = [];
    for (const x of [-0.105, 0.13]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(enemy.tier >= 2 ? 0.038 : 0.03, 7, 5), eyeMaterial);
      eye.position.set(x, 2.5, 0.385);
      root.add(eye);
      eyes.push(eye);
    }
    const jaw = box(enemy.tier >= 2 ? 0.33 : 0.28, 0.19, 0.24, this.materials.beard.clone());
    jaw.position.set(0.035, 2.24, 0.19);
    jaw.rotation.x = 0.12;
    root.add(jaw);
    const woundMaterial = this.materials.infectedBlood.clone();
    const wound = new THREE.Mesh(new THREE.CircleGeometry(enemy.tier >= 2 ? 0.28 : 0.2, 12), woundMaterial);
    wound.position.set(enemy.tier >= 2 ? -0.24 : 0.2, 1.62, 0.44);
    root.add(wound);

    const strips = [];
    const stripCount = enemy.tier >= 2 ? 5 : 3;
    for (let index = 0; index < stripCount; index += 1) {
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(this.random.range(0.12, 0.23), this.random.range(0.35, 0.68)),
        this.materials.infectedCloth.clone()
      );
      strip.position.set(this.random.range(-0.46, 0.46), this.random.range(1.15, 1.92), this.random.range(0.35, 0.46));
      strip.rotation.z = this.random.range(-0.45, 0.45);
      strip.userData.phase = this.random.range(0, Math.PI * 2);
      root.add(strip);
      strips.push(strip);
    }

    if (enemy.tier >= 2) {
      for (const side of [-1, 1]) {
        const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 0), this.materials.infectedCloth.clone());
        shoulder.position.set(side * 0.53, 1.96, -0.02);
        shoulder.scale.set(1.15, 0.72, 0.9);
        root.add(shoulder);
      }
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 6), this.materials.beard.clone());
      spine.rotation.x = Math.PI * 0.5;
      spine.position.set(0, 1.92, -0.47);
      root.add(spine);
    }

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(enemy.tier >= 2 ? 0.75 : 0.57, 22), this.materials.shadow.clone());
    shadow.rotation.x = -Math.PI * 0.5;
    shadow.scale.y = 0.62;
    shadow.position.y = 0.035;
    enemy.root.add(shadow, root);
    enableShadows(root);
    this.enemyRecords.set(enemy.id, {
      enemy,
      root,
      eyeMaterial,
      jaw,
      wound,
      strips,
      shadow,
      hit: 0,
      phase: this.random.range(0, Math.PI * 2)
    });
  }

  /** @param {number} dt @param {number} elapsed @param {{ night: number }} lighting */
  update(dt, elapsed, lighting) {
    this.syncEquipment();
    this.weaponKick = Math.max(0, this.weaponKick - dt * 8.2);
    this.meleeSwing = Math.max(0, this.meleeSwing - dt * 5.8);
    const isLongTool = ['shovel', 'crowbar'].includes(this.selectedId);
    const isFirearm = this.selectedId === 'revolver';
    this.equipmentMount.position.z = 0.18 - this.weaponKick * 0.14;
    this.equipmentMount.rotation.x = -0.1 + this.weaponKick * 0.22 - this.meleeSwing * 0.55;
    this.equipmentMount.rotation.y = this.meleeSwing * 0.45;
    this.equipmentMount.rotation.z = isLongTool ? -0.18 : 0;
    this.player.rightArm.rotation.z = isLongTool ? -0.25 : (isFirearm ? -0.12 : 0);
    this.player.leftArm.rotation.z = isLongTool ? 0.2 : (isFirearm ? 0.18 : 0);
    this.playerShadow.material.opacity = 0.2 + lighting.night * 0.15;

    for (const enemy of this.enemies.enemies) this.decorateEnemy(enemy);
    for (const record of this.enemyRecords.values()) {
      const enemy = record.enemy;
      const distance = Math.hypot(enemy.position.x - this.player.position.x, enemy.position.z - this.player.position.z);
      record.root.visible = distance < 62 && enemy.root.visible;
      record.shadow.visible = enemy.root.visible;
      record.hit = Math.max(0, record.hit - dt * 5.5);
      const alert = enemy.state === 'chase' ? 1 : 0;
      record.eyeMaterial.opacity = enemy.dead ? 0 : Math.min(0.86, 0.06 + lighting.night * 0.23 + alert * 0.38 + (enemy.tier >= 2 ? 0.12 : 0));
      record.wound.material.emissive.set(record.hit > 0 ? 0xa31410 : 0x000000);
      record.wound.material.emissiveIntensity = record.hit * 1.8;
      record.jaw.rotation.x = 0.12 + Math.sin(elapsed * (enemy.tier >= 2 ? 4.2 : 3.1) + record.phase) * (alert ? 0.14 : 0.045);
      record.shadow.material.opacity = enemy.dead ? 0.12 : 0.2 + lighting.night * 0.12;
      for (const strip of record.strips) {
        strip.rotation.x = Math.sin(elapsed * 2.2 + strip.userData.phase) * 0.12;
        strip.rotation.z += Math.sin(elapsed * 1.7 + strip.userData.phase) * dt * 0.025;
      }
    }
  }

  dispose() {
    for (const dispose of this.disposers) dispose();
    if (this.originalHeld) this.originalHeld.visible = true;
    this.survivorRoot.removeFromParent();
    this.equipmentMount.removeFromParent();
    this.playerShadow.removeFromParent();
    for (const record of this.enemyRecords.values()) {
      record.root.removeFromParent();
      record.shadow.removeFromParent();
    }
  }
}
