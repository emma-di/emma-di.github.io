# emma-di.github.io

My portfolio! HTML, CSS, and JS.
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

## Updating your resume

Nothing on this site is generated from the PDF. The PDF is a copy, and the page
content is hand-written HTML. Updating one does not update the other.

### The download button

Overwrite `assets/EmmaDi-Resume.pdf`, keeping that exact filename. Six pages link
to it, so a renamed file silently breaks all six.

```bash
cp ~/Downloads/<new-resume>.pdf assets/EmmaDi-Resume.pdf
```

### The page content

If the resume changes in substance — new role, new metric, new project — edit the
HTML too. Every fact lives in at most two places by design: a headline on the home
page and the detail in its case study.

| What changed | Files to edit |
| --- | --- |
| Ditto role, dates, or scope | `index.html` (hero, About, Experience) |
| A Pause Revamp number | `index.html` card chip, `work/pause-revamp.html` |
| A match-priority number | `index.html` card chip, `work/match-priority.html` |
| A Yearbook number | `index.html` card chip, `work/yearbook.html` |
| Sentiment system | `index.html` card, `work/sentiment-loop.html` |
| Apple harvesting / ICRA | `index.html` mini card only |
| dawaShare, Avicii | `index.html` mini cards only |
| SMG, Causality Lab, CS106 | `index.html` Experience only |
| GPA, coursework, activities | `index.html` Receipts panel |
| Skills | `index.html` Toolkit panel |
| Email or social links | all six pages (each footer) plus the Contact list |

A new job or project means a new `work/*.html` page and a new `.card` in the work
section of `index.html`. Copy an existing case study; they all share the same
structure.

### After editing

```bash
python3 -m http.server 4321
```

Click through every work card and every footer link. The only things that break
quietly are a renamed PDF and a mistyped `work/` path.

## Turning on the bulletin board

The board stores notes in a Cloudflare Worker with a KV namespace. Cloudflare's
free tier has no idle pause, so nothing has to keep it alive. (It used to run on
Supabase, whose free tier pauses after about a week of inactivity and then gets
deleted — which is exactly what a low-traffic guestbook does.)

Until `API` is set in `assets/guestbook.js`, the board shows demo notes on
`localhost` and removes itself everywhere else, so it is safe to push unconfigured.

### 1. Create the Worker

Cloudflare dashboard → **Workers & Pages** → **Create** → **Create Worker**.
Name it something like `emma-guestbook`, deploy the placeholder, then **Edit code**,
paste everything from `worker/guestbook-worker.js`, and deploy again.

### 2. Create the KV namespace and bind it

**Storage & Databases** → **KV** → **Create**, name it `guestbook`.

Then back in the Worker: **Settings** → **Bindings** → **Add** → **KV namespace**.

- Variable name: `NOTES` (exactly — the code looks for `env.NOTES`)
- KV namespace: `guestbook`

Deploy once more so the binding takes effect.

### 3. Point the site at it

The Worker's URL is on its overview page, like
`https://emma-guestbook.<your-subdomain>.workers.dev`. Put it in
`assets/guestbook.js`:

```js
const API = 'https://emma-guestbook.<your-subdomain>.workers.dev';
```

Commit and push. Nothing here is secret — the Worker enforces every rule itself,
and its CORS list only accepts requests from this site.

### Deleting a note

Cloudflare dashboard → **KV** → `guestbook` → find the `note:` key → delete.

### What stops spam

- A hidden honeypot field in the form. Bots fill it, people never see it.
- One note per IP per 30 seconds, enforced in the Worker.
- Ten notes per minute site-wide, so nobody can flood the board.
- Length caps and link rejection, checked in the browser and again in the Worker.

The browser checks are convenience. The Worker checks are the real ones, since
anyone can call the endpoint directly.

### If it breaks

`assets/guestbook.js` removes the whole section if the backend stops responding,
so visitors see nothing rather than an error. There is also a daily
`board-check` workflow that opens an issue when the Worker is down — treat that
as best-effort, since GitHub disables scheduled workflows in repos that sit
untouched for 60 days.

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
