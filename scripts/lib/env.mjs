// Loads OPENAI_API_KEY (and optional model overrides) from the environment or a local .env file.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return process.env;
}

export function requireKey() {
  const key = loadEnv().OPENAI_API_KEY;
  if (!key) {
    console.error('Missing OPENAI_API_KEY. Put it in a .env file in the project folder (OPENAI_API_KEY=sk-...) or export it in your shell.');
    process.exit(1);
  }
  return key;
}

export const flags = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

// Run async jobs with limited parallelism.
export async function pool(items, limit, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const n = i++;
      await fn(items[n], n);
    }
  });
  await Promise.all(workers);
}

export async function withRetry(fn, tries = 4) {
  for (let a = 1; ; a++) {
    try {
      return await fn();
    } catch (e) {
      const retryable = e.status === 429 || e.status >= 500 || e.code === 'ECONNRESET';
      if (!retryable || a >= tries) throw e;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** a));
    }
  }
}
