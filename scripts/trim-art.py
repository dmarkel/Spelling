"""Trims empty transparent margins around character art so characters fill their frame.
Usage: python3 scripts/trim-art.py assets/img/emma-wave.webp [...]"""
import sys
from PIL import Image

MARGIN = 0.04  # breathing room around the character, as a fraction of the square

for path in sys.argv[1:]:
    im = Image.open(path).convert('RGBA')
    box = im.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
    if not box:
        continue
    char = im.crop(box)
    side = int(max(char.size) * (1 + 2 * MARGIN))
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    # Centered horizontally, standing on the bottom edge.
    x = (side - char.width) // 2
    y = side - char.height - int(side * MARGIN)
    canvas.alpha_composite(char, (x, max(0, y)))
    canvas.thumbnail((640, 640), Image.LANCZOS)
    canvas.save(path, 'WEBP', quality=82, method=6)
    print('trimmed', path)
