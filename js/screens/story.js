// Comic-style story scene: voiced lines, one speech bubble at a time.
import { h, clear, wait } from '../ui/el.js';
import { avatar, setPose } from '../ui/avatar.js';
import { chapterById } from '../game.js';
import { imageUrl } from '../assets.js';
import { say, stop, preload } from '../audio.js';
import { splitDirection } from '../engine/text.js';
import { SPEAKERS } from '../../data/voices.js';
import { sfx } from '../sfx.js';

const OFFSTAGE = new Set(['narrator', 'coach']);

export function render(root, ctx, { chapterId, part = 'intro', outcome }) {
  const { player, profile } = ctx;
  const chapter = chapterById(player, profile, chapterId);
  if (!chapter) { ctx.go('map'); return; }
  // A chapter with a pass mark has a different ending when the case is lost.
  const lost = part === 'outro' && outcome && outcome.passed === false && chapter.outroFail;
  const lines = (lost ? chapter.outroFail : chapter[part]) || [];
  preload(lines);

  const next = () => (part === 'intro'
    ? ctx.go('challenge', { mode: 'chapter', chapterId })
    : ctx.go('results', { chapterId, outcome }));
  if (!lines.length) { next(); return; }

  // Cast: the hero on the left, everyone else who speaks (or is listed) on the right.
  const others = [...new Set([...(chapter.cast || []), ...lines.map((l) => l.who)])]
    .filter((w) => !OFFSTAGE.has(w) && w !== player.id);
  const cast = [player.id, ...others].slice(0, 5);
  const onstage = new Set([player.id, ...(chapter.cast || [])]);
  const actors = new Map(cast.map((who) => [who, h('div', { class: `actor ${onstage.has(who) || part === 'intro' ? '' : 'offstage'}`, dataset: { who } }, avatar(who, { pose: 'wave', size: 300 }))]));

  const bg = imageUrl(chapter.scene?.img);
  const [c1, c2] = chapter.scene?.colors || ['#fff', '#eee'];
  const stage = h('div', { class: 'stage-actors', style: { '--n': cast.length } }, [...actors.values()]);
  const bubbleSlot = h('div', { class: 'bubble-slot' });
  const nextBtn = h('button', { class: 'btn btn-primary btn-big next-btn', 'aria-label': 'Next' }, '▶');

  const flashEl = h('div', { class: 'lightning', 'aria-hidden': 'true' });
  const view = h('section', {
    class: 'screen story-screen',
    style: { '--c1': c1, '--c2': c2, backgroundImage: bg ? `url(${bg})` : '' },
  },
  flashEl,
  bg ? null : h('div', { class: 'scene-emoji', 'aria-hidden': 'true' }, chapter.scene?.emoji || '📖'),
  h('div', { class: 'story-top' },
    h('button', { class: 'btn btn-icon btn-ghost', 'aria-label': 'Back to map', onclick: () => { sfx.back(); ctx.go('map'); } }, '✕'),
    h('div', { class: 'story-title card' },
      h('div', { class: 'kicker' }, part === 'intro' ? chapter.pattern : 'The End'),
      h('div', {}, chapter.title)),
    h('div', { class: 'spacer' }),
    h('button', { class: 'btn btn-ghost', onclick: () => { stop(); done = true; next(); } }, 'Skip ⏭'),
  ),
  stage,
  h('div', { class: 'story-bottom' }, bubbleSlot, nextBtn));
  root.append(view);

  let i = -1;
  let done = false;
  let advanceTimer = null;

  async function show(n) {
    clearTimeout(advanceTimer);
    if (n >= lines.length) { done = true; next(); return; }
    i = n;
    const line = lines[n];
    const s = SPEAKERS[line.who] || SPEAKERS.narrator;
    const { direction, spoken } = splitDirection(line.text);

    // Optional per-line staging: a new backdrop, a new expression, a special effect.
    const sceneUrl = line.scene && imageUrl(line.scene);
    if (sceneUrl) view.style.backgroundImage = `url(${sceneUrl})`;
    for (const who of line.exit || []) actors.get(who)?.classList.add('offstage');
    if (line.pose) setPose(actors.get(line.who)?.querySelector('.avatar'), line.pose);
    if (line.fx === 'lightning') { sfx.thunder(); flashEl.classList.remove('go'); void flashEl.offsetWidth; flashEl.classList.add('go'); }

    // Characters who aren't part of the opening cast walk on when they first speak.
    const entering = actors.get(line.who);
    if (entering?.classList.contains('offstage')) { entering.classList.remove('offstage'); entering.classList.add('enter'); }
    for (const [who, el] of actors) {
      el.classList.toggle('speaking', who === line.who);
      el.classList.toggle('quiet', !OFFSTAGE.has(line.who) && who !== line.who);
    }
    clear(bubbleSlot).append(h('div', {
      class: `bubble ${OFFSTAGE.has(line.who) ? 'narration' : ''}`,
      style: { '--who': s.color },
    },
    OFFSTAGE.has(line.who) ? null : h('span', { class: 'who', style: { background: s.color } }, s.name),
    direction ? h('span', { class: 'direction' }, `(${direction})`) : null,
    spoken));
    nextBtn.classList.remove('ready');

    const started = Date.now();
    const finished = await say(line.text, line.who);
    if (done || i !== n) return;
    nextBtn.classList.add('ready');
    if (finished) {
      const minRead = spoken.length * 45;
      const extra = Math.max(700, minRead - (Date.now() - started));
      advanceTimer = setTimeout(() => { if (!done && i === n) show(n + 1); }, extra);
    }
  }

  const advance = () => { if (done) return; sfx.click(); stop(); show(i + 1); };
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); advance(); });
  stage.addEventListener('click', advance);
  bubbleSlot.addEventListener('click', advance);

  wait(350).then(() => show(0));
  return () => { done = true; clearTimeout(advanceTimer); };
}
