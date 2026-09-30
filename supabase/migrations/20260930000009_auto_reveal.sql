-- Colgrid: the location-reveal email sends itself.
-- Run after 20260929000008_team.sql. Safe to re-run.
--
-- How it works: every 5 minutes Supabase pings getcolgrid.com/api/cron/reveal (see
-- 20260930000010_reveal_schedule.sql). The website asks cron_due_reveals() which sessions just
-- revealed their start location, emails their ticket holders, and each session is emailed once.
-- The ping carries a random secret that is created here and never leaves the database, so no
-- one else can trigger it or read the guest list.

alter table public.session add column if not exists reveal_emailed_at timestamptz;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.app_secret (
  name text primary key,
  value text not null
);
revoke all on private.app_secret from public, anon, authenticated;
insert into private.app_secret (name, value)
values ('cron', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

create or replace function private.cron_ok(p_secret text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_secret, '') <> '' and exists (select 1 from private.app_secret where name = 'cron' and value = p_secret);
$$;

-- Claims every session whose location has just been revealed and hasn't been emailed yet, and
-- returns what the email needs. Only sessions that haven't started, so a late fix never
-- emails a finished gathering.
create or replace function public.cron_due_reveals(p_secret text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not private.cron_ok(p_secret) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;

  with due as (
    update public.session s set reveal_emailed_at = now()
    where s.reveal_emailed_at is null
      and s.status = 'scheduled'
      and s.revealed_at is not null and s.revealed_at <= now()
      and s.starts_at > now()
      and nullif(trim(s.start_location), '') is not null
    returning s.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', d.id,
           'number', d.number,
           'season_number', se.number,
           'neighborhood', d.neighborhood,
           'starts_at', d.starts_at,
           'start_location', d.start_location,
           'recipients', (select coalesce(jsonb_agg(jsonb_build_object('email', p.email, 'name', p.name)), '[]'::jsonb)
                          from public.ticket t join public.player p on p.id = t.player_id
                          where t.session_id = d.id)
         )), '[]'::jsonb)
  into v
  from due d join public.season se on se.id = d.season_id;
  return v;
end;
$$;

-- If the email provider refuses the send, release the claim so the next ping tries again.
create or replace function public.cron_reveal_failed(p_secret text, p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not private.cron_ok(p_secret) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;
  update public.session set reveal_emailed_at = null where id = p_session_id;
end;
$$;

-- The website calls these without a signed-in user; the secret is the lock.
revoke all on function private.cron_ok(text) from public, anon, authenticated;
revoke all on function public.cron_due_reveals(text) from public;
revoke all on function public.cron_reveal_failed(text, uuid) from public;
grant execute on function public.cron_due_reveals(text) to anon, authenticated;
grant execute on function public.cron_reveal_failed(text, uuid) to anon, authenticated;
