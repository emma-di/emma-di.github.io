-- Bulletin board setup. Paste this whole file into the Supabase SQL editor and Run.
-- Safe to re-run: it drops and recreates cleanly.

create table if not exists public.notes (
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

-- Anyone may read and add. Nobody may edit or delete: there is no policy for
-- either, and no policy means no permission. You delete from the table editor.
drop policy if exists "read notes" on public.notes;
drop policy if exists "add a note" on public.notes;
create policy "read notes" on public.notes for select to anon using (true);
create policy "add a note" on public.notes for insert to anon with check (true);

-- Backstop against a flood: at most 10 new notes a minute, site-wide.
create or replace function public.notes_rate_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.notes
      where created_at > now() - interval '1 minute') >= 10 then
    raise exception 'too many notes right now';
  end if;
  return new;
end $$;

drop trigger if exists notes_throttle on public.notes;
create trigger notes_throttle before insert on public.notes
  for each row execute function public.notes_rate_limit();
