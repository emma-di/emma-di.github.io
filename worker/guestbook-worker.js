/**
 * Bulletin board backend — Cloudflare Worker + KV.
 *
 * Deploy: Cloudflare dashboard → Workers & Pages → Create Worker → paste this,
 * then bind a KV namespace as NOTES. Setup steps are in the repo README.
 *
 * GET  /notes  -> newest notes, as JSON
 * POST /notes  -> {name, message}
 */

const NOTE_MAX = 280;
const NAME_MAX = 32;
const LIST_LIMIT = 60;
const COOLDOWN_S = 30; // per IP
const BURST_MAX = 10; // site-wide, per minute

const URL_RE =
  /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|ru|xyz|shop|link)\b)/i;

const ALLOWED_ORIGINS = [
  "https://emma-di.github.io",
  "http://localhost:4321",
  "http://127.0.0.1:4321",
];

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) },
  });
}

async function listNotes(env) {
  const { keys } = await env.NOTES.list({ prefix: "note:", limit: 1000 });
  // keys are note:<ms>:<rand>, so a lexical sort is chronological
  keys.sort((a, b) => (a.name < b.name ? 1 : -1));
  const wanted = keys.slice(0, LIST_LIMIT);
  const notes = await Promise.all(
    wanted.map((k) => env.NOTES.get(k.name, { type: "json" })),
  );
  return notes.filter(Boolean);
}

async function addNote(request, env, origin) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  // one note per IP per COOLDOWN_S
  if (await env.NOTES.get(`rate:${ip}`)) {
    return json({ error: "Give it a few seconds." }, 429, origin);
  }

  // site-wide burst ceiling, so one person can't flood the board
  const minute = Math.floor(Date.now() / 60000);
  const burstKey = `burst:${minute}`;
  const burst = Number((await env.NOTES.get(burstKey)) || 0);
  if (burst >= BURST_MAX) {
    return json({ error: "Too many notes right now." }, 429, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad request." }, 400, origin);
  }

  const name = String(body?.name ?? "").trim();
  const message = String(body?.message ?? "").trim();

  if (!name || !message)
    return json({ error: "Need a name and a note." }, 400, origin);
  if (name.length > NAME_MAX || message.length > NOTE_MAX)
    return json({ error: "A bit too long." }, 400, origin);
  if (URL_RE.test(name) || URL_RE.test(message))
    return json({ error: "Links are not allowed." }, 400, origin);

  const now = Date.now();
  const id = `${now}:${crypto.randomUUID().slice(0, 8)}`;
  const note = { id, name, message, created_at: new Date(now).toISOString() };

  await env.NOTES.put(`note:${id}`, JSON.stringify(note));
  await env.NOTES.put(`rate:${ip}`, "1", { expirationTtl: COOLDOWN_S });
  await env.NOTES.put(burstKey, String(burst + 1), { expirationTtl: 120 });

  return json({ ok: true }, 201, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const { pathname } = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (pathname !== "/notes") {
      return json({ error: "Not found." }, 404, origin);
    }
    if (request.method === "GET") {
      return json(await listNotes(env), 200, origin);
    }
    if (request.method === "POST") {
      return addNote(request, env, origin);
    }
    return json({ error: "Method not allowed." }, 405, origin);
  },
};
