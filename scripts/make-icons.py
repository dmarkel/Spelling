"""Draws the app icons (home-screen icon, favicon). Run: python3 scripts/make-icons.py"""
from PIL import Image, ImageDraw, ImageFont
import math, os

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'icons')
os.makedirs(OUT, exist_ok=True)

def font(size):
    for path in ['/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf']:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

def star(draw, cx, cy, r, fill, outline, width):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.45
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    draw.polygon(pts, fill=fill, outline=outline, width=width)

def icon(size, maskable=False):
    s = 1024
    img = Image.new('RGB', (s, s))
    top, bottom = (155, 89, 208), (37, 99, 235)
    px = img.load()
    for y in range(s):
        for x in range(s):
            t = (x + y) / (2 * s)
            px[x, y] = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
    d = ImageDraw.Draw(img)
    ink = (43, 33, 64)
    pad = 170 if maskable else 110
    # letter tile
    d.rounded_rectangle([pad + 60, pad + 150, s - pad - 60, s - pad - 30], radius=90, fill=(255, 255, 255), outline=ink, width=28)
    f = font(360)
    text = 'Aa'
    w = d.textlength(text, font=f)
    d.text(((s - w) / 2, pad + 250), text, font=f, fill=ink)
    star(d, s - pad - 90, pad + 120, 150, (255, 194, 51), ink, 22)
    return img.resize((size, size), Image.LANCZOS)

for size, name in [(180, 'icon-180.png'), (192, 'icon-192.png'), (512, 'icon-512.png')]:
    icon(size).save(os.path.join(OUT, name))
icon(512, maskable=True).save(os.path.join(OUT, 'icon-maskable-512.png'))
print('icons written to', os.path.abspath(OUT))
