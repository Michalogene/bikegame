import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve('dist');
const reports = resolve('reports');
await mkdir(reports, { recursive: true });

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.woff2', 'font/woff2']
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = resolve(root, relative);
    if (!file.startsWith(root)) throw new Error('Unsafe path');
    const data = await readFile(file);
    response.writeHead(200, {
      'content-type': mime.get(extname(file)) ?? 'application/octet-stream',
      'cache-control': 'no-store'
    });
    response.end(data);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Unable to bind gameplay smoke server');
const origin = `http://127.0.0.1:${address.port}`;

const profile = await mkdtemp(join(tmpdir(), 'afterdark-chrome-'));
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-background-networking',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-popup-blocking',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--use-angle=swiftshader',
  '--window-size=1600,900',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  'about:blank'
], { stdio: ['ignore', 'pipe', 'pipe'] });

let chromeLog = '';
chrome.stdout.on('data', (chunk) => { chromeLog += chunk.toString(); });
chrome.stderr.on('data', (chunk) => { chromeLog += chunk.toString(); });

async function waitForFile(path, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { return await readFile(path, 'utf8'); } catch { await delay(100); }
  }
  throw new Error(`Timed out waiting for ${path}`);
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

const activePort = await waitForFile(join(profile, 'DevToolsActivePort'));
const [debugPort] = activePort.trim().split(/\r?\n/);
const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
const target = targets.find((entry) => entry.type === 'page');
if (!target?.webSocketDebuggerUrl) throw new Error('Unable to find Chromium page target');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener('open', resolveOpen, { once: true });
  socket.addEventListener('error', rejectOpen, { once: true });
});

let sequence = 0;
const pending = new Map();
const pageErrors = [];
const consoleEntries = [];

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve: resolvePending, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolvePending(message.result ?? {});
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') {
    pageErrors.push(message.params?.exceptionDetails?.text ?? 'Runtime exception');
  }
  if (message.method === 'Log.entryAdded') {
    const entry = message.params?.entry;
    if (entry && ['error', 'warning'].includes(entry.level)) consoleEntries.push(`${entry.level}: ${entry.text}`);
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
    consoleEntries.push('console.error emitted');
  }
});

function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolveSend, rejectSend) => {
    pending.set(id, { resolve: resolveSend, reject: rejectSend });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Evaluation failed');
  return result.result?.value;
}

async function waitFor(predicate, timeout = 12000, label = 'condition') {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function screenshot(name) {
  const capture = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(join(reports, name), Buffer.from(capture.data, 'base64'));
}

async function appSnapshot() {
  return evaluate(`(() => {
    const app = globalThis.afterdarkCounty;
    if (!app) return null;
    const active = app.interiors?.activeBuilding ?? app.interiors?.active ?? app.interiors?.currentBuilding ?? null;
    const cameraMode = app.camera?.compositionMode ?? app.camera?.mode ?? (app.camera?.interiorWeight > 0.01 ? 'interior' : 'outdoor');
    return {
      health: app.state?.survival?.health,
      stateDead: app.state?.dead,
      appDead: app.dead,
      x: app.player?.position?.x,
      z: app.player?.position?.z,
      minute: app.state?.clock?.minute,
      inputEnabled: app.input?.enabled,
      activePanel: app.hud?.activePanel ?? null,
      activeBuilding: active?.id ?? active?.buildingId ?? active?.name ?? (typeof active === 'string' ? active : null),
      cameraMode,
      targetZoom: app.camera?.targetZoom,
      zoom: app.camera?.zoom,
      respawnTimer: app.respawnTimer ?? app.respawn?.timer ?? app.respawnSystem?.timer ?? null,
      manualTimePaused: app.state?.clock?.manualPaused ?? app.time?.manualPaused ?? app.time?.paused ?? false,
      gameOverVisible: Boolean(document.querySelector('.game-over.visible'))
    };
  })()`);
}

async function sendMove(duration = 900) {
  await evaluate(`document.querySelector('#game-root canvas')?.focus()`);
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87
  });
  await delay(duration);
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87
  });
  await delay(250);
}

async function proveMovement(label) {
  const before = await appSnapshot();
  await sendMove();
  const after = await appSnapshot();
  const distance = Math.hypot((after.x ?? 0) - (before.x ?? 0), (after.z ?? 0) - (before.z ?? 0));
  if (!(distance > 0.12)) throw new Error(`${label}: survivor did not move after respawn (${distance})`);
  return { before, after, distance };
}

async function proveClock(label) {
  const before = await appSnapshot();
  await delay(1800);
  const after = await appSnapshot();
  const delta = (after.minute ?? 0) - (before.minute ?? 0);
  if (!(delta > 0.01)) throw new Error(`${label}: world clock remained frozen after respawn`);
  return { before: before.minute, after: after.minute, delta };
}

async function triggerDeath(label) {
  await evaluate(`(() => {
    const app = globalThis.afterdarkCounty;
    app.state.damage(9999, ${JSON.stringify(label)});
  })()`);
  await waitFor(async () => {
    const value = await appSnapshot();
    return value && (value.stateDead === true || value.appDead === true || value.health <= 0);
  }, 4000, `${label} death state`);
}

async function waitForRespawn(label) {
  await waitFor(async () => {
    const value = await appSnapshot();
    return value && value.health > 0 && value.stateDead !== true && value.appDead !== true && !value.gameOverVisible;
  }, 12000, `${label} respawn`);
  const value = await appSnapshot();
  if (value.inputEnabled === false) throw new Error(`${label}: input remained disabled after respawn`);
  if (value.activePanel) throw new Error(`${label}: hidden panel remained active after respawn`);
  return value;
}

async function teleport(x, z) {
  await evaluate(`(() => {
    const app = globalThis.afterdarkCounty;
    const x = ${Number(x)};
    const z = ${Number(z)};
    const y = app.world.terrain.getHeight(x, z);
    app.player.root.position.set(x, y, z);
    app.player.velocity.x = 0;
    app.player.velocity.z = 0;
    app.state.player.x = x;
    app.state.player.z = z;
    app.camera?.snapTo?.(app.player.position);
    app.interiors?.reset?.();
  })()`);
  await delay(1300);
}

await send('Runtime.enable');
await send('Page.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Storage.clearDataForOrigin', { origin, storageTypes: 'all' });
await send('Page.navigate', { url: `${origin}/?dev=1&gameplaySmoke=1` });

const report = {
  origin,
  startedAt: new Date().toISOString(),
  initial: null,
  cycles: [],
  interiorDeath: null,
  school: null,
  pageErrors,
  consoleEntries
};

try {
  await waitFor(async () => evaluate(`Boolean(globalThis.afterdarkCounty && document.readyState === 'complete' && document.querySelector('#boot-screen')?.classList.contains('hidden'))`), 20000, 'game readiness');
  report.initial = await appSnapshot();
  if (!report.initial || report.initial.health <= 0 || report.initial.stateDead === true || report.initial.appDead === true) {
    throw new Error('Fresh gameplay session did not start alive');
  }
  report.initialClock = await proveClock('initial session');
  report.initialMovement = await proveMovement('initial session');
  await screenshot('respawn-initial.png');

  for (let cycle = 1; cycle <= 3; cycle += 1) {
    const deathPosition = await appSnapshot();
    await triggerDeath(`Chromium respawn cycle ${cycle}`);
    if (cycle === 1) await screenshot('respawn-dead.png');
    const respawned = await waitForRespawn(`cycle ${cycle}`);
    const movement = await proveMovement(`cycle ${cycle}`);
    const clock = await proveClock(`cycle ${cycle}`);
    const separation = Math.hypot((respawned.x ?? 0) - (deathPosition.x ?? 0), (respawned.z ?? 0) - (deathPosition.z ?? 0));
    if (!(separation > 5)) throw new Error(`cycle ${cycle}: respawn remained too close to death (${separation})`);
    report.cycles.push({ cycle, deathPosition, respawned, movement, clock, separation });
  }
  await screenshot('respawn-after-three-cycles.png');

  await teleport(19, -5);
  await waitFor(async () => {
    const value = await appSnapshot();
    return Boolean(value?.activeBuilding);
  }, 5000, 'Food Mart interior activation');
  const insideBeforeDeath = await appSnapshot();
  await screenshot('food-mart-interior.png');
  await triggerDeath('Chromium interior death');
  const afterInteriorRespawn = await waitForRespawn('interior death');
  const interiorMovement = await proveMovement('interior death');
  const interiorClock = await proveClock('interior death');
  if (afterInteriorRespawn.activeBuilding) throw new Error('Interior context remained active after exterior respawn');
  report.interiorDeath = { insideBeforeDeath, afterInteriorRespawn, movement: interiorMovement, clock: interiorClock };
  await screenshot('respawn-after-interior-death.png');

  const schoolDescriptor = await evaluate(`(() => {
    const app = globalThis.afterdarkCounty;
    const collections = [app.world?.buildings, app.world?.interiorBuildings, app.world?.interiors, app.world?.poi];
    for (const collection of collections) {
      const values = collection instanceof Map ? [...collection.values()] : Array.isArray(collection) ? collection : [];
      const found = values.find((entry) => /school/i.test(String(entry?.id ?? entry?.name ?? entry?.label ?? '')));
      if (found) return { x: found.x ?? found.center?.x, z: found.z ?? found.center?.z, id: found.id ?? found.name };
    }
    return null;
  })()`);
  if (schoolDescriptor && Number.isFinite(schoolDescriptor.x) && Number.isFinite(schoolDescriptor.z)) {
    await teleport(schoolDescriptor.x, schoolDescriptor.z);
    await delay(1200);
    report.school = { descriptor: schoolDescriptor, state: await appSnapshot() };
    await screenshot('school-interior.png');
  } else {
    report.school = { skipped: true, reason: 'No integrated school descriptor was exposed by the current world.' };
  }

  report.completedAt = new Date().toISOString();
  report.final = await appSnapshot();
  if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  await writeFile(join(reports, 'gameplay-regression.json'), JSON.stringify(report, null, 2));
  console.log(`Gameplay regression smoke passed: ${report.cycles.length} respawns, interior reset, movement and world clock verified.`);
} catch (error) {
  report.failedAt = new Date().toISOString();
  report.failure = error instanceof Error ? error.stack ?? error.message : String(error);
  report.final = await appSnapshot().catch(() => null);
  report.chromeLogTail = chromeLog.slice(-12000);
  await screenshot('gameplay-regression-failure.png').catch(() => {});
  await writeFile(join(reports, 'gameplay-regression.json'), JSON.stringify(report, null, 2));
  throw error;
} finally {
  socket.close();
  chrome.kill('SIGTERM');
  server.close();
  await rm(profile, { recursive: true, force: true });
}
