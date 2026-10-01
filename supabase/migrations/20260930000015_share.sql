-- Colgrid: sharing, phase 1 (native share sheet + Save image). Basic counts only.
-- Run after 20260930000014_contact.sql. Safe to re-run.
-- No social accounts, no posting on anyone's behalf, no feed: we only count what players chose to do.

create table if not exists public.share_event (
  id bigint generated always as identity primary key,
  player_id uuid references public.player (id) on delete set null,
  kind text not null check (kind in ('mission', 'all', 'hidden', 'level')),
  action text not null check (action in ('opened', 'shared', 'saved', 'copied', 'cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists share_event_created_idx on public.share_event (created_at desc);
alter table public.share_event enable row level security;
drop policy if exists "admins read shares" on public.share_event;
create policy "admins read shares" on public.share_event for select using (public.is_admin());
revoke all on public.share_event from public, anon, authenticated;
grant select on public.share_event to authenticated; -- admins only, through the policy

-- Players log their own share actions (one call per tap). Light limit so it can't be spammed.
create or replace function public.log_share(p_kind text, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare v_player uuid := public.current_player_id();
begin
  if v_player is null or p_kind not in ('mission', 'all', 'hidden', 'level')
     or p_action not in ('opened', 'shared', 'saved', 'copied', 'cancelled') then
    return;
  end if;
  if (select count(*) from public.share_event where player_id = v_player and created_at > now() - interval '1 minute') >= 20 then
    return;
  end if;
  insert into public.share_event (player_id, kind, action) values (v_player, p_kind, p_action);
end;
$$;
revoke all on function public.log_share(text, text) from public, anon;
grant execute on function public.log_share(text, text) to authenticated;
