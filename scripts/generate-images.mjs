// Generates cartoon art with OpenAI images: Emma & Parker (from their photos), the cast, and scene backgrounds.
//   node scripts/generate-images.mjs                  # generate anything missing
//   node scripts/generate-images.mjs --only=emma-wave,grizzle
//   node scripts/generate-images.mjs --force --only=scene-e1
//   node scripts/generate-images.mjs --dry-run
// Real photos are read from private/photos/ (gitignored) and only sent to OpenAI to make the cartoons.
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, requireKey, loadEnv, flags, pool, withRetry } from './lib/env.mjs';
import emma from '../data/emma.js';
import parker from '../data/parker.js';

const OUT = path.join(ROOT, 'assets', 'img');
const PHOTOS = path.join(ROOT, 'private', 'photos');
const MANIFEST = path.join(ROOT, 'data', 'image-manifest.json');
const REFS = path.join(ROOT, 'private', 'refs'); // full-size cartoon portraits reused for extra poses (gitignored)

const STYLE = 'Bright, friendly 2D cartoon illustration in a modern children\'s picture-book style: bold clean dark-purple outlines, soft cel shading, cheerful saturated colors, big expressive eyes, warm and cute. No text, no letters, no words, no border, no frame.';
const CHAR = `${STYLE} A single full-body character, centered, feet visible, on a fully transparent background with no ground shadow and no scenery.`;
const SCENE = `${STYLE} A wide background scene for a storybook app with NO people, NO characters and NO animals in it. Keep the lower third fairly simple and uncluttered so characters can stand in front of it.`;

const KIDS = {
  emma: {
    photo: 'emma.jpg',
    look: 'a 9-year-old girl with long straight black hair and full straight-cut bangs, wearing a lavender t-shirt, a purple plaid skirt, pink socks, navy sneakers, and a mint-green backpack',
    poses: {
      wave: 'waving hello with a big happy smile',
      cheer: 'jumping for joy with both arms up, holding a sparkly magic notebook, huge grin',
      think: 'thinking hard with one finger on her chin, eyes looking up, curious expression',
      encourage: 'giving a friendly thumbs up with a kind, determined smile',
    },
  },
  parker: {
    photo: 'parker.jpg',
    look: 'a 7-year-old boy with short dark hair and a big gap-toothed smile, wearing a royal blue polo shirt, gray shorts, white socks, red-and-blue superhero sneakers, and a red backpack',
    poses: {
      wave: 'waving hello with a big happy smile',
      cheer: 'jumping in victory, raising a toy wooden knight sword high, huge grin',
      think: 'thinking hard with one finger on his chin, eyes looking up, curious expression',
      encourage: 'giving a friendly thumbs up with a brave, determined smile',
    },
  },
};

const CAST = {
  maya: 'a cheerful 9-year-old girl with curly brown hair in two puffs, warm brown skin, wearing a yellow hoodie with a rainbow on it, jeans, and pink sneakers, smiling and waving',
  leo: 'a shy, sweet 9-year-old boy with messy light-brown hair and freckles, wearing an orange t-shirt with a small green dragon on it, holding a dragon-themed lunchbox, smiling a little nervously',
  rivera: 'a warm, friendly elementary school teacher woman in her 30s with a dark ponytail and round glasses, wearing a teal cardigan, holding a book, smiling',
  grizzle: 'Grizzle the Misspell Goblin: a small, silly, mischievous green goblin with big pointy ears, a crooked grin, a patched purple vest, clutching a soup ladle full of floating colorful alphabet letters. Goofy and cute, not scary',
  sparky: 'Sparky, a tiny adorable baby dragon with orange scales, a round belly, stubby wings and big sparkly eyes, a little puff of smoke from its nose. Very cute',
  slime: 'the Swamp Slime: a big goofy blob of green swamp slime monster with googly eyes, a silly open-mouth grin, a lily pad on its head, dripping gloop. Funny, not scary',
  shadowbeard: 'Captain Shadowbeard: a silly cartoon pirate captain made of dark purple shadowy smoke, with a big tricorn hat, an eyepatch, a curly beard, and a small orange pet fish in a bowl. Funny, not scary',
  ghost: 'the Silent E Ghost: a small shy friendly ghost, pale blue and glowing, with a tiny letter-shaped wisp on its tail, big shy eyes and rosy cheeks',
  troll: 'a grumpy but lovable bridge troll with mossy green-brown skin, a big nose, tufts of hair, holding a riddle scroll, raising one bushy eyebrow. Silly, not scary',
  giant: 'the Storm Giant: a huge friendly cloud giant made of stormy blue-gray clouds with a lightning-bolt beard and big puffy cheeks, looking dramatic but kind',
  robot: 'Robo-Boss: a chunky retro toy robot with a square head, antenna, glowing blue eyes, and a small red siren on top, silly and glitchy looking',
  batty: 'Batty: a small chatty purple bat with huge ears, tiny fangs, big theatrical eyes, wearing a tiny cape',
  dragon: 'the Great Word Dragon: a big majestic red-and-gold dragon grandma with kind eyes, curled horns, small reading glasses and golden letters swirling around her. Grand but friendly, not scary',
};

const SCENES = {
  'scene-e1': 'a cozy, colorful 4th-grade classroom in the morning sun, wooden desks, one desk with a folded sparkly note on it, bulletin boards with drawings',
  'scene-e2': 'a bright elementary school cafeteria at lunchtime with long tables, trays, apples and sandwiches, big windows',
  'scene-e3': 'a school hallway with lockers, and walls covered in silly messy crayon scribbles and doodles',
  'scene-e4': 'a school auditorium stage with red velvet curtains, a spotlight, a cardboard castle backdrop and a paper crown on a stool',
  'scene-e5': 'a school playground at recess with a bench under a big tree, swings and a slide, a paper note blowing in the breeze',
  'scene-e6': 'a school talent show stage with colorful lights, a microphone stand and balloons',
  'scene-e7': 'a cozy nighttime blanket fort in a bedroom made of sheets and pillows, fairy lights, flashlights, popcorn bowl, starry window',
  'scene-e8': 'a small crooked whimsical goblin castle made of stacked books and pencils behind a school garden, with round wooden doors',
  'scene-e9': 'the top of a whimsical goblin tower room full of floating glowing alphabet letters and a bubbling pot of letter soup, sunset through the window',
  'scene-p1': 'a friendly fantasy swamp with lily pads, cattails, mossy logs and fireflies, a dirt path winding through',
  'scene-p2': 'a sparkling fantasy sea with a foggy horizon and a wooden pier, a mysterious dark pirate ship far away',
  'scene-p3': 'an old spooky-but-cute haunted house on a hill under a purple twilight sky with friendly jack-o-lanterns',
  'scene-p4': 'a rickety wooden rope bridge over a rushing blue river between green hills, mountains beyond',
  'scene-p5': 'the top of Thunder Mountain with dramatic storm clouds, a rainbow starting to peek through, rocky path',
  'scene-p6': 'a colorful toy robot factory with conveyor belts, gears, pipes and blinking lights',
  'scene-p7': 'a dark twisty cave with glowing crystals, stalactites and a warm glow at the end of the tunnel',
  'scene-p8': 'the top of Volcano Peak at sunset with a big treasure pile of golden letters, glowing lava in the distance, epic sky',
};

// Build the job list. Kids' first pose is made from their photo; other poses reuse that cartoon for consistency.
const jobs = [];
for (const [id, kid] of Object.entries(KIDS)) {
  const [firstPose, ...rest] = Object.keys(kid.poses);
  jobs.push({ name: `${id}-${firstPose}`, kind: 'photo', ref: path.join(PHOTOS, kid.photo),
    prompt: `Turn this child into a cartoon character for a kids' spelling game. Keep their face shape, hairstyle, skin tone and likeness, drawn as ${kid.look}. Pose: ${kid.poses[firstPose]}. ${CHAR}` });
  for (const pose of rest) {
    jobs.push({ name: `${id}-${pose}`, kind: 'ref', ref: path.join(REFS, `${id}-${firstPose}.png`), after: `${id}-${firstPose}`,
      prompt: `The same cartoon character as in this image (${kid.look}), keeping the exact same art style, face, hair, clothes and colors. New pose: ${kid.poses[pose]}. ${CHAR}` });
  }
}
for (const [name, desc] of Object.entries(CAST)) jobs.push({ name, kind: 'char', prompt: `${desc}. ${CHAR}` });
const sceneNames = new Set([...emma.chapters, ...parker.chapters].map((c) => c.scene?.img).filter(Boolean));
for (const [name, desc] of Object.entries(SCENES)) if (sceneNames.has(name)) jobs.push({ name, kind: 'scene', prompt: `${desc}. ${SCENE}` });

const only = flags.only ? new Set(String(flags.only).split(',')) : null;
mkdirSync(OUT, { recursive: true });
mkdirSync(REFS, { recursive: true });
const selected = jobs.filter((j) => (!only || only.has(j.name)) && (flags.force || !existsSync(path.join(OUT, `${j.name}.webp`))));
console.log(`${jobs.length} images defined, ${selected.length} to generate.`);
if (flags['dry-run']) { for (const j of selected) console.log(`  ${j.name} (${j.kind})`); process.exit(0); }

async function callImages(key, job) {
  const env = loadEnv();
  const model = env.IMAGE_MODEL || 'gpt-image-1';
  const size = job.kind === 'scene' ? '1536x1024' : '1024x1024';
  const background = job.kind === 'scene' ? 'opaque' : 'transparent';
  let res;
  if (job.kind === 'photo' || job.kind === 'ref') {
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', job.prompt);
    form.append('size', size);
    form.append('quality', 'medium');
    form.append('background', background);
    const type = job.ref.endsWith('.png') ? 'image/png' : 'image/jpeg';
    form.append('image', new Blob([readFileSync(job.ref)], { type }), path.basename(job.ref));
    res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
  } else {
    res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: job.prompt, size, quality: 'medium', background, n: 1 }),
    });
  }
  if (!res.ok) {
    const err = new Error(`images ${res.status}: ${(await res.text()).slice(0, 400)}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  return Buffer.from(json.data[0].b64_json, 'base64');
}

// PNG → compact WebP (characters 640px, scenes 1536px) using Pillow.
function toWebp(pngPath, webpPath, kind) {
  const max = kind === 'scene' ? 1536 : 640;
  execFileSync('python3', ['-c', `
import sys
from PIL import Image
im = Image.open(sys.argv[1])
im.thumbnail((${max}, ${max}), Image.LANCZOS)
im.save(sys.argv[2], 'WEBP', quality=82, method=6)
`, pngPath, webpPath]);
}

async function run(job, key) {
  const png = path.join(job.kind === 'photo' ? REFS : OUT, `${job.name}.png`);
  const webp = path.join(OUT, `${job.name}.webp`);
  if (job.kind === 'photo' && !existsSync(job.ref)) throw new Error(`photo not found: ${job.ref}`);
  if (job.kind === 'ref' && !existsSync(job.ref)) throw new Error(`reference not generated yet: ${job.ref}`);
  const buf = await withRetry(() => callImages(key, job));
  writeFileSync(png, buf);
  toWebp(png, webp, job.kind);
  console.log(`  ✓ ${job.name}`);
}

const key = requireKey();
let failed = 0;
// Photo-based portraits first (other poses depend on them), then everything else in parallel.
const first = selected.filter((j) => j.kind === 'photo');
const later = selected.filter((j) => j.kind !== 'photo');
for (const phase of [first, later]) {
  await pool(phase, 3, async (job) => {
    try { await run(job, key); } catch (e) { failed++; console.error(`  ✗ ${job.name}: ${e.message}`); }
  });
}

// Only the compact WebPs are published.
for (const f of readdirSync(OUT)) if (f.endsWith('.png')) unlinkSync(path.join(OUT, f));
const names = readdirSync(OUT).filter((f) => f.endsWith('.webp')).map((f) => f.replace(/\.webp$/, '')).sort();
writeFileSync(MANIFEST, `${JSON.stringify(names)}\n`);
console.log(`Done. ${names.length} images available, ${failed} failed.`);
