// Knows which generated images and audio files exist, so the app never requests missing ones.

let images = new Set();
let audio = {};

async function loadJSON(url, fallback) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

export async function loadManifests() {
  const [img, snd] = await Promise.all([
    loadJSON('data/image-manifest.json', []),
    loadJSON('data/audio-manifest.json', {}),
  ]);
  images = new Set(img);
  audio = snd;
}

export function imageUrl(name) {
  return images.has(name) ? `assets/img/${name}.webp` : null;
}

export function audioUrl(key) {
  return audio[key] ? `assets/audio/${audio[key]}` : null;
}
