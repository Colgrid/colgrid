-- Colgrid: the contact form (instead of a public email address) goes through the same lead table.
-- Run after 20260930000013_location.sql. Safe to re-run.
alter table public.lead drop constraint if exists lead_kind_check;
alter table public.lead add constraint lead_kind_check check (kind in ('corporate', 'host', 'contact'));

create or replace function public.submit_lead(
  p_kind text, p_name text, p_email text, p_organization text, p_phone text,
  p_group_size int, p_preferred_dates text, p_message text
) returns text language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(coalesce(p_email, '')));
begin
  if p_kind not in ('corporate', 'host', 'contact') then return 'invalid'; end if;
  if nullif(trim(coalesce(p_name, '')), '') is null or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return 'invalid'; end if;
  if p_kind = 'contact' and nullif(trim(coalesce(p_message, '')), '') is null then return 'invalid'; end if;
  if exists (select 1 from public.lead where email = v_email and kind = p_kind and created_at > now() - interval '10 minutes') then
    return 'duplicate';
  end if;
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
