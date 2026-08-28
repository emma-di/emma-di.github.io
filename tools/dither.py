#!/usr/bin/env python3
"""Bayer-dither photos into the site's pastel palette.

Usage: python3 tools/dither.py           # re-render everything in JOBS
       python3 tools/dither.py in.jpg out.png 240   # one-off
"""
import sys
from PIL import Image

# Ordered by luminance so the dither produces a clean tonal ramp.
PALETTE = [
    (0xFF, 0xFB, 0xF5),  # cream
    (0xFB, 0xDC, 0xE9),  # blush
    (0xCF, 0xE6, 0xE0),  # mint
    (0xB9, 0xA8, 0xDE),  # lilac
    (0x7E, 0x6B, 0xAE),  # periwinkle
    (0x3B, 0x2E, 0x55),  # plum
]

BAYER8 = [
    [0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26],
    [12, 44, 4, 36, 14, 46, 6, 38], [60, 28, 52, 20, 62, 30, 54, 22],
    [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
    [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21],
]


def nearest(r, g, b):
    # Weighted RGB distance — green carries most perceived luminance.
    return min(PALETTE, key=lambda c: 2 * (r - c[0]) ** 2 + 4 * (g - c[1]) ** 2 + 3 * (b - c[2]) ** 2)


def dither(src, dst, width, crop=None, spread=46, contrast=1.06, brightness=1.13):
    """crop is a fractional (left, top, right, bottom) box, or None for the full frame."""
    im = Image.open(src).convert("RGB")
    if crop:
        l, t, r, b = crop
        im = im.crop((int(l * im.width), int(t * im.height), int(r * im.width), int(b * im.height)))
    im = im.resize((width, round(width * im.height / im.width)), Image.LANCZOS)

    px = im.load()
    out = Image.new("RGB", im.size)
    op = out.load()
    for y in range(im.height):
        row = BAYER8[y % 8]
        for x in range(im.width):
            # Bayer offset nudges each pixel before quantising; that scatter is the dither.
            off = (row[x % 8] / 63.0 - 0.5) * spread
            vals = []
            for c in px[x, y]:
                v = (c - 128) * contrast + 128 * brightness + off
                vals.append(0 if v < 0 else 255 if v > 255 else int(v))
            op[x, y] = nearest(*vals)
    out.convert("P", palette=Image.ADAPTIVE, colors=len(PALETTE)).save(dst, optimize=True)
    print(f"{dst}  {out.width}x{out.height}")


# (source in raw/, output in assets/img/, pixel width, crop box)
JOBS = [
    ("emma.jpg",           "emma.png",           260, (0.10, 0.03, 0.90, 1.0)),
    ("life-symphony.jpg",       "life-symphony.png",  300, None),
    ("life-robotics.jpg",       "life-robotics.png",  300, (0.0, 0.10, 1.0, 0.80)),
    ("life-orchestra.jpg",       "life-orchestra.png", 300, None),
    ("life-hackathon.jpg",       "life-hackathon.png", 300, (0.0, 0.08, 1.0, 0.78)),
    ("life-hike.jpg",       "life-hike.png",      300, None),
    ("life-cookies.jpg",       "life-cookies.png",   300, None),
]

if __name__ == "__main__":
    if len(sys.argv) > 2:
        dither(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 280)
    else:
        import os
        here = os.path.dirname(__file__)
        raw = os.path.join(here, "..", "raw")
        out = os.path.join(here, "..", "assets", "img")
        for src, dst, w, crop in JOBS:
            dither(os.path.join(raw, src), os.path.join(out, dst), w, crop)
