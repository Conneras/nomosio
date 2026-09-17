-- ============================================================================
-- ΝΟΜΟΣΙΟ — 002: Νομόσιο+ (συνδρομητές, Stripe, Έξυπνες Κινήσεις)
-- ----------------------------------------------------------------------------
-- Τι σπάει χωρίς αυτό: η σελίδα /kiniseis δεν βρίσκει κινήσεις, και μια πληρωμή
-- στο Stripe δεν ανοίγει τίποτα, γιατί δεν υπάρχει πού να γραφτεί ο συνδρομητής.
--
-- Ασφαλές να ξανατρέξει (if not exists / create or replace). Τελειώνει με έλεγχο
-- που γράφει PASS ή σταματά με FAIL.
--
-- Αρχή, ίδια με το schema.sql: η σελίδα δεν διαβάζει ΠΟΤΕ πίνακα απευθείας,
-- ούτε ο ανώνυμος επισκέπτης ούτε ο συνδεδεμένος χρήστης. Όλα περνούν από τη
-- συνάρτηση nomosio_moves(), που αποφασίζει τι ανοίγει σε ποιον. Στους πίνακες
-- γράφουν μόνο οι edge functions, με το secret key.
-- ============================================================================

-- 1. Σε ποια λειτουργία τρέχει το Stripe (δοκιμαστική ή πραγματική).
--    Τη γράφει το webhook· τη διαβάζει η nomosio_moves(), ώστε ένας δοκιμαστικός
--    συνδρομητής να μην ανοίγει ποτέ κινήσεις όταν το Stripe τρέχει πραγματικά.
create table if not exists public.nomosio_plus_settings (
  key text primary key check (char_length(key) <= 40),
  value text not null check (char_length(value) <= 200),
  updated_at timestamptz not null default now()
);

-- 2. Συνδρομητές. Τον πελάτη Stripe τον γράφει το checkout, την κατάσταση μόνο το webhook.
create table if not exists public.nomosio_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (char_length(email) <= 254),
  livemode boolean not null default false,
  stripe_customer text unique check (char_length(stripe_customer) <= 255),
  stripe_subscription text unique check (char_length(stripe_subscription) <= 255),
  plan text check (plan in ('month', 'year')),
  status text not null default 'none' check (char_length(status) <= 24),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  refunded_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 3. Γεγονότα Stripe που έχουν ήδη περάσει, με το id τους (ποτέ με την ώρα τους).
create table if not exists public.nomosio_stripe_events (
  id text primary key check (char_length(id) <= 255),
  type text not null check (char_length(type) <= 80),
  livemode boolean not null,
  received_at timestamptz not null default now()
);

-- 4. Συγκαταθέσεις πριν την πληρωμή: παραίτηση από τις 14 ημέρες και αποδοχή όρων.
--    Μένουν και μετά τη διαγραφή λογαριασμού (το user_id γίνεται null), ως απόδειξη.
create table if not exists public.nomosio_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stripe_customer text check (char_length(stripe_customer) <= 255),
  kind text not null check (kind in ('withdrawal_waiver', 'terms')),
  terms_version text not null check (char_length(terms_version) <= 40),
  plan text check (plan in ('month', 'year')),
  checkout_session text check (char_length(checkout_session) <= 255),
  created_at timestamptz not null default now()
);
create index if not exists nomosio_consents_user on public.nomosio_consents (user_id);

-- 5. Οι Έξυπνες Κινήσεις. Πηγή αλήθειας: data/moves.json, περνά εδώ με tools/moves-sql.js.
create table if not exists public.nomosio_moves (
  id text primary key check (id ~ '^[a-z0-9-]{3,64}$'),
  sort int not null default 100,
  theme text not null check (theme in ('work', 'home', 'health', 'rights')),
  title text not null check (char_length(title) <= 120),
  who text[] not null default '{}',
  benefit text not null check (char_length(benefit) <= 400),
  law text check (char_length(law) <= 160),
  nomosio_ref text check (char_length(nomosio_ref) <= 200),
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  watch_out text check (char_length(watch_out) <= 500),
  deadline_text text check (char_length(deadline_text) <= 500),
  deadline_url text check (deadline_url ~ '^https://'),
  action_url text not null check (action_url ~ '^https://'),
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  checked_on date not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Δύο στρώματα κλειδώματος: RLS ενεργό ΚΑΙ καμία άδεια στους ρόλους της σελίδας.
alter table public.nomosio_plus_settings enable row level security;
alter table public.nomosio_members enable row level security;
alter table public.nomosio_stripe_events enable row level security;
alter table public.nomosio_consents enable row level security;
alter table public.nomosio_moves enable row level security;
revoke all on public.nomosio_plus_settings, public.nomosio_members, public.nomosio_stripe_events,
  public.nomosio_consents, public.nomosio_moves from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. nomosio_moves(): η ΜΟΝΗ πόρτα της σελίδας προς τις κινήσεις.
--    Όλοι βλέπουν τίτλο, ποιον αφορά και τι κερδίζει. Ολόκληρη ανοίγει:
--    (α) μία κίνηση τον μήνα για όλους, με σειρά που αλλάζει κάθε ημερολογιακό
--        μήνα (ώρα Ελλάδας), και (β) όλες για ενεργό συνδρομητή.
--    Ο κανόνας «ενεργός» είναι ίδιος με το isActiveMember() στις edge functions.
-- ---------------------------------------------------------------------------
create or replace function public.nomosio_moves()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  live boolean := coalesce(
    (select s.value = 'true' from public.nomosio_plus_settings s where s.key = 'stripe_livemode'), false);
  m public.nomosio_members%rowtype;
  has_row boolean := false;
  is_member boolean := false;
  n int;
  athens timestamp := now() at time zone 'Europe/Athens';
  free_id text;
  result jsonb;
begin
  if uid is not null then
    select * into m from public.nomosio_members where user_id = uid;
    has_row := found;
    if has_row then
      is_member := m.livemode = live
        and m.refunded_at is null
        and m.status in ('active', 'trialing', 'past_due');
    end if;
  end if;

  select count(*) into n from public.nomosio_moves where active;
  if n > 0 then
    select mv.id into free_id
    from public.nomosio_moves mv
    where mv.active
    order by mv.sort, mv.id
    offset ((extract(year from athens)::int * 12 + extract(month from athens)::int) % n)
    limit 1;
  end if;

  select coalesce(jsonb_agg(
    case when is_member or mv.id = free_id then
      jsonb_build_object(
        'id', mv.id, 'sort', mv.sort, 'theme', mv.theme, 'title', mv.title,
        'who', to_jsonb(mv.who), 'benefit', mv.benefit, 'law', mv.law, 'ref', mv.nomosio_ref,
        'checked_on', mv.checked_on, 'open', true, 'free', mv.id = free_id,
        'steps', mv.steps, 'watch_out', mv.watch_out, 'deadline_text', mv.deadline_text,
        'deadline_url', mv.deadline_url, 'action_url', mv.action_url, 'sources', mv.sources)
    else
      jsonb_build_object(
        'id', mv.id, 'sort', mv.sort, 'theme', mv.theme, 'title', mv.title,
        'who', to_jsonb(mv.who), 'benefit', mv.benefit, 'law', mv.law, 'ref', mv.nomosio_ref,
        'checked_on', mv.checked_on, 'open', false, 'free', false,
        'steps_count', jsonb_array_length(mv.steps))
    end
    order by mv.sort, mv.id), '[]'::jsonb)
  into result
  from public.nomosio_moves mv
  where mv.active;

  return jsonb_build_object(
    'signed_in', uid is not null,
    'member', case when not has_row then null else jsonb_build_object(
      'active', is_member, 'plan', m.plan, 'status', m.status,
      'period_end', m.current_period_end, 'cancel_at_period_end', m.cancel_at_period_end) end,
    'moves', result);
end
$$;

revoke all on function public.nomosio_moves() from public;
grant execute on function public.nomosio_moves() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Έλεγχος: PASS ή σταματά με FAIL
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  problems text := '';
begin
  foreach t in array array['nomosio_plus_settings', 'nomosio_members', 'nomosio_stripe_events',
                           'nomosio_consents', 'nomosio_moves'] loop
    if not coalesce((select c.relrowsecurity from pg_class c
                     join pg_namespace ns on ns.oid = c.relnamespace
                     where ns.nspname = 'public' and c.relname = t), false) then
      problems := problems || format(' RLS κλειστό ή πίνακας λείπει: %s;', t);
    end if;
    if has_table_privilege('anon', format('public.%I', t), 'select')
       or has_table_privilege('authenticated', format('public.%I', t), 'select') then
      problems := problems || format(' η σελίδα μπορεί να διαβάσει το %s;', t);
    end if;
    if has_table_privilege('anon', format('public.%I', t), 'insert')
       or has_table_privilege('authenticated', format('public.%I', t), 'insert')
       or has_table_privilege('authenticated', format('public.%I', t), 'update') then
      problems := problems || format(' η σελίδα μπορεί να γράψει στο %s;', t);
    end if;
  end loop;
  if not has_function_privilege('anon', 'public.nomosio_moves()', 'execute') then
    problems := problems || ' ο επισκέπτης δεν μπορεί να καλέσει τη nomosio_moves();';
  end if;
  if problems <> '' then
    raise exception 'FAIL 002_plus:%', problems;
  end if;
  raise notice 'PASS 002_plus';
end
$$;
