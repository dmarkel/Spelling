import { h } from '../ui/el.js';
import { avatar } from '../ui/avatar.js';
import { chaptersFor, isUnlocked, totalStars, campChapter } from '../game.js';
import { sfx } from '../sfx.js';
import { say } from '../audio.js';
import { LINES } from '../../data/lines.js';

const STEP = 150; // vertical distance between chapter stops

export function render(root, ctx) {
  const { player, profile } = ctx;
  const chapters = chaptersFor(player, profile);
  const current = chapters.findIndex((c, i) => isUnlocked(player, profile, i) && !profile.chapters[c.id]?.done && !c.special);
  const camp = campChapter(player, profile);

  const xs = chapters.map((_, i) => (i % 2 === 0 ? 28 : 72) + (i % 4 === 1 ? 4 : i % 4 === 3 ? -4 : 0));
  const height = chapters.length * STEP + 60;
  const pathD = xs.map((x, i) => {
    const y = 70 + i * STEP;
    if (i === 0) return `M ${x} ${y}`;
    const py = 70 + (i - 1) * STEP;
    return `C ${xs[i - 1]} ${py + STEP / 2}, ${x} ${y - STEP / 2}, ${x} ${y}`;
  }).join(' ');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'map-path');
  svg.setAttribute('viewBox', `0 0 100 ${height}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.innerHTML = `<path d="${pathD}" vector-effect="non-scaling-stroke" class="road"/><path d="${pathD}" vector-effect="non-scaling-stroke" class="road-dash"/>`;

  const nodes = chapters.map((c, i) => {
    const unlocked = isUnlocked(player, profile, i);
    const rec = profile.chapters[c.id];
    const isCurrent = i === current;
    const node = h('div', {
      class: `stop ${xs[i] > 50 ? 'right' : 'left'} ${unlocked ? '' : 'locked'} ${isCurrent ? 'current' : ''} ${rec?.done ? 'done' : ''}`,
      style: { left: `${xs[i]}%`, top: `${70 + i * STEP}px` },
    },
    h('button', {
      class: 'stop-btn',
      'aria-label': `${c.special ? '' : `Chapter ${i + 1}: `}${c.title}${unlocked ? '' : ' (locked)'}`,
      onclick: () => {
        if (!unlocked) { sfx.boop(); say(LINES.locked[0], 'coach'); return; }
        sfx.chime();
        ctx.go('story', { chapterId: c.id, part: 'intro' });
      },
    }, unlocked ? (rec?.done ? c.sticker.emoji : c.special ? c.scene.emoji : String(i + 1)) : '🔒'),
    h('div', { class: 'stop-label' },
      h('div', { class: 'stop-title' }, c.title),
      h('div', { class: 'stop-pattern' }, c.pattern),
      rec?.done ? h('div', { class: 'stars' }, [1, 2, 3].map((n) => h('span', { class: n <= rec.stars ? '' : 'off' }, '⭐'))) : null,
    ),
    isCurrent ? h('div', { class: 'stop-hero' }, avatar(player.id, { pose: 'wave', size: 84 })) : null);
    return node;
  });

  const view = h('section', { class: 'screen map-screen' },
    h('div', { class: 'topbar' },
      h('button', { class: 'btn btn-icon', 'aria-label': 'Switch player', onclick: () => { sfx.back(); ctx.go('select'); } }, '⬅'),
      h('div', { class: 'map-heading' },
        h('div', { class: 'map-kicker' }, `${player.name}'s Quest`),
        h('h1', {}, player.title),
      ),
      h('div', { class: 'spacer' }),
      h('span', { class: 'pill' }, '⭐ ', totalStars(profile)),
      profile.streak.count ? h('span', { class: 'pill' }, '🔥 ', profile.streak.count) : null,
    ),
    h('div', { class: 'map-actions' },
      h('button', {
        class: 'btn btn-gold',
        onclick: () => {
          if (!camp.items.length) { sfx.boop(); say(LINES.campEmpty[0], 'coach'); return; }
          sfx.chime();
          ctx.go('challenge', { mode: 'camp' });
        },
      }, '🏋️ Training Camp', camp.items.length ? h('span', { class: 'count' }, camp.items.length) : null),
      h('button', { class: 'btn', onclick: () => { sfx.click(); ctx.go('stickers'); } }, '📒 Sticker Book ', h('span', { class: 'count' }, profile.stickers.length)),
    ),
    h('div', { class: 'map', style: { height: `${height}px` } }, svg, nodes),
  );
  root.append(view);

  // Bring the current chapter into view.
  const cur = view.querySelector('.stop.current');
  if (cur) setTimeout(() => cur.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
}
