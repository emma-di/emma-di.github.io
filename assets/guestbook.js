/* Bulletin board — visitor notes, stored by a Cloudflare Worker (worker/guestbook-worker.js).
   Set API to the deployed Worker URL to go live. Until then the board renders
   demo notes on localhost and removes itself everywhere else.

   If the backend ever stops responding the section deletes itself rather than
   showing an error. A dead board should be invisible, not broken. */

const API = 'https://emma-guestbook.emma-tingyu.workers.dev';

const NOTE_MAX = 280;
const NAME_MAX = 32;
const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|ru|xyz|shop|link)\b)/i;

const DEMO_NOTES = [
  { id: 'd1', name: 'demo', message: 'this is what a note looks like' },
  { id: 'd2', name: 'also demo', message: 'not live until the Worker URL is set' },
];

const isLocal = () => ['localhost', '127.0.0.1'].includes(location.hostname);

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

  const remove = () => {
    section.remove();
    document.querySelector('.nav__links a[href="#notes"]')?.remove();
  };

  if (!API && !isLocal()) return remove();

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

  if (!API) {
    renderNotes(list, DEMO_NOTES);
    button.disabled = true;
    say('Demo only. Set API to the Worker URL to go live.');
    return;
  }

  let shown = [];

  async function load() {
    try {
      const r = await fetch(`${API}/notes`);
      if (!r.ok) throw new Error(r.status);
      shown = await r.json();
      renderNotes(list, shown);
    } catch {
      // backend is gone: take the section down instead of showing a broken one
      remove();
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

    button.disabled = true;
    say('Pinning it up...');
    try {
      const r = await fetch(`${API}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: who, message: what }),
      });
      if (!r.ok) {
        const { error } = await r.json().catch(() => ({}));
        return say(error || "That didn't go through.", true);
      }
      // KV is eventually consistent, so re-fetching here often misses the note
      // that was just written. Show it straight away instead.
      const { note } = await r.json().catch(() => ({}));
      if (note) shown.unshift(note);
      renderNotes(list, shown);
      form.reset();
      count.textContent = `0/${NOTE_MAX}`;
      say('Thanks! It’s up there now.');
    } catch {
      say("That didn't go through. Try again in a minute.", true);
    } finally {
      button.disabled = false;
    }
  });

  load();
}

document.addEventListener('DOMContentLoaded', initGuestbook);
