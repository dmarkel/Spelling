// Game rules that sit between the engine and the screens: chapters, unlocking, rewards.
import emma from '../data/emma.js';
import parker from '../data/parker.js';
import justin from '../data/justin.js';
import { buildTrainingCamp } from './engine/scheduler.js';
import { finishWord, recordMiss, updateStreak, starsFor, logSession } from './engine/progress.js';
import { normalize } from './engine/compare.js';

export const PLAYERS = { emma, parker, justin };

export const BONUS_STICKERS = [
  { id: 'perfect', emoji: '🌟', name: 'Perfect Round' },
  { id: 'camp', emoji: '🏋️', name: 'Training Camp' },
  { id: 'teacher', emoji: '🍎', name: "Teacher's Pet" },
  { id: 'streak3', emoji: '🔥', name: '3 Days in a Row' },
  { id: 'streak7', emoji: '🌈', name: '7 Days in a Row' },
];

export function customChapter(player, profile) {
  if (!profile.custom.length) return null;
  const hero = player.id;
  return {
    id: 'custom',
    title: "Teacher's List",
    pattern: "This week's words",
    tip: 'Say the word slowly in your spelling voice and write every sound you hear.',
    special: true,
    meter: { label: 'Words practiced', icon: '🍎' },
    scene: { emoji: '🍎', colors: ['#fff4d6', '#ffd1dc'] },
    sticker: { id: 'teacher', emoji: '🍎', name: "Teacher's Pet" },
    intro: [{ who: 'coach', text: "These words are from your teacher's list. Let's practice them!" }],
    outro: [{ who: hero, text: 'I practiced my teacher words!' }],
    hit: [{ who: 'coach', text: 'Great job!' }],
    miss: [{ who: 'coach', text: 'Try again. You can do it!' }],
    words: profile.custom.map((c) => ({ word: c.word, sentence: c.sentence || `Can you spell ${c.word}?` })),
  };
}

export function chaptersFor(player, profile) {
  const c = customChapter(player, profile);
  return c ? [...player.chapters, c] : player.chapters;
}

export function campChapter(player, profile) {
  return {
    id: 'camp',
    title: 'Training Camp',
    pattern: 'Your trickiest words',
    special: true,
    meter: { label: 'Training', icon: '🏋️' },
    scene: { emoji: '🏋️', colors: ['#e3ffe7', '#d9e7ff'] },
    sticker: BONUS_STICKERS[1],
    hit: [{ who: 'coach', text: 'Stronger every time!' }],
    miss: [{ who: 'coach', text: 'That is what practice is for. Try again!' }],
    items: buildTrainingCamp({ allChapters: chaptersFor(player, profile), stats: profile.stats, size: player.campSize }),
  };
}

export function chapterById(player, profile, id) {
  return chaptersFor(player, profile).find((c) => c.id === id) || null;
}

export function isUnlocked(player, profile, index) {
  const list = chaptersFor(player, profile);
  if (index === 0 || list[index]?.special) return true;
  return !!profile.chapters[list[index - 1]?.id]?.done;
}

export function totalStars(profile) {
  return Object.values(profile.chapters).reduce((n, c) => n + (c.stars || 0), 0);
}

export function statKey(word) {
  return normalize(word);
}

export function missWord(profile, word, typed, day) {
  recordMiss(profile, statKey(word), typed, day);
}

export function completeWord(profile, word, firstTry, day) {
  finishWord(profile, statKey(word), { firstTry, day });
}

// Called when a round ends. Returns what the results screen should celebrate.
export function finishRound(profile, { chapter, results, mode, day }) {
  const firstTry = results.filter((r) => r.firstTry).length;
  const stars = starsFor(firstTry, results.length);
  const passed = !chapter.passRatio || (results.length > 0 && firstTry / results.length >= chapter.passRatio);
  const newStickers = [];
  const award = (s) => {
    if (s && !profile.stickers.includes(s.id)) { profile.stickers.push(s.id); newStickers.push(s); }
  };

  if (mode === 'chapter') {
    const prev = profile.chapters[chapter.id] || { stars: 0, plays: 0 };
    profile.chapters[chapter.id] = { done: prev.done || passed, stars: passed ? Math.max(prev.stars, stars) : prev.stars, plays: prev.plays + 1, last: day };
    if (passed) award(chapter.sticker);
  } else {
    award(BONUS_STICKERS[1]);
  }
  if (results.length && firstTry === results.length) award(BONUS_STICKERS[0]);

  updateStreak(profile.streak, day);
  if (profile.streak.count >= 3) award(BONUS_STICKERS[3]);
  if (profile.streak.count >= 7) award(BONUS_STICKERS[4]);

  logSession(profile, { day, at: Date.now(), chapterId: chapter.id, title: chapter.title, mode, results });
  return { stars, firstTry, total: results.length, newStickers, passed };
}

export function allStickers(player) {
  return [...player.chapters.map((c) => c.sticker), ...BONUS_STICKERS];
}
