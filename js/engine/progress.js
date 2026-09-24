// Per-child progress: Leitner boxes, mastery, streaks, session log, dashboard summary.

const MAX_BOX = 5;
const MASTERY_DAYS = 3;
const MAX_TYPED = 10;
const MAX_SESSIONS = 300;

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

export function emptyProfile() {
  return { stats: {}, chapters: {}, sessions: [], stickers: [], streak: { last: null, count: 0 }, custom: [] };
}

function statFor(profile, word) {
  profile.stats[word] ??= { box: 1, cleanDays: [], seen: 0, firstTry: 0, misses: 0, typed: [], lastSeen: null };
  return profile.stats[word];
}

export function recordMiss(profile, word, typed, day) {
  const s = statFor(profile, word);
  s.misses++;
  s.typed.push({ t: typed, d: day });
  if (s.typed.length > MAX_TYPED) s.typed.splice(0, s.typed.length - MAX_TYPED);
}

// Called once per word per round, when the child finally spells it.
export function finishWord(profile, word, { firstTry, day }) {
  const s = statFor(profile, word);
  s.seen++;
  s.lastSeen = day;
  if (firstTry) {
    s.firstTry++;
    s.box = Math.min(MAX_BOX, s.box + 1);
    if (!s.cleanDays.includes(day)) s.cleanDays.push(day);
  } else {
    s.box = 1;
    s.cleanDays = [];
  }
  return s;
}

export function isMastered(stat) {
  return !!stat && stat.cleanDays.length >= MASTERY_DAYS;
}

export function updateStreak(streak, day) {
  if (streak.last === day) return streak;
  streak.count = streak.last && addDays(streak.last, 1) === day ? streak.count + 1 : 1;
  streak.last = day;
  return streak;
}

export function starsFor(firstTry, total) {
  const r = total ? firstTry / total : 0;
  if (r >= 0.9) return 3;
  if (r >= 0.6) return 2;
  return 1;
}

export function logSession(profile, session) {
  profile.sessions.push(session);
  if (profile.sessions.length > MAX_SESSIONS) profile.sessions.splice(0, profile.sessions.length - MAX_SESSIONS);
}

export function summary(profile, today = dayKey()) {
  const stats = Object.entries(profile.stats);
  const results = profile.sessions.flatMap((s) => s.results.map((r) => ({ ...r, day: s.day })));
  const firstTry = results.filter((r) => r.firstTry).length;

  const trouble = stats
    .filter(([, s]) => s.misses > 0 && !isMastered(s))
    .map(([word, s]) => ({ word, misses: s.misses, box: s.box, typed: s.typed.map((x) => x.t) }))
    .sort((a, b) => a.box - b.box || b.misses - a.misses);

  const byDay = [];
  for (let i = 13; i >= 0; i--) {
    const day = addDays(today, -i);
    const rs = results.filter((r) => r.day === day);
    byDay.push({ day, firstTry: rs.filter((r) => r.firstTry).length, total: rs.length });
  }

  const mastered = stats.filter(([, s]) => isMastered(s)).length;
  return {
    accuracy: results.length ? Math.round((firstTry / results.length) * 100) : null,
    mastered,
    learning: stats.length - mastered,
    trouble,
    byDay,
  };
}
