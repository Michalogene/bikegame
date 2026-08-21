// @ts-check

import * as THREE from '../core/three.js';

const SCHOOL = Object.freeze({ id: 'abandoned-school', label: 'Abandoned School', x: 42, z: -42, width: 30, depth: 22, angle: 0 });
const SPAWN = Object.freeze({ x: -7, z: 8, rotation: Math.PI * 0.25 });
const FOOD_EXTERIOR = Object.freeze({ x: 19, z: 4.4, rotation: Math.PI });
const FOOD_INTERIOR = Object.freeze({ x: 19, z: -5, rotation: Math.PI });
const SCHOOL_EXTERIOR = Object.freeze({ x: 42, z: -29.7, rotation: Math.PI });
const SCHOOL_INTERIOR = Object.freeze({ x: 42, z: -42, rotation: Math.PI });

/** @param {number} width @param {number} height @param {number} depth @param {any} material */
function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** @param {string} text @param {string} foreground @param {string} background */
function signMaterial(text, foreground = '#dfd4bf', background = '#27302e') {
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
    context.font = '900 54px Arial Narrow, Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width * 0.5, canvas.height * 0.53);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    emissive: 0x17130d,
    emissiveIntensity: 0.3,
    roughness: 0.82
  });
}

/** @param {any} world @param {any} object */
function fadeTargets(world, object) {
  return typeof world.prepareFadeObject === 'function' ? world.prepareFadeObject(object) : [];
}

/** @param {any} app */
function buildSchool(app) {
  if (app.world.buildings.has(SCHOOL.id)) return app.world.buildings.get(SCHOOL.id);
  const world = app.world;
  const materials = world.materials;
  const root = new THREE.Group();
  root.name = 'Abandoned school';
  root.position.set(SCHOOL.x, world.terrain.getHeight(SCHOOL.x, SCHOOL.z), SCHOOL.z);
  world.root.add(root);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x747169, roughness: 0.96 });
  const lowerWallMaterial = new THREE.MeshStandardMaterial({ color: 0x39494d, roughness: 0.94 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x56574f, roughness: 0.94 });
  const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x735238, roughness: 0.92 });
  const lockerMaterial = new THREE.MeshStandardMaterial({ color: 0x41565d, roughness: 0.84, metalness: 0.22 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x263139, roughness: 0.95 });
  const floor = box(SCHOOL.width, 0.18, SCHOOL.depth, floorMaterial);
  floor.position.y = 0.08;
  root.add(floor);

  const wallHeight = 4.5;
  const thickness = 0.38;
  const wallSides = {
    north: { normal: { x: 0, z: -1 }, objects: [] },
    south: { normal: { x: 0, z: 1 }, objects: [] },
    west: { normal: { x: -1, z: 0 }, objects: [] },
    east: { normal: { x: 1, z: 0 }, objects: [] }
  };
  const colliders = [];
  const addWall = (id, width, depth, x, z, side) => {
    const group = new THREE.Group();
    const upper = box(width, wallHeight, depth, wallMaterial);
    upper.position.y = wallHeight * 0.5;
    const lower = box(width + 0.02, 1.65, depth + 0.02, lowerWallMaterial);
    lower.position.y = 0.825;
    group.position.set(x, 0, z);
    group.add(upper, lower);
    root.add(group);
    wallSides[side].objects.push(group);
    colliders.push({ id, x, z, width, depth });
    return group;
  };

  addWall('school-north', SCHOOL.width, thickness, 0, -SCHOOL.depth * 0.5, 'north');
  addWall('school-west', thickness, SCHOOL.depth, -SCHOOL.width * 0.5, 0, 'west');
  addWall('school-east', thickness, SCHOOL.depth, SCHOOL.width * 0.5, 0, 'east');
  addWall('school-south-left', 12.6, thickness, -8.7, SCHOOL.depth * 0.5, 'south');
  addWall('school-south-right', 12.6, thickness, 8.7, SCHOOL.depth * 0.5, 'south');
  addWall('school-classroom-left', 10.5, thickness, -9.0, -1.8, 'south');
  addWall('school-classroom-right', 10.5, thickness, 9.0, -1.8, 'south');
  addWall('school-gym-left', 9.6, thickness, -9.6, 4.0, 'south');
  addWall('school-infirmary-right', 9.6, thickness, 9.6, 4.0, 'south');
  addWall('school-center-west', thickness, 7.0, -3.1, -5.4, 'west');
  addWall('school-center-east', thickness, 7.0, 3.1, -5.4, 'east');

  const roof = new THREE.Group();
  roof.name = 'Abandoned school roof';
  const roofNorth = box(SCHOOL.width + 0.8, 0.38, SCHOOL.depth * 0.52, roofMaterial);
  roofNorth.position.set(0, 4.86, -SCHOOL.depth * 0.24);
  const roofSouth = box(SCHOOL.width + 0.8, 0.38, SCHOOL.depth * 0.52, roofMaterial);
  roofSouth.position.set(0, 4.86, SCHOOL.depth * 0.24);
  roof.add(roofNorth, roofSouth);
  root.add(roof);

  const blackboard = box(6.1, 2.0, 0.12, signMaterial('STAY QUIET   STAY ALIVE', '#c6c4a7', '#27352c'));
  blackboard.position.set(-9.4, 2.25, -10.65);
  root.add(blackboard);

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const desk = box(1.28, 0.67, 0.82, woodMaterial);
      desk.position.set(-12 + column * 2.35, 0.35, -8.6 + row * 2.0);
      const chair = box(0.66, 0.56, 0.66, woodMaterial);
      chair.position.set(desk.position.x, 0.29, desk.position.z + 0.82);
      root.add(desk, chair);
    }
  }
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const desk = box(1.24, 0.66, 0.8, woodMaterial);
      desk.position.set(5.5 + column * 2.35, 0.35, -8.2 + row * 2.2);
      const chair = box(0.64, 0.55, 0.64, woodMaterial);
      chair.position.set(desk.position.x, 0.29, desk.position.z + 0.8);
      root.add(desk, chair);
    }
  }

  for (let index = 0; index < 15; index += 1) {
    const locker = box(0.7, 2.2, 0.54, lockerMaterial);
    locker.position.set(-5 + index * 0.72, 1.1, 0.5);
    root.add(locker);
  }

  const bed = box(3.2, 0.58, 1.25, new THREE.MeshStandardMaterial({ color: 0xb0aa93, roughness: 0.9 }));
  bed.position.set(10.6, 0.34, 7.6);
  const cabinet = box(1.45, 2.4, 0.65, materials.whitePaint ?? wallMaterial);
  cabinet.position.set(13.0, 1.2, 8.8);
  const infirmarySign = box(2.25, 0.55, 0.08, signMaterial('INFIRMARY', '#d7eee3', '#315448'));
  infirmarySign.position.set(8.2, 3.35, 3.75);
  root.add(bed, cabinet, infirmarySign);

  for (let index = 0; index < 4; index += 1) {
    const bench = box(4.0, 0.52, 0.75, woodMaterial);
    bench.position.set(-11.2 + index * 3.0, 0.28, 8.0);
    root.add(bench);
  }
  const trophyCase = box(5.4, 2.3, 0.7, materials.glass ?? lockerMaterial);
  trophyCase.position.set(-10.5, 1.15, 10.2);
  const gymSign = box(2.6, 0.65, 0.08, signMaterial('GYM', '#ead9b6', '#563d2d'));
  gymSign.position.set(-3.2, 3.4, 3.75);
  root.add(trophyCase, gymSign);

  const lights = [];
  for (const [x, z, color, intensity] of [
    [-9, -7, 0xffd7a1, 2.5], [8, -7, 0xd6e3d9, 2.1], [0, 1, 0xd2dfdb, 1.8],
    [-9, 7, 0xffd6a6, 2.0], [10, 7, 0xcfe7df, 2.1]
  ]) {
    const fixtureMaterial = new THREE.MeshStandardMaterial({ color: 0xe7dfcf, emissive: color, emissiveIntensity: 1.45 });
    const fixture = box(3.0, 0.12, 0.32, fixtureMaterial);
    fixture.position.set(x, 4.18, z);
    const light = new THREE.PointLight(color, intensity, 11, 2);
    light.position.set(x, 3.85, z);
    light.castShadow = false;
    light.userData.interiorLight = true;
    root.add(fixture, light);
    lights.push(light);
  }

  for (const collider of colliders) {
    world.collider.addRect(
      collider.id,
      SCHOOL.x + collider.x,
      SCHOOL.z + collider.z,
      collider.width,
      collider.depth,
      0
    );
  }
  world.collider.addRect('school-lockers', SCHOOL.x, SCHOOL.z + 0.5, 11, 0.72);
  world.collider.addRect('school-infirmary-bed', SCHOOL.x + 10.6, SCHOOL.z + 7.6, 3.2, 1.25);

  const descriptor = {
    ...SCHOOL,
    root,
    group: root,
    roof,
    roofFadeTargets: fadeTargets(world, roof),
    wallFadeSides: Object.values(wallSides).map((side) => ({
      normal: side.normal,
      targets: side.objects.flatMap((object) => fadeTargets(world, object))
    })),
    lights,
    interiorZoom: 0.9,
    interiorVolumes: [{ x: SCHOOL.x, z: SCHOOL.z, width: SCHOOL.width - 1.2, depth: SCHOOL.depth - 1.2, angle: 0 }]
  };
  app.interiors.registerBuilding(descriptor);
  world.warmLights.push(...lights);
  if (!world.poi.some((poi) => poi.id === SCHOOL.id)) {
    world.poi.push({ id: SCHOOL.id, name: 'ABANDONED SCHOOL', x: SCHOOL.x, z: SCHOOL.z, glyph: '▦' });
  }
  return descriptor;
}

/** @param {any} app @param {{ x: number, z: number, rotation?: number }} target */
function teleport(app, target) {
  app.relocatePlayer(target.x, target.z, { rotation: target.rotation });
  app.save.save(app.state);
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
    position: 'fixed', right: '18px', top: '94px', zIndex: '1000', width: '330px', maxHeight: 'calc(100vh - 118px)',
    overflow: 'auto', padding: '16px', color: '#ded4c2', background: 'rgba(6,11,13,.96)', border: '1px solid rgba(190,171,136,.45)',
    boxShadow: '0 18px 55px rgba(0,0,0,.68)', font: '12px Arial Narrow, Arial, sans-serif', letterSpacing: '.04em'
  });
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(190,171,136,.2);padding-bottom:10px;margin-bottom:12px">
      <strong style="letter-spacing:.13em;color:#e3d5bd">DEVELOPMENT TOOLS</strong><button data-close>×</button>
    </div>
    <section><b>PLAYER</b><div class="dev-grid"><button data-action="respawn">RESPAWN PLAYER</button><button data-action="kill">KILL / TEST DEATH</button></div></section>
    <section><b>TELEPORT</b><div class="dev-grid"><button data-action="spawn">SPAWN</button><button data-action="food-out">FOOD MART EXTERIOR</button><button data-action="food-in">FOOD MART INTERIOR</button><button data-action="school-out">SCHOOL EXTERIOR</button><button data-action="school-in">SCHOOL INTERIOR</button></div></section>
    <section><b>TIME</b><div class="dev-grid"><button data-time="480">08:00</button><button data-time="720">12:00</button><button data-time="1080">18:00</button><button data-time="1320">22:00</button><button data-time="0">00:00</button><button data-action="nightfall">23:00 NIGHTFALL</button><button data-action="freeze">FREEZE TIME</button><button data-action="resume">RESUME TIME</button></div></section>
    <section><b>LIVE STATE</b><pre data-debug style="white-space:pre-wrap;color:#9ea89d;line-height:1.45;background:#05090a;padding:10px;border:1px solid rgba(255,255,255,.07)"></pre></section>`;
  const style = document.createElement('style');
  style.textContent = `#afterdark-development-panel section{margin:13px 0}#afterdark-development-panel section>b{display:block;color:#a98d67;margin-bottom:7px;letter-spacing:.12em}.dev-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}#afterdark-development-panel button{border:1px solid #5e5649;background:#151b1b;color:#d7cebd;padding:8px 7px;font:700 10px Arial Narrow,Arial,sans-serif;cursor:pointer}#afterdark-development-panel button:hover{border-color:#dd6c19;color:white}`;
  document.head.append(style);
  document.body.append(panel);

  const toggle = () => {
    panel.hidden = !panel.hidden;
    if (panel.hidden) app.renderer.renderer.domElement.focus?.();
  };
  window.addEventListener('keydown', (event) => {
    if (event.code === 'F10') {
      event.preventDefault();
      toggle();
    }
  });
  panel.querySelector('[data-close]')?.addEventListener('click', toggle);
  panel.addEventListener('click', (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest('button') : null;
    if (!button) return;
    const minute = button.getAttribute('data-time');
    if (minute !== null) app.time.setTime(Number(minute));
    const action = button.getAttribute('data-action');
    if (action === 'respawn') app.respawnPlayer({ manual: true });
    if (action === 'kill') {
      app.state.respawn.protectedUntil = 0;
      app.state.damage(9999, 'Development test');
    }
    if (action === 'spawn') teleport(app, SPAWN);
    if (action === 'food-out') teleport(app, FOOD_EXTERIOR);
    if (action === 'food-in') teleport(app, FOOD_INTERIOR);
    if (action === 'school-out') teleport(app, SCHOOL_EXTERIOR);
    if (action === 'school-in') teleport(app, SCHOOL_INTERIOR);
    if (action === 'nightfall') {
      app.time.setTime(23 * 60);
      app.state.clock.nightfallActive = true;
      app.state.clock.nightfallEndsAt = app.state.clock.day * 1440 + app.state.clock.minute + 92;
      app.bus.emit('nightfall:start', { day: app.state.clock.day, development: true });
    }
    if (action === 'freeze') app.time.setPaused(true, 'development');
    if (action === 'resume') app.time.setPaused(false, 'development');
  });

  const debug = panel.querySelector('[data-debug]');
  setInterval(() => {
    if (!(debug instanceof HTMLElement) || panel.hidden) return;
    debug.textContent = [
      `Alive: ${!app.state.dead}`,
      `Health: ${Math.round(app.state.survival.health)}`,
      `Input: ${app.input.enabled !== false}`,
      `Position: ${app.player.position.x.toFixed(1)}, ${app.player.position.z.toFixed(1)}`,
      `Interior state: ${app.interiors.state}`,
      `Building: ${app.interiors.activeBuildingId ?? 'OUTDOOR'}`,
      `Camera: ${app.camera.compositionMode}`,
      `Zoom: ${app.camera.zoom.toFixed(2)} / manual ${app.camera.manualZoom.toFixed(2)}`,
      `Time: ${app.time.formattedTime}`,
      `Time frozen: ${app.time.paused}`,
      `World loot remaining: ${app.worldLoot.entities.size}`
    ].join('\n');
  }, 250);
  globalThis.afterdarkDevelopment = { app, school, teleport, panel };
}

async function install() {
  let app = globalThis.afterdarkCounty;
  for (let attempt = 0; !app && attempt < 200; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    app = globalThis.afterdarkCounty;
  }
  if (!app || app.__gameplayExpansionInstalled) return;
  app.__gameplayExpansionInstalled = true;
  const school = buildSchool(app);
  app.interiors.syncFromPlayer({ immediate: true });
  installDevPanel(app, school);
}

install().catch((error) => console.error('[Afterdark expansion]', error));
