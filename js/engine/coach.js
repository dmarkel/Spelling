// Coaching ladder for a missed word: spot it → fill it → look, say, cover, write.
import { normalize } from './compare.js';

export function coachStep(misses) {
  if (misses <= 1) return 'spot';
  if (misses === 2) return 'fill';
  return 'cover';
}

export function tipFor(entry, chapter) {
  return entry.tip || chapter?.tip || '';
}

export function lettersOf(word) {
  return [...normalize(word)];
}

export function spellOut(word) {
  return lettersOf(word)
    .map((ch) => (ch === "'" ? 'apostrophe' : ch === ' ' ? 'space' : ch.toUpperCase()))
    .join('. ') + '.';
}
