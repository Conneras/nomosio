-- ============================================================================
-- ΝΟΜΟΣΙΟ — σχήμα βάσης (Supabase / Postgres)
-- Εφαρμόζεται ΜΟΝΟ σε δικό του, ξεχωριστό Supabase project.
-- Αρχή: η δημόσια σελίδα μπορεί μόνο να ΓΡΑΦΕΙ (INSERT) και να διαβάζει
-- αποκλειστικά ΣΥΓΚΕΝΤΡΩΤΙΚΑ views. Ωμά δεδομένα δεν διαβάζονται ποτέ από
-- τον ανώνυμο ρόλο.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Λίστα email (write-only από τη σελίδα)
-- ---------------------------------------------------------------------------
create table if not exists public.nomosio_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
    check (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source text not null default 'site' check (char_length(source) <= 40),
  created_at timestamptz not null default now()
);

alter table public.nomosio_subscribers enable row level security;

drop policy if exists "nomosio public subscribe" on public.nomosio_subscribers;
create policy "nomosio public subscribe"
  on public.nomosio_subscribers
  for insert
  to anon
  with check (true);
-- καμία πολιτική select/update/delete για anon

-- ---------------------------------------------------------------------------
-- 2. Ανώνυμες επιλογές επισκεπτών (ψήφοι, ΠΑΡΩΝ, FAQ, πάνελ, αναπτύξεις)
-- ---------------------------------------------------------------------------
create table if not exists public.nomosio_events (
  id uuid primary key default gen_random_uuid(),
  visitor text not null check (char_length(visitor) between 8 and 64),
  kind text not null check (char_length(kind) <= 24),
  key text not null check (char_length(key) <= 64),
  value text not null default '' check (char_length(value) <= 32),
  created_at timestamptz not null default now()
);

alter table public.nomosio_events enable row level security;

drop policy if exists "nomosio events insert" on public.nomosio_events;
create policy "nomosio events insert"
  on public.nomosio_events
  for insert
  to anon
  with check (true);
-- καμία πολιτική select/update/delete για anon

create index if not exists nomosio_events_kind_key
  on public.nomosio_events (kind, key);
create index if not exists nomosio_events_visitor_key
  on public.nomosio_events (visitor, key, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Δημόσια ΣΥΓΚΕΝΤΡΩΤΙΚΑ views (μετρά η τελευταία επιλογή κάθε επισκέπτη)
-- ---------------------------------------------------------------------------
create or replace view public.nomosio_vote_tallies
  with (security_invoker = false) as
select key,
  count(*) filter (where value = 'yes')  as yes,
  count(*) filter (where value = 'no')   as no,
  count(*) filter (where value = 'none') as retracted
from (
  select distinct on (visitor, key) visitor, key, value
  from public.nomosio_events
  where kind = 'vote'
  order by visitor, key, created_at desc
) latest
group by key
order by key;

create or replace view public.nomosio_pledge_count
  with (security_invoker = false) as
select count(*)::int as paron from (
  select distinct on (visitor) value
  from public.nomosio_events
  where kind = 'pledge' and key = 'paron'
  order by visitor, created_at desc
) latest
where value = 'on';

-- Ο ανώνυμος ρόλος διαβάζει ΜΟΝΟ τα δύο views — τίποτα άλλο.
revoke all on public.nomosio_vote_tallies from anon, authenticated;
revoke all on public.nomosio_pledge_count from anon, authenticated;
grant select on public.nomosio_vote_tallies to anon;
grant select on public.nomosio_pledge_count to anon;

-- Ο ανώνυμος ρόλος δεν χρειάζεται τίποτα πέρα από INSERT στους πίνακες.
revoke all on public.nomosio_subscribers from anon, authenticated;
revoke all on public.nomosio_events from anon, authenticated;
grant insert on public.nomosio_subscribers to anon;
grant insert on public.nomosio_events to anon;
