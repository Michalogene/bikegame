// @ts-check

import * as THREE from '../core/three.js';
import { Random } from '../core/Random.js';
import { distance2D } from '../core/math.js';
import { LOOT_TABLES } from '../data/items.js';
import { ColliderMap } from './ColliderMap.js';
import { EditableTerrain } from './EditableTerrain.js';
import { MaterialLibrary } from './Materials.js';
import {
  box, createBarn, createBarrel, createCrate, createFence, createGasStation,
  createHouse, createPowerPole, createRoadSign, createStreetLight, createVehicle,
  enableShadows
} from './WorldFactories.js';

export class WorldBuilder {
  /** @param {any} scene @param {import('../state/GameState.js').GameState} state */
  constructor(scene, state) {
    this.scene = scene;
    this.state = state;
    this.random = new Random(0x1178ac);
    this.materials = new MaterialLibrary();
    this.collider = new ColliderMap();
    this.terrain = new EditableTerrain(this.materials);
    this.root = new THREE.Group();
    this.root.name = 'Pine Ridge world';
    this.root.add(this.terrain.root);
    this.scene.add(this.root);
    /** @type {Map<string, any>} */
    this.containers = new Map();
    /** @type {any[]} */
    this.interactables = [];
    /** @type {{ id: string, name: string, x: number, z: number, glyph: string }[]} */
    this.poi = [];
    /** @type {{ roof: any, material: any, x: number, z: number, width: number, depth: number, angle: number }[]} */
    this.roofs = [];
    /** @type {any[]} */
    this.warmLights = [];
    this.foliageRoot = new THREE.Group();
    this.propRoot = new THREE.Group();
    this.structureRoot = new THREE.Group();
    this.root.add(this.foliageRoot, this.propRoot, this.structureRoot);
    this.buildWorld();
    this.terrain.applyEdits(state.terrainEdits);
  }

  buildWorld() {
    this.buildRoads();
    this.buildPineRidge();
    this.buildResidentialArea();
    this.buildFarmAndBarn();
    this.buildVehiclesAndRoadside();
    this.buildForest();
    this.buildNaturalBoundary();
    this.buildPowerNetwork();
    this.buildAmbientDetail();
  }

  buildRoads() {
    const vertical = box(12.2, 0.18, 166, this.materials.asphalt);
    vertical.position.set(0, 0.04, 0);
    const horizontal = box(112, 0.16, 10.5, this.materials.asphalt);
    horizontal.position.set(-1, 0.05, 8);
    this.root.add(vertical, horizontal);

    for (let z = -76; z <= 78; z += 8.5) {
      const dash = box(0.28, 0.06, 4.3, this.materials.roadLine);
      dash.position.set(0, 0.17, z);
      this.root.add(dash);
    }
    for (let x = -52; x <= 50; x += 9) {
      if (Math.abs(x) < 7) continue;
      const dash = box(4.5, 0.06, 0.25, this.materials.roadLine);
      dash.position.set(x, 0.17, 8);
      this.root.add(dash);
    }

    const curbMaterial = new THREE.MeshStandardMaterial({ color: 0x777064, roughness: 1 });
    for (const x of [-6.55, 6.55]) {
      const curb = box(0.32, 0.28, 80, curbMaterial);
      curb.position.set(x, 0.1, -4);
      this.root.add(curb);
    }
    for (let index = 0; index < 28; index += 1) {
      const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(this.random.range(0.08, 0.28), 0), this.materials.rock);
      const alongVertical = this.random.chance(0.56);
      const x = alongVertical ? this.random.pick([-7.4, 7.4]) + this.random.range(-1.2, 1.2) : this.random.range(-52, 50);
      const z = alongVertical ? this.random.range(-70, 70) : 14 + this.random.range(-1.3, 1.3);
      pebble.position.set(x, this.terrain.getHeight(x, z) + 0.18, z);
      pebble.rotation.set(this.random.range(0, Math.PI), this.random.range(0, Math.PI), 0);
      pebble.castShadow = true;
      this.propRoot.add(pebble);
    }
  }

  buildPineRidge() {
    const station = createGasStation(this.materials);
    station.group.position.set(19, this.terrain.getHeight(19, -5), -5);
    this.root.add(station.group);
    this.warmLights.push(...station.warmLights);
    this.roofs.push({ roof: station.roof, material: station.roofMaterial, x: 19, z: -5, width: 25, depth: 15, angle: 0 });
    this.poi.push({ id: 'pine-ridge', name: 'PINE RIDGE', x: 14, z: 0, glyph: '◆' });

    this.collider.addRect('station-back', 19, -12.35, 25, 0.8);
    this.collider.addRect('station-left', 6.6, -5, 0.8, 15);
    this.collider.addRect('station-right', 31.4, -5, 0.8, 15);
    this.collider.addRect('station-counter', 26.5, -9.7, 8.8, 1.8);
    this.collider.addRect('station-fridge', 10.2, -11.7, 4.9, 1.5);
    this.collider.addRect('station-pump-a', 14.5, 7.6, 2.0, 1.7);
    this.collider.addRect('station-pump-b', 20.4, 7.6, 2.0, 1.7);

    this.addContainer('station-shelves', 'Food mart shelves', 14.2, -6.2, 'gas_station', createCrate(this.materials));
    this.addContainer('station-counter-cache', 'Locked counter cache', 26.0, -8.0, 'gas_station', createCrate(this.materials));
    this.addContainer('station-fridge-cache', 'Cold storage', 10.8, -10.0, 'gas_station', createCrate(this.materials));

    const priceSign = this.createPriceSign();
    priceSign.position.set(5.1, this.terrain.getHeight(5.1, 0.8), 0.8);
    this.root.add(priceSign);
    this.collider.addRect('price-sign', 5.1, 0.8, 2.0, 1.0);

    const parkingLineMaterial = new THREE.MeshStandardMaterial({ color: 0xd0cbb7, roughness: 0.9 });
    for (let index = 0; index < 6; index += 1) {
      const line = box(0.12, 0.04, 4.6, parkingLineMaterial);
      line.position.set(9 + index * 3.2, 0.18, -17.5);
      this.root.add(line);
    }
  }

  createPriceSign() {
    const group = new THREE.Group();
    const postA = box(0.28, 6.8, 0.28, this.materials.metal);
    const postB = box(0.28, 6.8, 0.28, this.materials.metal);
    postA.position.set(-0.78, 3.4, 0);
    postB.position.set(0.78, 3.4, 0);
    const board = box(3.2, 5.6, 0.3, this.materials.black);
    board.position.y = 4.8;
    group.add(postA, postB, board);
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 256;
    textCanvas.height = 512;
    const context = textCanvas.getContext('2d');
    if (context) {
      context.fillStyle = '#1c1d1a';
      context.fillRect(0, 0, 256, 512);
      context.textAlign = 'center';
      context.fillStyle = '#d98754';
      context.font = '900 42px Arial Narrow';
      context.fillText('PINE', 128, 58);
      context.fillText('RIDGE', 128, 105);
      context.fillStyle = '#e0d2b7';
      context.font = '700 25px Arial Narrow';
      context.fillText('PUB & FOOD', 128, 148);
      context.font = '700 40px monospace';
      context.fillText('3.19', 128, 235);
      context.fillText('3.29', 128, 313);
      context.fillText('3.39', 128, 391);
      context.strokeStyle = '#6e3a29';
      context.lineWidth = 5;
      context.strokeRect(8, 8, 240, 496);
    }
    const texture = new THREE.CanvasTexture(textCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const face = box(2.8, 5.2, 0.06, new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: 0x432016, emissiveIntensity: 0.7 }));
    face.position.set(0, 4.8, 0.18);
    group.add(face);
    return enableShadows(group);
  }

  buildResidentialArea() {
    const homes = [
      { id: 'west-home', x: -27, z: -10, angle: 0, width: 13, depth: 10 },
      { id: 'ridge-home', x: 39, z: 24, angle: Math.PI, width: 14, depth: 10.5 },
      { id: 'north-home', x: -38, z: 29, angle: Math.PI, width: 12.5, depth: 9.5 }
    ];
    for (const [index, home] of homes.entries()) {
      const house = createHouse(this.materials, { width: home.width, depth: home.depth, color: index === 0 ? this.materials.darkWall : this.materials.wall });
      const y = this.terrain.getHeight(home.x, home.z);
      house.group.position.set(home.x, y, home.z);
      house.group.rotation.y = home.angle;
      this.root.add(house.group);
      this.roofs.push({ roof: house.roof, material: house.roofMaterial, x: home.x, z: home.z, width: home.width, depth: home.depth, angle: home.angle });
      this.collider.addRect(home.id, home.x, home.z, home.width + 0.4, home.depth + 0.4, home.angle);
      const lootPosition = index === 0 ? { x: -21.6, z: -4.2 } : index === 1 ? { x: 33, z: 18.2 } : { x: -32.5, z: 23.5 };
      this.addContainer(`${home.id}-porch`, 'Abandoned home supplies', lootPosition.x, lootPosition.z, 'house', createCrate(this.materials));
    }

    this.addFencedYard(-27, -9.5, 25, 23, 'west-yard');
    this.addFencedYard(39, 24, 26, 22, 'east-yard');

    const mailbox = (x, z, angle = 0) => {
      const group = new THREE.Group();
      const post = box(0.16, 1.7, 0.16, this.materials.wood);
      post.position.y = 0.85;
      const body = box(0.75, 0.55, 1.05, this.materials.rust);
      body.position.set(0, 1.65, 0.25);
      group.add(post, body);
      group.position.set(x, this.terrain.getHeight(x, z), z);
      group.rotation.y = angle;
      this.propRoot.add(group);
    };
    mailbox(-18.2, 2.0, 0.2);
    mailbox(31, 13.8, Math.PI);
  }

  addFencedYard(x, z, width, depth, id) {
    const segments = [
      { x, z: z - depth * 0.5, length: width, angle: 0 },
      { x: x - width * 0.5, z, length: depth, angle: Math.PI * 0.5 },
      { x: x + width * 0.5, z, length: depth, angle: Math.PI * 0.5 }
    ];
    for (const [index, segment] of segments.entries()) {
      const fence = createFence(this.materials, segment.length);
      fence.position.set(segment.x, this.terrain.getHeight(segment.x, segment.z), segment.z);
      fence.rotation.y = segment.angle;
      this.root.add(fence);
      this.collider.addRect(`${id}-${index}`, segment.x, segment.z, segment.angle ? 0.45 : segment.length, segment.angle ? segment.length : 0.45, segment.angle);
    }
  }

  buildFarmAndBarn() {
    const barn = createBarn(this.materials);
    barn.group.position.set(-24, this.terrain.getHeight(-24, 39), 39);
    barn.group.rotation.y = Math.PI;
    this.root.add(barn.group);
    this.roofs.push({ roof: barn.roof, material: barn.roofMaterial, x: -24, z: 39, width: 17, depth: 15, angle: Math.PI });
    this.collider.addRect('barn-back', -24, 46.3, 17, 0.8);
    this.collider.addRect('barn-left', -32.3, 39, 0.8, 15);
    this.collider.addRect('barn-right', -15.7, 39, 0.8, 15);
    this.addContainer('barn-workbench', 'Barn workshop', -24, 34, 'workshop', createCrate(this.materials));
    this.poi.push({ id: 'old-barn', name: 'OLD BARN', x: -24, z: 39, glyph: '▰' });

    const fieldMaterial = new THREE.MeshStandardMaterial({ color: 0x4d4a2e, roughness: 1 });
    for (let row = 0; row < 8; row += 1) {
      const strip = box(2.1, 0.08, 23, fieldMaterial);
      strip.position.set(-52 + row * 3.1, this.terrain.getHeight(-52 + row * 3.1, 36) + 0.06, 36);
      this.root.add(strip);
    }
    for (let index = 0; index < 40; index += 1) {
      const stalk = box(0.08, this.random.range(0.5, 1.3), 0.08, this.materials.foliageLight);
      const x = this.random.range(-60, -34);
      const z = this.random.range(25, 48);
      stalk.position.set(x, this.terrain.getHeight(x, z) + stalk.geometry.parameters.height * 0.5, z);
      this.foliageRoot.add(stalk);
    }
  }

  buildVehiclesAndRoadside() {
    const pickup = createVehicle(this.materials, 'pickup');
    pickup.position.set(31, this.terrain.getHeight(31, 15.5) + 0.2, 15.5);
    pickup.rotation.y = -0.95;
    this.root.add(pickup);
    this.collider.addRect('blue-pickup', 31, 15.5, 3.1, 6.8, -0.95);
    this.interactables.push({ id: 'blue-pickup-salvage', type: 'salvage', label: 'Salvage abandoned pickup', x: 31, z: 15.5, radius: 3.8, used: false });

    const sedan = createVehicle(this.materials, 'sedan');
    sedan.position.set(-2.7, this.terrain.getHeight(-2.7, -35) + 0.15, -35);
    sedan.rotation.y = 0.18;
    sedan.scale.set(0.94, 0.94, 0.94);
    this.root.add(sedan);
    this.collider.addRect('wrecked-sedan', -2.7, -35, 3, 5.8, 0.18);

    const sign = createRoadSign(this.materials, ['PINE RIDGE', 'POP. 612']);
    sign.position.set(46, this.terrain.getHeight(46, 14.5), 14.5);
    sign.rotation.y = -0.25;
    this.root.add(sign);
    this.collider.addRect('town-sign', 46, 14.5, 4.6, 0.8, -0.25);

    for (const [index, data] of [[-7.8, -22], [7.8, 32], [-7.6, 58]].entries()) {
      const street = createStreetLight(this.materials);
      street.group.position.set(data[0], this.terrain.getHeight(data[0], data[1]), data[1]);
      street.group.rotation.y = data[0] < 0 ? 0 : Math.PI;
      this.root.add(street.group);
      this.warmLights.push(street.light);
      this.collider.addCircle(`streetlight-${index}`, data[0], data[1], 0.34);
    }
  }

  buildForest() {
    const treeCount = 245;
    const trunkGeometry = new THREE.CylinderGeometry(0.23, 0.38, 4.6, 7);
    const crownGeometry = new THREE.ConeGeometry(2.25, 5.8, 8);
    const crownGeometry2 = new THREE.ConeGeometry(1.75, 4.6, 8);
    const trunks = new THREE.InstancedMesh(trunkGeometry, this.materials.trunk, treeCount);
    const crowns = new THREE.InstancedMesh(crownGeometry, this.materials.foliage, treeCount);
    const crowns2 = new THREE.InstancedMesh(crownGeometry2, this.materials.foliageLight, treeCount);
    trunks.castShadow = true;
    trunks.receiveShadow = true;
    crowns.castShadow = true;
    crowns.receiveShadow = true;
    crowns2.castShadow = true;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const position = new THREE.Vector3();

    let placed = 0;
    let attempts = 0;
    while (placed < treeCount && attempts < treeCount * 18) {
      attempts += 1;
      const edgeBias = this.random.chance(0.65);
      const x = edgeBias ? this.random.pick([-1, 1]) * this.random.range(43, 86) : this.random.range(-84, 84);
      const z = edgeBias ? this.random.range(-84, 84) : this.random.pick([-1, 1]) * this.random.range(45, 86);
      if (Math.abs(x) < 10 || Math.abs(z - 8) < 8) continue;
      if (distance2D(x, z, 19, -5) < 25 || distance2D(x, z, -27, -10) < 18 || distance2D(x, z, -24, 39) < 20 || distance2D(x, z, 39, 24) < 18) continue;
      const y = this.terrain.getHeight(x, z);
      const treeScale = this.random.range(0.72, 1.42);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.random.range(0, Math.PI * 2));
      scale.set(treeScale, treeScale * this.random.range(0.9, 1.18), treeScale);
      position.set(x, y + 2.3 * scale.y, z);
      matrix.compose(position, quaternion, scale);
      trunks.setMatrixAt(placed, matrix);
      position.y = y + 5.7 * scale.y;
      matrix.compose(position, quaternion, scale);
      crowns.setMatrixAt(placed, matrix);
      position.y = y + 7.55 * scale.y;
      scale.multiplyScalar(0.78);
      matrix.compose(position, quaternion, scale);
      crowns2.setMatrixAt(placed, matrix);
      this.collider.addCircle(`tree-${placed}`, x, z, 0.48 * treeScale);
      placed += 1;
    }
    trunks.count = placed;
    crowns.count = placed;
    crowns2.count = placed;
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    crowns2.instanceMatrix.needsUpdate = true;
    this.foliageRoot.add(trunks, crowns, crowns2);

    const shrubCount = 180;
    const shrubGeometry = new THREE.DodecahedronGeometry(0.75, 0);
    const shrubs = new THREE.InstancedMesh(shrubGeometry, this.materials.foliageLight, shrubCount);
    shrubs.castShadow = true;
    for (let index = 0; index < shrubCount; index += 1) {
      let x = this.random.range(-82, 82);
      let z = this.random.range(-82, 82);
      if (Math.abs(x) < 8) x += Math.sign(x || 1) * 10;
      if (Math.abs(z - 8) < 7) z += Math.sign(z - 8 || 1) * 9;
      const y = this.terrain.getHeight(x, z);
      position.set(x, y + 0.45, z);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.random.range(0, Math.PI * 2));
      scale.set(this.random.range(0.6, 1.4), this.random.range(0.45, 1.0), this.random.range(0.6, 1.4));
      matrix.compose(position, quaternion, scale);
      shrubs.setMatrixAt(index, matrix);
    }
    shrubs.instanceMatrix.needsUpdate = true;
    this.foliageRoot.add(shrubs);
  }

  buildNaturalBoundary() {
    const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
    for (let index = 0; index < 92; index += 1) {
      const side = index % 4;
      const along = -86 + (index / 92) * 172 * 4;
      let x = 0;
      let z = 0;
      if (side === 0) { x = -88 + this.random.range(-2, 2); z = ((along + 86) % 172) - 86; }
      if (side === 1) { x = 88 + this.random.range(-2, 2); z = ((along + 86) % 172) - 86; }
      if (side === 2) { z = -88 + this.random.range(-2, 2); x = ((along + 86) % 172) - 86; }
      if (side === 3) { z = 88 + this.random.range(-2, 2); x = ((along + 86) % 172) - 86; }
      const mesh = new THREE.Mesh(rockGeometry, this.materials.rock);
      const scale = this.random.range(2.5, 6.2);
      mesh.scale.set(scale, scale * this.random.range(1, 2.2), scale * this.random.range(0.8, 1.5));
      mesh.position.set(x, this.terrain.getHeight(x, z) + mesh.scale.y * 0.5, z);
      mesh.rotation.set(this.random.range(-0.2, 0.2), this.random.range(0, Math.PI), this.random.range(-0.12, 0.12));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.root.add(mesh);
      this.collider.addCircle(`boundary-rock-${index}`, x, z, scale * 0.65);
    }
  }

  buildPowerNetwork() {
    const poles = [];
    for (let z = -55; z <= 61; z += 19) {
      const x = -10.3;
      const pole = createPowerPole(this.materials);
      pole.position.set(x, this.terrain.getHeight(x, z), z);
      this.root.add(pole);
      this.collider.addCircle(`power-pole-${z}`, x, z, 0.42);
      poles.push(new THREE.Vector3(x, this.terrain.getHeight(x, z) + 7.55, z));
    }
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x131716, transparent: true, opacity: 0.9 });
    for (let index = 0; index < poles.length - 1; index += 1) {
      for (const offset of [-1.25, 0, 1.25]) {
        const a = poles[index].clone().add(new THREE.Vector3(offset, 0, 0));
        const b = poles[index + 1].clone().add(new THREE.Vector3(offset, 0, 0));
        const middle = a.clone().lerp(b, 0.5);
        middle.y -= 1.2;
        const curve = new THREE.QuadraticBezierCurve3(a, middle, b);
        const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(14));
        this.root.add(new THREE.Line(geometry, lineMaterial));
      }
    }
  }

  buildAmbientDetail() {
    for (let index = 0; index < 22; index += 1) {
      const prop = index % 3 === 0 ? createBarrel(this.materials) : createCrate(this.materials);
      let x = this.random.range(-48, 48);
      let z = this.random.range(-48, 50);
      if (Math.abs(x) < 7) x += Math.sign(x || 1) * 10;
      if (Math.abs(z - 8) < 6) z += Math.sign(z - 8 || 1) * 9;
      prop.position.set(x, this.terrain.getHeight(x, z), z);
      prop.rotation.y = this.random.range(0, Math.PI * 2);
      prop.scale.setScalar(this.random.range(0.75, 1.15));
      this.propRoot.add(prop);
    }

    const warning = createRoadSign(this.materials, ['KEEP OUT', 'DANGER']);
    warning.position.set(-12, this.terrain.getHeight(-12, 21), 21);
    warning.rotation.y = 0.25;
    warning.scale.setScalar(0.78);
    this.root.add(warning);

    for (let index = 0; index < 28; index += 1) {
      const geometry = new THREE.PlaneGeometry(this.random.range(0.35, 1.1), this.random.range(0.2, 0.7));
      geometry.rotateX(-Math.PI * 0.5);
      const material = new THREE.MeshStandardMaterial({ color: this.random.pick([0x665d4c, 0x473e31, 0x796f5a]), roughness: 1, side: THREE.DoubleSide });
      const litter = new THREE.Mesh(geometry, material);
      const x = this.random.range(-53, 50);
      const z = this.random.range(-45, 55);
      litter.position.set(x, this.terrain.getHeight(x, z) + 0.04, z);
      litter.rotation.y = this.random.range(0, Math.PI * 2);
      this.propRoot.add(litter);
    }
  }

  /** @param {string} id @param {string} label @param {number} x @param {number} z @param {keyof typeof LOOT_TABLES} tableName @param {any} mesh */
  addContainer(id, label, x, z, tableName, mesh) {
    mesh.position.set(x, this.terrain.getHeight(x, z), z);
    mesh.rotation.y = this.random.range(-0.2, 0.2);
    this.root.add(mesh);
    const items = this.generateLoot(tableName);
    const container = { id, label, x, z, radius: 2.8, type: 'container', items, opened: this.state.openedContainers.has(id), mesh };
    if (container.opened) container.items = [];
    this.containers.set(id, container);
    this.interactables.push(container);
    this.collider.addRect(`container-${id}`, x, z, 1.65, 1.4, mesh.rotation.y);
  }

  /** @param {keyof typeof LOOT_TABLES} tableName */
  generateLoot(tableName) {
    const table = LOOT_TABLES[tableName] ?? LOOT_TABLES.house;
    const items = [];
    for (const [id, min, max, chance] of table) {
      if (this.random.chance(chance)) items.push({ id, qty: this.random.int(min, max) });
    }
    if (!items.length) items.push({ id: 'cloth', qty: 1 });
    return items;
  }

  /** @param {number} x @param {number} z @param {number} maxDistance */
  getNearestInteractable(x, z, maxDistance = 3.4) {
    let nearest = null;
    let nearestDistance = maxDistance;
    for (const interactable of this.interactables) {
      if (interactable.type === 'container' && interactable.items.length === 0) continue;
      if (interactable.used) continue;
      const distance = distance2D(x, z, interactable.x, interactable.z);
      if (distance < nearestDistance) {
        nearest = interactable;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  /** @param {number} x @param {number} z @param {string} label @param {{ id: string, qty: number }[]} items */
  addLootBag(x, z, label, items) {
    const id = `loot-bag-${Math.round(performance.now())}-${this.containers.size}`;
    const mesh = createCrate(this.materials);
    mesh.scale.setScalar(0.58);
    mesh.position.set(x, this.terrain.getHeight(x, z), z);
    this.root.add(mesh);
    const container = { id, label, x, z, radius: 2.4, type: 'container', items: items.map((item) => ({ ...item })), opened: false, mesh };
    this.containers.set(id, container);
    this.interactables.push(container);
    return container;
  }

  /** @param {{ x: number, z: number }} player @param {number} nightStrength @param {number} elapsed */
  update(player, nightStrength, elapsed) {
    for (const light of this.warmLights) {
      if (!Number.isFinite(light.userData.baseIntensity)) light.userData.baseIntensity = light.intensity || 5;
      light.intensity = light.userData.baseIntensity * (0.22 + nightStrength * 0.95);
    }
    this.foliageRoot.rotation.z = Math.sin(elapsed * 0.17) * 0.0015;
    for (const roof of this.roofs) {
      const dx = player.x - roof.x;
      const dz = player.z - roof.z;
      const inside = Math.abs(dx) < roof.width * 0.48 && Math.abs(dz) < roof.depth * 0.48;
      roof.material.opacity += ((inside ? 0.08 : 1) - roof.material.opacity) * 0.12;
      roof.material.depthWrite = roof.material.opacity > 0.5;
    }
  }
}
