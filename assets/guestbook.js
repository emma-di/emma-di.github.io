/* Bulletin board — visitor notes, stored in Supabase.
   Fill both values in to go live. Until then the board only renders locally. */

const GUESTBOOK = {
  url: 'https://kvnacdxnxpggisplbqif.supabase.co',
  // Publishable key: client-safe by design, protected by row-level security.
  // Never put an sb_secret_ key in this repo.
  anonKey: 'sb_publishable_lH0sZpq6_tzh-tbNlXt2qQ_jYVjVm-9',
};

const NOTE_MAX = 280;
const NAME_MAX = 32;
const POST_COOLDOWN_MS = 30_000;
const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|ru|xyz|shop|link)\b)/i;

const DEMO_NOTES = [
  { id: 'd1', name: 'demo', message: 'this is what a note looks like', created_at: new Date().toISOString() },
  { id: 'd2', name: 'also demo', message: 'not live until the Supabase keys are in', created_at: new Date().toISOString() },
];

// Kill switch. Flip to true to show the board again.
const ENABLED = false;

const configured = () =>
  ENABLED && Boolean(GUESTBOOK.url && GUESTBOOK.anonKey);
const isLocal = () => ['localhost', '127.0.0.1'].includes(location.hostname);

function headers() {
  return {
    apikey: GUESTBOOK.anonKey,
    Authorization: `Bearer ${GUESTBOOK.anonKey}`,
    'Content-Type': 'application/json',
  };
}

/* Deterministic per-note tilt and colour, so nothing jumps between renders. */
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function renderNotes(list, notes) {
  list.textContent = '';
  if (!notes.length) {
    const empty = document.createElement('p');
    empty.className = 'board__empty';
    empty.textContent = 'No notes yet. Be the first.';
    list.append(empty);
    return;
  }
  notes.forEach((n) => {
    const h = hash(String(n.id));
    const note = document.createElement('article');
    note.className = `note note--c${h % 4}`;
    note.style.setProperty('--tilt', `${(h % 5) - 2}deg`);

    const pin = document.createElement('span');
    pin.className = 'note__pin';
    pin.dataset.sprite = 'pin';
    pin.dataset.unit = '3';
    pin.dataset.accent = '#FFFBF5';

    // textContent, never innerHTML — these strings come from strangers
    const body = document.createElement('p');
    body.className = 'note__body';
    body.textContent = n.message;

    const who = document.createElement('div');
    who.className = 'note__who';
    who.textContent = n.name;

    note.append(pin, body, who);
    list.append(note);
  });
  if (typeof mountSprites === 'function') mountSprites(list);
}

function initGuestbook() {
  const section = document.querySelector('#notes');
  if (!section) return;

  // Nothing to show and nowhere to post: hide it rather than ship a dead form.
  if (!configured() && !isLocal()) {
    section.remove();
    document.querySelector('.nav__links a[href="#notes"]')?.remove();
    return;
  }

  const list = section.querySelector('.board__list');
  const form = section.querySelector('.board__form');
  const name = form.querySelector('[name="name"]');
  const message = form.querySelector('[name="message"]');
  const trap = form.querySelector('[name="website"]'); // honeypot, hidden from people
  const count = form.querySelector('.board__count');
  const status = form.querySelector('.board__status');
  const button = form.querySelector('button');

  const say = (msg, bad) => {
    status.textContent = msg;
    status.classList.toggle('is-bad', Boolean(bad));
  };

  message.addEventListener('input', () => {
    count.textContent = `${message.value.length}/${NOTE_MAX}`;
  });

  if (!configured()) {
    renderNotes(list, DEMO_NOTES);
    button.disabled = true;
    say('Demo only. Add the Supabase keys to go live.');
    return;
  }

  async function load() {
    try {
      const r = await fetch(
        `${GUESTBOOK.url}/rest/v1/notes?select=id,name,message,created_at&order=created_at.desc&limit=60`,
        { headers: headers() },
      );
      if (!r.ok) throw new Error(r.status);
      renderNotes(list, await r.json());
    } catch {
      say("Couldn't load the notes right now.", true);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (trap.value) return; // a bot filled the hidden field

    const who = name.value.trim();
    const what = message.value.trim();
    if (!who || !what) return say('Need a name and a note.', true);
    if (who.length > NAME_MAX || what.length > NOTE_MAX) return say('A bit too long.', true);
    if (URL_RE.test(what) || URL_RE.test(who)) return say('Links aren’t allowed, sorry.', true);

    let last = 0;
    try { last = Number(localStorage.getItem('gb:last') || 0); } catch {}
    if (Date.now() - last < POST_COOLDOWN_MS) return say('Give it a few seconds.', true);

    button.disabled = true;
    say('Pinning it up...');
    try {
      const r = await fetch(`${GUESTBOOK.url}/rest/v1/notes`, {
        method: 'POST',
        headers: { ...headers(), Prefer: 'return=minimal' },
        body: JSON.stringify({ name: who, message: what }),
      });
      if (!r.ok) throw new Error(r.status);
      try { localStorage.setItem('gb:last', String(Date.now())); } catch {}
      form.reset();
      count.textContent = `0/${NOTE_MAX}`;
      say('Thanks! It’s up there now.');
      load();
    } catch {
      say("That didn't go through. Try again in a minute.", true);
    } finally {
      button.disabled = false;
    }
  });

  load();
}

document.addEventListener('DOMContentLoaded', initGuestbook);
