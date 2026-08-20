// @ts-check

import * as THREE from '../core/three.js';

/** @param {any} object */
export function enableShadows(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object;
}

/** @param {number} width @param {number} height @param {number} depth @param {any} material */
export function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** @param {string[]} lines @param {{ width?: number, height?: number, background?: string, foreground?: string, accent?: string }} [options] */
export function createSignTexture(lines, options = {}) {
  const width = options.width ?? 512;
  const height = options.height ?? 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = options.background ?? '#332820';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = options.accent ?? '#d26b32';
  context.lineWidth = 12;
  context.strokeRect(8, 8, width - 16, height - 16);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const fontSize = Math.floor(height / (lines.length + 1.25));
  context.font = `900 ${fontSize}px Arial Narrow, sans-serif`;
  lines.forEach((line, index) => {
    context.fillStyle = index === lines.length - 1 && lines.length > 1
      ? options.accent ?? '#d26b32'
      : options.foreground ?? '#e6dac2';
    context.fillText(line, width * 0.5, (index + 0.85) * height / lines.length, width * 0.88);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** @param {import('./Materials.js').MaterialLibrary} materials @param {number} width @param {number} height */
function createWindow(materials, width = 1.8, height = 1.5) {
  const group = new THREE.Group();
  const glow = box(width, height, 0.08, materials.windowGlow);
  group.add(glow);
  const frameMaterial = materials.darkWood;
  const barV = box(0.1, height + 0.14, 0.13, frameMaterial);
  const barH = box(width + 0.14, 0.1, 0.13, frameMaterial);
  group.add(barV, barH);
  return group;
}

/** @param {import('./Materials.js').MaterialLibrary} materials @param {{ width?: number, depth?: number, color?: any }} [options] */
export function createHouse(materials, options = {}) {
  const width = options.width ?? 13;
  const depth = options.depth ?? 10;
  const group = new THREE.Group();
  group.name = 'Abandoned residence';
  const foundation = box(width + 0.7, 0.55, depth + 0.7, materials.rock);
  foundation.position.y = 0.2;
  group.add(foundation);

  const wallMaterial = options.color ?? materials.darkWall;
  const floor = box(width, 0.3, depth, materials.darkWood);
  floor.position.y = 0.62;
  group.add(floor);
  const back = box(width, 3.8, 0.32, wallMaterial);
  back.position.set(0, 2.5, -depth * 0.5);
  const left = box(0.32, 3.8, depth, wallMaterial);
  left.position.set(-width * 0.5, 2.5, 0);
  const right = box(0.32, 3.8, depth, wallMaterial);
  right.position.set(width * 0.5, 2.5, 0);
  const frontLeft = box(width * 0.35, 3.8, 0.32, wallMaterial);
  frontLeft.position.set(-width * 0.325, 2.5, depth * 0.5);
  const frontRight = box(width * 0.35, 3.8, 0.32, wallMaterial);
  frontRight.position.set(width * 0.325, 2.5, depth * 0.5);
  group.add(back, left, right, frontLeft, frontRight);

  const door = box(1.45, 2.8, 0.18, materials.darkWood);
  door.position.set(0, 2.15, depth * 0.5 + 0.08);
  door.rotation.y = -0.6;
  group.add(door);

  const porch = box(width * 0.72, 0.32, 2.4, materials.wood);
  porch.position.set(0, 0.74, depth * 0.5 + 1.1);
  group.add(porch);
  for (const x of [-width * 0.3, width * 0.3]) {
    const post = box(0.18, 3, 0.18, materials.darkWood);
    post.position.set(x, 2.25, depth * 0.5 + 1.85);
    group.add(post);
  }
  for (const x of [-width * 0.29, width * 0.29]) {
    const window = createWindow(materials, 1.7, 1.4);
    window.position.set(x, 2.7, depth * 0.5 + 0.19);
    group.add(window);
  }
  const sideWindow = createWindow(materials, 1.8, 1.45);
  sideWindow.rotation.y = Math.PI * 0.5;
  sideWindow.position.set(width * 0.5 + 0.19, 2.65, -1.7);
  group.add(sideWindow);

  const roofMaterial = materials.roof.clone();
  roofMaterial.transparent = true;
  const roof = new THREE.Group();
  const slabA = box(width * 0.62, 0.32, depth + 1.3, roofMaterial);
  slabA.rotation.z = -0.57;
  slabA.position.set(-width * 0.23, 5.9, 0);
  const slabB = box(width * 0.62, 0.32, depth + 1.3, roofMaterial);
  slabB.rotation.z = 0.57;
  slabB.position.set(width * 0.23, 5.9, 0);
  roof.add(slabA, slabB);
  group.add(roof);

  const chimney = box(0.85, 2.7, 0.85, materials.rust);
  chimney.position.set(-width * 0.28, 6.2, -depth * 0.18);
  group.add(chimney);

  const interiorTable = box(3.2, 0.22, 1.4, materials.wood);
  interiorTable.position.set(-2, 1.65, -1.8);
  group.add(interiorTable);
  for (const x of [-3.2, -0.8]) {
    const leg = box(0.16, 1.15, 0.16, materials.darkWood);
    leg.position.set(x, 1.08, -1.8);
    group.add(leg);
  }
  const cabinet = box(2.4, 2.4, 0.8, materials.darkWood);
  cabinet.position.set(width * 0.5 - 1.3, 1.9, -depth * 0.5 + 0.55);
  group.add(cabinet);

  enableShadows(group);
  return { group, roof, roofMaterial, bounds: { width, depth } };
}

/** @param {import('./Materials.js').MaterialLibrary} materials */
export function createGasStation(materials) {
  const group = new THREE.Group();
  group.name = 'Pine Ridge Food Mart';
  const width = 25;
  const depth = 15;
  const base = box(width + 1, 0.45, depth + 1, materials.rock);
  base.position.y = 0.2;
  group.add(base);
  const floor = box(width, 0.28, depth, materials.asphalt);
  floor.position.y = 0.55;
  group.add(floor);

  const back = box(width, 4.8, 0.35, materials.wall);
  back.position.set(0, 3, -depth * 0.5);
  const left = box(0.35, 4.8, depth, materials.wall);
  left.position.set(-width * 0.5, 3, 0);
  const right = box(0.35, 4.8, depth, materials.wall);
  right.position.set(width * 0.5, 3, 0);
  const frontLintel = box(width, 1.25, 0.35, materials.darkWall);
  frontLintel.position.set(0, 4.75, depth * 0.5);
  group.add(back, left, right, frontLintel);

  const trimRed = box(width + 0.45, 0.52, depth + 0.45, materials.redPaint);
  trimRed.position.y = 5.35;
  group.add(trimRed);
  const trimDark = box(width + 0.6, 0.32, depth + 0.6, materials.black);
  trimDark.position.y = 5.72;
  group.add(trimDark);

  for (let index = 0; index < 6; index += 1) {
    const glass = box(3.25, 3.2, 0.1, index === 4 ? materials.darkWood : materials.glass);
    glass.position.set(-9.7 + index * 3.9, 2.55, depth * 0.5 + 0.12);
    group.add(glass);
    const frame = box(0.12, 3.5, 0.18, materials.metal);
    frame.position.set(-11.65 + index * 3.9, 2.55, depth * 0.5 + 0.2);
    group.add(frame);
  }

  const signTexture = createSignTexture(['PINE RIDGE', 'FOOD MART'], {
    width: 640, height: 190, background: '#3d2b27', foreground: '#e5cbb0', accent: '#a83a2d'
  });
  const signMaterial = new THREE.MeshStandardMaterial({ map: signTexture, emissiveMap: signTexture, emissive: 0x5a1c13, emissiveIntensity: 0.72, roughness: 0.75 });
  const frontSign = box(10.5, 1.65, 0.18, signMaterial);
  frontSign.position.set(0, 5.35, depth * 0.5 + 0.45);
  group.add(frontSign);

  const roofMaterial = materials.roof.clone();
  roofMaterial.color.set(0x343d46);
  roofMaterial.transparent = true;
  const roof = box(width + 1.4, 0.62, depth + 1.4, roofMaterial);
  roof.position.y = 6.05;
  group.add(roof);

  for (let shelfIndex = 0; shelfIndex < 3; shelfIndex += 1) {
    const shelf = box(7.5, 1.6, 1.15, materials.darkWood);
    shelf.position.set(-5 + shelfIndex * 5, 1.5, -1.2);
    group.add(shelf);
    for (let item = 0; item < 6; item += 1) {
      const can = box(0.32, 0.5, 0.3, item % 2 ? materials.redPaint : materials.whitePaint);
      can.position.set(-8 + shelfIndex * 5 + item * 0.55, 2.5, -1.1);
      group.add(can);
    }
  }
  const counter = box(8.5, 1.25, 1.6, materials.darkWood);
  counter.position.set(7.5, 1.3, -4.7);
  group.add(counter);
  const register = box(1.05, 0.72, 0.85, materials.metal);
  register.position.set(8.6, 2.3, -4.65);
  group.add(register);
  const fridge = box(4.6, 3.7, 1.15, materials.metal);
  fridge.position.set(-8.8, 2.45, -6.65);
  group.add(fridge);
  for (const x of [-9.8, -8.8, -7.8]) {
    const door = box(0.92, 3.2, 0.08, materials.glass);
    door.position.set(x, 2.45, -6.03);
    group.add(door);
  }

  const canopy = new THREE.Group();
  const canopyRoofMaterial = materials.roof.clone();
  canopyRoofMaterial.color.set(0x37424a);
  canopyRoofMaterial.roughness = 0.9;
  const canopyRoof = box(16, 0.48, 8, canopyRoofMaterial);
  canopyRoof.position.set(-1.5, 5.35, 12.6);
  canopy.add(canopyRoof);

  const canopyUndersideMaterial = new THREE.MeshStandardMaterial({
    color: 0x6d6559,
    roughness: 0.84,
    emissive: 0x5c3115,
    emissiveIntensity: 0.42
  });
  const canopyUnderside = box(15.45, 0.1, 7.45, canopyUndersideMaterial);
  canopyUnderside.position.set(-1.5, 5.06, 12.6);
  canopy.add(canopyUnderside);

  for (const z of [8.68, 16.52]) {
    const redEdge = box(16.15, 0.34, 0.28, materials.redPaint);
    redEdge.position.set(-1.5, 5.12, z);
    canopy.add(redEdge);
  }
  for (const x of [-9.42, 6.42]) {
    const redEdge = box(0.28, 0.34, 7.55, materials.redPaint);
    redEdge.position.set(x, 5.12, 12.6);
    canopy.add(redEdge);
  }
  for (const x of [-6.8, 3.8]) {
    const post = box(0.45, 5.1, 0.45, materials.metal);
    post.position.set(x, 2.55, 12.6);
    canopy.add(post);
  }
  group.add(canopy);

  for (const x of [-4.5, 1.4]) {
    const pump = new THREE.Group();
    const body = box(1.35, 2.35, 1.0, materials.metal);
    body.position.y = 1.2;
    const panel = box(0.9, 0.65, 0.08, materials.black);
    panel.position.set(0, 1.55, 0.55);
    const basePump = box(1.8, 0.25, 1.45, materials.rock);
    basePump.position.y = 0.12;
    pump.add(body, panel, basePump);
    pump.position.set(x, 0, 12.6);
    group.add(pump);
  }

  const warmLights = [];
  for (const position of [[-6, 4.8, 2.5], [0, 4.8, 2.5], [6, 4.8, 2.5], [-4.5, 4.6, 12.6], [1.4, 4.6, 12.6]]) {
    const light = new THREE.PointLight(0xffb766, 12, 18, 2.2);
    light.position.set(position[0], position[1], position[2]);
    light.castShadow = false;
    group.add(light);
    warmLights.push(light);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), materials.windowGlow);
    bulb.position.copy(light.position);
    group.add(bulb);
  }

  enableShadows(group);
  return { group, roof, roofMaterial, warmLights, bounds: { width, depth } };
}

/** @param {import('./Materials.js').MaterialLibrary} materials */
export function createBarn(materials) {
  const group = new THREE.Group();
  group.name = 'Rural barn';
  const width = 17;
  const depth = 15;
  const floor = box(width, 0.35, depth, materials.darkWood);
  floor.position.y = 0.5;
  group.add(floor);
  const back = box(width, 5.5, 0.35, materials.darkWood);
  back.position.set(0, 3.2, -depth * 0.5);
  const left = box(0.35, 5.5, depth, materials.darkWood);
  left.position.set(-width * 0.5, 3.2, 0);
  const right = box(0.35, 5.5, depth, materials.darkWood);
  right.position.set(width * 0.5, 3.2, 0);
  group.add(back, left, right);
  for (const x of [-6.6, 6.6]) {
    const frontPost = box(0.45, 5.5, 0.45, materials.darkWood);
    frontPost.position.set(x, 3.2, depth * 0.5);
    group.add(frontPost);
  }
  const roofMaterial = materials.roof.clone();
  roofMaterial.color.set(0x5f4f43);
  roofMaterial.transparent = true;
  const roof = box(width + 1.2, 0.55, depth + 1.2, roofMaterial);
  roof.position.y = 6.15;
  roof.rotation.z = 0.04;
  group.add(roof);
  for (const x of [-5.5, 0, 5.5]) {
    const bale = box(3.4, 1.8, 2.5, new THREE.MeshStandardMaterial({ color: 0x8f7c45, roughness: 1 }));
    bale.position.set(x, 1.4, -4.5);
    group.add(bale);
  }
  enableShadows(group);
  return { group, roof, roofMaterial, bounds: { width, depth } };
}

/** @param {import('./Materials.js').MaterialLibrary} materials @param {'pickup' | 'sedan'} kind */
export function createVehicle(materials, kind = 'pickup') {
  const group = new THREE.Group();
  const bodyLength = kind === 'pickup' ? 6.4 : 5.4;
  const body = box(2.65, 1.15, bodyLength, materials.bluePaint);
  body.position.y = 1.05;
  group.add(body);
  const cabin = box(2.35, 1.65, kind === 'pickup' ? 2.5 : 3.0, materials.bluePaint);
  cabin.position.set(0, 2.0, kind === 'pickup' ? -1.25 : -0.35);
  group.add(cabin);
  const windshield = box(2.05, 0.95, 0.08, materials.glass);
  windshield.position.set(0, 2.22, kind === 'pickup' ? 0.04 : 1.18);
  windshield.rotation.x = -0.24;
  group.add(windshield);
  if (kind === 'pickup') {
    const bed = box(2.35, 0.42, 2.35, materials.black);
    bed.position.set(0, 1.45, 1.75);
    group.add(bed);
  }
  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 });
  const tireGeometry = new THREE.CylinderGeometry(0.55, 0.55, 0.34, 14);
  for (const x of [-1.4, 1.4]) {
    for (const z of [-bodyLength * 0.31, bodyLength * 0.31]) {
      const tire = new THREE.Mesh(tireGeometry, tireMaterial);
      tire.rotation.z = Math.PI * 0.5;
      tire.position.set(x, 0.65, z);
      tire.castShadow = true;
      group.add(tire);
    }
  }
  const headlight = materials.windowGlow;
  for (const x of [-0.85, 0.85]) {
    const lamp = box(0.55, 0.35, 0.08, headlight);
    lamp.position.set(x, 1.2, bodyLength * 0.5 + 0.04);
    group.add(lamp);
  }
  enableShadows(group);
  return group;
}

/** @param {import('./Materials.js').MaterialLibrary} materials @param {number} length */
export function createFence(materials, length = 8) {
  const group = new THREE.Group();
  const postCount = Math.max(2, Math.floor(length / 2.2) + 1);
  for (let index = 0; index < postCount; index += 1) {
    const x = -length * 0.5 + index * (length / (postCount - 1));
    const post = box(0.24, 2.2, 0.24, materials.wood);
    post.position.set(x, 1.1, 0);
    group.add(post);
  }
  for (const y of [0.75, 1.55]) {
    const rail = box(length, 0.2, 0.16, materials.darkWood);
    rail.position.y = y;
    group.add(rail);
  }
  enableShadows(group);
  return group;
}

/** @param {import('./Materials.js').MaterialLibrary} materials */
export function createCrate(materials) {
  const group = new THREE.Group();
  const body = box(1.5, 1.15, 1.25, materials.wood);
  body.position.y = 0.58;
  group.add(body);
  for (const x of [-0.62, 0.62]) {
    const brace = box(0.12, 1.22, 1.34, materials.darkWood);
    brace.position.set(x, 0.61, 0);
    group.add(brace);
  }
  enableShadows(group);
  return group;
}

/** @param {import('./Materials.js').MaterialLibrary} materials */
export function createBarrel(materials) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.55, 16), materials.rust);
  body.position.y = 0.78;
  body.castShadow = true;
  group.add(body);
  for (const y of [0.23, 0.78, 1.33]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.045, 6, 18), materials.metal);
    ring.rotation.x = Math.PI * 0.5;
    ring.position.y = y;
    group.add(ring);
  }
  return group;
}

/** @param {import('./Materials.js').MaterialLibrary} materials */
export function createPowerPole(materials) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 8.2, 10), materials.darkWood);
  pole.position.y = 4.1;
  pole.castShadow = true;
  group.add(pole);
  const cross = box(3.2, 0.18, 0.2, materials.darkWood);
  cross.position.y = 7.25;
  group.add(cross);
  for (const x of [-1.25, 0, 1.25]) {
    const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.35, 8), materials.glass);
    insulator.position.set(x, 7.55, 0);
    group.add(insulator);
  }
  return group;
}

/** @param {import('./Materials.js').MaterialLibrary} materials */
export function createStreetLight(materials) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.19, 6.5, 10), materials.metal);
  pole.position.y = 3.25;
  pole.castShadow = true;
  const arm = box(2.1, 0.12, 0.12, materials.metal);
  arm.position.set(0.95, 6.35, 0);
  const lamp = box(0.8, 0.25, 0.45, materials.windowGlow);
  lamp.position.set(1.85, 6.15, 0);
  const light = new THREE.PointLight(0xffbb72, 6.5, 17, 2.2);
  light.position.set(1.85, 5.85, 0);
  group.add(pole, arm, lamp, light);
  return { group, light };
}

/** @param {import('./Materials.js').MaterialLibrary} materials @param {string[]} lines */
export function createRoadSign(materials, lines) {
  const group = new THREE.Group();
  const pole = box(0.16, 3.6, 0.16, materials.metal);
  pole.position.y = 1.8;
  const texture = createSignTexture(lines, { width: 400, height: 240, background: '#2f3833', foreground: '#ddd4be', accent: '#8c9b76' });
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.82, metalness: 0.12 });
  const sign = box(4.2, 2.4, 0.18, material);
  sign.position.y = 4.0;
  group.add(pole, sign);
  enableShadows(group);
  return group;
}
