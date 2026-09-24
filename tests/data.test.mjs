import { test } from 'node:test';
import assert from 'node:assert/strict';
import emma from '../data/emma.js';
import parker from '../data/parker.js';
import { SPEAKERS } from '../data/voices.js';
import { CHEERS } from '../data/lines.js';
import { normalize } from '../js/engine/compare.js';

const players = [emma, parker];
const lines = (ch) => [...ch.intro, ...ch.outro, ...ch.hit, ...ch.miss];

test('every word has a sentence that contains the word', () => {
  for (const p of players) for (const ch of p.chapters) for (const w of ch.words) {
    assert.ok(w.sentence, `${w.word} has a sentence`);
    assert.ok(normalize(w.sentence).includes(normalize(w.word)), `"${w.sentence}" contains ${w.word}`);
  }
});

test('focus letters actually appear in the word', () => {
  for (const p of players) for (const ch of p.chapters) for (const w of ch.words) {
    if (w.focus) assert.ok(normalize(w.word).includes(normalize(w.focus)), `${w.word} contains ${w.focus}`);
  }
});

test('every speaker exists in voices', () => {
  const all = players.flatMap((p) => p.chapters.flatMap(lines)).concat(Object.values(CHEERS).flat());
  for (const l of all) assert.ok(SPEAKERS[l.who], `speaker ${l.who}`);
  for (const p of players) for (const ch of p.chapters) {
    if (ch.villain) assert.ok(SPEAKERS[ch.villain.who], `villain ${ch.villain.who}`);
    for (const c of ch.cast || []) assert.ok(SPEAKERS[c], `cast ${c}`);
  }
});

test('chapter ids are unique and words are unique within a chapter', () => {
  const ids = players.flatMap((p) => p.chapters.map((c) => c.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const p of players) for (const ch of p.chapters) {
    const ws = ch.words.map((w) => normalize(w.word));
    assert.equal(new Set(ws).size, ws.length, ch.id);
    assert.ok(ch.intro.length && ch.outro.length && ch.hit.length && ch.miss.length, ch.id);
  }
});

test("the teacher's flagged words come first in Emma's quest", () => {
  const firstFive = emma.chapters.slice(0, 5).flatMap((c) => c.words.map((w) => normalize(w.word)));
  for (const w of ['what', 'when', 'where', 'wear', 'eat', 'been', 'quit', "didn't", 'were']) {
    assert.ok(firstFive.includes(w), w);
  }
});
