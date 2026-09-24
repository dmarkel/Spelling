// Generates natural voices for every spoken line with OpenAI text-to-speech.
//   node scripts/generate-audio.mjs            # generate anything missing
//   node scripts/generate-audio.mjs --dry-run  # just count
//   node scripts/generate-audio.mjs --force    # regenerate everything
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { ROOT, requireKey, loadEnv, flags, pool, withRetry } from './lib/env.mjs';
import { collectLines } from './lib/lines.mjs';
import { SPEAKERS, ACCENT, PACE } from '../data/voices.js';
import { splitDirection } from '../js/engine/text.js';

const OUT = path.join(ROOT, 'assets', 'audio');
const MANIFEST = path.join(ROOT, 'data', 'audio-manifest.json');
// Bump VOICE_VERSION whenever voices or delivery change: new file names stop iPads from replaying cached old audio.
const VOICE_VERSION = 'v2-american-slow';
const fileFor = (key) => `${createHash('sha1').update(`${VOICE_VERSION}|${key}`).digest('hex').slice(0, 16)}.mp3`;

function instructionsFor({ who, kind }, direction) {
  const s = SPEAKERS[who] || SPEAKERS.narrator;
  const base = `${s.style} ${ACCENT} ${PACE}`;
  if (kind === 'word') return `${base} You are giving a spelling test. Say this single word once, slowly and clearly, with no extra words.`;
  if (kind === 'letters') return `${base} Spell out these letters one at a time, slowly, with a clear pause between each letter. Say "apostrophe" where written.`;
  return direction ? `${base} Deliver this line ${direction}.` : base;
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
      speed: line.kind === 'line' ? 0.9 : 0.85,
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

// Remove recordings from older voice versions, then list only files that exist
// (the app falls back to the device voice for anything missing).
const wanted = new Set(lines.map((l) => fileFor(`${l.who}|${l.text}`)));
for (const f of readdirSync(OUT)) if (f.endsWith('.mp3') && !wanted.has(f)) unlinkSync(path.join(OUT, f));
const have = new Set(readdirSync(OUT));
const manifest = {};
for (const l of lines) {
  const k = `${l.who}|${l.text}`;
  if (have.has(fileFor(k))) manifest[k] = fileFor(k);
}
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 0)}\n`);
console.log(`Manifest: ${Object.keys(manifest).length} lines have audio.`);
