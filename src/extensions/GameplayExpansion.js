// @ts-check

import * as THREE from '../core/three.js';

const SCHOOL = Object.freeze({ id: 'abandoned-school', name: 'ABANDONED SCHOOL', x: 42, z: -42, width: 30, depth: 22, angle: 0 });
const SPAWN = Object.freeze({ x: -7, z: 8 });
const FOOD_MART = Object.freeze({ x: 19, z: -5 });

/** @param {number} width @param {number} height @param {number} depth @param {any} material */
function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** @param {string} text @param {string} foreground @param {string} background */
function labelMaterial(text, foreground = '#dfd4bf', background = '#27302e') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#171b1a';
    context.lineWidth = 12;
    context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
    context.fillStyle = foreground;
    context.font = '900 58px Arial Narrow, Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width * 0.5, canvas.height * 0.53);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.78, emissiveMap: texture, emissive: 0x17130d, emissiveIntensity: 0.32 });
}

/** @param {any} app @param {number} x @param {number} z */
function teleport(app, x, z) {
  const y = app.world.terrain.getHeight(x, z);
  app.building?.cancel?.();
  app.interaction?.closeContainer?.();
  app.player.stopAiming?.();
  app.player.velocity.x = 0;
  app.player.velocity.z = 0;
  app.player.root.position.set(x, y, z);
  app.state.player.x = x;
  app.state.player.z = z;
  app.interiors?.reset?.({ immediate: true });
  app.camera?.resetComposition?.({ immediate: true });
  app.camera?.snapTo?.(app.player.position);
  app.input?.reset?.();
  app.renderer?.renderer?.domElement?.focus?.();
  app.bus.emit('toast', `Development teleport: ${Math.round(x)}, ${Math.round(z)}`);
}

/** @param {any} app */
function forceSafeRespawn(app) {
  const candidates = [
    { x: SPAWN.x, z: SPAWN.z },
    { x: -18, z: 22 },
    { x: 31, z: 18 },
    { x: 4, z: -29 },
    { x: -43, z: -30 }
  ];
  const deathX = app.player.position.x;
  const deathZ = app.player.position.z;
  const enemies = app.enemies?.enemies ?? [];
  const valid = candidates
    .filter((point) => !app.world.collider.isBlocked(point.x, point.z, 0.8))
    .map((point) => ({
      ...point,
      deathDistance: Math.hypot(point.x - deathX, point.z - deathZ),
      enemyDistance: Math.min(999, ...enemies.filter((enemy) => !enemy.dead).map((enemy) => Math.hypot(point.x - enemy.position.x, point.z - enemy.position.z)))
    }))
    .sort((a, b) => (b.deathDistance + b.enemyDistance * 1.7) - (a.deathDistance + a.enemyDistance * 1.7));
  const target = valid[0] ?? candidates[0];
  app.state.survival.health = Math.max(65, app.state.survival.health || 0);
  app.state.survival.stamina = Math.max(70, app.state.survival.stamina || 0);
  app.state.survival.bleeding = 0;
  app.state.dead = false;
  app.dead = false;
  app.respawnTimer = null;
  if (app.state.respawn) app.state.respawn.pending = false;
  app.input.enabled = true;
  app.input.reset?.();
  app.hud?.closePanel?.();
  app.hud?.elements?.gameOver?.classList?.remove('visible');
  teleport(app, target.x, target.z);
  app.save?.save?.(app.state);
  app.bus.emit('player:respawned', { x: target.x, z: target.z, manual: true });
  app.bus.emit('toast', 'Development respawn completed');
}

/** @param {any} app */
function requestRespawn(app) {
  if (typeof app.respawnPlayer === 'function') return app.respawnPlayer({ manual: true });
  if (typeof app.requestRespawn === 'function') return app.requestRespawn({ manual: true });
  if (typeof app.respawnSystem?.respawn === 'function') return app.respawnSystem.respawn({ manual: true });
  if (typeof app.respawn?.respawn === 'function') return app.respawn.respawn({ manual: true });
  return forceSafeRespawn(app);
}

/** @param {any} app @param {number} minute @param {boolean} [nightfall] */
function setTime(app, minute, nightfall = false) {
  app.state.clock.minute = ((minute % 1440) + 1440) % 1440;
  app.state.clock.nightfallActive = nightfall;
  if (nightfall) {
    app.state.clock.lastNightfallDay = app.state.clock.day;
    app.state.clock.nightfallEndsAt = app.state.clock.day * 1440 + app.state.clock.minute + 92;
    app.bus.emit('nightfall:start', { day: app.state.clock.day, development: true });
  }
  app.bus.emit('clock:minute', { day: app.state.clock.day, minute: Math.floor(app.state.clock.minute) });
}

/** @param {any} app @param {boolean} paused */
function setTimePaused(app, paused) {
  if (typeof app.time?.setPaused === 'function') app.time.setPaused(paused, 'development');
  else if (paused && typeof app.time?.pause === 'function') app.time.pause('development');
  else if (!paused && typeof app.time?.resume === 'function') app.time.resume('development');
  app.state.clock.manualPaused = paused;
  if ('paused' in app.state.clock) app.state.clock.paused = paused;
  if ('manualPaused' in app.time) app.time.manualPaused = paused;
  app.bus.emit('toast', paused ? 'Development world time frozen' : 'Development world time resumed');
}

/** @param {any} world */
function addFoodMartPolish(world) {
  if (world.root.getObjectByName('Food Mart density extension')) return;
  const root = new THREE.Group();
  root.name = 'Food Mart density extension';
  const cartonMaterials = [0x9e5635, 0xd09b43, 0x4d7a72, 0x744e77, 0x5875a3].map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.88 }));
  const productGeometry = new THREE.BoxGeometry(0.22, 0.34, 0.16);
  const products = cartonMaterials.map((material) => new THREE.InstancedMesh(productGeometry, material, 90));
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const position = new THREE.Vector3();
  const counts = new Array(products.length).fill(0);

  const runs = [
    { x0: 10.2, x1: 27.2, z: -11.42, levels: [0.78, 1.25, 1.72, 2.2] },
    { x0: 11.4, x1: 25.8, z: -6.2, levels: [0.62, 1.08, 1.54] },
    { x0: 11.4, x1: 25.8, z: -2.9, levels: [0.62, 1.08, 1.54] }
  ];
  let sequence = 0;
  for (const run of runs) {
    for (const y of run.levels) {
      for (let x = run.x0; x <= run.x1; x += 0.42) {
        const index = sequence % products.length;
        const instance = counts[index]++;
        position.set(x + Math.sin(sequence * 1.9) * 0.035, y, run.z + Math.cos(sequence) * 0.03);
        rotation.setFromEuler(new THREE.Euler(0, Math.sin(sequence * 2.3) * 0.08, 0));
        scale.set(0.8 + (sequence % 3) * 0.08, 0.85 + (sequence % 4) * 0.07, 0.9);
        matrix.compose(position, rotation, scale);
        products[index].setMatrixAt(instance, matrix);
        sequence += 1;
      }
    }
  }
  for (let index = 0; index < products.length; index += 1) {
    products[index].count = counts[index];
    products[index].instanceMatrix.needsUpdate = true;
    products[index].castShadow = true;
    root.add(products[index]);
  }

  const signs = [
    ['COLD DRINKS', 12.8, 2.9, -11.68, '#d9edf2', '#24577c'],
    ['SNACKS', 16.0, 2.55, -6.22, '#ead1b4', '#6f3528'],
    ['DAIRY', 21.5, 2.55, -2.92, '#d8e7dd', '#315f56']
  ];
  for (const [text, x, y, z, foreground, background] of signs) {
    const sign = box(4.2, 0.52, 0.08, labelMaterial(String(text), String(foreground), String(background)));
    sign.position.set(Number(x), Number(y), Number(z));
    root.add(sign);
  }

  const cardboard = new THREE.MeshStandardMaterial({ color: 0x8f6f4f, roughness: 0.96 });
  for (const [x, z, sx, sy, sz, angle] of [
    [28.4, -10.8, 0.9, 0.72, 0.75, 0.08], [29.2, -9.9, 0.62, 0.52, 0.58, -0.18],
    [8.4, -9.7, 0.75, 0.64, 0.68, 0.25], [27.8, -2.2, 0.58, 0.46, 0.52, -0.2]
  ]) {
    const crate = box(Number(sx), Number(sy), Number(sz), cardboard);
    crate.position.set(Number(x), Number(sy) * 0.5 + 0.08, Number(z));
    crate.rotation.y = Number(angle);
    root.add(crate);
  }

  const coolLight = new THREE.PointLight(0xb9d8e6, 2.2, 13, 2);
  coolLight.position.set(14, 3.4, -9.2);
  coolLight.castShadow = false;
  coolLight.userData.interiorLight = true;
  const warmLight = new THREE.PointLight(0xffc47b, 2.6, 14, 2);
  warmLight.position.set(25.5, 3.2, -7.2);
  warmLight.castShadow = false;
  warmLight.userData.interiorLight = true;
  root.add(coolLight, warmLight);
  world.root.add(root);
}

/** @param {any} world */
function buildSchool(world) {
  if (world.root.getObjectByName('Abandoned school extension')) return null;
  const materials = world.materials;
  const wall = new THREE.MeshStandardMaterial({ color: 0x77746b, roughness: 0.96 });
  const lowerWall = new THREE.MeshStandardMaterial({ color: 0x3d4c50, roughness: 0.94 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x5a5a50, roughness: 0.92 });
  const schoolWood = new THREE.MeshStandardMaterial({ color: 0x765539, roughness: 0.92 });
  const lockerMaterial = new THREE.MeshStandardMaterial({ color: 0x43575e, roughness: 0.82, metalness: 0.24 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x263139, roughness: 0.94, transparent: true, opacity: 1 });
  const root = new THREE.Group();
  root.name = 'Abandoned school extension';
  root.position.set(SCHOOL.x, world.terrain.getHeight(SCHOOL.x, SCHOOL.z), SCHOOL.z);
  world.root.add(root);

  const floor = box(SCHOOL.width, 0.18, SCHOOL.depth, floorMaterial);
  floor.position.y = 0.08;
  root.add(floor);

  const wallHeight = 4.5;
  const wallThickness = 0.38;
  const walls = [];
  const addWall = (name, width, depth, x, z, y = wallHeight * 0.5) => {
    const upper = box(width, wallHeight, depth, wall);
    upper.name = name;
    upper.position.set(x, y, z);
    const lower = box(width + 0.025, 1.65, depth + 0.025, lowerWall);
    lower.position.set(x, 0.84, z);
    root.add(upper, lower);
    walls.push(upper, lower);
    return upper;
  };

  addWall('school-back-wall', SCHOOL.width, wallThickness, 0, -SCHOOL.depth * 0.5);
  addWall('school-left-wall', wallThickness, SCHOOL.depth, -SCHOOL.width * 0.5, 0);
  addWall('school-right-wall', wallThickness, SCHOOL.depth, SCHOOL.width * 0.5, 0);
  addWall('school-front-left', 12.6, wallThickness, -8.7, SCHOOL.depth * 0.5);
  addWall('school-front-right', 12.6, wallThickness, 8.7, SCHOOL.depth * 0.5);
  addWall('school-north-partition-left', 11.0, wallThickness, -8.8, -1.8);
  addWall('school-north-partition-right', 11.0, wallThickness, 8.8, -1.8);
  addWall('school-south-partition-left', 9.8, wallThickness, -9.4, 4.0);
  addWall('school-south-partition-right', 9.8, wallThickness, 9.4, 4.0);
  addWall('school-center-west', wallThickness, 7.1, -3.1, -5.4);
  addWall('school-center-east', wallThickness, 7.1, 3.1, -5.4);

  const roof = new THREE.Group();
  roof.name = 'school-roof';
  const roofA = box(SCHOOL.width + 0.8, 0.38, SCHOOL.depth * 0.52, roofMaterial);
  roofA.position.set(0, 4.86, -SCHOOL.depth * 0.24);
  const roofB = box(SCHOOL.width + 0.8, 0.38, SCHOOL.depth * 0.52, roofMaterial);
  roofB.position.set(0, 4.86, SCHOOL.depth * 0.24);
  roof.add(roofA, roofB);
  root.add(roof);

  const board = box(6.2, 2.1, 0.12, new THREE.MeshStandardMaterial({ color: 0x24362b, roughness: 0.93 }));
  board.position.set(-9.5, 2.25, -10.74);
  root.add(board);
  const boardLabel = box(5.9, 1.82, 0.03, labelMaterial('STAY QUIET   STAY ALIVE', '#c6c4a7', '#27352c'));
  boardLabel.position.set(-9.5, 2.25, -10.66);
  root.add(boardLabel);

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const desk = box(1.3, 0.68, 0.82, schoolWood);
      desk.position.set(-12 + column * 2.35, 0.36, -8.6 + row * 2.0);
      root.add(desk);
      const chair = box(0.68, 0.58, 0.68, schoolWood);
      chair.position.set(desk.position.x, 0.3, desk.position.z + 0.82);
      root.add(chair);
    }
  }

  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const desk = box(1.25, 0.66, 0.8, schoolWood);
      desk.position.set(5.5 + column * 2.35, 0.35, -8.2 + row * 2.2);
      root.add(desk);
      const chair = box(0.66, 0.55, 0.66, schoolWood);
      chair.position.set(desk.position.x, 0.29, desk.position.z + 0.8);
      root.add(chair);
    }
  }

  for (let index = 0; index < 15; index += 1) {
    const locker = box(0.72, 2.2, 0.55, lockerMaterial);
    locker.position.set(-5.0 + index * 0.72, 1.1, 0.5);
    root.add(locker);
  }

  const infirmaryBed = box(3.2, 0.58, 1.25, new THREE.MeshStandardMaterial({ color: 0xb0aa93, roughness: 0.9 }));
  infirmaryBed.position.set(10.6, 0.34, 7.6);
  root.add(infirmaryBed);
  const medicalCabinet = box(1.45, 2.4, 0.65, materials.whitePaint ?? wall);
  medicalCabinet.position.set(13.0, 1.2, 8.8);
  root.add(medicalCabinet);
  const infirmarySign = box(2.1, 0.55, 0.08, labelMaterial('INFIRMARY', '#d7eee3', '#315448'));
  infirmarySign.position.set(8.2, 3.35, 3.75);
  root.add(infirmarySign);

  for (let index = 0; index < 4; index += 1) {
    const bench = box(4.0, 0.52, 0.75, schoolWood);
    bench.position.set(-11.2 + index * 3.0, 0.28, 8.0);
    root.add(bench);
  }
  const trophyCase = box(5.4, 2.3, 0.7, materials.glass ?? lockerMaterial);
  trophyCase.position.set(-10.5, 1.15, 10.2);
  root.add(trophyCase);
  const gymSign = box(2.6, 0.65, 0.08, labelMaterial('GYM', '#ead9b6', '#563d2d'));
  gymSign.position.set(-3.2, 3.4, 3.75);
  root.add(gymSign);

  const lights = [];
  for (const [x, z, color, intensity] of [
    [-9, -7, 0xffd7a1, 2.6], [8, -7, 0xd6e3d9, 2.2], [0, 1, 0xd2dfdb, 1.8],
    [-9, 7, 0xffd6a6, 2.0], [10, 7, 0xcfe7df, 2.2]
  ]) {
    const fixture = box(3.0, 0.12, 0.32, new THREE.MeshStandardMaterial({ color: 0xe7dfcf, emissive: color, emissiveIntensity: 1.5 }));
    fixture.position.set(x, 4.18, z);
    root.add(fixture);
    const light = new THREE.PointLight(color, intensity, 11, 2);
    light.position.set(x, 3.85, z);
    light.castShadow = false;
    light.userData.interiorLight = true;
    root.add(light);
    lights.push(light);
  }

  const worldX = (localX) => SCHOOL.x + localX;
  const worldZ = (localZ) => SCHOOL.z + localZ;
  const addCollider = (id, x, z, width, depth) => world.collider.addRect(id, worldX(x), worldZ(z), width, depth, 0);
  addCollider('school-back', 0, -SCHOOL.depth * 0.5, SCHOOL.width, wallThickness);
  addCollider('school-left', -SCHOOL.width * 0.5, 0, wallThickness, SCHOOL.depth);
  addCollider('school-right', SCHOOL.width * 0.5, 0, wallThickness, SCHOOL.depth);
  addCollider('school-front-left', -8.7, SCHOOL.depth * 0.5, 12.6, wallThickness);
  addCollider('school-front-right', 8.7, SCHOOL.depth * 0.5, 12.6, wallThickness);
  addCollider('school-partition-north-left', -8.8, -1.8, 11.0, wallThickness);
  addCollider('school-partition-north-right', 8.8, -1.8, 11.0, wallThickness);
  addCollider('school-lockers', 0, 0.5, 11.0, 0.75);
  addCollider('school-infirmary-bed', 10.6, 7.6, 3.2, 1.25);

  const createLootMesh = (x, z, material = materials.wood ?? schoolWood) => {
    const mesh = box(1.1, 0.72, 0.9, material);
    mesh.position.set(x, 0.38, z);
    root.add(mesh);
    return mesh;
  };
  if (typeof world.addContainer === 'function') {
    world.addContainer('school-classroom-cache', 'Classroom supplies', worldX(-11.5), worldZ(-6.7), 'house', createLootMesh(-11.5, -6.7));
    world.addContainer('school-locker-cache', 'Abandoned school lockers', worldX(1.8), worldZ(1.35), 'house', createLootMesh(1.8, 1.35, lockerMaterial));
    world.addContainer('school-infirmary-cache', 'Infirmary medicine cabinet', worldX(13.0), worldZ(8.2), 'house', createLootMesh(13.0, 8.2, materials.whitePaint ?? wall));
    world.addContainer('school-gym-cache', 'Gym equipment storage', worldX(-7.8), worldZ(8.8), 'workshop', createLootMesh(-7.8, 8.8));
  }

  const descriptor = {
    id: SCHOOL.id,
    buildingId: SCHOOL.id,
    name: SCHOOL.name,
    label: SCHOOL.name,
    x: SCHOOL.x,
    z: SCHOOL.z,
    width: SCHOOL.width,
    depth: SCHOOL.depth,
    angle: SCHOOL.angle,
    group: root,
    root,
    roof,
    roofGroup: roof,
    roofMeshes: [roofA, roofB],
    walls,
    wallMeshes: walls,
    occluders: walls,
    lights,
    volumes: [{ x: SCHOOL.x, z: SCHOOL.z, width: SCHOOL.width - 1.2, depth: SCHOOL.depth - 1.2, angle: 0 }],
    interiorVolumes: [{ x: SCHOOL.x, z: SCHOOL.z, width: SCHOOL.width - 1.2, depth: SCHOOL.depth - 1.2, angle: 0 }]
  };

  let registered = false;
  for (const method of ['registerBuilding', 'registerInterior', 'addBuilding']) {
    if (typeof world[method] === 'function') {
      world[method](descriptor);
      registered = true;
      break;
    }
  }
  if (!registered) {
    if (!Array.isArray(world.buildings)) world.buildings = [];
    world.buildings.push(descriptor);
  }
  if (Array.isArray(world.interiorBuildings) && !world.interiorBuildings.includes(descriptor)) world.interiorBuildings.push(descriptor);
  if (Array.isArray(world.interiors) && !world.interiors.includes(descriptor)) world.interiors.push(descriptor);
  if (Array.isArray(world.roofs)) world.roofs.push({ roof, material: roofMaterial, x: SCHOOL.x, z: SCHOOL.z, width: SCHOOL.width, depth: SCHOOL.depth, angle: 0 });
  if (Array.isArray(world.poi)) world.poi.push({ id: SCHOOL.id, name: SCHOOL.name, x: SCHOOL.x, z: SCHOOL.z, glyph: '▦' });

  const driveway = box(7.0, 0.08, 22.0, new THREE.MeshStandardMaterial({ color: 0x494b46, roughness: 1 }));
  driveway.position.set(SCHOOL.x, world.terrain.getHeight(SCHOOL.x, -25) + 0.06, -25);
  world.root.add(driveway);
  return descriptor;
}

/** @param {any} app @param {any} school */
function registerSchoolWithInteriorSystem(app, school) {
  if (!school || !app.interiors) return;
  for (const method of ['registerBuilding', 'registerInterior', 'addBuilding']) {
    if (typeof app.interiors[method] === 'function') {
      app.interiors[method](school);
      return;
    }
  }
  if (Array.isArray(app.interiors.buildings) && !app.interiors.buildings.includes(school)) app.interiors.buildings.push(school);
  app.interiors.refresh?.();
}

/** @param {any} app @param {any} school */
function installDevPanel(app, school) {
  const params = new URLSearchParams(location.search);
  const enabled = params.get('dev') !== '0' && (params.has('dev') || ['localhost', '127.0.0.1'].includes(location.hostname));
  if (!enabled || document.querySelector('#afterdark-development-panel')) return;
  const panel = document.createElement('aside');
  panel.id = 'afterdark-development-panel';
  panel.hidden = true;
  Object.assign(panel.style, {
    position: 'fixed', right: '18px', top: '94px', zIndex: '1000', width: '310px', maxHeight: 'calc(100vh - 118px)',
    overflow: 'auto', padding: '16px', color: '#ded4c2', background: 'rgba(6,11,13,.96)', border: '1px solid rgba(190,171,136,.45)',
    boxShadow: '0 18px 55px rgba(0,0,0,.68)', font: '12px Arial Narrow, Arial, sans-serif', letterSpacing: '.04em'
  });
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(190,171,136,.2);padding-bottom:10px;margin-bottom:12px">
      <strong style="letter-spacing:.13em;color:#e3d5bd">DEVELOPMENT TOOLS</strong><button data-close>×</button>
    </div>
    <section><b>PLAYER</b><div class="dev-grid"><button data-action="respawn">RESPAWN PLAYER</button><button data-action="kill">KILL / TEST DEATH</button></div></section>
    <section><b>TELEPORT</b><div class="dev-grid"><button data-action="spawn">SPAWN</button><button data-action="food">FOOD MART</button><button data-action="school">SCHOOL</button></div></section>
    <section><b>TIME</b><div class="dev-grid"><button data-time="480">08:00</button><button data-time="720">12:00</button><button data-time="1080">18:00</button><button data-time="1320">22:00</button><button data-time="0">00:00</button><button data-action="nightfall">23:00 NIGHTFALL</button><button data-action="freeze">FREEZE TIME</button><button data-action="resume">RESUME TIME</button></div></section>
    <section><b>LIVE STATE</b><pre data-debug style="white-space:pre-wrap;color:#9ea89d;line-height:1.45;background:#05090a;padding:10px;border:1px solid rgba(255,255,255,.07)"></pre></section>`;
  const style = document.createElement('style');
  style.textContent = `#afterdark-development-panel section{margin:13px 0}#afterdark-development-panel section>b{display:block;color:#a98d67;margin-bottom:7px;letter-spacing:.12em}.dev-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}#afterdark-development-panel button{border:1px solid #5e5649;background:#151b1b;color:#d7cebd;padding:8px 7px;font:700 10px Arial Narrow,Arial,sans-serif;cursor:pointer}#afterdark-development-panel button:hover{border-color:#dd6c19;color:white}`;
  document.head.append(style);
  document.body.append(panel);
  const toggle = () => { panel.hidden = !panel.hidden; if (!panel.hidden) app.renderer.renderer.domElement.focus?.(); };
  window.addEventListener('keydown', (event) => { if (event.code === 'F10') { event.preventDefault(); toggle(); } });
  panel.querySelector('[data-close]')?.addEventListener('click', toggle);
  panel.addEventListener('click', (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest('button') : null;
    if (!button) return;
    const time = button.getAttribute('data-time');
    if (time !== null) setTime(app, Number(time));
    const action = button.getAttribute('data-action');
    if (action === 'respawn') requestRespawn(app);
    if (action === 'kill') app.state.damage(9999, 'Development test');
    if (action === 'spawn') teleport(app, SPAWN.x, SPAWN.z);
    if (action === 'food') teleport(app, FOOD_MART.x, FOOD_MART.z);
    if (action === 'school') teleport(app, school?.x ?? SCHOOL.x, school?.z ?? SCHOOL.z);
    if (action === 'nightfall') setTime(app, 23 * 60, true);
    if (action === 'freeze') setTimePaused(app, true);
    if (action === 'resume') setTimePaused(app, false);
  });
  const debug = panel.querySelector('[data-debug]');
  setInterval(() => {
    if (!(debug instanceof HTMLElement) || panel.hidden) return;
    const active = app.interiors?.activeBuilding ?? app.interiors?.active ?? app.interiors?.currentBuilding;
    debug.textContent = [
      `Alive: ${app.state.dead !== true && app.dead !== true}`,
      `Health: ${Math.round(app.state.survival.health)}`,
      `Input: ${app.input.enabled !== false}`,
      `Position: ${app.player.position.x.toFixed(1)}, ${app.player.position.z.toFixed(1)}`,
      `Building: ${active?.id ?? active?.name ?? active ?? 'OUTDOOR'}`,
      `Camera: ${app.camera.compositionMode ?? app.camera.mode ?? 'AUTO'}`,
      `Zoom: ${(app.camera.zoom ?? 0).toFixed(2)} / ${(app.camera.targetZoom ?? 0).toFixed(2)}`,
      `Time: ${Math.floor(app.state.clock.minute / 60).toString().padStart(2, '0')}:${Math.floor(app.state.clock.minute % 60).toString().padStart(2, '0')}`,
      `Manual freeze: ${Boolean(app.state.clock.manualPaused ?? app.time.manualPaused ?? app.time.paused)}`,
      `Nearby infected: ${(app.enemies?.enemies ?? []).filter((enemy) => !enemy.dead && Math.hypot(enemy.position.x - app.player.position.x, enemy.position.z - app.player.position.z) < 16).length}`
    ].join('\n');
  }, 250);
}

/** @param {any} app */
function installDevelopmentAssertions(app) {
  if (!new URLSearchParams(location.search).has('dev')) return;
  let previousWarning = '';
  setInterval(() => {
    const alive = app.state.dead !== true && app.dead !== true && app.state.survival.health > 0;
    const active = app.interiors?.activeBuilding ?? app.interiors?.active ?? app.interiors?.currentBuilding;
    const outside = !active;
    let warning = '';
    if (alive && app.input.enabled === false) warning = 'Invariant: survivor alive while input is disabled.';
    else if (alive && app.hud.activePanel == null && app.state.clock.manualPaused !== true && app.state.clock.speed > 0 && app.time?.deathPaused === true) warning = 'Invariant: death pause remains active after respawn.';
    else if (outside && ['interior', 'inside'].includes(String(app.camera.compositionMode ?? app.camera.mode).toLowerCase())) warning = 'Invariant: exterior survivor retains interior camera composition.';
    if (warning && warning !== previousWarning) console.warn(`[Afterdark development] ${warning}`);
    previousWarning = warning;
  }, 1000);
}

async function install() {
  let app = globalThis.afterdarkCounty;
  for (let attempt = 0; !app && attempt < 200; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    app = globalThis.afterdarkCounty;
  }
  if (!app || app.__gameplayExpansionInstalled) return;
  app.__gameplayExpansionInstalled = true;
  addFoodMartPolish(app.world);
  const school = buildSchool(app.world);
  registerSchoolWithInteriorSystem(app, school);
  installDevPanel(app, school);
  installDevelopmentAssertions(app);
  globalThis.afterdarkDevelopment = { app, school, teleport: (x, z) => teleport(app, x, z), respawn: () => requestRespawn(app) };
}

install().catch((error) => console.error('[Afterdark expansion]', error));
