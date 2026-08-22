// @ts-check

import * as THREE from '../core/three.js';
import { Random } from '../core/Random.js';

const WORLD_LIMIT = 86;

/** @param {any} object */
function enableShadows(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return object;
}

/** @param {number} width @param {number} height @param {number} depth @param {any} material */
function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** @param {string} colorA @param {string} colorB */
function createSoftTexture(colorA, colorB) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 62);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(0.58, colorB);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class WorldPolish {
  /** @param {import('./WorldBuilder.js').WorldBuilder} world */
  constructor(world) {
    this.world = world;
    this.random = new Random(0x51a7e2);
    this.root = new THREE.Group();
    this.root.name = 'Pine Ridge visual polish';
    this.world.root.add(this.root);
    this.animated = [];
    this.mistSprites = [];
    this.rainDrops = 340;
    this.rainSpeed = new Float32Array(this.rainDrops);
    this.lightningTimer = 4.5;
    this.lightningPulse = 0;
    this.windPhase = 0;
    this.materials = this.createMaterials();
    this.buildRoadShoulders();
    this.buildSurfaceDecals();
    this.buildFacadeDetails();
    this.buildPropClusters();
    this.buildGroundCover();
    this.buildAtmosphere();
  }

  createMaterials() {
    return {
      shoulder: new THREE.MeshStandardMaterial({ color: 0x504c3d, roughness: 1 }),
      gravel: new THREE.MeshStandardMaterial({ color: 0x666054, roughness: 1 }),
      dampDirt: new THREE.MeshStandardMaterial({ color: 0x2f2b25, roughness: 0.9 }),
      puddle: new THREE.MeshPhysicalMaterial({
        color: 0x5e7782,
        roughness: 0.18,
        metalness: 0.08,
        transparent: true,
        opacity: 0.38,
        depthWrite: false
      }),
      oil: new THREE.MeshStandardMaterial({
        color: 0x111714,
        roughness: 0.3,
        metalness: 0.15,
        transparent: true,
        opacity: 0.72,
        depthWrite: false
      }),
      crack: new THREE.LineBasicMaterial({ color: 0x101412, transparent: true, opacity: 0.72 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x171918, roughness: 1 }),
      trash: new THREE.MeshStandardMaterial({ color: 0x252b27, roughness: 0.92 }),
      paleMetal: new THREE.MeshStandardMaterial({ color: 0x777c77, roughness: 0.74, metalness: 0.42 }),
      darkMetal: new THREE.MeshStandardMaterial({ color: 0x323936, roughness: 0.82, metalness: 0.3 }),
      warning: new THREE.MeshStandardMaterial({ color: 0xb05b20, roughness: 0.78 }),
      grass: new THREE.MeshStandardMaterial({ color: 0x34402b, roughness: 1 }),
      grassDry: new THREE.MeshStandardMaterial({ color: 0x5a5636, roughness: 1 }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x3a4029, roughness: 1, side: THREE.DoubleSide }),
      mist: new THREE.SpriteMaterial({
        map: createSoftTexture('rgba(190,210,218,.2)', 'rgba(80,105,115,.08)'),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        color: 0xaec3ca
      }),
      firefly: new THREE.PointsMaterial({
        color: 0xd7c66c,
        size: 0.17,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      }),
      rain: new THREE.LineBasicMaterial({
        color: 0xaec8d6,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    };
  }

  buildRoadShoulders() {
    const strips = [
      { x: -7.45, z: 0, width: 1.55, depth: 166 },
      { x: 7.45, z: 0, width: 1.55, depth: 166 },
      { x: -1, z: 1.72, width: 112, depth: 1.35 },
      { x: -1, z: 14.28, width: 112, depth: 1.35 }
    ];
    for (const strip of strips) {
      const shoulder = box(strip.width, 0.12, strip.depth, this.materials.shoulder);
      shoulder.position.set(strip.x, 0.005, strip.z);
      shoulder.receiveShadow = true;
      shoulder.castShadow = false;
      this.root.add(shoulder);
    }

    for (let index = 0; index < 94; index += 1) {
      const alongVertical = this.random.chance(0.58);
      const x = alongVertical
        ? this.random.pick([-7.65, 7.65]) + this.random.range(-1.0, 1.0)
        : this.random.range(-54, 52);
      const z = alongVertical
        ? this.random.range(-78, 79)
        : this.random.pick([1.5, 14.5]) + this.random.range(-0.9, 0.9);
      const pebble = new THREE.Mesh(
        new THREE.DodecahedronGeometry(this.random.range(0.045, 0.17), 0),
        this.random.chance(0.28) ? this.materials.dampDirt : this.materials.gravel
      );
      pebble.position.set(x, this.world.terrain.getHeight(x, z) + 0.1, z);
      pebble.rotation.set(this.random.range(0, Math.PI), this.random.range(0, Math.PI), this.random.range(0, Math.PI));
      pebble.scale.y = this.random.range(0.45, 1.0);
      pebble.castShadow = true;
      this.root.add(pebble);
    }

    const drainage = box(0.66, 0.16, 18, this.materials.dampDirt);
    drainage.position.set(-8.25, -0.02, 31);
    drainage.rotation.z = -0.025;
    this.root.add(drainage);
  }

  buildSurfaceDecals() {
    const puddles = [
      [-5.3, -21.2, 1.8, 0.7, -0.15],
      [4.8, 21.0, 2.1, 0.9, 0.2],
      [12.1, -18.8, 1.4, 0.56, 0.05],
      [22.5, 8.1, 1.1, 0.48, -0.3],
      [-30.5, 8.6, 1.8, 0.72, 0.1],
      [34.5, 14.0, 1.45, 0.6, -0.5]
    ];
    for (const [x, z, sx, sz, rotation] of puddles) {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 28), this.materials.puddle.clone());
      puddle.rotation.x = -Math.PI * 0.5;
      puddle.rotation.z = rotation;
      puddle.scale.set(sx, sz, 1);
      puddle.position.set(x, this.world.terrain.getHeight(x, z) + 0.19, z);
      puddle.renderOrder = 2;
      this.root.add(puddle);
      this.animated.push({ kind: 'puddle', object: puddle, phase: this.random.range(0, Math.PI * 2) });
    }

    for (const data of [[15.8, 7.5, 0.85, 0.45], [21.4, 7.6, 0.74, 0.36], [31, 15.5, 1.25, 0.55], [-2.7, -35, 1.35, 0.48]]) {
      const stain = new THREE.Mesh(new THREE.CircleGeometry(1, 20), this.materials.oil);
      stain.rotation.x = -Math.PI * 0.5;
      stain.scale.set(data[2], data[3], 1);
      stain.position.set(data[0], this.world.terrain.getHeight(data[0], data[1]) + 0.185, data[1]);
      this.root.add(stain);
    }

    const potholes = [[-0.8, -13], [1.3, 37], [-27, 8.4], [42, 7.6]];
    for (const [x, z] of potholes) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.75, 16), this.materials.dampDirt);
      hole.rotation.x = -Math.PI * 0.5;
      hole.scale.set(this.random.range(0.72, 1.25), this.random.range(0.45, 0.86), 1);
      hole.position.set(x, this.world.terrain.getHeight(x, z) + 0.18, z);
      this.root.add(hole);
      const rim = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 0.92, 18),
        new THREE.MeshStandardMaterial({ color: 0x4b4b43, roughness: 1, side: THREE.DoubleSide })
      );
      rim.rotation.x = -Math.PI * 0.5;
      rim.scale.copy(hole.scale);
      rim.position.copy(hole.position);
      rim.position.y += 0.004;
      this.root.add(rim);
    }

    for (let index = 0; index < 24; index += 1) {
      const alongVertical = this.random.chance(0.58);
      const startX = alongVertical ? this.random.range(-4.6, 4.6) : this.random.range(-48, 48);
      const startZ = alongVertical ? this.random.range(-71, 70) : this.random.range(4, 12);
      const points = [];
      let x = startX;
      let z = startZ;
      for (let step = 0; step < this.random.int(3, 6); step += 1) {
        points.push(new THREE.Vector3(x, this.world.terrain.getHeight(x, z) + 0.195, z));
        x += alongVertical ? this.random.range(-0.55, 0.55) : this.random.range(0.7, 1.8);
        z += alongVertical ? this.random.range(0.75, 1.9) : this.random.range(-0.5, 0.5);
      }
      const crack = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), this.materials.crack);
      this.root.add(crack);
    }
  }

  buildFacadeDetails() {
    const stationCenter = { x: 19, z: -5 };
    const ventPositions = [[10, -8], [17, -7], [25, -8.5], [28, -2.8], [15, -1.5]];
    for (const [x, z] of ventPositions) {
      const vent = new THREE.Group();
      const base = box(1.35, 0.22, 1.35, this.materials.darkMetal);
      base.position.y = 0.11;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.65, 12), this.materials.paleMetal);
      cap.position.y = 0.56;
      const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.13, 12), this.materials.darkMetal);
      hood.position.y = 0.88;
      vent.add(base, cap, hood);
      vent.position.set(x, this.world.terrain.getHeight(stationCenter.x, stationCenter.z) + 6.35, z);
      this.root.add(enableShadows(vent));
      this.world.registerRoofAttachment('food-mart', vent);
    }

    const rearUtility = new THREE.Group();
    const ac = box(2.8, 2.1, 1.35, this.materials.paleMetal);
    ac.position.set(0, 1.05, 0);
    rearUtility.add(ac);
    for (let y = 0.45; y <= 1.65; y += 0.28) {
      const grille = box(2.35, 0.07, 0.08, this.materials.darkMetal);
      grille.position.set(0, y, 0.72);
      rearUtility.add(grille);
    }
    rearUtility.position.set(27.6, this.world.terrain.getHeight(27.6, -13.1), -13.1);
    this.root.add(enableShadows(rearUtility));

    const gutterMaterial = this.materials.darkMetal;
    const stationGutter = box(25.6, 0.14, 0.18, gutterMaterial);
    stationGutter.position.set(19, 5.78, 2.7);
    this.root.add(stationGutter);
    for (const x of [6.4, 31.6]) {
      const downpipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5.2, 8), gutterMaterial);
      downpipe.position.set(x, 3.0, 2.75);
      downpipe.castShadow = true;
      this.root.add(downpipe);
    }

    for (const x of [10.6, 14.5, 20.4, 24.3]) {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 1.05, 10), this.materials.warning);
      bollard.position.set(x, this.world.terrain.getHeight(x, 4.9) + 0.52, 4.9);
      bollard.castShadow = true;
      this.root.add(bollard);
    }

    const wheelStops = [9.2, 12.4, 15.6, 18.8, 22.0, 25.2];
    for (const x of wheelStops) {
      const stop = box(2.1, 0.2, 0.34, this.materials.gravel);
      stop.position.set(x, this.world.terrain.getHeight(x, -15.4) + 0.2, -15.4);
      this.root.add(stop);
    }

    const houseDetails = [
      { id: 'west-home', x: -27, z: -10, w: 13, d: 10, angle: 0 },
      { id: 'ridge-home', x: 39, z: 24, w: 14, d: 10.5, angle: Math.PI },
      { id: 'north-home', x: -38, z: 29, w: 12.5, d: 9.5, angle: Math.PI }
    ];
    for (const house of houseDetails) {
      const group = new THREE.Group();
      const gutter = box(house.w + 0.65, 0.12, 0.15, this.materials.darkMetal);
      gutter.position.set(0, 5.1, house.d * 0.52 + 0.08);
      group.add(gutter);
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 4.2, 8), this.materials.darkMetal);
      pipe.position.set(house.w * 0.43, 2.9, house.d * 0.52 + 0.08);
      group.add(pipe);
      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.65, 8), this.materials.darkMetal);
      vent.position.set(-house.w * 0.12, 6.55, -house.d * 0.12);
      group.add(vent);
      group.position.set(house.x, this.world.terrain.getHeight(house.x, house.z), house.z);
      group.rotation.y = house.angle;
      this.root.add(enableShadows(group));
      this.world.registerRoofAttachment(house.id, group);
    }
  }

  buildPropClusters() {
    this.addPalletStack(29.0, -14.2, 3, 0.05);
    this.addPalletStack(8.0, -13.4, 2, -0.18);
    this.addPalletStack(-17.0, 45.5, 4, 0.3);

    const dumpster = new THREE.Group();
    const body = box(3.2, 1.65, 1.75, this.materials.darkMetal);
    body.position.y = 0.82;
    body.rotation.z = -0.04;
    const lidA = box(1.55, 0.12, 1.85, this.materials.rubber);
    lidA.position.set(-0.78, 1.72, 0);
    lidA.rotation.z = -0.06;
    const lidB = lidA.clone();
    lidB.position.x = 0.78;
    lidB.rotation.z = 0.08;
    dumpster.add(body, lidA, lidB);
    dumpster.position.set(30.0, this.world.terrain.getHeight(30, -14.4), -14.4);
    dumpster.rotation.y = 0.12;
    this.root.add(enableShadows(dumpster));

    const propaneRack = new THREE.Group();
    const cage = box(2.5, 1.85, 1.25, this.materials.darkMetal);
    cage.position.y = 0.93;
    propaneRack.add(cage);
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.72, 10), this.world.materials.whitePaint);
        tank.position.set(-0.84 + col * 0.56, 0.48 + row * 0.72, 0.66);
        propaneRack.add(tank);
      }
    }
    propaneRack.position.set(7.5, this.world.terrain.getHeight(7.5, -10.7), -10.7);
    this.root.add(enableShadows(propaneRack));

    const clusterData = [
      [-20.5, -2.8, 5], [-35.5, -14.5, 4], [34.0, 31.0, 5], [-17.0, 33.0, 5], [-43.0, 25.0, 4]
    ];
    for (const [x, z, count] of clusterData) {
      for (let index = 0; index < count; index += 1) {
        const offsetX = this.random.range(-2.2, 2.2);
        const offsetZ = this.random.range(-1.8, 1.8);
        const kind = this.random.int(0, 3);
        let prop;
        if (kind === 0) {
          prop = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.15, 8, 16), this.materials.rubber);
          prop.rotation.x = Math.PI * 0.5;
          prop.position.y = 0.2;
        } else if (kind === 1) {
          prop = box(0.75, 0.45, 0.6, this.materials.trash);
          prop.rotation.y = this.random.range(0, Math.PI * 2);
          prop.rotation.z = this.random.range(-0.18, 0.18);
          prop.position.y = 0.25;
        } else if (kind === 2) {
          prop = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.3, 0.65, 9), this.materials.paleMetal);
          prop.position.y = 0.33;
        } else {
          prop = box(1.0, 0.12, 0.28, this.world.materials.wood);
          prop.position.y = 0.08;
          prop.rotation.y = this.random.range(0, Math.PI * 2);
        }
        prop.position.x += x + offsetX;
        prop.position.z += z + offsetZ;
        prop.position.y += this.world.terrain.getHeight(prop.position.x, prop.position.z);
        prop.castShadow = true;
        prop.receiveShadow = true;
        this.root.add(prop);
      }
    }

    for (let index = 0; index < 18; index += 1) {
      const cone = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.75, 12), this.materials.warning);
      base.position.y = 0.45;
      const foot = box(0.82, 0.09, 0.82, this.materials.rubber);
      foot.position.y = 0.045;
      cone.add(base, foot);
      const x = 7.7 + (index % 9) * 2.3;
      const z = index < 9 ? 3.7 : 17.2;
      cone.position.set(x, this.world.terrain.getHeight(x, z), z);
      cone.visible = index < 6 || index > 14;
      this.root.add(enableShadows(cone));
    }
  }

  /** @param {number} x @param {number} z @param {number} count @param {number} angle */
  addPalletStack(x, z, count, angle) {
    const group = new THREE.Group();
    for (let level = 0; level < count; level += 1) {
      for (const offset of [-0.58, 0, 0.58]) {
        const slat = box(1.55, 0.09, 0.23, this.world.materials.wood);
        slat.position.set(offset, 0.1 + level * 0.22, 0);
        group.add(slat);
      }
      for (const offset of [-0.54, 0.54]) {
        const runner = box(0.2, 0.12, 1.45, this.world.materials.darkWood);
        runner.position.set(offset, 0.04 + level * 0.22, 0);
        group.add(runner);
      }
    }
    group.position.set(x, this.world.terrain.getHeight(x, z), z);
    group.rotation.y = angle;
    this.root.add(enableShadows(group));
  }

  buildGroundCover() {
    const count = 420;
    const geometry = new THREE.ConeGeometry(0.12, 0.72, 3);
    geometry.translate(0, 0.36, 0);
    const grass = new THREE.InstancedMesh(geometry, this.materials.grass, count);
    const dryGrass = new THREE.InstancedMesh(geometry, this.materials.grassDry, Math.floor(count * 0.38));
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const position = new THREE.Vector3();
    let grassPlaced = 0;
    let dryPlaced = 0;
    for (let attempt = 0; attempt < 1200 && grassPlaced < count; attempt += 1) {
      const x = this.random.range(-82, 82);
      const z = this.random.range(-82, 82);
      if (Math.abs(x) < 7.2 || Math.abs(z - 8) < 6.4) continue;
      if (Math.hypot(x - 19, z + 5) < 17 || Math.hypot(x + 27, z + 10) < 10 || Math.hypot(x - 39, z - 24) < 11) continue;
      const height = this.world.terrain.getHeight(x, z);
      position.set(x, height, z);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.random.range(0, Math.PI * 2));
      const size = this.random.range(0.55, 1.55);
      scale.set(size * this.random.range(0.7, 1.2), size, size * this.random.range(0.7, 1.2));
      matrix.compose(position, quaternion, scale);
      grass.setMatrixAt(grassPlaced, matrix);
      grassPlaced += 1;
      if (dryPlaced < dryGrass.count && this.random.chance(0.42)) {
        position.x += this.random.range(-0.5, 0.5);
        position.z += this.random.range(-0.5, 0.5);
        scale.multiplyScalar(this.random.range(0.75, 1.18));
        matrix.compose(position, quaternion, scale);
        dryGrass.setMatrixAt(dryPlaced, matrix);
        dryPlaced += 1;
      }
    }
    grass.count = grassPlaced;
    dryGrass.count = dryPlaced;
    grass.instanceMatrix.needsUpdate = true;
    dryGrass.instanceMatrix.needsUpdate = true;
    grass.castShadow = true;
    dryGrass.castShadow = true;
    this.root.add(grass, dryGrass);
    this.grassMeshes = [grass, dryGrass];

    for (let index = 0; index < 42; index += 1) {
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(this.random.range(0.08, 0.22), 6), this.materials.leaf);
      leaf.rotation.x = -Math.PI * 0.5;
      leaf.rotation.z = this.random.range(0, Math.PI * 2);
      const x = this.random.range(-48, 48);
      const z = this.random.range(-43, 50);
      leaf.position.set(x, this.world.terrain.getHeight(x, z) + 0.055, z);
      leaf.scale.y = this.random.range(0.45, 0.9);
      this.root.add(leaf);
    }
  }

  buildAtmosphere() {
    const mistTexture = this.materials.mist.map;
    for (let index = 0; index < 18; index += 1) {
      const material = this.materials.mist.clone();
      material.map = mistTexture;
      material.opacity = this.random.range(0.08, 0.2);
      const sprite = new THREE.Sprite(material);
      const angle = this.random.range(0, Math.PI * 2);
      const distance = this.random.range(42, 78);
      sprite.position.set(Math.cos(angle) * distance, this.random.range(1.2, 4.8), Math.sin(angle) * distance);
      sprite.scale.set(this.random.range(16, 32), this.random.range(5, 11), 1);
      sprite.userData.speed = this.random.range(0.05, 0.18);
      sprite.userData.phase = this.random.range(0, Math.PI * 2);
      this.root.add(sprite);
      this.mistSprites.push(sprite);
    }

    const fireflyCount = 72;
    const fireflyPositions = new Float32Array(fireflyCount * 3);
    for (let index = 0; index < fireflyCount; index += 1) {
      const angle = this.random.range(0, Math.PI * 2);
      const distance = this.random.range(35, 78);
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      fireflyPositions[index * 3] = x;
      fireflyPositions[index * 3 + 1] = this.world.terrain.getHeight(x, z) + this.random.range(0.8, 4.2);
      fireflyPositions[index * 3 + 2] = z;
    }
    const fireflyGeometry = new THREE.BufferGeometry();
    fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
    this.fireflies = new THREE.Points(fireflyGeometry, this.materials.firefly);
    this.root.add(this.fireflies);

    const rainPositions = new Float32Array(this.rainDrops * 6);
    for (let index = 0; index < this.rainDrops; index += 1) {
      const x = this.random.range(-28, 28);
      const y = this.random.range(2, 29);
      const z = this.random.range(-28, 28);
      const offset = index * 6;
      rainPositions[offset] = x;
      rainPositions[offset + 1] = y;
      rainPositions[offset + 2] = z;
      rainPositions[offset + 3] = x - 0.12;
      rainPositions[offset + 4] = y - this.random.range(0.55, 1.15);
      rainPositions[offset + 5] = z + 0.08;
      this.rainSpeed[index] = this.random.range(10, 18);
    }
    const rainGeometry = new THREE.BufferGeometry();
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rain = new THREE.LineSegments(rainGeometry, this.materials.rain);
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.root.add(this.rain);

    this.lightning = new THREE.DirectionalLight(0xb8d5ff, 0);
    this.lightning.position.set(-20, 45, 15);
    this.world.scene.add(this.lightning);
  }

  /** @param {{ x: number, z: number }} player @param {{ daylight: number, night: number, storm: number }} lighting @param {number} elapsed @param {number} dt */
  update(player, lighting, elapsed, dt) {
    this.windPhase += dt * (0.4 + lighting.storm * 2.2);
    if (this.grassMeshes) {
      const sway = Math.sin(this.windPhase) * (0.004 + lighting.storm * 0.012);
      this.grassMeshes[0].rotation.z = sway;
      this.grassMeshes[1].rotation.z = -sway * 0.75;
    }

    for (const entry of this.animated) {
      if (entry.kind !== 'puddle') continue;
      const material = entry.object.material;
      material.opacity = 0.24 + lighting.night * 0.16 + Math.sin(elapsed * 0.35 + entry.phase) * 0.025;
      material.color.setRGB(
        0.22 + lighting.daylight * 0.12,
        0.32 + lighting.daylight * 0.12,
        0.37 + lighting.daylight * 0.14
      );
    }

    this.fireflies.visible = lighting.night > 0.44 && lighting.storm < 0.2;
    if (this.fireflies.visible) {
      const positions = this.fireflies.geometry.attributes.position;
      for (let index = 0; index < positions.count; index += 1) {
        const baseY = positions.getY(index);
        positions.setY(index, baseY + Math.sin(elapsed * 1.4 + index * 1.73) * dt * 0.35);
      }
      positions.needsUpdate = true;
      this.materials.firefly.opacity = 0.54 + Math.sin(elapsed * 2.2) * 0.18;
    }

    for (const [index, sprite] of this.mistSprites.entries()) {
      sprite.position.x += sprite.userData.speed * dt * (1 + lighting.storm * 2.5);
      sprite.position.z += Math.sin(elapsed * 0.08 + sprite.userData.phase) * dt * 0.03;
      if (sprite.position.x > WORLD_LIMIT) sprite.position.x = -WORLD_LIMIT;
      sprite.material.opacity = (0.055 + lighting.night * 0.12 + lighting.storm * 0.14) * (0.75 + Math.sin(elapsed * 0.12 + index) * 0.18);
    }

    this.updateRain(player, lighting.storm, dt);
    this.updateLightning(lighting.storm, dt);
  }

  /** @param {{ x: number, z: number }} player @param {number} storm @param {number} dt */
  updateRain(player, storm, dt) {
    this.rain.visible = storm > 0.08;
    if (!this.rain.visible) return;
    this.rain.position.set(player.x, 0, player.z);
    this.materials.rain.opacity = 0.12 + storm * 0.58;
    const positions = this.rain.geometry.attributes.position;
    for (let index = 0; index < this.rainDrops; index += 1) {
      const offset = index * 2;
      let topY = positions.getY(offset) - this.rainSpeed[index] * dt;
      if (topY < 0.5) topY += 28;
      const length = Math.abs(positions.getY(offset + 1) - positions.getY(offset));
      positions.setY(offset, topY);
      positions.setY(offset + 1, topY - length);
    }
    positions.needsUpdate = true;
  }

  /** @param {number} storm @param {number} dt */
  updateLightning(storm, dt) {
    if (storm > 0.12) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningTimer = this.random.range(5.5, 14);
        this.lightningPulse = this.random.range(2.4, 4.2);
      }
    } else {
      this.lightningTimer = Math.min(this.lightningTimer, 4.5);
    }
    this.lightningPulse = Math.max(0, this.lightningPulse - dt * 9.5);
    this.lightning.intensity = this.lightningPulse;
  }

  dispose() {
    this.root.removeFromParent();
    this.lightning.removeFromParent();
    this.root.traverse((child) => {
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose?.());
      else child.material?.dispose?.();
    });
  }
}
