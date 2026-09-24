// Chooses which words a round contains.
import { isMastered } from './progress.js';

function shuffle(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function allEntries(allChapters) {
  return allChapters.flatMap((c) => c.words.map((entry) => ({ entry, chapterId: c.id })));
}

const byTrouble = (stats) => (x, y) => {
  const a = stats[x.entry.word];
  const b = stats[y.entry.word];
  return a.box - b.box || b.misses - a.misses;
};

// Every word of the chapter, plus a few trouble words from other chapters.
export function buildChallenge({ chapter, allChapters, stats, reviewSlots = 0, rand = Math.random }) {
  const own = new Set(chapter.words.map((e) => e.word));
  const round = shuffle(chapter.words.map((entry) => ({ entry, chapterId: chapter.id, review: false })), rand);

  const seen = new Set(own);
  const review = allEntries(allChapters)
    .filter(({ entry, chapterId }) => chapterId !== chapter.id && stats[entry.word]?.box <= 2 && !isMastered(stats[entry.word]))
    .sort(byTrouble(stats))
    .filter(({ entry }) => (seen.has(entry.word) ? false : seen.add(entry.word)))
    .slice(0, reviewSlots);

  // Spread review words through the round rather than bunching them at the start.
  review.forEach((r, i) => {
    const at = Math.min(round.length, 2 + i * 3);
    round.splice(at, 0, { ...r, review: true });
  });
  return round;
}

// A practice round of words the child has seen but not mastered, worst first.
export function buildTrainingCamp({ allChapters, stats, size }) {
  const seen = new Set();
  return allEntries(allChapters)
    .filter(({ entry }) => stats[entry.word] && !isMastered(stats[entry.word]))
    .filter(({ entry }) => (seen.has(entry.word) ? false : seen.add(entry.word)))
    .sort(byTrouble(stats))
    .slice(0, size)
    .map((r) => ({ ...r, review: true }));
}
