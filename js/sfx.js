// Sound effects synthesized with Web Audio — no files to download.
import { audioContext, isMuted } from './audio.js';

function tone({ freq, start = 0, dur = 0.15, type = 'sine', gain = 0.18, slide = 0 }) {
  const c = audioContext();
  if (!c || isMuted()) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise({ start = 0, dur = 0.25, gain = 0.2, from = 3000, to = 300 }) {
  const c = audioContext();
  if (!c || isMuted()) return;
  const t0 = c.currentTime + start;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  click: () => tone({ freq: 660, dur: 0.05, type: 'triangle', gain: 0.08 }),
  back: () => tone({ freq: 330, dur: 0.06, type: 'triangle', gain: 0.08 }),
  chime: () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, start: i * 0.08, dur: 0.25, type: 'triangle' })),
  boop: () => { tone({ freq: 300, dur: 0.18, type: 'sine', slide: 0.7 }); tone({ freq: 220, start: 0.15, dur: 0.22, type: 'sine', slide: 0.8 }); },
  whoosh: () => noise({ dur: 0.3 }),
  hit: () => { noise({ dur: 0.18, gain: 0.3, from: 1500, to: 200 }); tone({ freq: 120, dur: 0.2, type: 'square', gain: 0.08, slide: 0.5 }); },
  ding: () => tone({ freq: 1318, dur: 0.4, type: 'sine', gain: 0.15 }),
  sparkle: () => [1568, 2093, 2637].forEach((f, i) => tone({ freq: f, start: i * 0.06, dur: 0.18, type: 'sine', gain: 0.07 })),
  fanfare: () => [[523, 0], [523, 0.12], [523, 0.24], [659, 0.36], [784, 0.6], [659, 0.78], [784, 0.9], [1047, 1.1]]
    .forEach(([f, s]) => tone({ freq: f, start: s, dur: s >= 1.1 ? 0.6 : 0.16, type: 'square', gain: 0.07 })),
};
