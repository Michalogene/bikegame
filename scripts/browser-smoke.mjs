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
    '--use-angle=swiftshader',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    '--window-size=1600,900',
    'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  await waitForUrl(`http://${host}:${debugPort}/json/version`);
  const pages = await (await fetch(`http://${host}:${debugPort}/json/list`)).json();
  const target = pages.find((page) => page.type === 'page');
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
  await protocol.send('Page.navigate', { url: gameUrl });

  const deadline = Date.now() + 20000;
  let state;
  while (Date.now() < deadline) {
    await delay(250);
    state = await evaluate(protocol, `(() => ({
      appReady: Boolean(globalThis.afterdarkCounty),
      bootHidden: document.querySelector('#boot-screen')?.classList.contains('hidden') ?? false,
      canvasReady: Boolean(document.querySelector('#game-root canvas')),
      hudReady: Boolean(document.querySelector('.hud-shell')),
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
    throw new Error(`Game did not reach a rendered playable state: ${JSON.stringify(state)}`);
  }

  const before = state.player;
  await evaluate(protocol, `window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));`);
  await delay(700);
  await evaluate(protocol, `window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));`);
  await delay(150);
  const after = await evaluate(protocol, `({
    x: globalThis.afterdarkCounty.state.player.x,
    z: globalThis.afterdarkCounty.state.player.z
  })`);
  const movement = Math.hypot(after.x - before.x, after.z - before.z);
  if (movement < 0.03) throw new Error(`Player input smoke test did not move the survivor (${movement}).`);

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
  if (browser && !browser.killed) browser.kill('SIGTERM');
  if (server && !server.killed) server.kill('SIGTERM');
  if (profile) await rm(profile, { recursive: true, force: true });
}
