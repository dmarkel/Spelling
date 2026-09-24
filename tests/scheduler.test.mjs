import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChallenge, buildTrainingCamp } from '../js/engine/scheduler.js';
import { coachStep, tipFor, spellOut, lettersOf } from '../js/engine/coach.js';

const w = (word) => ({ word, sentence: `I see ${word}.` });
const chapters = [
  { id: 'c1', tip: 'wh words', words: [w('what'), w('when'), w('where')] },
  { id: 'c2', tip: 'ea words', words: [w('eat'), w('ear'), w('wear')] },
  { id: 'c3', tip: 'qu words', words: [w('quit'), w('queen')] },
];
const stat = (box, misses) => ({ box, misses, cleanDays: [], seen: 1, firstTry: 0, typed: [], lastSeen: '2026-09-23' });

test('challenge contains every chapter word once plus trouble review words', () => {
  const stats = { what: stat(1, 4), when: stat(2, 1), eat: stat(5, 0), quit: stat(1, 2) };
  const round = buildChallenge({ chapter: chapters[2], allChapters: chapters, stats, reviewSlots: 2, rand: () => 0.3 });
  const words = round.map((r) => r.entry.word);
  assert.deepEqual([...words].sort(), ['queen', 'quit', 'what', 'when'].sort());
  assert.equal(new Set(words).size, words.length);
  assert.equal(round.find((r) => r.entry.word === 'what').review, true);
  assert.equal(round.find((r) => r.entry.word === 'quit').review, false);
  assert.equal(round.find((r) => r.entry.word === 'what').chapterId, 'c1');
});

test('review slots pick the most troubled words first', () => {
  const stats = { what: stat(2, 1), when: stat(1, 1), where: stat(1, 6) };
  const round = buildChallenge({ chapter: chapters[2], allChapters: chapters, stats, reviewSlots: 1 });
  assert.deepEqual(round.filter((r) => r.review).map((r) => r.entry.word), ['where']);
});

test('training camp orders by box then misses and caps size', () => {
  const stats = { what: stat(2, 1), when: stat(1, 1), where: stat(1, 6), eat: stat(3, 0) };
  const camp = buildTrainingCamp({ allChapters: chapters, stats, size: 3 });
  assert.deepEqual(camp.map((r) => r.entry.word), ['where', 'when', 'what']);
});

test('training camp skips mastered words and is empty when nothing seen', () => {
  const mastered = { ...stat(5, 0), cleanDays: ['a', 'b', 'c'] };
  assert.deepEqual(buildTrainingCamp({ allChapters: chapters, stats: { eat: mastered }, size: 5 }), []);
  assert.deepEqual(buildTrainingCamp({ allChapters: chapters, stats: {}, size: 5 }), []);
});

test('coachStep ladder', () => {
  assert.equal(coachStep(1), 'spot');
  assert.equal(coachStep(2), 'fill');
  assert.equal(coachStep(3), 'cover');
  assert.equal(coachStep(7), 'cover');
});

test('tipFor prefers the word tip', () => {
  assert.equal(tipFor({ word: 'wear', tip: 'ear inside' }, chapters[1]), 'ear inside');
  assert.equal(tipFor({ word: 'eat' }, chapters[1]), 'ea words');
});

test('spellOut reads letters and apostrophes', () => {
  assert.equal(spellOut("didn't"), 'D. I. D. N. apostrophe. T.');
  assert.deepEqual(lettersOf("It's"), ['i', 't', "'", 's']);
});

test('stats are looked up by normalized word', () => {
  const chs = [{ id: 'a', words: [w("I'm")] }, { id: 'b', words: [w('cat')] }];
  const camp = buildTrainingCamp({ allChapters: chs, stats: { "i'm": stat(1, 2) }, size: 5 });
  assert.deepEqual(camp.map((r) => r.entry.word), ["I'm"]);
});

test('ordered challenges keep the chapter word order', () => {
  const round = buildChallenge({ chapter: chapters[0], allChapters: chapters, stats: {}, ordered: true, rand: () => 0 });
  assert.deepEqual(round.map((r) => r.entry.word), ['what', 'when', 'where']);
});
