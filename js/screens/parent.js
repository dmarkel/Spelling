// Grown-ups area: PIN gate, progress dashboard, teacher's list, backup.
import { h, clear } from '../ui/el.js';
import { avatar } from '../ui/avatar.js';
import { PLAYERS, chaptersFor } from '../game.js';
import { summary, dayKey, isMastered } from '../engine/progress.js';
import { normalize } from '../engine/compare.js';
import { sfx } from '../sfx.js';

let unlockedThisVisit = false;
export function unlockForScreenshots() { if (location.hostname === 'localhost') unlockedThisVisit = true; }

export function render(root, ctx, params = {}) {
  const view = h('section', { class: 'screen parent-screen' });
  root.append(view);
  if (unlockedThisVisit) dashboard(view, ctx, params.kid || 'emma');
  else pinGate(view, ctx);
  // Leaving the grown-up area locks it again.
  return () => { unlockedThisVisit = false; };
}

// ---------- PIN ----------
function pinGate(view, ctx) {
  const data = ctx.data;
  const setting = !data.pin;
  let first = null;
  let entry = '';
  const dotsEl = h('div', { class: 'pin-dots' });
  const msg = h('p', { class: 'pin-msg' }, setting ? 'Create a 4-digit grown-up PIN' : 'Enter the grown-up PIN');

  const draw = () => {
    clear(dotsEl).append([0, 1, 2, 3].map((i) => h('span', { class: `pin-dot ${i < entry.length ? 'on' : ''}` })));
  };
  const press = (d) => {
    sfx.click();
    if (d === 'del') { entry = entry.slice(0, -1); draw(); return; }
    if (entry.length >= 4) return;
    entry += d;
    draw();
    if (entry.length < 4) return;
    setTimeout(() => {
      if (setting && first === null) { first = entry; entry = ''; msg.textContent = 'Type it again to confirm'; draw(); return; }
      if (setting) {
        if (entry === first) { data.pin = entry; ctx.save(); unlock(); } else { first = null; entry = ''; msg.textContent = "Those didn't match. Create a PIN"; sfx.boop(); draw(); }
        return;
      }
      if (entry === data.pin) unlock();
      else { entry = ''; msg.textContent = 'Wrong PIN. Try again'; sfx.boop(); dotsEl.classList.add('shake'); setTimeout(() => dotsEl.classList.remove('shake'), 500); draw(); }
    }, 150);
  };
  const unlock = () => { unlockedThisVisit = true; sfx.chime(); clear(view); dashboard(view, ctx, 'emma'); };

  view.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'btn btn-icon', 'aria-label': 'Back', onclick: () => { sfx.back(); ctx.go('select'); } }, '⬅'),
      h('h1', {}, '🔒 Grown-ups')),
    h('div', { class: 'pin-card card' },
      msg, dotsEl,
      h('div', { class: 'pin-pad' },
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((d) => (d
          ? h('button', { class: 'key pin-key', 'aria-label': d === 'del' ? 'Delete' : d, onclick: () => press(d) }, d === 'del' ? '⌫' : d)
          : h('span', {})))),
      setting ? h('p', { class: 'fine' }, 'The PIN keeps kids out of the grown-up area. It is saved only on this device.') : null));
  draw();
}

// ---------- dashboard ----------
function dashboard(view, ctx, kid) {
  const data = ctx.data;
  const player = PLAYERS[kid];
  const profile = data.players[kid];
  const today = dayKey();
  const s = summary(profile, today);
  const chapters = chaptersFor(player, profile).filter((c) => !c.special);
  const done = chapters.filter((c) => profile.chapters[c.id]?.done).length;
  const rerender = (k = kid) => { clear(view); dashboard(view, ctx, k); };

  const tabs = h('div', { class: 'tabs' }, Object.values(PLAYERS).map((p) => h('button', {
    class: `tab ${p.id === kid ? 'active' : ''}`,
    onclick: () => { sfx.click(); rerender(p.id); },
  }, avatar(p.id, { size: 36 }), p.name)));

  const statCard = (label, value, note) => h('div', { class: 'stat card' },
    h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-label' }, label), note ? h('div', { class: 'stat-note' }, note) : null);

  view.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'btn btn-icon', 'aria-label': 'Back', onclick: () => { sfx.back(); ctx.go('select'); } }, '⬅'),
      h('h1', {}, 'Progress'),
      h('div', { class: 'spacer' }),
      tabs),
    h('div', { class: 'dash' },
      h('div', { class: 'stat-row' },
        statCard('First-try accuracy', s.accuracy == null ? '—' : `${s.accuracy}%`, 'all rounds'),
        statCard('Words mastered', s.mastered, 'right, unhelped, on 3 different days'),
        statCard('Still learning', s.learning),
        statCard('Chapters done', `${done}/${chapters.length}`),
        statCard('Day streak', profile.streak.count || 0, profile.streak.last ? `last played ${profile.streak.last}` : 'not played yet')),
      panel('Last 14 days', chart(s.byDay), h('div', { class: 'legend' },
        h('span', {}, h('i', { class: 'sw sw-total' }), 'words practiced'),
        h('span', {}, h('i', { class: 'sw sw-good' }), 'right on the first try'))),
      panel(`Trouble words (${s.trouble.length})`, troubleTable(s.trouble),
        h('p', { class: 'fine' }, 'Level 1 = just missed; words climb to level 5 as they are spelled right without help. Missed words come back in the next rounds and in Training Camp.')),
      panel('Chapters', chapterList(player, profile, chapters)),
      panel('Recent rounds', sessionList(profile)),
      panel("Teacher's list", teacherList(ctx, profile, rerender)),
      panel('Backup & settings', settings(ctx, kid, rerender))));
}

function panel(title, ...content) {
  return h('section', { class: 'panel card' }, h('h2', {}, title), ...content);
}

function chart(byDay) {
  const max = Math.max(5, ...byDay.map((d) => d.total));
  const W = 700; const H = 180; const bw = W / byDay.length;
  const bars = byDay.map((d, i) => {
    const x = i * bw + 6; const w = bw - 12;
    const th = (d.total / max) * (H - 44); const gh = (d.firstTry / max) * (H - 44);
    const label = d.day.slice(5).replace('-', '/');
    return `<g><title>${label}: ${d.firstTry} of ${d.total} first try</title>
      <rect x="${x}" y="${H - 20 - th}" width="${w}" height="${th}" rx="5" class="bar-total"/>
      <rect x="${x}" y="${H - 20 - gh}" width="${w}" height="${gh}" rx="5" class="bar-good"/>
      ${d.total ? `<text x="${x + w / 2}" y="${H - 24 - th}" class="bar-num">${d.total}</text>` : ''}
      <text x="${x + w / 2}" y="${H - 4}" class="bar-day">${i % 2 === 1 || i === byDay.length - 1 ? label : ''}</text></g>`;
  }).join('');
  return h('div', { class: 'chart', html: `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Words practiced per day">${bars}</svg>` });
}

function troubleTable(trouble) {
  if (!trouble.length) return h('p', { class: 'empty' }, 'No trouble words yet. 🎉');
  return h('table', { class: 'table' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Word'), h('th', {}, 'Missed'), h('th', {}, 'What they typed'), h('th', {}, 'Level'))),
    h('tbody', {}, trouble.map((t) => h('tr', {},
      h('td', { class: 'word-cell' }, t.word),
      h('td', {}, t.misses),
      h('td', {}, h('div', { class: 'typed-list' }, [...new Set(t.typed)].slice(-6).map((x) => h('span', { class: 'typed' }, x)))),
      h('td', {}, h('span', { class: `level l${t.box}` }, t.box))))));
}

function chapterList(player, profile, chapters) {
  return h('div', { class: 'chapter-list' }, chapters.map((c, i) => {
    const rec = profile.chapters[c.id];
    const words = c.words.map((w) => {
      const st = profile.stats[normalize(w.word)];
      const cls = !st ? 'unseen' : isMastered(st) ? 'mastered' : st.misses ? 'trouble' : 'learning';
      return h('span', { class: `wchip ${cls}` }, w.word);
    });
    return h('div', { class: 'chapter-row' },
      h('div', { class: 'chapter-name' }, `${i + 1}. ${c.title}`, h('span', { class: 'muted' }, ` · ${c.pattern}`)),
      h('div', { class: 'chapter-meta' }, rec?.done ? `${'⭐'.repeat(rec.stars)} · played ${rec.plays}×` : 'not finished'),
      h('div', { class: 'wchips' }, words));
  }), h('div', { class: 'legend' },
    h('span', {}, h('i', { class: 'sw wchip mastered' }), 'mastered'),
    h('span', {}, h('i', { class: 'sw wchip learning' }), 'learning'),
    h('span', {}, h('i', { class: 'sw wchip trouble' }), 'has been missed'),
    h('span', {}, h('i', { class: 'sw wchip unseen' }), 'not seen yet')));
}

function sessionList(profile) {
  const recent = profile.sessions.slice(-12).reverse();
  if (!recent.length) return h('p', { class: 'empty' }, 'No rounds played yet.');
  return h('div', { class: 'sessions' }, recent.map((s) => {
    const first = s.results.filter((r) => r.firstTry).length;
    const missed = s.results.filter((r) => !r.firstTry);
    const when = s.at ? new Date(s.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : s.day;
    return h('div', { class: 'session' },
      h('div', { class: 'session-head' }, h('strong', {}, s.title), h('span', { class: 'muted' }, when), h('span', { class: 'score-pill' }, `${first}/${s.results.length}`)),
      missed.length ? h('div', { class: 'session-missed' }, missed.map((r) => h('span', { class: 'miss' },
        h('b', {}, r.word), r.typed.length ? ` ← ${r.typed.join(', ')}` : ''))) : h('div', { class: 'muted' }, 'All first try! 🌟'));
  }));
}

function teacherList(ctx, profile, rerender) {
  const wordIn = h('input', { class: 'input', placeholder: 'word (e.g. because)', autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false' });
  const sentIn = h('input', { class: 'input', placeholder: 'example sentence (optional)', autocomplete: 'off' });
  const err = h('p', { class: 'error' });
  const add = () => {
    const word = wordIn.value.trim().replace(/[‘’]/g, "'");
    const sentence = sentIn.value.trim();
    if (!/^[a-zA-Z' -]{1,20}$/.test(word)) { err.textContent = 'Use letters only (apostrophes are OK).'; return; }
    if (profile.custom.some((c) => normalize(c.word) === normalize(word))) { err.textContent = 'That word is already on the list.'; return; }
    profile.custom.push({ word, sentence });
    ctx.save();
    sfx.chime();
    rerender();
  };
  return h('div', {},
    h('p', { class: 'fine' }, "Words added here appear as a \"Teacher's List\" stop on this child's map. They use the iPad's built-in voice until the voice files are regenerated."),
    h('div', { class: 'add-row' }, wordIn, sentIn, h('button', { class: 'btn btn-primary', onclick: add }, 'Add')),
    err,
    profile.custom.length
      ? h('div', { class: 'wchips' }, profile.custom.map((c, i) => h('span', { class: 'wchip removable' }, c.word,
        h('button', { class: 'x', 'aria-label': `Remove ${c.word}`, onclick: () => { profile.custom.splice(i, 1); ctx.save(); rerender(); } }, '✕'))))
      : h('p', { class: 'empty' }, 'No custom words yet.'));
}

function settings(ctx, kid, rerender) {
  const fileIn = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  const note = h('p', { class: 'fine' });
  fileIn.addEventListener('change', async () => {
    const f = fileIn.files?.[0];
    if (!f) return;
    try { ctx.store.importJSON(await f.text()); note.textContent = 'Backup restored.'; rerender(); } catch (e) { note.textContent = e.message || 'Could not read that file.'; }
  });
  const exportData = () => {
    const blob = new Blob([ctx.store.exportJSON()], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `spelling-quest-backup-${dayKey()}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const name = PLAYERS[kid].name;
  return h('div', {},
    h('div', { class: 'settings-row' },
      h('button', { class: 'btn', onclick: exportData }, '⬇️ Export backup'),
      h('button', { class: 'btn', onclick: () => fileIn.click() }, '⬆️ Import backup'), fileIn,
      h('button', { class: 'btn', onclick: () => { ctx.data.pin = null; ctx.save(); unlockedThisVisit = false; ctx.go('parent'); } }, '🔑 Change PIN'),
      h('button', {
        class: 'btn danger',
        onclick: () => { if (confirm(`Erase all of ${name}'s progress on this iPad? This cannot be undone.`)) { ctx.store.reset(kid); rerender(); } },
      }, `🗑️ Reset ${name}`)),
    note,
    ctx.store.recovered ? h('p', { class: 'error' }, 'Saved progress on this device was unreadable, so the game started fresh. Import a backup to restore it.') : null,
    h('p', { class: 'fine' }, 'Progress is saved only in this browser on this device. Export a backup now and then.'));
}
