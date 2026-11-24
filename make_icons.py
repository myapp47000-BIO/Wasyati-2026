"""توليد أيقونات PNG محلية للتطبيق (بدون إنترنت)."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
ICONS = ROOT / "icons"
ICONS.mkdir(exist_ok=True)


def make_icon(size, maskable=False):
    top = (19, 108, 91)
    bottom = (8, 43, 36)
    img = Image.new("RGB", (size, size), top)
    px = img.load()
    for y in range(size):
        t = y / max(size - 1, 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        for x in range(size):
            px[x, y] = (r, g, b)

    d = ImageDraw.Draw(img, "RGBA")
    s = size

    # حلقة ذهبية خفيفة
    pad = s * (0.13 if maskable else 0.09)
    d.ellipse([pad, pad, s - pad, s - pad], outline=(200, 164, 93, 120), width=max(2, int(s * 0.012)))

    # ورقة الوصية
    left = s * 0.29 if maskable else s * 0.25
    right = s * 0.71 if maskable else s * 0.75
    top_y = s * 0.20 if maskable else s * 0.17
    bot_y = s * 0.81 if maskable else s * 0.84
    d.rounded_rectangle([left, top_y, right, bot_y], radius=int(s * 0.045), fill=(255, 255, 255, 245))
    d.rounded_rectangle(
        [left + s * 0.02, top_y + s * 0.02, right - s * 0.02, bot_y - s * 0.02],
        radius=int(s * 0.035), outline=(200, 164, 93, 210), width=max(2, int(s * 0.009))
    )

    # خطوط النص
    lw = int(s * 0.018)
    for i in range(5):
        y = top_y + s * (0.13 + i * 0.085)
        x2 = right - s * (0.09 if i % 2 == 0 else 0.15)
        d.line([left + s * 0.1, y, x2, y], fill=(33, 110, 92, 170), width=lw)

    # ختم ذهبي بعلامة صح
    cx, cy, rad = int(s * 0.5), int(s * 0.68), int(s * 0.085)
    d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(200, 164, 93, 255))
    d.line(
        [(cx - rad * 0.45, cy), (cx - rad * 0.08, cy + rad * 0.38), (cx + rad * 0.5, cy - rad * 0.42)],
        fill=(255, 255, 255, 255), width=max(3, int(s * 0.026)), joint="curve"
    )

    # قلم مائل على اليمين
    d.line(
        [(s * 0.79, s * 0.74), (s * 0.9, s * 0.38)],
        fill=(244, 233, 205, 240), width=max(4, int(s * 0.035))
    )
    d.polygon(
        [(s * 0.9, s * 0.38), (s * 0.855, s * 0.44), (s * 0.925, s * 0.46)],
        fill=(200, 164, 93, 255)
    )
    return img


for name, size, maskable in [
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("icon-maskable-512.png", 512, True),
    ("favicon-32.png", 32, False),
]:
    make_icon(size, maskable).save(ICONS / name)
    print("wrote", name)
