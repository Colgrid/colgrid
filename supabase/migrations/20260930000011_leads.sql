-- Colgrid: lead forms on the home page (corporate private runs and quest hosts).
-- Run after 20260930000009_auto_reveal.sql. Safe to re-run.
-- Anyone can submit (no sign-in); only admins can read. Light limits stop form spam.

create table if not exists public.lead (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('corporate', 'host')),
  name text not null check (length(name) between 1 and 120),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200),
  organization text check (length(organization) <= 160),   -- company, or the host's business
  phone text check (length(phone) <= 40),
  group_size int check (group_size between 1 and 1000),     -- corporate only
  preferred_dates text check (length(preferred_dates) <= 200),
  message text check (length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'won', 'lost')),
  created_at timestamptz not null default now()
);
create index if not exists lead_created_idx on public.lead (created_at desc);
alter table public.lead enable row level security;
drop policy if exists "admins manage leads" on public.lead;
create policy "admins manage leads" on public.lead for all using (public.is_admin()) with check (public.is_admin());
revoke all on public.lead from public, anon, authenticated;
grant select, update on public.lead to authenticated;  -- still admin-only through the policy

create or replace function public.submit_lead(
  p_kind text, p_name text, p_email text, p_organization text, p_phone text,
  p_group_size int, p_preferred_dates text, p_message text
) returns text language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(coalesce(p_email, '')));
begin
  if p_kind not in ('corporate', 'host') then return 'invalid'; end if;
  if nullif(trim(coalesce(p_name, '')), '') is null or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return 'invalid'; end if;
  -- Same address, same form, within 10 minutes: treat as a double-submit.
  if exists (select 1 from public.lead where email = v_email and kind = p_kind and created_at > now() - interval '10 minutes') then
    return 'duplicate';
  end if;
  -- More than 30 submissions in an hour from everyone: something is spamming.
  if (select count(*) from public.lead where created_at > now() - interval '1 hour') >= 30 then
    return 'busy';
  end if;
  insert into public.lead (kind, name, email, organization, phone, group_size, preferred_dates, message)
  values (p_kind, left(trim(p_name), 120), v_email, left(nullif(trim(p_organization), ''), 160), left(nullif(trim(p_phone), ''), 40),
          case when p_kind = 'corporate' then p_group_size end, left(nullif(trim(p_preferred_dates), ''), 200),
          left(nullif(trim(p_message), ''), 2000));
  return 'ok';
end;
$$;
revoke all on function public.submit_lead(text, text, text, text, text, int, text, text) from public;
grant execute on function public.submit_lead(text, text, text, text, text, int, text, text) to anon, authenticated;
