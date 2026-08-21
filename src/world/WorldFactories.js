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
  const cutaway = [];
  const colliders = [];
  const warmLights = [];

  const foundation = box(width + 0.7, 0.55, depth + 0.7, materials.rock);
  foundation.position.y = 0.2;
  const floor = box(width, 0.3, depth, materials.darkWood);
  floor.position.y = 0.62;
  group.add(foundation, floor);

  const wallMaterial = options.color ?? materials.darkWall;
  const doorWidth = 2.5;
  const frontSegmentWidth = (width - doorWidth) * 0.5;

  const backGroup = new THREE.Group();
  const back = box(width, 3.8, 0.32, wallMaterial);
  back.position.set(0, 2.5, -depth * 0.5);
  backGroup.add(back);
  group.add(backGroup);
  cutaway.push({ object: backGroup, normal: { x: 0, z: -1 } });
  colliders.push({ id: 'back', x: 0, z: -depth * 0.5, width, depth: 0.42 });

  const leftGroup = new THREE.Group();
  const left = box(0.32, 3.8, depth, wallMaterial);
  left.position.set(-width * 0.5, 2.5, 0);
  const leftWindow = createWindow(materials, 1.8, 1.45);
  leftWindow.rotation.y = -Math.PI * 0.5;
  leftWindow.position.set(-width * 0.5 - 0.19, 2.65, 1.65);
  leftGroup.add(left, leftWindow);
  group.add(leftGroup);
  cutaway.push({ object: leftGroup, normal: { x: -1, z: 0 } });
  colliders.push({ id: 'left', x: -width * 0.5, z: 0, width: 0.42, depth });

  const rightGroup = new THREE.Group();
  const right = box(0.32, 3.8, depth, wallMaterial);
  right.position.set(width * 0.5, 2.5, 0);
  const rightWindow = createWindow(materials, 1.8, 1.45);
  rightWindow.rotation.y = Math.PI * 0.5;
  rightWindow.position.set(width * 0.5 + 0.19, 2.65, -1.7);
  rightGroup.add(right, rightWindow);
  group.add(rightGroup);
  cutaway.push({ object: rightGroup, normal: { x: 1, z: 0 } });
  colliders.push({ id: 'right', x: width * 0.5, z: 0, width: 0.42, depth });

  const frontGroup = new THREE.Group();
  for (const side of [-1, 1]) {
    const segment = box(frontSegmentWidth, 3.8, 0.32, wallMaterial);
    segment.position.set(side * (doorWidth * 0.5 + frontSegmentWidth * 0.5), 2.5, depth * 0.5);
    frontGroup.add(segment);
    colliders.push({
      id: side < 0 ? 'front-left' : 'front-right',
      x: segment.position.x,
      z: depth * 0.5,
      width: frontSegmentWidth,
      depth: 0.42
    });
  }
  for (const x of [-width * 0.3, width * 0.3]) {
    const window = createWindow(materials, 1.7, 1.4);
    window.position.set(x, 2.7, depth * 0.5 + 0.19);
    frontGroup.add(window);
  }
  const door = box(1.45, 2.8, 0.18, materials.darkWood);
  door.position.set(-doorWidth * 0.45, 2.15, depth * 0.5 + 0.15);
  door.rotation.y = -1.08;
  frontGroup.add(door);
  group.add(frontGroup);
  cutaway.push({ object: frontGroup, normal: { x: 0, z: 1 } });

  const porch = box(width * 0.72, 0.32, 2.4, materials.wood);
  porch.position.set(0, 0.74, depth * 0.5 + 1.1);
  group.add(porch);
  for (const x of [-width * 0.3, width * 0.3]) {
    const post = box(0.18, 3, 0.18, materials.darkWood);
    post.position.set(x, 2.25, depth * 0.5 + 1.85);
    group.add(post);
    colliders.push({ id: `porch-post-${x < 0 ? 'left' : 'right'}`, x, z: depth * 0.5 + 1.85, width: 0.3, depth: 0.3 });
  }

  const roofMaterial = materials.roof.clone();
  roofMaterial.transparent = true;
  const roof = new THREE.Group();
  roof.name = 'Residence roof';
  const slabA = box(width * 0.62, 0.32, depth + 1.3, roofMaterial);
  slabA.rotation.z = -0.57;
  slabA.position.set(-width * 0.23, 5.9, 0);
  const slabB = box(width * 0.62, 0.32, depth + 1.3, roofMaterial);
  slabB.rotation.z = 0.57;
  slabB.position.set(width * 0.23, 5.9, 0);
  const chimney = box(0.85, 2.7, 0.85, materials.rust);
  chimney.position.set(-width * 0.28, 6.2, -depth * 0.18);
  roof.add(slabA, slabB, chimney);
  group.add(roof);

  const interiorWall = materials.wall.clone();
  interiorWall.color.offsetHSL(0, -0.08, -0.18);
  const partitionZ = -0.45;
  const partitionDoorX = 1.45;
  const partitionDoorWidth = 1.75;
  const leftPartitionWidth = partitionDoorX - partitionDoorWidth * 0.5 + width * 0.5;
  const rightPartitionWidth = width * 0.5 - (partitionDoorX + partitionDoorWidth * 0.5);
  if (leftPartitionWidth > 0.5) {
    const partition = box(leftPartitionWidth, 3.15, 0.22, interiorWall);
    partition.position.set(-width * 0.5 + leftPartitionWidth * 0.5, 2.15, partitionZ);
    group.add(partition);
    colliders.push({ id: 'partition-left', x: partition.position.x, z: partitionZ, width: leftPartitionWidth, depth: 0.3 });
  }
  if (rightPartitionWidth > 0.5) {
    const partition = box(rightPartitionWidth, 3.15, 0.22, interiorWall);
    partition.position.set(partitionDoorX + partitionDoorWidth * 0.5 + rightPartitionWidth * 0.5, 2.15, partitionZ);
    group.add(partition);
    colliders.push({ id: 'partition-right', x: partition.position.x, z: partitionZ, width: rightPartitionWidth, depth: 0.3 });
  }

  const rugMaterial = new THREE.MeshStandardMaterial({ color: 0x51443a, roughness: 1, side: THREE.DoubleSide });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 3.0), rugMaterial);
  rug.rotation.x = -Math.PI * 0.5;
  rug.position.set(-1.65, 0.79, 2.0);
  group.add(rug);

  const interiorTable = box(2.8, 0.22, 1.25, materials.wood);
  interiorTable.position.set(-2.0, 1.65, 1.6);
  group.add(interiorTable);
  for (const x of [-3.05, -0.95]) {
    const leg = box(0.16, 1.15, 0.16, materials.darkWood);
    leg.position.set(x, 1.08, 1.6);
    group.add(leg);
  }
  colliders.push({ id: 'table', x: -2.0, z: 1.6, width: 2.9, depth: 1.35 });

  const sofa = box(2.7, 1.05, 1.05, materials.darkWall);
  sofa.position.set(width * 0.5 - 1.75, 1.28, 2.15);
  group.add(sofa);
  colliders.push({ id: 'sofa', x: width * 0.5 - 1.75, z: 2.15, width: 2.8, depth: 1.15 });

  const bed = new THREE.Group();
  const frame = box(3.25, 0.42, 1.8, materials.darkWood);
  frame.position.y = 0.95;
  const mattress = box(3.05, 0.38, 1.62, materials.whitePaint);
  mattress.position.y = 1.32;
  bed.add(frame, mattress);
  bed.position.set(-2.25, 0, -depth * 0.5 + 1.45);
  group.add(bed);
  colliders.push({ id: 'bed', x: -2.25, z: -depth * 0.5 + 1.45, width: 3.35, depth: 1.9 });

  const cabinet = box(2.2, 2.3, 0.8, materials.darkWood);
  cabinet.position.set(width * 0.5 - 1.25, 1.9, -depth * 0.5 + 0.58);
  group.add(cabinet);
  colliders.push({ id: 'cabinet', x: cabinet.position.x, z: cabinet.position.z, width: 2.3, depth: 0.9 });

  const lightPositions = [[-2.1, 3.25, 2.0], [2.0, 3.2, -2.2]];
  for (const position of lightPositions) {
    const light = new THREE.PointLight(0xffbc78, 4.4, 10, 2.0);
    light.position.set(position[0], position[1], position[2]);
    light.userData.baseIntensity = light.intensity;
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.42, 12, 1, true), materials.windowGlow);
    shade.position.copy(light.position);
    shade.position.y += 0.16;
    shade.rotation.x = Math.PI;
    group.add(light, shade);
    warmLights.push(light);
  }

  enableShadows(group);
  return {
    group,
    roof,
    roofMaterial,
    cutaway,
    colliders,
    warmLights,
    entrances: [{ x: 0, z: depth * 0.5 + 0.1, width: doorWidth }],
    lootSpots: [
      { id: 'kitchen', label: 'Kitchen cupboard', x: width * 0.5 - 2.2, z: 0.65, table: 'house' },
      { id: 'bedroom', label: 'Bedroom supplies', x: 2.65, z: -depth * 0.5 + 1.65, table: 'house' }
    ],
    bounds: { width, depth }
  };
}

/** @param {import('./Materials.js').MaterialLibrary} materials */
export function createGasStation(materials) {
  const group = new THREE.Group();
  group.name = 'Pine Ridge Food Mart';
  const width = 25;
  const depth = 15;
  const cutaway = [];
  const colliders = [];
  const warmLights = [];

  const base = box(width + 1, 0.45, depth + 1, materials.rock);
  base.position.y = 0.2;
  const floor = box(width, 0.28, depth, materials.asphalt);
  floor.position.y = 0.55;
  group.add(base, floor);

  const backGroup = new THREE.Group();
  const back = box(width, 4.8, 0.35, materials.wall);
  back.position.set(0, 3, -depth * 0.5);
  backGroup.add(back);
  group.add(backGroup);
  cutaway.push({ object: backGroup, normal: { x: 0, z: -1 } });
  colliders.push({ id: 'back', x: 0, z: -depth * 0.5, width, depth: 0.52 });

  const leftGroup = new THREE.Group();
  const left = box(0.35, 4.8, depth, materials.wall);
  left.position.set(-width * 0.5, 3, 0);
  leftGroup.add(left);
  group.add(leftGroup);
  cutaway.push({ object: leftGroup, normal: { x: -1, z: 0 } });
  colliders.push({ id: 'left', x: -width * 0.5, z: 0, width: 0.52, depth });

  const rightGroup = new THREE.Group();
  const right = box(0.35, 4.8, depth, materials.wall);
  right.position.set(width * 0.5, 3, 0);
  rightGroup.add(right);
  group.add(rightGroup);
  cutaway.push({ object: rightGroup, normal: { x: 1, z: 0 } });
  colliders.push({ id: 'right', x: width * 0.5, z: 0, width: 0.52, depth });

  const frontGroup = new THREE.Group();
  const frontLintel = box(width, 1.25, 0.35, materials.darkWall);
  frontLintel.position.set(0, 4.75, depth * 0.5);
  frontGroup.add(frontLintel);
  const doorCenter = 6.0;
  const doorWidth = 3.2;
  const leftFrontWidth = doorCenter - doorWidth * 0.5 + width * 0.5;
  const rightFrontWidth = width * 0.5 - (doorCenter + doorWidth * 0.5);
  colliders.push({ id: 'front-left', x: -width * 0.5 + leftFrontWidth * 0.5, z: depth * 0.5, width: leftFrontWidth, depth: 0.48 });
  colliders.push({ id: 'front-right', x: doorCenter + doorWidth * 0.5 + rightFrontWidth * 0.5, z: depth * 0.5, width: rightFrontWidth, depth: 0.48 });

  const windowCenters = [-10.2, -6.3, -2.4, 1.5, 10.0];
  for (const center of windowCenters) {
    const glass = box(3.25, 3.2, 0.1, materials.glass);
    glass.position.set(center, 2.55, depth * 0.5 + 0.12);
    const frameLeft = box(0.12, 3.5, 0.18, materials.metal);
    frameLeft.position.set(center - 1.68, 2.55, depth * 0.5 + 0.2);
    const frameRight = box(0.12, 3.5, 0.18, materials.metal);
    frameRight.position.set(center + 1.68, 2.55, depth * 0.5 + 0.2);
    frontGroup.add(glass, frameLeft, frameRight);
  }

  for (const offset of [-0.98, 0.98]) {
    const slidingDoor = box(1.35, 3.2, 0.1, materials.glass);
    slidingDoor.position.set(doorCenter + offset * 1.1, 2.55, depth * 0.5 + 0.12);
    const handle = box(0.08, 0.78, 0.12, materials.metal);
    handle.position.set(doorCenter + offset * 0.42, 2.55, depth * 0.5 + 0.25);
    frontGroup.add(slidingDoor, handle);
  }

  const signTexture = createSignTexture(['PINE RIDGE', 'FOOD MART'], {
    width: 640, height: 190, background: '#3d2b27', foreground: '#e5cbb0', accent: '#a83a2d'
  });
  const signMaterial = new THREE.MeshStandardMaterial({ map: signTexture, emissiveMap: signTexture, emissive: 0x5a1c13, emissiveIntensity: 0.72, roughness: 0.75 });
  const frontSign = box(10.5, 1.65, 0.18, signMaterial);
  frontSign.position.set(0, 5.35, depth * 0.5 + 0.45);
  frontGroup.add(frontSign);
  group.add(frontGroup);
  cutaway.push({ object: frontGroup, normal: { x: 0, z: 1 } });

  const roofMaterial = materials.roof.clone();
  roofMaterial.color.set(0x343d46);
  roofMaterial.transparent = true;
  const roof = new THREE.Group();
  roof.name = 'Food Mart roof';
  const roofSlab = box(width + 1.4, 0.62, depth + 1.4, roofMaterial);
  roofSlab.position.y = 6.05;
  const trimRed = box(width + 0.45, 0.52, depth + 0.45, materials.redPaint);
  trimRed.position.y = 5.35;
  const trimDark = box(width + 0.6, 0.32, depth + 0.6, materials.black);
  trimDark.position.y = 5.72;
  roof.add(trimRed, trimDark, roofSlab);
  group.add(roof);

  const shelfPositions = [-6.0, 0, 6.0];
  for (const shelfX of shelfPositions) {
    const shelf = box(4.25, 1.6, 1.15, materials.darkWood);
    shelf.position.set(shelfX, 1.5, -1.15);
    group.add(shelf);
    colliders.push({ id: `shelf-${shelfX}`, x: shelfX, z: -1.15, width: 4.35, depth: 1.25 });
    for (let item = 0; item < 6; item += 1) {
      const can = box(0.32, 0.5, 0.3, item % 2 ? materials.redPaint : materials.whitePaint);
      can.position.set(shelfX - 1.45 + item * 0.58, 2.5, -1.1);
      group.add(can);
    }
  }

  const counter = box(8.5, 1.25, 1.6, materials.darkWood);
  counter.position.set(7.5, 1.3, -4.7);
  const register = box(1.05, 0.72, 0.85, materials.metal);
  register.position.set(8.6, 2.3, -4.65);
  group.add(counter, register);
  colliders.push({ id: 'counter', x: 7.5, z: -4.7, width: 8.7, depth: 1.8 });

  const fridge = box(4.6, 3.7, 1.15, materials.metal);
  fridge.position.set(-8.8, 2.45, -6.65);
  group.add(fridge);
  colliders.push({ id: 'fridge', x: -8.8, z: -6.65, width: 4.8, depth: 1.35 });
  for (const x of [-9.8, -8.8, -7.8]) {
    const fridgeDoor = box(0.92, 3.2, 0.08, materials.glass);
    fridgeDoor.position.set(x, 2.45, -6.03);
    group.add(fridgeDoor);
  }

  const aisleRug = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 8.4),
    new THREE.MeshStandardMaterial({ color: 0x36332d, roughness: 1, side: THREE.DoubleSide })
  );
  aisleRug.rotation.x = -Math.PI * 0.5;
  aisleRug.position.set(6.0, 0.72, 3.0);
  group.add(aisleRug);

  const canopy = new THREE.Group();
  const canopyRoofMaterial = materials.roof.clone();
  canopyRoofMaterial.color.set(0x37424a);
  canopyRoofMaterial.roughness = 0.9;
  const canopyRoof = box(16, 0.48, 8, canopyRoofMaterial);
  canopyRoof.position.set(-1.5, 5.35, 12.6);
  canopy.add(canopyRoof);
  const canopyUndersideMaterial = new THREE.MeshStandardMaterial({ color: 0x6d6559, roughness: 0.84, emissive: 0x5c3115, emissiveIntensity: 0.42 });
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

  for (const position of [[-7, 4.7, 1.7], [0, 4.7, 1.7], [7, 4.7, 1.7], [-4.5, 4.6, 12.6], [1.4, 4.6, 12.6]]) {
    const light = new THREE.PointLight(0xffb766, 12, 18, 2.2);
    light.position.set(position[0], position[1], position[2]);
    light.castShadow = false;
    light.userData.baseIntensity = light.intensity;
    group.add(light);
    warmLights.push(light);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), materials.windowGlow);
    bulb.position.copy(light.position);
    group.add(bulb);
  }

  enableShadows(group);
  return {
    group,
    roof,
    roofMaterial,
    warmLights,
    cutaway,
    colliders,
    entrances: [{ x: doorCenter, z: depth * 0.5 + 0.1, width: doorWidth }],
    lootSpots: [
      { id: 'shelves', label: 'Food mart shelves', x: -4.8, z: -1.2, table: 'gas_station' },
      { id: 'counter-cache', label: 'Locked counter cache', x: 7.0, z: -3.0, table: 'gas_station' },
      { id: 'fridge-cache', label: 'Cold storage', x: -8.2, z: -5.0, table: 'gas_station' }
    ],
    bounds: { width, depth }
  };
}

/** @param {import('./Materials.js').MaterialLibrary} materials */
export function createBarn(materials) {
  const group = new THREE.Group();
  group.name = 'Rural barn';
  const width = 17;
  const depth = 15;
  const cutaway = [];
  const colliders = [];
  const warmLights = [];

  const floor = box(width, 0.35, depth, materials.darkWood);
  floor.position.y = 0.5;
  group.add(floor);

  const backGroup = new THREE.Group();
  const back = box(width, 5.5, 0.35, materials.darkWood);
  back.position.set(0, 3.2, -depth * 0.5);
  backGroup.add(back);
  group.add(backGroup);
  cutaway.push({ object: backGroup, normal: { x: 0, z: -1 } });
  colliders.push({ id: 'back', x: 0, z: -depth * 0.5, width, depth: 0.48 });

  const leftGroup = new THREE.Group();
  const left = box(0.35, 5.5, depth, materials.darkWood);
  left.position.set(-width * 0.5, 3.2, 0);
  leftGroup.add(left);
  group.add(leftGroup);
  cutaway.push({ object: leftGroup, normal: { x: -1, z: 0 } });
  colliders.push({ id: 'left', x: -width * 0.5, z: 0, width: 0.48, depth });

  const rightGroup = new THREE.Group();
  const right = box(0.35, 5.5, depth, materials.darkWood);
  right.position.set(width * 0.5, 3.2, 0);
  rightGroup.add(right);
  group.add(rightGroup);
  cutaway.push({ object: rightGroup, normal: { x: 1, z: 0 } });
  colliders.push({ id: 'right', x: width * 0.5, z: 0, width: 0.48, depth });

  const frontGroup = new THREE.Group();
  for (const x of [-6.6, 6.6]) {
    const frontPost = box(0.45, 5.5, 0.45, materials.darkWood);
    frontPost.position.set(x, 3.2, depth * 0.5);
    frontGroup.add(frontPost);
    colliders.push({ id: `front-post-${x < 0 ? 'left' : 'right'}`, x, z: depth * 0.5, width: 0.6, depth: 0.6 });
  }
  group.add(frontGroup);
  cutaway.push({ object: frontGroup, normal: { x: 0, z: 1 } });

  const roofMaterial = materials.roof.clone();
  roofMaterial.color.set(0x5f4f43);
  roofMaterial.transparent = true;
  const roof = new THREE.Group();
  roof.name = 'Barn roof';
  const roofSlab = box(width + 1.2, 0.55, depth + 1.2, roofMaterial);
  roofSlab.position.y = 6.15;
  roofSlab.rotation.z = 0.04;
  roof.add(roofSlab);
  group.add(roof);

  for (const x of [-5.5, 0, 5.5]) {
    const bale = box(3.4, 1.8, 2.5, new THREE.MeshStandardMaterial({ color: 0x8f7c45, roughness: 1 }));
    bale.position.set(x, 1.4, -4.5);
    group.add(bale);
    colliders.push({ id: `bale-${x}`, x, z: -4.5, width: 3.55, depth: 2.65 });
  }

  const workbench = box(4.2, 1.25, 1.25, materials.wood);
  workbench.position.set(4.8, 1.2, 3.6);
  group.add(workbench);
  colliders.push({ id: 'workbench', x: 4.8, z: 3.6, width: 4.35, depth: 1.4 });

  const light = new THREE.PointLight(0xffaa5f, 6.2, 14, 2.1);
  light.position.set(0, 4.8, 1.5);
  light.userData.baseIntensity = light.intensity;
  group.add(light);
  warmLights.push(light);

  enableShadows(group);
  return {
    group,
    roof,
    roofMaterial,
    warmLights,
    cutaway,
    colliders,
    entrances: [{ x: 0, z: depth * 0.5 + 0.1, width: 11.5 }],
    lootSpots: [{ id: 'workbench', label: 'Barn workshop', x: 3.4, z: 2.6, table: 'workshop' }],
    bounds: { width, depth }
  };
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
