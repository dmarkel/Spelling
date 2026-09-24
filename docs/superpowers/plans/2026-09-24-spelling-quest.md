# Spelling Quest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A story-driven, iPad-first spelling game for Emma (4th) and Parker (2nd) with coaching, spaced repetition, a parent dashboard, and OpenAI-generated voices/art, hosted on GitHub Pages.

**Architecture:** Static site of plain ES modules (no build). Pure logic lives in `js/engine/*` and is unit-tested with `node --test`. Content (words + story scripts) lives in `data/*.js` ES modules so both the browser and the Node asset scripts import the same source. OpenAI is only called by local scripts in `scripts/`, whose outputs are committed.

**Tech Stack:** HTML/CSS/JS (ES2020 modules), Web Audio (sound effects), HTMLAudio + speechSynthesis fallback, Service Worker, Node 18 (`node:test`, global `fetch`/`FormData`/`Blob`), OpenAI `gpt-4o-mini-tts` and `gpt-image-1`.

**Spec:** `docs/superpowers/specs/2026-09-24-spelling-quest-design.md`

**Spec refinement (decided while planning):** A chapter challenge is *all* of that chapter's words (Emma 5–6, Parker 6–8) plus review slots (Emma 1, Parker 2) of trouble words from other chapters. Training Camp rounds use the size in spec §3 (Emma 5, Parker 8). This replaces the "max 3 new per round" rule, which produced 3-word rounds.

---

## File map

| File | Responsibility |
|---|---|
| `js/engine/compare.js` | `normalize`, `align`, `check`, `attemptView`, `hintMask` |
| `js/engine/progress.js` | `dayKey`, `emptyProfile`, `recordMiss`, `finishWord`, `isMastered`, `updateStreak`, `starsFor`, `summary` |
| `js/engine/scheduler.js` | `buildChallenge`, `buildTrainingCamp` |
| `js/engine/coach.js` | `coachStep`, `tipFor`, `spellOut`, `encouragement` |
| `js/engine/storage.js` | `createStore(backend)` → `load/save/exportJSON/importJSON` |
| `data/emma.js`, `data/parker.js` | player config, chapters (words, sentences, tips, mnemonics, intro/outro lines, taunts) |
| `data/voices.js` | speaker → OpenAI voice + style instructions + display name/colour |
| `data/lines.js` | fixed spoken lines (praise, coaching, UI) |
| `js/audio.js` | `say(text, speaker)`, `unlock()`, manifest lookup, speech fallback |
| `js/sfx.js` | Web Audio synthesized effects |
| `js/ui/*.js` | `keyboard`, `meter`, `confetti`, `avatar`, `el` helper |
| `js/screens/*.js` | `select`, `map`, `story`, `challenge`, `results`, `stickers`, `parent` |
| `js/app.js` | boot, router, shared context (store, player) |
| `scripts/lib/env.mjs` | reads `.env` / process env |
| `scripts/generate-audio.mjs` | TTS for every line → `assets/audio/*.mp3`, `data/audio-manifest.json` |
| `scripts/generate-images.mjs` | avatars (from `private/photos`), villains, scenes → `assets/img/*.webp` |
| `tests/*.test.mjs` | unit + data-validation tests |

## Task 1: compare.js (TDD)

- [ ] Write `tests/compare.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, check, attemptView, hintMask } from '../js/engine/compare.js';

test('normalize lowercases, trims, straightens apostrophes', () => {
  assert.equal(normalize('  Didn’t '), "didn't");
});
test('exact match is correct', () => {
  assert.equal(check('what', 'What').correct, true);
});
test("Emma's real mistakes are wrong and close", () => {
  for (const [t, a] of [['what','wat'],['when','wen'],['wear','whar'],['eat','ete'],['been','ben'],['quit','qwit'],["didn't",'dident'],['learned','learnd'],['were','wer']]) {
    const r = check(t, a);
    assert.equal(r.correct, false, `${a}`);
    assert.ok(r.distance <= 2, `${a} distance ${r.distance}`);
  }
});
test('attemptView marks a missing letter without revealing it', () => {
  const v = attemptView(check('what', 'wat').ops);
  assert.deepEqual(v.map(x => x.kind), ['ok', 'missing', 'ok', 'ok']);
  assert.equal(v[1].ch, undefined);
});
test('attemptView marks substitutions and extras', () => {
  assert.deepEqual(attemptView(check('quit', 'qwit').ops).map(x => x.kind), ['ok','wrong','ok','ok']);
  assert.deepEqual(attemptView(check('cat', 'catt').ops).map(x => x.kind), ['ok','ok','ok','extra']);
});
test('hintMask hides only the letters the child missed', () => {
  assert.deepEqual(hintMask('what', check('what','wat').ops), [true,false,true,true]);
  assert.deepEqual(hintMask('wear', check('wear','whar').ops), [true,false,true,true]);
});
test('hintMask on a wild guess still shows first letter and hides the focus', () => {
  const m = hintMask('because', check('because','zzz').ops, 'cau');
  assert.equal(m[0], true);
  assert.deepEqual(m.slice(2, 5), [false,false,false]);
  assert.ok(m.filter(Boolean).length >= 3);
});
```

- [ ] Run `node --test tests/` → FAIL (module missing).
- [ ] Implement `js/engine/compare.js`: Levenshtein DP with backtrace preferring match > sub > del > ins; `ops` = `{op:'match'|'sub'|'del'|'ins', t:index|null, a:char|null}`. `attemptView` maps match→ok, sub→wrong, ins→extra, del→missing. `hintMask`: true for target indices with `match` op; always show index 0; if fewer than half shown, show every index outside `focus` (first occurrence of focus substring); always leave at least one hidden.
- [ ] Run tests → PASS. Commit `feat: answer comparison and letter diff`.

## Task 2: progress.js (TDD)

- [ ] Write `tests/progress.test.mjs` covering: `dayKey(new Date(2026,8,24))==='2026-09-24'`; `finishWord` first-try raises box (cap 5) and records clean day once per day; a helped finish resets box to 1; `isMastered` true only after 3 distinct clean days; `recordMiss` stores typed attempts (last 10) and increments misses; `updateStreak` same-day no change, next-day +1, gap resets to 1; `starsFor(firstTry,total)` → 3 at ≥0.9, 2 at ≥0.6, else 1.
- [ ] Run → FAIL. Implement. Word stat shape: `{box, cleanDays:[], seen, firstTry, misses, typed:[], lastSeen}`. Profile: `{stats:{}, chapters:{}, sessions:[], stickers:[], streak:{last:null,count:0}, custom:[]}`. `summary(profile, today)` → `{accuracy, mastered, learning, trouble:[{word,misses,typed,box}], byDay:[{day,firstTry,total}]}` (last 14 days).
- [ ] Run → PASS. Commit.

## Task 3: scheduler.js + coach.js (TDD)

- [ ] Tests: `buildChallenge({chapter, allChapters, stats, reviewSlots})` returns every chapter word exactly once plus ≤reviewSlots words from other chapters with box ≤2, trouble first (lowest box, most misses); never duplicates. `buildTrainingCamp({allChapters, stats, size})` returns seen, unmastered words ordered by box asc then misses desc, capped at size; empty when nothing seen. `coachStep(1|2|≥3)` → `'spot'|'fill'|'cover'`. `tipFor(word, chapter)` prefers word tip. `spellOut('didn\'t')` → `"D. I. D. N. apostrophe. T."`.
- [ ] Run → FAIL. Implement (shuffle via injectable `rand` param, default `Math.random`). Run → PASS. Commit.

## Task 4: storage.js (TDD)

- [ ] Tests with an in-memory backend `{getItem,setItem}`: load of empty → default root `{version:1, pin:null, players:{emma:emptyProfile(), parker:emptyProfile()}}`; save/load round trip; corrupt JSON → default + `recovered:true`; backend that throws → still works in memory; `importJSON` rejects wrong shape and accepts `exportJSON` output.
- [ ] Implement, PASS, commit.

## Task 5: Content data + validation test

- [ ] `data/voices.js`: narrator (fable), reader (coral), emma (shimmer), parker (verse), goblin (ash), monster (onyx), maya (nova), leo (echo), knight/king (sage) with style instructions and display colours.
- [ ] `data/emma.js` and `data/parker.js`: chapters from spec §4, each `{id, title, pattern, tip, villain:{name, emoji, img}, scene:{emoji, colors}, sticker:{emoji,name}, words:[{word, sentence, tip?, mnemonic?, focus?, teacher?}], intro:[{who,text}], outro:[{who,text}], hit:[...], miss:[...]}`; plus `{id, name, theme, reviewSlots, campSize}`.
- [ ] `data/lines.js`: praise, try-again, coaching prompts.
- [ ] `tests/data.test.mjs`: every word has a sentence containing the word (case-insensitive); every line's `who` exists in voices; ids unique; teacher words (what, when, where, wear, eat, been, quit, didn't, were) present in Emma chapters 1–5.
- [ ] PASS, commit.

## Task 6: Audio + SFX modules

- [ ] `js/audio.js`: loads `data/audio-manifest.json` (missing → `{}`); key = `${speaker}|${text}`; single reused `Audio` element; `say()` returns a Promise resolved on end/error; fallback `speechSynthesis` (en-US, rate 0.9, pitch by speaker); `unlock()` on first gesture; `stop()`.
- [ ] `js/sfx.js`: `chime`, `boop`, `whoosh`, `ding`, `click`, `fanfare` synthesized with Web Audio.
- [ ] Commit.

## Task 7: UI shell, styles, router, player select

- [ ] `index.html` (viewport-fit, apple web-app meta, fonts Fredoka + Andika), `manifest.webmanifest`, `css/*.css` with tokens and per-player themes, `js/app.js` router `go(name, params)`, `js/ui/el.js` DOM helper, `js/ui/avatar.js` (image with emoji/initial fallback), `js/screens/select.js`.
- [ ] Verify in browser pane at 1024×768 and 768×1024. Commit.

## Task 8: Map + story scene

- [ ] `js/screens/map.js` winding path of chapter nodes, lock/unlock (chapter n unlocked when n−1 done), stars, Training Camp + Sticker Book buttons, Teacher's List node when custom words exist.
- [ ] `js/screens/story.js` scene player: background, characters, speech bubble, voiced line, tap to continue, skip.
- [ ] Verify, commit.

## Task 9: Challenge screen

- [ ] `js/ui/keyboard.js` QWERTY letter tiles + apostrophe + backspace, hardware keydown support; `js/ui/meter.js` villain HP / goblin meter; `js/ui/confetti.js`.
- [ ] `js/screens/challenge.js`: prompt (word → sentence → word), answer slots, Check, coaching ladder (spot → fill → cover, cover loops until correct; after 5 misses word stays visible), records via progress.js, villain reactions, hit animation.
- [ ] Verify full chapter playthrough, commit.

## Task 10: Results, stickers, parent dashboard

- [ ] `results.js` (stars, sibling cheer, sticker award, next/map), `stickers.js` (grid), `parent.js` (PIN set/enter, per-kid summary cards, 14-day SVG bar chart, trouble words with typed attempts, recent sessions, custom words add/remove, export/import/reset, change PIN).
- [ ] Verify, commit.

## Task 11: PWA

- [ ] `sw.js` network-first for html/js/css/data, cache-first for `assets/`; register in `app.js`; icons generated.
- [ ] Commit.

## Task 12: Asset scripts

- [ ] `scripts/lib/env.mjs`, `scripts/generate-audio.mjs` (collect lines from data + words + sentences + spellOut + lines.js; skip existing; concurrency 4; `--dry-run` prints count), `scripts/generate-images.mjs` (avatars via images/edits with photo reference, then poses referencing the first cartoon; villains/scenes via generations; webp; skip existing; `--only`).
- [ ] Run `--dry-run` for both. Commit.

## Task 13: Publish

- [ ] README (how to play, add to home screen, regenerate assets). Run all tests. Push `main`, enable Pages (`gh api -X POST repos/dmarkel/Spelling/pages -f build_type=legacy -f source[branch]=main -f source[path]=/`). Verify live URL.
- [ ] Once `OPENAI_API_KEY` is available: run both scripts, review images, commit, push.
