import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const host = '127.0.0.1';
const port = Number(process.env.SMOKE_PORT || 8766);
const debugPort = Number(process.env.SMOKE_DEBUG_PORT || 9223);
const gameUrl = `http://${host}:${port}/`;
const reports = resolve('reports');
const pageErrors = [];
const browserOutput = [];
let server;
let browser;
let socket;
let profile;

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    'google-chrome-stable',
    'google-chrome',
    'chromium',
    'chromium-browser'
  ].filter(Boolean);
  for (const candidate of candidates) {
    const result = spawnSync('which', [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim();
  }
  throw new Error('No Chromium-compatible browser was found. Set CHROME_BIN to run the smoke test.');
}

async function waitForUrl(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      lastError = error;
    }
    await delay(150);
  }
  throw new Error(`Timed out waiting for ${url}. ${lastError instanceof Error ? lastError.message : ''}`);
}

function createProtocol(wsUrl) {
  socket = new WebSocket(wsUrl);
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }
    for (const listener of listeners.get(message.method) ?? []) listener(message.params ?? {});
  });

  return {
    ready: new Promise((resolveReady, rejectReady) => {
      socket.addEventListener('open', resolveReady, { once: true });
      socket.addEventListener('error', () => rejectReady(new Error('Chrome DevTools websocket failed.')), { once: true });
    }),
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolveRequest, rejectRequest) => {
        pending.set(id, { resolve: resolveRequest, reject: rejectRequest });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    on(method, listener) {
      const bucket = listeners.get(method) ?? [];
      bucket.push(listener);
      listeners.set(method, bucket);
    }
  };
}

async function evaluate(protocol, expression) {
  const result = await protocol.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.');
  return result.result?.value;
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolveExit) => child.once('exit', resolveExit));
  child.kill('SIGTERM');
  await Promise.race([exited, delay(1500)]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGKILL');
    await Promise.race([exited, delay(1000)]);
  }
}

async function removeProfile(path) {
  if (!path) return;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
      return;
    } catch (error) {
      if (!['ENOTEMPTY', 'EBUSY', 'EPERM'].includes(error?.code) || attempt === 5) {
        process.stderr.write(`Smoke cleanup warning: ${error instanceof Error ? error.message : String(error)}\n`);
        return;
      }
      await delay(250 * (attempt + 1));
    }
  }
}

async function run() {
  await mkdir(reports, { recursive: true });
  profile = await mkdtemp(join(tmpdir(), 'afterdark-smoke-'));
  server = spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, HOST: host, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const serverOutput = [];
  server.stdout.on('data', (chunk) => serverOutput.push(String(chunk)));
  server.stderr.on('data', (chunk) => serverOutput.push(String(chunk)));
  await waitForUrl(gameUrl);

  const chrome = findChrome();
  browser = spawn(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--disable-translate',
    '--metrics-recording-only',
    '--mute-audio',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
    '--ozone-platform=headless',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    '--window-size=1600,900',
    'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  browser.stdout.on('data', (chunk) => browserOutput.push(String(chunk)));
  browser.stderr.on('data', (chunk) => browserOutput.push(String(chunk)));

  await waitForUrl(`http://${host}:${debugPort}/json/version`);
  const pages = await (await fetch(`http://${host}:${debugPort}/json/list`)).json();
  const pageTargets = pages.filter((page) => page.type === 'page');
  const target = pageTargets.find((page) => page.url === 'about:blank') ?? pageTargets.at(-1);
  if (!target?.webSocketDebuggerUrl) throw new Error('Chrome did not expose a debuggable page.');
  const protocol = createProtocol(target.webSocketDebuggerUrl);
  await protocol.ready;
  protocol.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    pageErrors.push(exceptionDetails?.exception?.description || exceptionDetails?.text || 'Uncaught browser exception');
  });
  protocol.on('Log.entryAdded', ({ entry }) => {
    if (entry?.level === 'error') pageErrors.push(entry.text);
  });
  await protocol.send('Page.enable');
  await protocol.send('Runtime.enable');
  await protocol.send('Log.enable');
  const navigation = await protocol.send('Page.navigate', { url: gameUrl });
  if (navigation.errorText) throw new Error(`Chrome navigation failed: ${navigation.errorText}`);

  const deadline = Date.now() + 20000;
  let state;
  while (Date.now() < deadline) {
    await delay(250);
    state = await evaluate(protocol, `(() => ({
      url: location.href,
      title: document.title,
      readyState: document.readyState,
      bodyText: document.body?.innerText?.trim().slice(0, 500) ?? '',
      appReady: Boolean(globalThis.afterdarkCounty),
      bootHidden: document.querySelector('#boot-screen')?.classList.contains('hidden') ?? false,
      canvasReady: Boolean(document.querySelector('#game-root canvas')),
      hudReady: Boolean(document.querySelector('.hud')),
      bootText: document.querySelector('#boot-screen')?.textContent?.trim() ?? '',
      renderCalls: globalThis.afterdarkCounty?.renderer?.renderer?.info?.render?.calls ?? 0,
      player: globalThis.afterdarkCounty ? {
        x: globalThis.afterdarkCounty.state.player.x,
        z: globalThis.afterdarkCounty.state.player.z
      } : null
    }))()`);
    if (state?.appReady && state?.bootHidden && state?.renderCalls > 0) break;
  }

  if (!state?.appReady || !state?.bootHidden || !state?.canvasReady || !state?.hudReady || state?.renderCalls <= 0) {
    try {
      const failureShot = await protocol.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(join(reports, 'pine-ridge-smoke-failure.png'), Buffer.from(failureShot.data, 'base64'));
    } catch {}
    const diagnostics = { state, pageErrors, serverOutput, browserOutput };
    await writeFile(join(reports, 'browser-smoke-failure.json'), `${JSON.stringify(diagnostics, null, 2)}\n`);
    throw new Error(`Game did not reach a rendered playable state: ${JSON.stringify(diagnostics)}`);
  }

  await protocol.send('Page.bringToFront');
  await evaluate(protocol, `(() => {
    window.focus();
    document.querySelector('#game-root canvas')?.focus?.();
    return document.visibilityState;
  })()`);
  await delay(120);
  const before = state.player;
  const inputAttempts = [
    { code: 'KeyW', key: 'w', virtualKeyCode: 87, duration: 850 },
    { code: 'KeyD', key: 'd', virtualKeyCode: 68, duration: 700 }
  ];
  let after = { ...before };
  let movement = 0;
  for (const attempt of inputAttempts) {
    await protocol.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: attempt.key,
      code: attempt.code,
      windowsVirtualKeyCode: attempt.virtualKeyCode,
      nativeVirtualKeyCode: attempt.virtualKeyCode
    });
    await delay(attempt.duration);
    await protocol.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: attempt.key,
      code: attempt.code,
      windowsVirtualKeyCode: attempt.virtualKeyCode,
      nativeVirtualKeyCode: attempt.virtualKeyCode
    });
    await delay(220);
    after = await evaluate(protocol, `({
      x: globalThis.afterdarkCounty.state.player.x,
      z: globalThis.afterdarkCounty.state.player.z
    })`);
    movement = Math.hypot(after.x - before.x, after.z - before.z);
    if (movement >= 0.03) break;
  }
  if (movement < 0.03) {
    const inputDiagnostics = await evaluate(protocol, `({
      visibility: document.visibilityState,
      loopRunning: globalThis.afterdarkCounty?.loop?.running ?? false,
      activePanel: globalThis.afterdarkCounty?.hud?.activePanel ?? null,
      dead: globalThis.afterdarkCounty?.dead ?? null,
      keys: [...(globalThis.afterdarkCounty?.input?.keys ?? [])],
      player: globalThis.afterdarkCounty?.state?.player ?? null
    })`);
    const failureShot = await protocol.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(reports, 'pine-ridge-input-failure.png'), Buffer.from(failureShot.data, 'base64'));
    await writeFile(join(reports, 'browser-input-failure.json'), `${JSON.stringify({ before, after, movement, inputDiagnostics, pageErrors }, null, 2)}\n`);
    throw new Error(`Player input smoke test did not move the survivor (${movement}): ${JSON.stringify(inputDiagnostics)}`);
  }

  const screenshot = await protocol.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false
  });
  await writeFile(join(reports, 'pine-ridge-smoke.png'), Buffer.from(screenshot.data, 'base64'));
  await writeFile(join(reports, 'browser-smoke.json'), `${JSON.stringify({ state, after, movement, pageErrors }, null, 2)}\n`);

  if (pageErrors.length) throw new Error(`Browser reported errors:\n${pageErrors.join('\n')}`);
  process.stdout.write(`Browser smoke passed: rendered Pine Ridge and moved the survivor ${movement.toFixed(2)} world units.\n`);
  if (serverOutput.some((line) => /error|exception/i.test(line))) {
    process.stdout.write(`Server output:\n${serverOutput.join('')}\n`);
  }
}

try {
  await run();
} finally {
  try { socket?.close(); } catch {}
  await stopProcess(browser);
  await stopProcess(server);
  await removeProfile(profile);
}
