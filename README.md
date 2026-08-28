# emma-di.github.io

My portfolio. Hand-written HTML, CSS, and JS — no framework, no build step.
Deployed with GitHub Pages straight from `main`.

## Layout

```
index.html          home: hero, about, work, experience, life, contact
work/*.html         one case study per page
assets/style.css    the whole design system
assets/site.js      pixel sprites, dithered canvas backdrops, page behaviour
assets/img/         dithered PNGs (small, committed)
raw/                source photos the dither pipeline reads
tools/dither.py     the dither pipeline
```

## Running it locally

```bash
python3 -m http.server 4321
```

Then open <http://localhost:4321>. There is nothing to compile.

## Adding or changing a photo

Photos are Bayer-dithered down to a fixed six-colour pastel palette so
everything on the site matches.

1. Drop the source image in `raw/` (JPEG, ~1400px wide is plenty).
2. Add a row to `JOBS` in `tools/dither.py`:
   `("raw-name.jpg", "output-name.png", 300, None)` — the number is the pixel
   width before upscaling (smaller = chunkier), and the last value is an
   optional fractional crop box `(left, top, right, bottom)`.
3. Run it:

```bash
python3 tools/dither.py
```

One-off, without touching `JOBS`:

```bash
python3 tools/dither.py in.jpg out.png 300
```

Requires Pillow (`pip3 install Pillow`).

## Adding a pixel sprite

Sprites live in `SPRITES` in `assets/site.js` as arrays of strings.
`X` is the outline, `c` the accent colour, `g` green, `.` transparent.
Use one anywhere with:

```html
<span data-sprite="heart" data-unit="4" data-accent="#E894BE"></span>
```

`data-unit` is the size of one pixel in screen px.

## Adding a case study

Copy any file in `work/`, change the content. They all share the same
`cs-hero` / `cs-body` structure, so nothing else needs touching. Then add a
`.card` for it in the work section of `index.html`.

## Colours

Everything comes from the custom properties at the top of `assets/style.css`.
The dither palette in `tools/dither.py` is the same six colours — change one,
change the other.
