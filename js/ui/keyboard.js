// Big on-screen letter keys (plus hardware keyboard support).
import { h } from './el.js';
import { sfx } from '../sfx.js';

const ROWS = ['qwertyuiop', 'asdfghjkl', "zxcvbnm'"];

export function keyboard({ onKey, onBackspace, onEnter }) {
  const keys = new Map();
  const press = (ch) => {
    sfx.click();
    const k = keys.get(ch);
    if (k) { k.classList.add('pressed'); setTimeout(() => k.classList.remove('pressed'), 120); }
    onKey(ch);
  };
  const node = h('div', { class: 'keyboard', role: 'group', 'aria-label': 'Letter keys' },
    ROWS.map((row) => h('div', { class: 'key-row' },
      [...row].map((ch) => {
        const k = h('button', {
          class: `key ${ch === "'" ? 'key-apos' : ''}`,
          'aria-label': ch === "'" ? 'apostrophe' : ch,
          onpointerdown: (e) => { e.preventDefault(); press(ch); },
        }, ch);
        keys.set(ch, k);
        return k;
      }))),
    h('div', { class: 'key-row' },
      h('button', {
        class: 'key key-wide key-back', 'aria-label': 'Delete letter',
        onpointerdown: (e) => { e.preventDefault(); sfx.back(); onBackspace(); },
      }, '⌫'),
      h('button', {
        class: 'key key-wide key-check', 'aria-label': 'Check my spelling',
        onpointerdown: (e) => { e.preventDefault(); onEnter(); },
      }, 'Check ✓'),
    ));

  const onDoc = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.('input, textarea')) return;
    if (/^[a-z']$/i.test(e.key) || e.key === '’') { e.preventDefault(); press(e.key === '’' ? "'" : e.key.toLowerCase()); }
    else if (e.key === 'Backspace') { e.preventDefault(); sfx.back(); onBackspace(); }
    else if (e.key === 'Enter') { e.preventDefault(); onEnter(); }
  };
  document.addEventListener('keydown', onDoc);

  return {
    node,
    setDisabled(v) { node.classList.toggle('disabled', v); },
    destroy() { document.removeEventListener('keydown', onDoc); },
  };
}
