import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dayKey, emptyProfile, recordMiss, finishWord, isMastered, updateStreak, starsFor, summary, logSession,
} from '../js/engine/progress.js';

test('dayKey uses local date', () => {
  assert.equal(dayKey(new Date(2026, 8, 24, 23, 30)), '2026-09-24');
});

test('first-try finish raises box and records clean day once per day', () => {
  const p = emptyProfile();
  finishWord(p, 'what', { firstTry: true, day: '2026-09-24' });
  finishWord(p, 'what', { firstTry: true, day: '2026-09-24' });
  assert.equal(p.stats.what.box, 3);
  assert.deepEqual(p.stats.what.cleanDays, ['2026-09-24']);
  assert.equal(p.stats.what.seen, 2);
  assert.equal(p.stats.what.firstTry, 2);
});

test('box caps at 5', () => {
  const p = emptyProfile();
  for (let i = 0; i < 9; i++) finishWord(p, 'cat', { firstTry: true, day: '2026-09-24' });
  assert.equal(p.stats.cat.box, 5);
});

test('helped finish resets box to 1', () => {
  const p = emptyProfile();
  finishWord(p, 'when', { firstTry: true, day: '2026-09-23' });
  finishWord(p, 'when', { firstTry: false, day: '2026-09-24' });
  assert.equal(p.stats.when.box, 1);
});

test('mastered only after 3 distinct clean days', () => {
  const p = emptyProfile();
  finishWord(p, 'been', { firstTry: true, day: '2026-09-22' });
  finishWord(p, 'been', { firstTry: true, day: '2026-09-23' });
  assert.equal(isMastered(p.stats.been), false);
  finishWord(p, 'been', { firstTry: true, day: '2026-09-24' });
  assert.equal(isMastered(p.stats.been), true);
  assert.equal(isMastered(undefined), false);
});

test('a miss after mastery un-masters the word', () => {
  const p = emptyProfile();
  for (const d of ['2026-09-20', '2026-09-21', '2026-09-22']) finishWord(p, 'eat', { firstTry: true, day: d });
  finishWord(p, 'eat', { firstTry: false, day: '2026-09-23' });
  assert.equal(isMastered(p.stats.eat), false);
});

test('recordMiss keeps the last 10 typed attempts', () => {
  const p = emptyProfile();
  for (let i = 0; i < 12; i++) recordMiss(p, 'what', `wat${i}`, '2026-09-24');
  assert.equal(p.stats.what.misses, 12);
  assert.equal(p.stats.what.typed.length, 10);
  assert.equal(p.stats.what.typed.at(-1).t, 'wat11');
});

test('updateStreak', () => {
  const s = { last: null, count: 0 };
  updateStreak(s, '2026-09-22');
  assert.equal(s.count, 1);
  updateStreak(s, '2026-09-22');
  assert.equal(s.count, 1);
  updateStreak(s, '2026-09-23');
  assert.equal(s.count, 2);
  updateStreak(s, '2026-09-26');
  assert.equal(s.count, 1);
  updateStreak(s, '2026-10-01');
  updateStreak(s, '2026-10-02');
  assert.equal(s.count, 2, 'crosses month boundary');
});

test('starsFor', () => {
  assert.equal(starsFor(9, 10), 3);
  assert.equal(starsFor(6, 10), 2);
  assert.equal(starsFor(2, 10), 1);
  assert.equal(starsFor(0, 0), 1);
});

test('summary reports accuracy, mastery, trouble words and daily totals', () => {
  const p = emptyProfile();
  recordMiss(p, 'what', 'wat', '2026-09-24');
  finishWord(p, 'what', { firstTry: false, day: '2026-09-24' });
  finishWord(p, 'cat', { firstTry: true, day: '2026-09-24' });
  logSession(p, { day: '2026-09-24', chapterId: 'e1', mode: 'chapter', results: [
    { word: 'what', firstTry: false, tries: 2, typed: ['wat'] },
    { word: 'cat', firstTry: true, tries: 1, typed: [] },
  ] });
  const s = summary(p, '2026-09-24');
  assert.equal(s.accuracy, 50);
  assert.equal(s.trouble[0].word, 'what');
  assert.deepEqual(s.trouble[0].typed, ['wat']);
  assert.equal(s.byDay.length, 14);
  assert.deepEqual(s.byDay.at(-1), { day: '2026-09-24', firstTry: 1, total: 2 });
  assert.equal(s.learning, 2);
  assert.equal(s.mastered, 0);
});
