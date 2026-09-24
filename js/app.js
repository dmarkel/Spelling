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
  if (location.hostname === 'localhost' && new URLSearchParams(location.search).has('shot')) return screenshotRoute();
  ctx.go('select');
}

// Local-only jump straight to a screen, used for layout screenshots: ?shot=challenge:emma:e2:miss
async function screenshotRoute() {
  const [screen, player, chapterId, extra] = new URLSearchParams(location.search).get('shot').split(':');
  if (player) ctx.setPlayer(player);
  const outcome = { stars: 2, firstTry: 4, total: 6, newStickers: [{ id: 'e1', emoji: '💌', name: 'Mystery Note' }] };
  const params = { chapterId, mode: 'chapter', part: extra === 'outro' || extra === 'lost' ? 'outro' : 'intro', outcome: { ...outcome, passed: extra !== 'lost' }, kid: player };
  if (screen === 'parent') (await import('./screens/parent.js')).unlockForScreenshots?.();
  await ctx.go(screen, params);
  if (extra === 'miss') {
    const key = (k) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
    setTimeout(() => { key('w'); key('a'); key('Enter'); }, 300);
  }
}
boot();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
