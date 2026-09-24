// Collects every line the game can speak, so each gets a pre-generated mp3.
import emma from '../../data/emma.js';
import parker from '../../data/parker.js';
import { LINES, CHEERS } from '../../data/lines.js';
import { customChapter, campChapter } from '../../js/game.js';
import { emptyProfile } from '../../js/engine/progress.js';
import { spellOut } from '../../js/engine/coach.js';

// kind: 'line' (dialogue), 'word' (a single spelling word), 'letters' (spelled out letter by letter)
export function collectLines() {
  const out = new Map();
  const add = (who, text, kind = 'line') => {
    if (!text) return;
    const key = `${who}|${text}`;
    if (!out.has(key)) out.set(key, { who, text, kind });
  };

  for (const p of [emma, parker]) {
    const fake = { ...emptyProfile(), custom: [{ word: 'x' }] };
    const specials = [customChapter(p, fake), campChapter(p, emptyProfile())];
    for (const ch of [...p.chapters, ...specials]) {
      for (const part of ['intro', 'outro', 'hit', 'miss']) for (const l of ch[part] || []) add(l.who, l.text);
      add('coach', ch.tip);
      for (const w of ch.words || []) {
        add('coach', w.word, 'word');
        add('coach', w.sentence);
        add('coach', spellOut(w.word), 'letters');
        add('coach', w.tip);
        add('coach', w.mnemonic);
      }
    }
  }
  for (const list of Object.values(LINES)) for (const text of list) add('coach', text);
  for (const list of Object.values(CHEERS)) for (const l of list) add(l.who, l.text);
  return [...out.values()];
}
