import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, KEY } from '../js/engine/storage.js';

const memory = (init = {}) => {
  const data = { ...init };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
};

test('empty storage loads defaults for both players', () => {
  const store = createStore(memory());
  const root = store.load();
  assert.equal(root.version, 1);
  assert.equal(root.pin, null);
  assert.deepEqual(Object.keys(root.players).sort(), ['emma', 'parker']);
  assert.deepEqual(root.players.emma.stats, {});
});

test('save then load round-trips', () => {
  const backend = memory();
  const store = createStore(backend);
  const root = store.load();
  root.players.emma.stats.what = { box: 2 };
  store.save();
  assert.equal(createStore(backend).load().players.emma.stats.what.box, 2);
});

test('corrupt data falls back to defaults and flags recovery', () => {
  const store = createStore(memory({ [KEY]: '{nope' }));
  const root = store.load();
  assert.equal(store.recovered, true);
  assert.deepEqual(root.players.parker.stats, {});
});

test('a throwing backend still works in memory', () => {
  const store = createStore({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
  const root = store.load();
  root.pin = '1234';
  assert.doesNotThrow(() => store.save());
  assert.equal(store.load().pin, '1234');
});

test('missing player keys are filled in on load', () => {
  const store = createStore(memory({ [KEY]: JSON.stringify({ version: 1, pin: null, players: { emma: { stats: {} } } }) }));
  const root = store.load();
  assert.ok(root.players.parker);
  assert.deepEqual(root.players.emma.sessions, []);
});

test('import accepts export output and rejects junk', () => {
  const a = createStore(memory());
  a.load().players.parker.stickers.push('slime');
  const json = a.exportJSON();
  const b = createStore(memory());
  b.load();
  assert.throws(() => b.importJSON('{"hello":1}'));
  assert.throws(() => b.importJSON('not json'));
  b.importJSON(json);
  assert.deepEqual(b.load().players.parker.stickers, ['slime']);
});
