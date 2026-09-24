// Offline support. Code and data: network first (so updates show up), cache as fallback.
// Images, audio and fonts: cache first (they never change once generated).
const VERSION = 'sq-v5';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/base.css', 'css/screens.css', 'css/challenge.css',
  'js/app.js', 'js/game.js', 'js/assets.js', 'js/audio.js', 'js/sfx.js',
  'js/engine/compare.js', 'js/engine/progress.js', 'js/engine/scheduler.js', 'js/engine/coach.js',
  'js/engine/storage.js', 'js/engine/text.js',
  'js/ui/el.js', 'js/ui/avatar.js', 'js/ui/keyboard.js', 'js/ui/confetti.js',
  'js/screens/select.js', 'js/screens/map.js', 'js/screens/story.js', 'js/screens/challenge.js',
  'js/screens/results.js', 'js/screens/stickers.js', 'js/screens/parent.js',
  'data/emma.js', 'data/parker.js', 'data/voices.js', 'data/lines.js',
  'data/image-manifest.json', 'data/audio-manifest.json',
  'assets/icons/icon-180.png', 'assets/icons/icon-192.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const cacheFirst = (req) => caches.match(req).then((hit) => hit || fetch(req).then((res) => {
  if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
  return res;
}));

const networkFirst = (req) => fetch(req).then((res) => {
  if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
  return res;
}).catch(() => caches.match(req, { ignoreSearch: true }));

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const isAsset = url.pathname.includes('/assets/') || url.hostname.includes('fonts.g');
  e.respondWith(isAsset ? cacheFirst(request) : networkFirst(request));
});
