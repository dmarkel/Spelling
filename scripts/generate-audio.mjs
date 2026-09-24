// Generates natural voices for every spoken line with OpenAI text-to-speech.
//   node scripts/generate-audio.mjs            # generate anything missing
//   node scripts/generate-audio.mjs --dry-run  # just count
//   node scripts/generate-audio.mjs --force    # regenerate everything
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT, requireKey, loadEnv, flags, pool, withRetry } from './lib/env.mjs';
import { collectLines } from './lib/lines.mjs';
import { SPEAKERS } from '../data/voices.js';
import { splitDirection } from '../js/engine/text.js';

const OUT = path.join(ROOT, 'assets', 'audio');
const MANIFEST = path.join(ROOT, 'data', 'audio-manifest.json');
const fileFor = (key) => `${createHash('sha1').update(key).digest('hex').slice(0, 16)}.mp3`;

function instructionsFor({ who, kind }, direction) {
  const s = SPEAKERS[who] || SPEAKERS.narrator;
  if (kind === 'word') return `${s.style} You are giving a spelling test. Say this single word once, clearly and naturally, with no extra words.`;
  if (kind === 'letters') return `${s.style} Spell out these letters one at a time, slowly and clearly, with a short pause between each letter. Say "apostrophe" where written.`;
  return direction ? `${s.style} Deliver this line ${direction}.` : s.style;
}

async function speak(key, line) {
  const { direction, spoken } = splitDirection(line.text);
  const env = loadEnv();
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.TTS_MODEL || 'gpt-4o-mini-tts',
      voice: (SPEAKERS[line.who] || SPEAKERS.narrator).voice,
      input: spoken,
      instructions: instructionsFor(line, direction),
      response_format: 'mp3',
    }),
  });
  if (!res.ok) {
    const err = new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return Buffer.from(await res.arrayBuffer());
}

const lines = collectLines();
mkdirSync(OUT, { recursive: true });
const todo = lines.filter((l) => flags.force || !existsSync(path.join(OUT, fileFor(`${l.who}|${l.text}`))));
console.log(`${lines.length} spoken lines, ${todo.length} need audio.`);

if (!flags['dry-run'] && todo.length) {
  const key = requireKey();
  let done = 0;
  let failed = 0;
  await pool(todo, 4, async (line) => {
    const k = `${line.who}|${line.text}`;
    try {
      const mp3 = await withRetry(() => speak(key, line));
      writeFileSync(path.join(OUT, fileFor(k)), mp3);
      done++;
      if (done % 25 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${k.slice(0, 70)} — ${e.message}`);
    }
  });
  console.log(`Generated ${done}, failed ${failed}.`);
}

// The manifest only lists files that exist, so the app falls back to the device voice for the rest.
const have = new Set(readdirSync(OUT));
const manifest = {};
for (const l of lines) {
  const k = `${l.who}|${l.text}`;
  if (have.has(fileFor(k))) manifest[k] = fileFor(k);
}
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 0)}\n`);
console.log(`Manifest: ${Object.keys(manifest).length} lines have audio.`);
