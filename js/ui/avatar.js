// A character picture: generated cartoon art if present, otherwise an emoji badge.
import { h } from './el.js';
import { imageUrl } from '../assets.js';
import { SPEAKERS } from '../../data/voices.js';

const EMOJI = {
  emma: '👧🏻', parker: '👦🏻', maya: '👧🏽', leo: '👦🏼', rivera: '👩🏽‍🏫', grizzle: '👺', sparky: '🐲',
  slime: '🟢', shadowbeard: '🏴‍☠️', ghost: '👻', troll: '🧌', giant: '⛈️', robot: '🤖', batty: '🦇',
  dragon: '🐉', narrator: '📖', coach: '🦉',
};

export function avatar(who, { pose = 'wave', size = 120, className = '' } = {}) {
  const src = imageUrl(`${who}-${pose}`) || imageUrl(`${who}-wave`) || imageUrl(who);
  const wrap = h('div', {
    class: `avatar ${className}`,
    style: { width: `${size}px`, height: `${size}px`, '--size': `${size}px`, '--badge': `${SPEAKERS[who]?.color || '#b49cff'}55` },
    dataset: { who },
  });
  if (src) wrap.append(h('img', { src, alt: SPEAKERS[who]?.name || who, draggable: 'false' }));
  else wrap.append(h('div', { class: 'emoji-badge', role: 'img', 'aria-label': SPEAKERS[who]?.name || who }, EMOJI[who] || '⭐'));
  return wrap;
}

// Swap pose in place (e.g. think → cheer) without rebuilding layout.
export function setPose(node, pose) {
  if (!node) return;
  const who = node.dataset.who;
  const src = imageUrl(`${who}-${pose}`);
  const img = node.querySelector('img');
  if (src && img) img.src = src;
}
