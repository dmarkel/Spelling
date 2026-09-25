# Spelling Quest

A story-driven spelling game for Emma (4th grade) and Parker (2nd grade), built for the iPad.

- **Emma and the Misspell Goblin**: a goblin is stealing letters at school, and her magic notebook puts them back. There's friend drama, a new boy named Leo, a talent show, and a showdown in the goblin's castle.
- **Parker the Dragon Tamer**: a knight quest through Letterland with his baby-dragon buddy Sparky. He breaks the curses on the Swamp Slime, a pirate ship, a ghost, a troll, a storm giant, robots, a bat, and finally the Great Word Dragon.

Each chapter is one spelling pattern. A voiced story sets up a problem, and each word spelled correctly helps solve it. When a word is wrong, the game coaches in steps:

1. **Spot it**: shows which letters were right and where the mistake is, plus a pattern tip.
2. **Fill it in**: shows part of the word, with a memory trick.
3. **Look, say, cover, write**: shows and spells the word aloud, then hides it so the child spells it from memory.

Missed words come back in later rounds and in **Training Camp** until they're mastered. A word counts as mastered when it's spelled right without help on 3 different days.

## Play

Open the site on the iPad in Safari, then tap **Share → Add to Home Screen**. It opens full-screen like an app and works offline.

## Voices and art

Voices and cartoon art are generated once with OpenAI by scripts that run on a computer. Their output is committed to the repo, so the website never contains an API key. Until they're generated, the game uses the iPad's built-in voice and emoji characters.

```bash
echo "OPENAI_API_KEY=sk-..." > .env     # .env is gitignored
node scripts/generate-images.mjs        # Emma & Parker from photos in private/photos/, the cast, scenes
node scripts/generate-audio.mjs         # every spoken line (skips ones already made)
```

After changing any story text, words, or sentences, run `generate-audio.mjs` again. It only makes the lines that are new.

Real photos stay in `private/` (gitignored) and are never published.

## Develop

```bash
npm test            # engine + content tests (node:test)
npm run serve       # http://localhost:8080
```

- Word lists and stories: `data/emma.js`, `data/parker.js`
- Voices: `data/voices.js`
- Game logic: `js/engine/`
- Screens: `js/screens/`
