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

The board is live-but-hidden until it has somewhere to store notes. With no keys
set it renders demo notes on `localhost` only and removes itself everywhere else,
so it is safe to push before it is wired up.

### 1. Make a Supabase project

Sign up at supabase.com, create a project, then open the SQL editor and run this:

```sql
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  message    text not null,
  created_at timestamptz not null default now(),
  constraint name_len    check (char_length(name) between 1 and 32),
  constraint message_len check (char_length(message) between 1 and 280),
  constraint no_links    check (message !~* '(https?://|www\.)'
                            and name    !~* '(https?://|www\.)')
);

alter table public.notes enable row level security;

-- anyone may read and add. Nobody may edit or delete: you do that from the
-- Supabase table editor, and no policy means no permission.
create policy "read notes"    on public.notes for select to anon using (true);
create policy "add a note"    on public.notes for insert to anon with check (true);

-- backstop against a flood: at most 10 new notes a minute, site-wide
create or replace function public.notes_rate_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.notes
      where created_at > now() - interval '1 minute') >= 10 then
    raise exception 'too many notes right now';
  end if;
  return new;
end $$;

create trigger notes_throttle before insert on public.notes
  for each row execute function public.notes_rate_limit();
```

### 2. Paste the keys in

Project Settings → API gives you the project URL and the `anon` public key. Put
both at the top of `assets/guestbook.js`:

```js
const GUESTBOOK = {
  url: 'https://<project>.supabase.co',
  anonKey: '<anon public key>',
};
```

The anon key is meant to be public and is safe to commit. Row-level security is
what protects the data, which is why the policies above matter more than the key
does. Never put the `service_role` key in this repo.

### 3. Deleting a note

Supabase dashboard → Table editor → `notes` → delete the row. Anonymous visitors
have no delete policy, so nobody else can.

### What stops spam

- A hidden honeypot field. Bots fill it, people never see it.
- 30 seconds between posts from one browser.
- Length caps in the form and again as database constraints.
- Links rejected in the browser and again by a database constraint.
- 10 notes per minute site-wide, enforced by a trigger.

The browser checks are convenience. The database constraints are the real ones,
since anyone can call the API directly.

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
