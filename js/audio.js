// Speech: plays pre-generated OpenAI mp3s through Web Audio (reliable on iPad once
// unlocked by a tap); falls back to the device's built-in voice when a line has no mp3.
import { audioUrl } from './assets.js';
import { SPEAKERS } from '../data/voices.js';
import { splitDirection, audioKey } from './engine/text.js';

let ctx = null;
let current = null; // { stop() }
let token = 0;
const buffers = new Map();
let muted = false;

export function audioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}

// Must be called from a user gesture (first tap).
export function unlock() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback'; // play even with the iPad's silent switch on
  } catch { /* older Safari */ }
  const c = audioContext();
  if (c && c.state !== 'running') c.resume().catch(() => {});
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  }
}

export function setMuted(v) { muted = v; if (v) stop(); }
export function isMuted() { return muted; }

async function bufferFor(url) {
  if (buffers.has(url)) return buffers.get(url);
  const p = fetch(url)
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .then((data) => new Promise((res, rej) => audioContext().decodeAudioData(data, res, rej)));
  buffers.set(url, p);
  p.catch(() => buffers.delete(url));
  return p;
}

export function preload(lines) {
  for (const { who, text } of lines) {
    const url = audioUrl(audioKey(who, text));
    if (url && audioContext()) bufferFor(url).catch(() => {});
  }
}

// Each player resolves true when the line finished, false when it was interrupted.
function playBuffer(buffer) {
  return new Promise((resolve) => {
    const c = audioContext();
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    let settled = false;
    const done = (ok) => { if (!settled) { settled = true; resolve(ok); } };
    src.onended = () => done(true);
    current = { stop: () => { done(false); try { src.stop(); } catch { /* already stopped */ } } };
    src.start();
  });
}

let voiceCache = null;
function pickVoice() {
  if (voiceCache) return voiceCache;
  const voices = speechSynthesis.getVoices().filter((v) => /^en[-_]US/i.test(v.lang));
  voiceCache = voices.find((v) => /premium|enhanced/i.test(v.name))
    || voices.find((v) => /samantha|ava|allison|susan/i.test(v.name))
    || voices[0] || null;
  return voiceCache;
}

function speakFallback(text, who) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) return resolve(true);
    const s = SPEAKERS[who] || SPEAKERS.narrator;
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.lang = 'en-US';
    u.rate = (s.rate ?? 1) * 0.88; // a touch slower than normal for young listeners
    u.pitch = s.pitch ?? 1;
    let settled = false;
    const done = (ok) => { if (!settled) { settled = true; clearTimeout(guard); resolve(ok); } };
    // iOS sometimes never fires onend; don't let the game hang.
    const guard = setTimeout(() => done(true), 1500 + text.length * 120);
    u.onend = () => done(true);
    u.onerror = () => done(true);
    current = { stop: () => { done(false); speechSynthesis.cancel(); } };
    speechSynthesis.speak(u);
  });
}

// Speak one line. Resolves true if it played to the end, false if something interrupted it.
export async function say(text, who = 'narrator') {
  if (muted || !text) return true;
  const my = ++token;
  stop(false);
  const url = audioUrl(audioKey(who, text));
  const c = audioContext();
  if (url && c) {
    try {
      const buf = await bufferFor(url);
      if (my !== token) return false;
      return await playBuffer(buf);
    } catch { /* fall back to the device voice */ }
  }
  if (my !== token) return false;
  return speakFallback(splitDirection(text).spoken, who);
}

export function stop(bumpToken = true) {
  if (bumpToken) token++;
  if (current) { const c = current; current = null; c.stop(); }
  // Cancelling an idle synth on iOS can swallow the next utterance, so only cancel when busy.
  if ('speechSynthesis' in window && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
}

// A handle that lets a caller cancel a whole sequence.
export function sequence() {
  let cancelled = false;
  return {
    async run(lines) {
      for (const l of lines) {
        if (cancelled) return false;
        if (!(await say(l.text, l.who))) return false;
      }
      return !cancelled;
    },
    cancel() { cancelled = true; stop(); },
    get cancelled() { return cancelled; },
  };
}
