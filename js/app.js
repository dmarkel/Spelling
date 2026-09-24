// Boot + router. Each screen module exports render(root, ctx, params) and may return a cleanup function.
import { createStore } from './engine/storage.js';
import { loadManifests } from './assets.js';
import { unlock, stop } from './audio.js';
import { PLAYERS } from './game.js';
import { clear } from './ui/el.js';

const screens = {
  select: () => import('./screens/select.js'),
  map: () => import('./screens/map.js'),
  story: () => import('./screens/story.js'),
  challenge: () => import('./screens/challenge.js'),
  results: () => import('./screens/results.js'),
  stickers: () => import('./screens/stickers.js'),
  parent: () => import('./screens/parent.js'),
};

const backend = (() => {
  try { return window.localStorage; } catch { return { getItem: () => null, setItem: () => {} }; }
})();

const root = document.getElementById('app');
let cleanup = null;

const ctx = {
  store: createStore(backend),
  playerId: null,
  get data() { return ctx.store.load(); },
  get player() { return PLAYERS[ctx.playerId]; },
  get profile() { return ctx.store.load().players[ctx.playerId]; },
  save() { ctx.store.save(); },
  setPlayer(id) {
    ctx.playerId = id;
    document.documentElement.dataset.theme = id || '';
  },
  async go(name, params = {}) {
    stop();
    if (cleanup) { try { cleanup(); } catch { /* ignore */ } cleanup = null; }
    const mod = await screens[name]();
    clear(root);
    window.scrollTo(0, 0);
    cleanup = mod.render(root, ctx, params) || null;
  },
};

// iPad audio must be unlocked by a real tap.
let unlocked = false;
document.addEventListener('pointerdown', () => { if (!unlocked) { unlocked = true; unlock(); } }, { capture: true });

async function boot() {
  await loadManifests();
  ctx.go('select');
}
boot();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
