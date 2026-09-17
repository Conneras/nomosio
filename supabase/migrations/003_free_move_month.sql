-- ============================================================================
-- ΝΟΜΟΣΙΟ — 003: η δωρεάν κίνηση του μήνα μένει ίδια όλο τον μήνα
-- ----------------------------------------------------------------------------
-- Τι σπάει χωρίς αυτό: η 002 διάλεγε τη δωρεάν κίνηση από το ΠΛΗΘΟΣ των ενεργών
-- κινήσεων. Αν προστεθεί ή αποσυρθεί κίνηση μέσα στον μήνα, αλλάζει ποια είναι
-- «ανοιχτή για όλους αυτόν τον μήνα», και κάποιος χάνει μια κίνηση που του
-- υποσχεθήκαμε (νομικός έλεγχος 14.9.2026).
--
-- Τώρα: η πρώτη κλήση κάθε μήνα γράφει ποια κίνηση είναι δωρεάν, και ισχύει ως το
-- τέλος του μήνα. Αλλάζει μόνο αν αυτή η κίνηση αποσυρθεί.
-- Ασφαλές να ξανατρέξει. PASS/FAIL στο τέλος.
-- ============================================================================

create table if not exists public.nomosio_moves_free (
  month text primary key check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  move_id text not null references public.nomosio_moves(id),
  created_at timestamptz not null default now()
);
alter table public.nomosio_moves_free enable row level security;
revoke all on public.nomosio_moves_free from anon, authenticated;

-- volatile: γράφει τη δωρεάν κίνηση του μήνα την πρώτη φορά. Η σελίδα την καλεί με POST.
create or replace function public.nomosio_moves()
returns jsonb
language plpgsql
volatile
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
  month_key text := to_char(now() at time zone 'Europe/Athens', 'YYYY-MM');
  free_id text;
  pick text;
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

  -- Η καρφωμένη κίνηση του μήνα, αν υπάρχει και είναι ακόμη ενεργή.
  select f.move_id into free_id
  from public.nomosio_moves_free f
  join public.nomosio_moves mv on mv.id = f.move_id and mv.active
  where f.month = month_key;

  if free_id is null then
    select count(*) into n from public.nomosio_moves where active;
    if n > 0 then
      select mv.id into pick
      from public.nomosio_moves mv
      where mv.active
      order by mv.sort, mv.id
      offset ((extract(year from athens)::int * 12 + extract(month from athens)::int) % n)
      limit 1;

      insert into public.nomosio_moves_free as f (month, move_id)
      values (month_key, pick)
      on conflict (month) do update
        set move_id = excluded.move_id, created_at = now()
        where not exists (select 1 from public.nomosio_moves m2 where m2.id = f.move_id and m2.active);

      -- Δύο επισκέπτες την ίδια στιγμή: μετράει ό,τι γράφτηκε.
      select f.move_id into free_id from public.nomosio_moves_free f where f.month = month_key;
    end if;
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

do $$
declare
  problems text := '';
begin
  if not coalesce((select c.relrowsecurity from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
                   where ns.nspname = 'public' and c.relname = 'nomosio_moves_free'), false) then
    problems := problems || ' RLS κλειστό ή πίνακας λείπει: nomosio_moves_free;';
  end if;
  if has_table_privilege('anon', 'public.nomosio_moves_free', 'select')
     or has_table_privilege('authenticated', 'public.nomosio_moves_free', 'select')
     or has_table_privilege('anon', 'public.nomosio_moves_free', 'insert') then
    problems := problems || ' η σελίδα έχει άδεια στο nomosio_moves_free;';
  end if;
  if not has_function_privilege('anon', 'public.nomosio_moves()', 'execute') then
    problems := problems || ' ο επισκέπτης δεν μπορεί να καλέσει τη nomosio_moves();';
  end if;
  if (select p.provolatile from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
      where ns.nspname = 'public' and p.proname = 'nomosio_moves') <> 'v' then
    problems := problems || ' η nomosio_moves() δεν είναι volatile;';
  end if;
  if problems <> '' then
    raise exception 'FAIL 003_free_move_month:%', problems;
  end if;
  raise notice 'PASS 003_free_move_month';
end
$$;
