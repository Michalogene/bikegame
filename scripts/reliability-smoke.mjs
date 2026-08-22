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
if (!address || typeof address === 'string') throw new Error('Unable to bind reliability smoke server');
const origin = `http://127.0.0.1:${address.port}`;

const profile = await mkdtemp(join(tmpdir(), 'afterdark-reliability-chrome-'));
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

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

async function waitForProcess(child, timeout = 2500) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return true;
  return Promise.race([
    new Promise((resolveExit) => child.once('exit', () => resolveExit(true))),
    delay(timeout).then(() => false)
  ]);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  if (await waitForProcess(child, 2500)) return;
  child.kill('SIGKILL');
  await waitForProcess(child, 1500);
}

async function closeServer(instance) {
  if (!instance?.listening) return;
  await new Promise((resolveClose) => instance.close(() => resolveClose()));
}

async function removeProfile(path) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
      return;
    } catch (error) {
      if (!['ENOTEMPTY', 'EBUSY', 'EPERM'].includes(error?.code) || attempt === 7) {
        process.stderr.write(`Reliability cleanup warning: ${error instanceof Error ? error.message : String(error)}\n`);
        return;
      }
      await delay(150 * (attempt + 1));
    }
  }
}

async function waitForFile(path, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try { return await readFile(path, 'utf8'); } catch { await delay(100); }
  }
  throw new Error(`Timed out waiting for ${path}`);
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
const consoleErrors = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const handler = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(message.error.message));
    else handler.resolve(message.result ?? {});
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') {
    pageErrors.push(message.params?.exceptionDetails?.text ?? 'Runtime exception');
  }
  if (message.method === 'Log.entryAdded' && message.params?.entry?.level === 'error') {
    consoleErrors.push(message.params.entry.text);
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') {
    consoleErrors.push('console.error emitted');
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
  const response = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text ?? 'Evaluation failed');
  return response.result?.value;
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
async function snapshot() {
  return evaluate(`(() => {
    const app = globalThis.afterdarkCounty;
    if (!app) return null;
    const building = app.world.buildings.get('food-mart');
    const roofs = building?.roofFadeTargets ?? [];
    const selected = app.interaction?.nearby;
    return {
      health: app.state.survival.health,
      dead: app.state.dead,
      x: app.player.position.x,
      z: app.player.position.z,
      minute: app.state.clock.minute,
      inputEnabled: app.input.enabled,
      activePanel: app.hud.activePanel,
      backdropVisible: app.hud.elements.backdrop.classList.contains('visible'),
      activeBuilding: app.interiors.activeBuildingId,
      interiorState: app.interiors.state,
      cameraMode: app.camera.compositionMode,
      roofVisible: roofs.some((target) => target.mesh.visible !== false),
      roofMaxOpacity: roofs.length ? Math.max(...roofs.map((target) => Number(target.material.opacity ?? 1))) : null,
      worldLootCount: app.worldLoot?.entities?.size ?? 0,
      selectedLoot: selected?.type === 'world-loot' ? selected.id : null,
      gameOverVisible: app.hud.elements.gameOver.classList.contains('visible')
    };
  })()`);
}

async function relocate(x, z) {
  await evaluate(`(() => { globalThis.afterdarkCounty.relocatePlayer(${Number(x)}, ${Number(z)}, { focus: true }); return true; })()`);
  await delay(250);
}

async function dispatchKey(code, key, down) {
  return evaluate(`(() => {
    const event = new KeyboardEvent(${down ? "'keydown'" : "'keyup'"}, {
      code: ${JSON.stringify(code)},
      key: ${JSON.stringify(key)},
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(event);
    return globalThis.afterdarkCounty?.input?.keys?.has(${JSON.stringify(code)}) ?? false;
  })()`);
}

async function proveMovement(label) {
  const before = await snapshot();
  await evaluate(`(() => {
    window.focus();
    document.querySelector('#game-root canvas')?.focus?.();
    return document.activeElement?.tagName ?? null;
  })()`);

  let last = before;
  try {
    await send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'w',
      code: 'KeyW',
      windowsVirtualKeyCode: 87,
      nativeVirtualKeyCode: 87
    });
    const registered = await evaluate(`globalThis.afterdarkCounty?.input?.keys?.has('KeyW') ?? false`);
    if (!registered) throw new Error(`${label}: InputManager did not register native KeyW keydown`);

    await waitFor(async () => {
      last = await snapshot();
      return Math.hypot(last.x - before.x, last.z - before.z) > 0.12;
    }, 12000, `${label} movement while KeyW is held`);
  } finally {
    await send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'w',
      code: 'KeyW',
      windowsVirtualKeyCode: 87,
      nativeVirtualKeyCode: 87
    }).catch(() => {});
    await dispatchKey('KeyW', 'w', false).catch(() => {});
    await waitFor(
      async () => evaluate(`!globalThis.afterdarkCounty?.input?.keys?.has('KeyW')`),
      2000,
      'KeyW release'
    ).catch(() => {});
  }

  const distance = Math.hypot(last.x - before.x, last.z - before.z);
  if (!(distance > 0.12)) throw new Error(`${label}: survivor did not move (${distance})`);
  return distance;
}

async function proveClock(label) {
  const before = await snapshot();
  let after = before;
  await waitFor(async () => {
    after = await snapshot();
    return after.minute - before.minute > 0.01;
  }, 12000, `${label} world clock advancement`);
  return after.minute - before.minute;
}

async function click(selector) {
  return evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) return false; node.click(); return true; })()`);
}

await send('Runtime.enable');
await send('Page.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Storage.clearDataForOrigin', { origin, storageTypes: 'all' });
await send('Page.navigate', { url: `${origin}/?dev=1&reliabilitySmoke=1` });

const report = {
  origin,
  startedAt: new Date().toISOString(),
  entries: [],
  menus: [],
  loot: null,
  respawn: null,
  school: null,
  pageErrors,
  consoleErrors
};

try {
  await waitFor(
    async () => evaluate(`Boolean(globalThis.afterdarkCounty && globalThis.afterdarkCounty.worldLoot && document.querySelector('#boot-screen')?.classList.contains('hidden'))`),
    20000,
    'game readiness'
  );
  await waitFor(async () => evaluate(`globalThis.afterdarkCounty.world.buildings.has('abandoned-school')`), 10000, 'school registration');
  const initial = await snapshot();
  if (!initial || initial.dead || initial.health <= 0) throw new Error('Fresh game did not start alive');
  await proveClock('fresh session');
  await proveMovement('fresh session');

  for (let cycle = 1; cycle <= 10; cycle += 1) {
    await relocate(19, 4.4);
    const outside = await snapshot();
    if (outside.activeBuilding) throw new Error(`cycle ${cycle}: exterior retained active building`);
    if (!outside.roofVisible) throw new Error(`cycle ${cycle}: exterior roof stayed hidden`);

    await relocate(19, -5);
    const inside = await snapshot();
    if (inside.activeBuilding !== 'food-mart') throw new Error(`cycle ${cycle}: Food Mart membership missing`);
    if (inside.roofVisible || inside.roofMaxOpacity > 0.001) {
      throw new Error(`cycle ${cycle}: Food Mart roof obstructed interior (${inside.roofMaxOpacity})`);
    }
    if (inside.cameraMode !== 'interior') throw new Error(`cycle ${cycle}: camera did not enter interior mode`);
    report.entries.push({ cycle, outside, inside });
    if (cycle === 1) await screenshot('food-mart-entry-1.png');
    if (cycle === 2) await screenshot('food-mart-entry-2.png');
    if (cycle === 5) await screenshot('food-mart-entry-5.png');
  }

  await relocate(19, -5);
  const directInterior = await snapshot();
  if (directInterior.activeBuilding !== 'food-mart' || directInterior.roofVisible) {
    throw new Error('Direct Food Mart teleport did not reconcile interior presentation');
  }
  await screenshot('food-mart-direct-interior.png');

  const lootBefore = await evaluate(`(() => {
    const app = globalThis.afterdarkCounty;
    const entity = app.worldLoot.entities.get('food-water-front');
    return { exists: Boolean(entity), inventory: app.state.inventory.count('water_bottle'), total: app.worldLoot.entities.size };
  })()`);
  if (!lootBefore.exists) throw new Error('Physical Food Mart water bottle was not spawned');
  await relocate(13.6, -9.1);
  await delay(300);
  await screenshot('food-mart-world-loot-before.png');
  const picked = await evaluate(`globalThis.afterdarkCounty.worldLoot.pickup('food-water-front')`);
  if (picked !== 1) throw new Error(`Physical loot pickup returned ${picked}`);
  const lootAfter = await evaluate(`(() => {
    const app = globalThis.afterdarkCounty;
    return {
      exists: app.worldLoot.entities.has('food-water-front'),
      inventory: app.state.inventory.count('water_bottle'),
      persisted: app.state.collectedWorldLoot.has('food-water-front')
    };
  })()`);
  if (lootAfter.exists || !lootAfter.persisted || lootAfter.inventory !== lootBefore.inventory + 1) {
    throw new Error('Physical loot transaction did not update world, inventory and persistence atomically');
  }
  await screenshot('food-mart-world-loot-after.png');
  await relocate(19, 4.4);
  await relocate(19, -5);
  const lootReturned = await evaluate(`globalThis.afterdarkCounty.worldLoot.entities.has('food-water-front')`);
  if (lootReturned) throw new Error('Collected physical loot returned after leaving and re-entering');
  report.loot = { before: lootBefore, after: lootAfter, returned: lootReturned };

  for (const panel of ['map', 'inventory', 'crafting', 'missions', 'camp', 'settings']) {
    const opened = await click(`[data-panel="${panel}"]`);
    if (!opened) throw new Error(`Missing ${panel} navigation button`);
    await waitFor(async () => {
      const state = await snapshot();
      return state.activePanel === panel && state.backdropVisible;
    }, 12000, `${panel} panel opening`);

    const closed = await click('[data-close-panel]');
    if (!closed) throw new Error(`${panel}: close button missing`);
    await waitFor(async () => {
      const state = await snapshot();
      return !state.activePanel && !state.backdropVisible;
    }, 12000, `${panel} X close`);

    await click(`[data-panel="${panel}"]`);
    await waitFor(async () => {
      const state = await snapshot();
      return state.activePanel === panel && state.backdropVisible;
    }, 12000, `${panel} reopening`);
    const escapeRegistered = await dispatchKey('Escape', 'Escape', true);
    if (!escapeRegistered) throw new Error(`${panel}: InputManager did not register Escape`);
    await dispatchKey('Escape', 'Escape', false);
    await waitFor(async () => {
      const state = await snapshot();
      return !state.activePanel && !state.backdropVisible;
    }, 12000, `${panel} Escape close`);
    report.menus.push({ panel, x: true, escape: true });
  }
  await proveMovement('post-menu focus restoration');

  await relocate(19, -5);
  await evaluate(`(() => { const app = globalThis.afterdarkCounty; app.state.respawn.protectedUntil = 0; app.state.damage(9999, 'Reliability interior death'); })()`);
  await waitFor(async () => (await snapshot()).dead === true, 3000, 'interior death');
  await waitFor(async () => {
    const state = await snapshot();
    return !state.dead && state.health > 0 && !state.gameOverVisible;
  }, 10000, 'interior respawn');
  const afterRespawn = await snapshot();
  if (afterRespawn.activeBuilding) throw new Error('Interior context survived exterior respawn');
  if (!afterRespawn.inputEnabled) throw new Error('Input remained disabled after respawn');
  const movement = await proveMovement('interior respawn');
  const clock = await proveClock('interior respawn');
  report.respawn = { afterRespawn, movement, clock };
  await screenshot('respawn-after-interior-death.png');

  await relocate(42, -42);
  const school = await snapshot();
  if (school.activeBuilding !== 'abandoned-school') throw new Error('School interior did not activate');
  report.school = school;
  await screenshot('school-interior.png');

  report.completedAt = new Date().toISOString();
  report.final = await snapshot();
  if (pageErrors.length || consoleErrors.length) {
    throw new Error(`Browser errors: ${[...pageErrors, ...consoleErrors].join(' | ')}`);
  }
  await writeFile(join(reports, 'reliability-smoke.json'), JSON.stringify(report, null, 2));
  process.stdout.write(`Reliability smoke passed: ${report.entries.length} interior entries, physical loot, ${report.menus.length} menus and interior respawn verified.\n`);
} catch (error) {
  report.failedAt = new Date().toISOString();
  report.failure = error instanceof Error ? error.stack ?? error.message : String(error);
  report.final = await snapshot().catch(() => null);
  report.chromeLogTail = chromeLog.slice(-12000);
  await screenshot('reliability-failure.png').catch(() => {});
  await writeFile(join(reports, 'reliability-smoke.json'), JSON.stringify(report, null, 2));
  throw error;
} finally {
  try { await send('Browser.close'); } catch {}
  try { socket.close(); } catch {}
  await stopProcess(chrome);
  await closeServer(server);
  await removeProfile(profile);
}