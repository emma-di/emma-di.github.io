/* emma di — pixel sprites, dithered backdrops, small page behaviours */

/* ---------------- ordered dithering ---------------- */

const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

const RAMPS = {
  hero: ["#FFFBF5", "#FFFBF5", "#FDF6F6", "#F9EFF6", "#F1E5F5", "#E5D8F2", "#D9C9EE"],
  band: ["#FFFBF5", "#FAF2F6", "#F1E7F5", "#E4D8F2"],
};

function hex(c) {
  return [
    parseInt(c.slice(1, 3), 16),
    parseInt(c.slice(3, 5), 16),
    parseInt(c.slice(5, 7), 16),
  ];
}

/* Paints a Bayer-dithered ramp radiating from the top-right corner.
   Renders at 1/PX resolution and lets CSS scale it back up hard-edged. */
function paintDither(cv, rampName) {
  const PX = 5;
  const w = Math.max(1, Math.ceil(cv.clientWidth / PX));
  const h = Math.max(1, Math.ceil(cv.clientHeight / PX));
  if (!w || !h) return;
  cv.width = w;
  cv.height = h;

  const ramp = (RAMPS[rampName] || RAMPS.hero).map(hex);
  const n = ramp.length;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;

  for (let y = 0; y < h; y++) {
    const brow = BAYER8[y % 8];
    for (let x = 0; x < w; x++) {
      const t = Math.min(1, ((x / w) * 0.85 + (y / h) * 0.35) * 1.05);
      let i = Math.round(t * (n - 1) + (brow[x % 8] / 63 - 0.5));
      i = i < 0 ? 0 : i > n - 1 ? n - 1 : i;
      const p = (y * w + x) * 4;
      d[p] = ramp[i][0];
      d[p + 1] = ramp[i][1];
      d[p + 2] = ramp[i][2];
      d[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* ---------------- pixel sprites ---------------- */
/* X = outline ink, c = accent fill, g = leaf green, . = transparent */

const SPRITES = {
  heart: [
    ".XX...XX.",
    "XccXXXccX",
    "XcccccccX",
    "XcccccccX",
    ".XcccccX.",
    "..XcccX..",
    "...XcX...",
    "....X....",
  ],
  book: [
    ".XXX.XXX.",
    "XcccXcccX",
    "XcccXcccX",
    "XcccXcccX",
    "XcccXcccX",
    "XcccXcccX",
    ".XXXXXXX.",
  ],
  pulse: [
    ".........",
    "....X....",
    "....X....",
    "XXXXX.XXX",
    ".....X...",
    ".....X...",
    ".........",
  ],
  graph: [
    ".........",
    ".......XX",
    ".......Xc",
    "....XX.Xc",
    "....Xc.Xc",
    ".XX.Xc.Xc",
    ".Xc.Xc.Xc",
    "XXXXXXXXX",
  ],
  pause: [
    ".XX...XX.",
    ".Xc...Xc.",
    ".Xc...Xc.",
    ".Xc...Xc.",
    ".Xc...Xc.",
    ".Xc...Xc.",
    ".XX...XX.",
  ],
  disk: [
    "XXXXXXXXX",
    "X.XXXXX.X",
    "X.Xc..X.X",
    "X.XXXXX.X",
    "X.......X",
    "X.XXXXX.X",
    "X.XcccX.X",
    "X.XXXXX.X",
    "XXXXXXXXX",
  ],
  pin: [
    "..XXX..",
    ".XcccX.",
    ".XcccX.",
    "..XXX..",
    "...X...",
    "...X...",
    "...X...",
  ],
  star: [
    "...X...",
    "...X...",
    "..XXX..",
    "XXXXXXX",
    "..XXX..",
    "...X...",
    "...X...",
  ],
  note: [
    ".....XXX",
    ".....X.X",
    ".....XX.",
    ".....X..",
    ".....X..",
    ".XXX.X..",
    "XcccXX..",
    ".XXX....",
  ],
  mail: [
    "XXXXXXXXX",
    "XX.....XX",
    "XcX...XcX",
    "XccX.XccX",
    "XcccXcccX",
    "XcccccccX",
    "XXXXXXXXX",
  ],
  car: [
    "..XXXXX..",
    ".XcccccX.",
    "XXXXXXXXX",
    "XcccccccX",
    "XXXXXXXXX",
    ".X.....X.",
  ],
  apple: [
    "....X.g..",
    "....Xgg..",
    ".XX.X.XX.",
    "XcccXcccX",
    "XcccccccX",
    "XcccccccX",
    ".XcccccX.",
    "..XXXXX..",
  ],
  wave: [
    "....X....",
    "..X.X.X..",
    "X.X.X.X.X",
    "XcXcXcXcX",
    "X.X.X.X.X",
    "..X.X.X..",
    "....X....",
  ],
};

const SPRITE_INK = "#2E2545";

function spriteSVG(name, unit, accent) {
  const grid = SPRITES[name];
  if (!grid) return "";
  const w = grid[0].length,
    h = grid.length;
  const fill = { X: SPRITE_INK, c: accent || "#B9A8DE", g: "#7FC4B4" };
  let r = "";
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grid[y][x];
      if (ch === ".") continue;
      r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${fill[ch]}"/>`;
    }
  }
  return (
    `<svg width="${w * unit}" height="${h * unit}" viewBox="0 0 ${w} ${h}" ` +
    `shape-rendering="crispEdges" aria-hidden="true" focusable="false">${r}</svg>`
  );
}

function mountSprites(root) {
  (root || document).querySelectorAll("[data-sprite]").forEach((el) => {
    if (el.dataset.mounted) return;
    el.dataset.mounted = "1";
    el.innerHTML = spriteSVG(
      el.dataset.sprite,
      +(el.dataset.unit || 3),
      el.dataset.accent,
    );
  });
}

/* ---------------- page behaviours ---------------- */

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (
    !("IntersectionObserver" in window) ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
  );
  items.forEach((el) => io.observe(el));
}

function initNav() {
  const btn = document.querySelector(".nav__toggle");
  const links = document.querySelector(".nav__links");
  if (!btn || !links) return;
  btn.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
  });
  links.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      links.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }
  });
}

function initDither() {
  const canvases = [...document.querySelectorAll("canvas[data-dither]")];
  if (!canvases.length) return;
  const paint = () => canvases.forEach((c) => paintDither(c, c.dataset.dither));
  paint();
  let t;
  addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(paint, 120);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  mountSprites();
  initDither();
  initReveal();
  initNav();
  initPageTransitions();
  const y = document.querySelector("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
});

/* ---------------- cross-document page transitions ---------------- */

/* Names have to be unique per document, so only the card being navigated
   to or from ever carries one. */
function clearMorphNames() {
  document.querySelectorAll('.card__icon, .card h3').forEach((el) => {
    el.style.viewTransitionName = '';
  });
}

function markMorphTarget(card) {
  clearMorphNames();
  if (!card) return;
  const icon = card.querySelector('.card__icon');
  const title = card.querySelector('h3');
  if (icon) icon.style.viewTransitionName = 'cs-icon';
  if (title) title.style.viewTransitionName = 'cs-title';
}

function initPageTransitions() {
  document.querySelectorAll('.card[href]').forEach((card) => {
    card.addEventListener('click', () => markMorphTarget(card));
  });

  // Coming back from a case study, morph into the card it came from.
  addEventListener('pagereveal', (e) => {
    if (!e.viewTransition) return;
    const from = self.navigation?.activation?.from?.url;
    if (!from) return;
    const slug = from.split('/').pop();
    if (!slug || !slug.endsWith('.html')) return;
    markMorphTarget(document.querySelector(`.card[href$="${slug}"]`));
    e.viewTransition.finished.finally(clearMorphNames);
  });
}
