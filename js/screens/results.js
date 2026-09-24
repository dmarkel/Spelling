import { h, wait } from '../ui/el.js';
import { avatar } from '../ui/avatar.js';
import { confetti } from '../ui/confetti.js';
import { chaptersFor, chapterById, isUnlocked } from '../game.js';
import { say } from '../audio.js';
import { sfx } from '../sfx.js';
import { pick } from '../engine/text.js';
import { CHEERS } from '../../data/lines.js';
import { SPEAKERS } from '../../data/voices.js';

export function render(root, ctx, { chapterId, outcome, mode = 'chapter' }) {
  const { player, profile } = ctx;
  if (!outcome) { ctx.go('map'); return; }
  const chapter = mode === 'camp' ? null : chapterById(player, profile, chapterId);
  const list = chaptersFor(player, profile);
  const at = chapter ? list.findIndex((c) => c.id === chapter.id) : -1;
  const nextChapter = at >= 0 && list[at + 1] && isUnlocked(player, profile, at + 1) && !list[at + 1].special ? list[at + 1] : null;
  const session = profile.sessions.at(-1);
  const cheer = pick(CHEERS[player.id]);
  let alive = true;

  const starEls = [1, 2, 3].map(() => h('span', { class: 'big-star off' }, '⭐'));
  const view = h('section', { class: 'screen results-screen' },
    h('div', { class: 'results-card card' },
      h('div', { class: 'kicker' }, chapter ? chapter.title : 'Training Camp'),
      h('h1', {}, chapter ? 'Chapter Complete!' : 'Training Complete!'),
      h('div', { class: 'big-stars' }, starEls),
      h('p', { class: 'score' }, `${outcome.firstTry} of ${outcome.total} on the first try`),
      h('div', { class: 'word-chips' }, (session?.results || []).map((r) => h('span', {
        class: `chip ${r.firstTry ? 'good' : 'helped'}`,
        title: r.firstTry ? 'First try!' : `Took ${r.tries} tries`,
      }, r.firstTry ? '✓ ' : '💪 ', r.word))),
      outcome.newStickers.length ? h('div', { class: 'new-stickers' },
        h('div', { class: 'kicker' }, outcome.newStickers.length > 1 ? 'New stickers!' : 'New sticker!'),
        h('div', { class: 'sticker-row' }, outcome.newStickers.map((s, i) => h('div', { class: 'sticker earned pop-in', style: { animationDelay: `${1.2 + i * 0.3}s` } },
          h('div', { class: 'sticker-emoji' }, s.emoji), h('div', { class: 'sticker-name' }, s.name))))) : null,
      h('div', { class: 'results-actions' },
        nextChapter ? h('button', { class: 'btn btn-primary btn-big', onclick: () => { sfx.chime(); ctx.go('story', { chapterId: nextChapter.id, part: 'intro' }); } }, 'Next chapter ▶') : null,
        chapter ? h('button', { class: 'btn', onclick: () => { sfx.click(); ctx.go('challenge', { mode: 'chapter', chapterId: chapter.id }); } }, '🔁 Play again') : null,
        h('button', { class: nextChapter ? 'btn' : 'btn btn-primary btn-big', onclick: () => { sfx.click(); ctx.go('map'); } }, '🗺️ Map'))),
    h('div', { class: 'sibling-cheer' },
      avatar(player.sibling, { pose: 'cheer', size: 170, className: 'bob' }),
      h('div', { class: 'bubble', style: { '--who': SPEAKERS[cheer.who].color } },
        h('span', { class: 'who', style: { background: SPEAKERS[cheer.who].color } }, SPEAKERS[cheer.who].name),
        cheer.text)));
  root.append(view);

  (async () => {
    for (let i = 0; i < outcome.stars; i++) {
      await wait(350);
      if (!alive) return;
      starEls[i].classList.remove('off');
      starEls[i].classList.add('pop-in');
      sfx.ding();
    }
    if (outcome.stars === 3) confetti({ count: 160, y: 0.3 });
    if (outcome.newStickers.length) { await wait(500); sfx.sparkle(); }
    await wait(300);
    if (alive) say(cheer.text, cheer.who);
  })();

  return () => { alive = false; };
}
