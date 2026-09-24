// Device-only persistence. Every backend call is guarded so the game still runs
// (in memory) when storage is blocked, full, or corrupt.
import { emptyProfile } from './progress.js';

export const KEY = 'spelling-quest-v1';
const PLAYERS = ['emma', 'parker', 'justin'];

function defaults() {
  return { version: 1, pin: null, players: Object.fromEntries(PLAYERS.map((p) => [p, emptyProfile()])) };
}

function isRoot(x) {
  return !!x && typeof x === 'object' && x.version === 1 && x.players && typeof x.players === 'object';
}

function fillIn(root) {
  for (const p of PLAYERS) root.players[p] = { ...emptyProfile(), ...(root.players[p] || {}) };
  return root;
}

export function createStore(backend) {
  let root = null;
  const store = {
    recovered: false,
    load() {
      if (root) return root;
      let raw = null;
      try { raw = backend.getItem(KEY); } catch { /* storage blocked */ }
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (!isRoot(parsed)) throw new Error('bad shape');
          root = fillIn(parsed);
        } catch {
          store.recovered = true;
        }
      }
      root ??= defaults();
      return root;
    },
    save() {
      try { backend.setItem(KEY, JSON.stringify(store.load())); } catch { /* keep in memory */ }
    },
    exportJSON() {
      return JSON.stringify(store.load(), null, 2);
    },
    importJSON(text) {
      const parsed = JSON.parse(text);
      if (!isRoot(parsed)) throw new Error('This file is not a Spelling Quest backup.');
      root = fillIn(parsed);
      store.save();
      return root;
    },
    reset(player) {
      store.load().players[player] = emptyProfile();
      store.save();
    },
  };
  return store;
}
