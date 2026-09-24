import { h } from '../ui/el.js';
import { allStickers } from '../game.js';
import { sfx } from '../sfx.js';

export function render(root, ctx) {
  const { player, profile } = ctx;
  const stickers = allStickers(player);
  const have = new Set(profile.stickers);

  root.append(h('section', { class: 'screen stickers-screen' },
    h('div', { class: 'topbar' },
      h('button', { class: 'btn btn-icon', 'aria-label': 'Back to map', onclick: () => { sfx.back(); ctx.go('map'); } }, '⬅'),
      h('h1', {}, `${player.name}'s Sticker Book`),
      h('div', { class: 'spacer' }),
      h('span', { class: 'pill' }, `${stickers.filter((s) => have.has(s.id)).length} / ${stickers.length}`)),
    h('div', { class: 'sticker-grid card' }, stickers.map((s, i) => {
      const earned = have.has(s.id);
      return h('button', {
        class: `sticker ${earned ? 'earned' : 'missing'}`,
        style: { '--tilt': `${((i * 37) % 9) - 4}deg` },
        onclick: () => (earned ? sfx.sparkle() : sfx.boop()),
      },
      h('div', { class: 'sticker-emoji' }, earned ? s.emoji : '❔'),
      h('div', { class: 'sticker-name' }, earned ? s.name : '???'));
    }))));
}
