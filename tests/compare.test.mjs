import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, check, attemptView, hintMask } from '../js/engine/compare.js';

test('normalize lowercases, trims, straightens apostrophes', () => {
  assert.equal(normalize('  Didn’t '), "didn't");
  assert.equal(normalize('ICE  cream'), 'ice cream');
});

test('exact match is correct', () => {
  assert.equal(check('what', 'What').correct, true);
  assert.equal(check("didn't", 'didn’t').correct, true);
});

test("Emma's real mistakes are wrong and close", () => {
  const cases = [['what', 'wat'], ['when', 'wen'], ['wear', 'whar'], ['eat', 'ete'], ['been', 'ben'],
    ['quit', 'qwit'], ["didn't", 'dident'], ['learned', 'learnd'], ['were', 'wer']];
  for (const [t, a] of cases) {
    const r = check(t, a);
    assert.equal(r.correct, false, a);
    assert.ok(r.distance <= 2, `${a} distance ${r.distance}`);
  }
});

test('attemptView marks a missing letter without revealing it', () => {
  const v = attemptView(check('what', 'wat').ops);
  assert.deepEqual(v.map((x) => x.kind), ['ok', 'missing', 'ok', 'ok']);
  assert.equal(v[1].ch, undefined);
  assert.equal(v[0].ch, 'w');
});

test('attemptView marks substitutions and extras', () => {
  assert.deepEqual(attemptView(check('quit', 'qwit').ops).map((x) => x.kind), ['ok', 'wrong', 'ok', 'ok']);
  assert.deepEqual(attemptView(check('cat', 'cats').ops).map((x) => x.kind), ['ok', 'ok', 'ok', 'extra']);
});

test('hintMask hides only the letters the child missed', () => {
  assert.deepEqual(hintMask('what', check('what', 'wat').ops), [true, false, true, true]);
  assert.deepEqual(hintMask('wear', check('wear', 'whar').ops), [true, false, true, true]);
});

test('hintMask on a wild guess still shows first letter and hides the focus', () => {
  const m = hintMask('because', check('because', 'zzz').ops, 'cau');
  assert.equal(m[0], true);
  assert.deepEqual(m.slice(2, 5), [false, false, false]);
  assert.ok(m.filter(Boolean).length >= 3);
});

test('hintMask always leaves at least one letter hidden', () => {
  const m = hintMask('cat', check('cat', 'cat').ops);
  assert.ok(m.includes(false));
});
