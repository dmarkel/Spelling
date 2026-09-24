// Answer checking and letter-level diff used for coaching highlights.

export function normalize(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein alignment of target vs attempt.
// ops: { op: 'match'|'sub'|'del'|'ins', t: targetIndex|null, a: attemptChar|null }
//   del = target letter missing from attempt, ins = extra letter in attempt.
export function align(target, attempt) {
  const t = [...target];
  const a = [...attempt];
  const n = t.length;
  const m = a.length;
  const dp = Array.from({ length: n + 1 }, (_, i) => {
    const row = new Array(m + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = t[i - 1] === a[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j - 1] + cost, dp[i - 1][j] + 1, dp[i][j - 1] + 1);
    }
  }
  const ops = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && t[i - 1] === a[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      ops.push({ op: 'match', t: i - 1, a: a[j - 1] });
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.push({ op: 'sub', t: i - 1, a: a[j - 1] });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ op: 'del', t: i - 1, a: null });
      i--;
    } else {
      ops.push({ op: 'ins', t: null, a: a[j - 1] });
      j--;
    }
  }
  ops.reverse();
  return { ops, distance: dp[n][m] };
}

export function check(target, attempt) {
  const tn = normalize(target);
  const an = normalize(attempt);
  const { ops, distance } = align(tn, an);
  return { correct: tn === an, distance, ops, target: tn, attempt: an };
}

// What to show the child about their own attempt, without revealing the answer.
export function attemptView(ops) {
  return ops.map(({ op, a }) => {
    if (op === 'match') return { kind: 'ok', ch: a };
    if (op === 'sub') return { kind: 'wrong', ch: a };
    if (op === 'ins') return { kind: 'extra', ch: a };
    return { kind: 'missing' };
  });
}

// Which target letters to reveal in the "fill it" hint (true = show).
export function hintMask(target, ops, focus) {
  const t = [...normalize(target)];
  const mask = t.map(() => false);
  for (const o of ops) if (o.op === 'match') mask[o.t] = true;
  mask[0] = true;

  const start = focus ? t.join('').indexOf(normalize(focus)) : -1;
  const inFocus = (i) => start >= 0 && i >= start && i < start + focus.length;

  const shown = () => mask.filter(Boolean).length;
  if (shown() < Math.ceil(t.length / 2)) {
    t.forEach((_, i) => {
      if (start >= 0 ? !inFocus(i) : i % 2 === 0) mask[i] = true;
    });
  }
  // A hint must leave something to fill in.
  if (!mask.includes(false) && t.length > 1) {
    if (start >= 0) t.forEach((_, i) => { if (inFocus(i) && i > 0) mask[i] = false; });
    if (!mask.includes(false)) mask[Math.floor(t.length / 2)] = false;
  }
  return mask;
}
