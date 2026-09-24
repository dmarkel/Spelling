// The spelling challenge: hear a word, spell it, get coached on misses.
import { h, clear, wait, flash } from '../ui/el.js';
import { avatar, setPose } from '../ui/avatar.js';
import { keyboard } from '../ui/keyboard.js';
import { confetti } from '../ui/confetti.js';
import { chapterById, chaptersFor, campChapter, missWord, completeWord, finishRound } from '../game.js';
import { buildChallenge } from '../engine/scheduler.js';
import { check, attemptView, hintMask } from '../engine/compare.js';
import { coachStep, tipFor, spellOut, lettersOf } from '../engine/coach.js';
import { dayKey } from '../engine/progress.js';
import { pick } from '../engine/text.js';
import { say, stop, sequence, preload } from '../audio.js';
import { sfx } from '../sfx.js';
import { LINES } from '../../data/lines.js';
import { SPEAKERS } from '../../data/voices.js';

const COPY_AFTER = 5; // after this many misses the word stays visible while typing

export function render(root, ctx, { mode = 'chapter', chapterId }) {
  const { player, profile } = ctx;
  const all = chaptersFor(player, profile);
  const chapter = mode === 'camp' ? campChapter(player, profile) : chapterById(player, profile, chapterId);
  if (!chapter) { ctx.go('map'); return; }
  const items = mode === 'camp'
    ? chapter.items
    : buildChallenge({ chapter, allChapters: all, stats: profile.stats, reviewSlots: player.reviewSlots });
  if (!items.length) { ctx.go('map'); return; }
  const chapterOf = (id) => all.find((c) => c.id === id) || chapter;
  const day = dayKey();
  const hp = chapter.meter?.kind === 'hp';

  // ---------- state ----------
  let idx = 0;
  let solved = 0;
  const results = [];
  let st = null; // per-word state
  let seq = null;
  let busy = false;
  let alive = true;

  // ---------- layout ----------
  const meterFill = h('div', { class: 'meter-fill' });
  const dots = h('div', { class: 'dots' }, items.map(() => h('span', { class: 'dot' })));
  const meterLabel = (hp && chapter.villain ? SPEAKERS[chapter.villain.who]?.name : chapter.meter?.label) || chapter.title;
  const villain = chapter.villain
    ? avatar(chapter.villain.who, { size: 170, className: 'villain' })
    : h('div', { class: 'villain scene-badge' }, chapter.scene?.emoji || '⭐');
  const villainSays = h('div', { class: 'villain-says' });
  const hero = avatar(player.id, { pose: 'think', size: 150, className: 'hero' });
  const heroSays = h('div', { class: 'hero-says' });
  const reviewTag = h('div', { class: 'review-tag' }, '🔁 Review word');
  const coachPanel = h('div', { class: 'coach-panel', hidden: true });
  const hint = h('p', { class: 'ch-hint' }, 'Listen, then spell the word you hear.');
  const answer = h('div', { class: 'answer', 'aria-live': 'polite' });
  const praise = h('div', { class: 'praise' });
  const readyBtn = h('button', { class: 'btn btn-good btn-big ready-btn', hidden: true, onclick: () => hideWord() }, "I'm ready! Hide it 🙈");

  const kb = keyboard({ onKey: typeKey, onBackspace: backspace, onEnter: submit });

  const view = h('section', { class: `screen challenge-screen ${hp ? 'meter-hp' : 'meter-fillup'}` },
    h('div', { class: 'ch-top' },
      h('button', { class: 'btn btn-icon', 'aria-label': 'Back to map', onclick: () => { sfx.back(); ctx.go('map'); } }, '✕'),
      h('div', { class: 'meter card' },
        h('div', { class: 'meter-label' }, h('span', {}, chapter.meter?.icon || '⭐'), ' ', meterLabel),
        h('div', { class: 'meter-track' }, meterFill)),
      dots),
    h('div', { class: 'ch-stage' },
      h('div', { class: 'ch-villain' }, villain, villainSays),
      h('div', { class: 'ch-hero' }, hero, heroSays)),
    h('div', { class: 'ch-card card' },
      reviewTag,
      h('div', { class: 'ch-listen' },
        h('button', { class: 'btn btn-primary listen-btn', onclick: () => { sfx.click(); speakWord(); } }, '🔊 Hear word'),
        h('button', { class: 'btn listen-btn', onclick: () => { sfx.click(); speakSentence(); } }, '💬 Sentence'),
        h('button', { class: 'btn btn-gold listen-btn', onclick: () => { sfx.click(); askHint(); } }, '💡 Help')),
      hint,
      coachPanel,
      answer,
      praise,
      readyBtn),
    kb.node);
  root.append(view);

  // ---------- helpers ----------
  const entry = () => items[idx].entry;
  const word = () => entry().word;
  const letters = () => lettersOf(word());

  function updateMeter() {
    const pct = (solved / items.length) * 100;
    meterFill.style.width = `${hp ? 100 - pct : pct}%`;
  }

  function updateDots() {
    [...dots.children].forEach((d, i) => {
      d.className = 'dot';
      if (i === idx && idx < items.length) d.classList.add('now');
      if (results[i]) d.classList.add(results[i].firstTry ? 'good' : 'helped');
    });
  }

  function bubble(node, text, who) {
    clear(node);
    if (!text) return;
    node.append(h('div', { class: 'mini-bubble pop-in', style: { '--who': SPEAKERS[who]?.color } }, text));
  }

  function speakWord() {
    seq?.cancel();
    say(word(), 'coach');
  }
  function speakSentence() {
    seq?.cancel();
    say(entry().sentence, 'coach');
  }
  function prompt(intro = []) {
    seq?.cancel();
    seq = sequence();
    return seq.run([
      ...intro,
      { who: 'coach', text: word() },
      { who: 'coach', text: entry().sentence },
      { who: 'coach', text: word() },
    ]);
  }
  function talk(lines) {
    seq?.cancel();
    seq = sequence();
    return seq.run(lines);
  }

  // ---------- answer rendering ----------
  function renderAnswer() {
    clear(answer);
    answer.className = `answer mode-${st.mode}`;
    if (st.mode === 'cover-show') {
      answer.append(h('div', { class: 'show-word' }, letters().map((ch, i) => h('span', { class: 'tile show pop-in', style: { animationDelay: `${i * 90}ms` } }, ch))));
      return;
    }
    if (st.mode === 'fill') {
      const nextBlank = st.fill.findIndex((c, i) => !st.mask[i] && !c);
      st.fill.forEach((c, i) => {
        const fixed = st.mask[i];
        answer.append(h('span', { class: `tile ${fixed ? 'given' : c ? 'typed' : 'blank'} ${i === nextBlank ? 'caret' : ''}` }, fixed ? letters()[i] : c || ''));
      });
      return;
    }
    if (st.mode === 'cover-input' && st.misses >= COPY_AFTER) {
      answer.append(h('div', { class: 'copy-word' }, word()));
    }
    const row = h('div', { class: 'tile-row' });
    const chars = [...st.typed];
    const slots = st.mode === 'cover-input' ? Math.max(letters().length, chars.length) : chars.length;
    for (let i = 0; i < slots; i++) {
      row.append(h('span', { class: `tile ${chars[i] ? 'typed' : 'blank'} ${i === chars.length ? 'caret' : ''}` }, chars[i] || ''));
    }
    if (st.mode === 'free') row.append(h('span', { class: 'tile caret-tile' }));
    answer.append(row);
  }

  function typeKey(ch) {
    if (busy || !st || st.mode === 'cover-show') return;
    if (st.mode === 'fill') {
      const i = st.fill.findIndex((c, j) => !st.mask[j] && !c);
      if (i === -1) return;
      st.fill[i] = ch;
    } else {
      if (st.typed.length >= 20) return;
      st.typed += ch;
    }
    renderAnswer();
  }

  function backspace() {
    if (busy || !st || st.mode === 'cover-show') return;
    if (st.mode === 'fill') {
      for (let i = st.fill.length - 1; i >= 0; i--) if (!st.mask[i] && st.fill[i]) { st.fill[i] = null; break; }
    } else {
      st.typed = st.typed.slice(0, -1);
    }
    renderAnswer();
  }

  function currentAttempt() {
    if (st.mode === 'fill') return st.fill.map((c, i) => (st.mask[i] ? letters()[i] : c || '')).join('');
    return st.typed;
  }

  // ---------- coaching ----------
  function showCoach(title, ...content) {
    coachPanel.hidden = false;
    hint.hidden = true;
    clear(coachPanel).append(h('div', { class: 'coach-title' }, title), ...content);
  }

  function attemptRow(ops) {
    return h('div', { class: 'attempt' },
      h('span', { class: 'attempt-label' }, 'Your try:'),
      attemptView(ops).map((v) => h('span', { class: `tile small ${v.kind}` }, v.kind === 'missing' ? '?' : v.ch)));
  }

  async function coach(result) {
    const e = entry();
    const ch = chapterOf(items[idx].chapterId);
    const tip = tipFor(e, ch);
    const step = coachStep(st.misses);

    if (step === 'spot') {
      st.mode = 'free';
      st.typed = '';
      showCoach('🔍 Spot it', attemptRow(result.ops), h('p', { class: 'tip' }, tip));
      renderAnswer();
      await talk([{ who: 'coach', text: pick(LINES.spot) }, { who: 'coach', text: tip }]);
    } else if (step === 'fill') {
      st.mode = 'fill';
      st.mask = hintMask(word(), result.ops, e.focus);
      st.fill = letters().map(() => null);
      const trick = e.mnemonic || tip;
      showCoach('🧩 Fill it in', result.attempt ? attemptRow(result.ops) : null, h('p', { class: 'tip' }, trick));
      renderAnswer();
      await talk([{ who: 'coach', text: pick(LINES.fill) }, { who: 'coach', text: trick }]);
    } else {
      st.mode = 'cover-show';
      showCoach('👀 Look, say, cover, write', h('p', { class: 'tip' }, e.mnemonic || tip));
      renderAnswer();
      readyBtn.hidden = false;
      kb.setDisabled(true);
      const intro = st.misses === 3 ? pick(LINES.cover) : pick(LINES.coverAgain);
      await talk([
        { who: 'coach', text: intro },
        { who: 'coach', text: word() },
        { who: 'coach', text: spellOut(word()) },
        { who: 'coach', text: word() },
      ]);
    }
  }

  function hideWord() {
    if (!st || st.mode !== 'cover-show') return;
    sfx.whoosh();
    readyBtn.hidden = true;
    kb.setDisabled(false);
    st.mode = 'cover-input';
    st.typed = '';
    renderAnswer();
    talk([{ who: 'coach', text: LINES.ready[0] }]);
  }

  // "Help" counts as a miss and jumps straight to the fill-in hint.
  function askHint() {
    if (busy || !st || st.mode === 'cover-show') return;
    st.misses = Math.max(st.misses + 1, 2);
    st.typedLog.push('(asked for help)');
    missWord(profile, word(), '(asked for help)', day);
    ctx.save();
    setPose(hero, 'think');
    coach(check(word(), st.mode === 'fill' ? currentAttempt() : st.typed || ''));
  }

  // ---------- check ----------
  async function submit() {
    if (busy || !st) return;
    if (st.mode === 'cover-show') { hideWord(); return; }
    const attempt = currentAttempt();
    if (!attempt || (st.mode === 'fill' && st.fill.some((c, i) => !st.mask[i] && !c))) {
      flash(answer, 'shake');
      sfx.boop();
      return;
    }
    const result = check(word(), attempt);
    if (result.correct) return win();

    busy = true;
    st.misses++;
    st.typedLog.push(attempt);
    missWord(profile, word(), attempt, day);
    ctx.save();
    sfx.boop();
    flash(answer, 'shake');
    flash(villain, 'wiggle');
    setPose(hero, 'encourage');
    const taunt = pick(chapter.miss || [{ who: 'coach', text: 'Try again!' }]);
    bubble(villainSays, taunt.text, taunt.who);
    await wait(500);
    busy = false;
    if (!alive) return;
    coach(result);
  }

  async function win() {
    busy = true;
    seq?.cancel();
    const firstTry = st.misses === 0;
    completeWord(profile, word(), firstTry, day);
    results[idx] = { word: word(), firstTry, tries: st.misses + 1, typed: st.typedLog };
    ctx.save();
    solved++;

    sfx.chime();
    setTimeout(() => sfx.hit(), 180);
    flash(villain, 'hit');
    setPose(hero, 'cheer');
    clear(coachPanel); coachPanel.hidden = true;
    clear(answer).append(h('div', { class: 'tile-row win' }, letters().map((ch, i) => h('span', { class: 'tile good pop-in', style: { animationDelay: `${i * 60}ms` } }, ch))));
    praise.textContent = firstTry ? pick(['Correct!', 'Yes!', 'Perfect!', 'Awesome!']) : 'You got it!';
    praise.classList.add('show');
    const rect = answer.getBoundingClientRect();
    confetti({ x: (rect.left + rect.width / 2) / innerWidth, y: (rect.top + rect.height / 2) / innerHeight, count: firstTry ? 90 : 50 });
    updateMeter();
    updateDots();

    const line = firstTry ? pick(chapter.hit) : { who: 'coach', text: pick(LINES.praiseHelped) };
    bubble(line.who === player.id ? heroSays : villainSays, line.text, line.who);
    await say(line.text, line.who);
    await wait(500);
    if (!alive) return;
    praise.classList.remove('show');
    bubble(villainSays, '');
    bubble(heroSays, '');
    idx++;
    busy = false;
    if (idx >= items.length) finish();
    else startWord();
  }

  function startWord(intro = []) {
    st = { misses: 0, typed: '', typedLog: [], mode: 'free', mask: null, fill: null };
    reviewTag.hidden = !items[idx].review;
    coachPanel.hidden = true;
    hint.hidden = false;
    readyBtn.hidden = true;
    kb.setDisabled(false);
    setPose(hero, 'think');
    renderAnswer();
    updateDots();
    preload([{ who: 'coach', text: word() }, { who: 'coach', text: entry().sentence }]);
    if (location.hostname === 'localhost') window.__sqWord = word(); // test hook for local previews only
    prompt(intro);
  }

  async function finish() {
    sfx.fanfare();
    confetti({ count: 200, spread: 1.4 });
    const outcome = finishRound(profile, {
      chapter, results: results.filter(Boolean), mode: mode === 'camp' ? 'camp' : 'chapter', day,
    });
    ctx.save();
    await wait(1200);
    if (!alive) return;
    if (mode === 'camp') ctx.go('results', { mode: 'camp', outcome });
    else ctx.go('story', { chapterId: chapter.id, part: 'outro', outcome });
  }

  updateMeter();
  startWord(mode === 'camp' ? [{ who: 'coach', text: LINES.camp[0] }] : []);

  return () => { alive = false; seq?.cancel(); stop(); kb.destroy(); };
}
