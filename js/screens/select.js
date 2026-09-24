import { h } from '../ui/el.js';
import { avatar } from '../ui/avatar.js';
import { PLAYERS, totalStars } from '../game.js';
import { sfx } from '../sfx.js';
import { say } from '../audio.js';
import { LINES } from '../../data/lines.js';

export function render(root, ctx) {
  ctx.setPlayer(null);
  const data = ctx.data;

  const card = (id) => {
    const p = PLAYERS[id];
    const prof = data.players[id];
    return h('button', {
      class: `hero-card card hero-${id}`,
      'aria-label': `Play as ${p.name}`,
      onclick: () => {
        sfx.chime();
        ctx.setPlayer(id);
        ctx.go('map');
      },
    },
    id === 'justin' ? h('span', { class: 'hero-grownup' }, 'Grown-up mode') : null,
    h('div', { class: 'hero-art bob' }, avatar(id, { pose: 'wave', size: 220 })),
    h('div', { class: 'hero-name' }, p.name),
    h('div', { class: 'hero-quest' }, p.title),
    h('div', { class: 'hero-stats' },
      h('span', { class: 'pill' }, '⭐ ', totalStars(prof)),
      prof.streak.count > 1 ? h('span', { class: 'pill' }, '🔥 ', prof.streak.count) : null,
    ));
  };

  root.append(h('section', { class: 'screen select-screen' },
    h('header', { class: 'select-title' },
      h('h1', { class: 'logo' }, h('span', { class: 'logo-a' }, 'Spelling'), ' ', h('span', { class: 'logo-b' }, 'Quest')),
      h('p', { class: 'tagline' }, 'Who is playing today?'),
    ),
    h('div', { class: 'hero-row' }, Object.keys(PLAYERS).map(card)),
    h('button', {
      class: 'btn btn-ghost parent-link',
      onclick: () => { sfx.click(); ctx.go('parent'); },
    }, '🔒 Grown-ups'),
  ));

  const hello = () => say(LINES.welcome[0], 'coach');
  document.addEventListener('pointerdown', hello, { once: true });
  return () => document.removeEventListener('pointerdown', hello);
}
