# Spelling Quest — Design Spec

**Date:** 2026-09-24
**Players:** Emma (4th grade, needs basic-spelling help, start slow) and Parker (2nd grade)
**Device:** iPad first (touch, portrait + landscape). Must also work on a laptop.
**Hosting:** GitHub Pages from `github.com/dmarkel/Spelling` (public).

## 1. Goals

1. Get Emma and Parker practising spelling regularly because it is fun, not a chore.
2. Fix Emma's specific mistakes first (teacher's corrections, Sept 2025 Storyworks assessment).
3. Coach, don't just grade: a wrong answer turns into a short, targeted lesson.
4. Let the parent see exactly what each child got right and wrong, including what they typed.

## 2. Architecture

- **Static site, no build step.** Plain HTML + CSS + JavaScript ES modules, served by GitHub Pages from `main`.
- **PWA.** Web app manifest + service worker so it installs to the iPad home screen, opens full-screen and works offline. Service worker caches the app shell and audio/images on first use.
- **No secrets in the site.** OpenAI is used only by local Node scripts run on the parent's Mac, reading `OPENAI_API_KEY` from a gitignored `.env`. Their outputs (images, mp3s) are committed.
- **Storage:** `localStorage` on the device only (parent's choice), with JSON export/import for backup. All reads/writes wrapped in try/catch; app still runs if storage is unavailable.
- **Privacy:** real photos live in gitignored `private/photos/` and are never published. The site shows first names and cartoon avatars only — no last names, no school name.

### File layout

```
index.html               app shell, loads js/app.js
manifest.webmanifest     PWA manifest
sw.js                    service worker (cache-first for assets)
css/                     styles (tokens, layout, components, animations)
js/
  app.js                 router between screens, boot
  screens/               player-select, map, story-scene, challenge, results, stickers, parent
  engine/
    scheduler.js         picks words for a round (Leitner boxes)
    compare.js           answer checking + letter-level diff for highlighting
    coach.js             chooses coaching step and tip for a miss
    progress.js          records attempts, mastery, stats
    storage.js           safe localStorage wrapper, export/import
  audio.js               plays pre-generated mp3; falls back to speechSynthesis
  ui/                    letter tiles, health/meter bar, confetti, avatar component
data/
  words/emma.json        levels → words, sentences, pattern tips, mnemonics
  words/parker.json
  stories/emma.json      chapter scripts (intro, challenge framing, resolution)
  stories/parker.json
  audio-manifest.json    text → mp3 path (generated)
assets/img/              avatars, villains, scene art (generated)
assets/audio/            mp3s (generated)
assets/sfx/              small sound effects
scripts/
  generate-images.mjs    OpenAI image generation (avatars from photos, villains, scenes)
  generate-audio.mjs     OpenAI TTS for every spoken line; skips files that already exist
tests/                   node:test unit tests for engine/*
```

## 3. Game flow

1. **Player select.** Cartoon Emma and Parker wave. Tap to choose. Small lock icon → Parent area.
2. **Story map.** Chapters shown as a path. Current chapter glows; finished chapters show stars (1–3). A "Training Camp" button for review of missed words.
3. **Chapter intro scene.** Comic-panel style: scene art + characters with speech bubbles. Lines are voiced. Tap to advance. Sets up the *problem*.
4. **Challenge.** The spelling round framed by the story (e.g. monster health bar, "friendship meter"). Each word:
   - Word is spoken, then used in a sentence, then spoken again. Buttons: 🔊 word, 💬 sentence.
   - Child spells using big on-screen letter tiles (default on iPad) or the keyboard.
   - "Check" button.
   - Correct → sound, confetti, avatar cheer, story meter advances, star.
   - Wrong → coaching ladder (section 5). The story reacts (monster laughs, goblin snickers) but **you cannot lose** — the child always finishes the chapter.
5. **Resolution scene.** Voiced lines show the problem being overcome. The *other* sibling appears to cheer them on.
6. **Results.** Stars, words mastered, a sticker earned for the sticker book.

Round size: **Emma 5 words (max 3 new per round)**, **Parker 8 words**. A chapter's challenge draws from that chapter's words plus any due review words.

## 4. Stories

Tone: funny, warm, problem → struggle → overcoming. Characters talk (voiced). Words from the chapter appear in the dialogue where natural.

### Parker — "Parker the Dragon Tamer" (knight quest)
Each correctly spelled word is a sword strike on the monster's health bar.

| # | Chapter | Pattern | Words (starter) |
|---|---|---|---|
| 1 | The Swamp Slime | short vowels | cat, pig, sun, bed, hop, jump, frog, drum |
| 2 | The Shadow Ship | sh / ch / th / wh | ship, chip, then, shop, much, fish, that, when |
| 3 | The Ghost of Silent E | silent e | make, bike, hope, cute, time, home, game, ride |
| 4 | The Troll Bridge | vowel teams | rain, play, feet, boat, team, snow, tree, day |
| 5 | The Storm Giant | r-controlled | car, bird, fork, her, turn, star, girl, park |
| 6 | The Robot Army | -ing / -ed | jumped, playing, looked, helping, wanted, going |
| 7 | The Cave of Tricky Words | sight words | said, was, they, could, would, because, there, were |
| 8 | The Great Word Dragon | boss: mixed review | drawn from chapters 1–7 |

### Emma — "Emma and the Misspell Goblin" (school life + magic)
A sneaky goblin steals letters from words — that's why "what" came out as "wat." Emma's magic notebook puts letters back when she spells correctly. Chapters mix age-appropriate friend drama, an innocent crush on a new boy (Leo), and goblin adventure. No dating: butterflies, nervous notes, friends giggling, a sweet ending.

| # | Chapter | Pattern | Words (starter) |
|---|---|---|---|
| 1 | The Mystery Note | question words (wh) | what, when, where, why, who, which |
| 2 | The New Boy | "ea" | eat, ear, wear, near, read, hear |
| 3 | The Goblin's Graffiti | tricky sight words | been, were, your, they, said, because |
| 4 | The Quiet Queen (school play) | "qu" | quit, quick, queen, quiet, question |
| 5 | The Big Misunderstanding | contractions | didn't, don't, can't, it's, I'm, won't |
| 6 | The Talent Show | -ed endings | tried, learned, played, practiced, wanted |
| 7 | Sleepover Stories | -ies plurals | stories, families, babies, cities, parties |
| 8 | The Goblin's Castle | silent letters | sword, board, knight, write, knock, climb |
| 9 | Showdown with the Misspell Goblin | sneaky vowels + review | probably, family, practice, different, favorite |

Chapters 1–3 use the teacher's circled/margin words first: **what, when, where, wear, eat, been, quit, didn't, were**. After chapter 9, further 4th-grade words can be added as new chapters or via the parent area.

## 5. Coaching ladder

Per word, per round:

1. **Miss 1 — "Spot it."** Letters in the right place turn green; wrong/missing spots are highlighted. A spoken pattern tip plays (e.g. "Question words start with **wh**: what, when, where."). Try again.
2. **Miss 2 — "Fill it."** Partial reveal: known letters shown, the tricky part blank (`w h _ n`). Mnemonic if one exists (teacher's: "wear muffs on your **ear**"; "**q** never goes anywhere without **u**"; "b-**ee**-n has two e's like a bee"). Try again.
3. **Miss 3 — "Look, say, cover, write."** Word shown and spelled aloud letter by letter, then hidden; child spells from memory. Counts as "helped."

Any miss moves the word back to box 1 so it returns next round. What the child typed is recorded every time.

**Letter diff:** `compare.js` aligns the attempt to the target (edit-distance alignment) so highlighting is correct for inserted, missing and swapped letters (e.g. `wat` vs `what` → missing `h` at position 2). Case-insensitive; apostrophe required for contractions but offered as its own tile.

## 6. Learning engine

- **Leitner boxes 1–5** per word per child. Correct with no help → up one box. Any miss → box 1.
- **Mastered** = correct with no help on **3 different days** (box 4+).
- **Round mix:** due/missed words first, then new words from the current chapter (capped: Emma 3 new), then a mastered word for review if space.
- A chapter is completed by finishing its challenge; stars reflect accuracy (3★ ≥ 90% first-try, 2★ ≥ 60%, 1★ otherwise).
- **Training Camp:** a round made purely of box-1/box-2 words across all chapters.

## 7. Fun layer

- Cartoon avatars of Emma and Parker in 4 poses each (wave, cheer, think, encourage).
- Villains/friends art: Swamp Slime, Shadow Ship captain, Silent-E Ghost, Trolls, Storm Giant, Robots, Tricky-Word Bat, Great Word Dragon; Misspell Goblin, Leo, Emma's best friend Maya.
- Scene art per chapter (one background each).
- Confetti, sound effects, bouncy tile animations, streak counter ("3 days in a row!").
- Sticker book: one sticker per completed chapter + bonus stickers for streaks and perfect rounds.
- Sibling cameo: the other child's avatar appears in resolution scenes and occasionally whispers a hint.

## 8. Voices & images (OpenAI, generated locally)

- `scripts/generate-audio.mjs`: reads all spoken text from `data/words/*` and `data/stories/*` plus fixed coaching/praise lines; calls OpenAI TTS (`gpt-4o-mini-tts` with style instructions) per unique line; writes `assets/audio/<hash>.mp3` and `data/audio-manifest.json`. Distinct voices for narrator, Emma, Parker, goblin/monsters, friends. Skips lines that already have audio, so re-running after adding words only generates new ones.
- `scripts/generate-images.mjs`: generates avatars from `private/photos/*` (image edit/reference) in one consistent cartoon style, plus villains and scene backgrounds. Outputs to `assets/img/`. Estimated cost: a few dollars in total.
- `audio.js`: if a line has no mp3 (e.g. a parent-added word before re-running the script), falls back to the iPad's `speechSynthesis` voice.

## 9. Parent area

- Gate: 4-digit PIN set on first visit (a speed bump for kids, not security).
- Per child: accuracy over time (simple chart), words mastered / in progress / trouble, **trouble words list with every wrong attempt** (e.g. "wat, wht → what"), recent rounds with date and score, streak.
- Add custom words (word + optional sentence) to a "Teacher's List" chapter for either child.
- Export / import progress as JSON. Reset a child's progress (with confirm).

## 10. Error handling

- Storage unavailable/corrupt → start fresh in memory, show a small notice in parent area; import still available.
- Missing audio → speechSynthesis fallback; if that is unavailable, show the word's sentence with the word blanked and a "ask a grown-up to read it" note.
- Missing image → CSS-drawn placeholder shape, no broken-image icon.
- iOS audio unlock: first tap on player-select unlocks audio playback.

## 11. Testing

- `node --test` unit tests for `scheduler`, `compare` (diff/alignment cases incl. Emma's real mistakes: wat→what, wen→when, whar→wear, ete→eat, ben→been, qwit→quit, dident→didn't, learnd→learned), `coach`, `progress` (mastery across days), `storage` (export/import round-trip, corrupt data).
- Data validation test: every word has a sentence; every story line has a speaker; every chapter's words exist in the word file.
- Manual check in the in-app browser at iPad size (portrait + landscape) before publishing.

## 12. Out of scope (for now)

Cloud sync, accounts, multiple devices sharing progress, handwriting input, more than two players.
