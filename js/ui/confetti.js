// Lightweight confetti burst on the full-screen canvas.
const COLORS = ['#ff5a6e', '#ffc233', '#22b573', '#2563eb', '#9b59d0', '#2ecc9a', '#ff7eb6'];
let particles = [];
let running = false;

export function confetti({ x = 0.5, y = 0.4, count = 120, spread = 1 } = {}) {
  const canvas = document.getElementById('confetti');
  if (!canvas || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  const cx = innerWidth * x;
  const cy = innerHeight * y;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (4 + Math.random() * 9) * spread;
    particles.push({
      x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6,
      w: 6 + Math.random() * 8, h: 8 + Math.random() * 10,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      color: COLORS[i % COLORS.length], life: 1,
    });
  }
  if (!running) { running = true; requestAnimationFrame(() => frame(canvas, dpr)); }
}

function frame(canvas, dpr) {
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, innerWidth, innerHeight);
  particles = particles.filter((p) => p.life > 0 && p.y < innerHeight + 40);
  for (const p of particles) {
    p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.006;
    g.save();
    g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, p.life);
    g.fillStyle = p.color; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    g.restore();
  }
  if (particles.length) requestAnimationFrame(() => frame(canvas, dpr));
  else { running = false; g.clearRect(0, 0, innerWidth, innerHeight); }
}
