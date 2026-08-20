// @ts-check

import { GameApp } from './app/GameApp.js';

const gameRoot = document.querySelector('#game-root');
const uiRoot = document.querySelector('#ui-root');
const boot = document.querySelector('#boot-screen');

if (!(gameRoot instanceof HTMLElement) || !(uiRoot instanceof HTMLElement)) {
  throw new Error('Afterdark County root elements are missing.');
}

try {
  const app = new GameApp({ gameRoot, uiRoot });
  app.start();
  globalThis.afterdarkCounty = app;
} catch (error) {
  if (boot) {
    boot.innerHTML = `<div class="boot-brand"><strong>AFTERDARK</strong><span>COUNTY</span></div><div class="boot-copy">Unable to initialize the county.<br>${error instanceof Error ? error.message : String(error)}</div>`;
  }
  throw error;
}
