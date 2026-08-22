// @ts-check

import { GameApp } from './app/GameApp.js';
import { installWorldReliabilityAdapter } from './world/WorldReliabilityAdapter.js';

const gameRoot = document.querySelector('#game-root');
const uiRoot = document.querySelector('#ui-root');
const boot = document.querySelector('#boot-screen');

if (!(gameRoot instanceof HTMLElement) || !(uiRoot instanceof HTMLElement)) {
  throw new Error('Afterdark County root elements are missing.');
}

try {
  const app = new GameApp({ gameRoot, uiRoot });
  installWorldReliabilityAdapter(app.world);
  app.start();
  globalThis.afterdarkCounty = app;
  import('./extensions/GameplayExpansion.js').catch((error) => console.error('[Afterdark expansion]', error));
} catch (error) {
  if (boot) {
    boot.innerHTML = `<div class="boot-brand"><strong>AFTERDARK</strong><span>COUNTY</span></div><div class="boot-copy">Unable to initialize the county.<br>${error instanceof Error ? error.message : String(error)}</div>`;
  }
  throw error;
}
