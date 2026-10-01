-- Colgrid: the Founding badge is inactive (decided Oct 1, 2026). Safe to re-run.
--
-- Founding used to be given at first sign-in to ticket holders. Colgrid no longer sells tickets
-- (Open Play is the product), and who counts as a founder hasn't been decided, so nobody gets it
-- automatically for now. Signing in only links the account to its player pass.
-- The badge itself stays in the badge list, and anyone who already has it keeps it (rule 3).
-- To turn it back on, give claim_my_pass() (or an admin action) the new rule.

create or replace function public.claim_my_pass()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_player uuid;
begin
  if v_uid is null then
    return null;
  end if;

  -- Already linked.
  select id into v_player from public.player where user_id = v_uid;
  if v_player is not null then
    return v_player;
  end if;

  -- Only a confirmed email can claim a pass. A magic-link or email-code sign-in confirms it.
  select lower(u.email) into v_email from auth.users u
  where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then
    return null;
  end if;

  update public.player set user_id = v_uid
  where email = v_email and user_id is null
  returning id into v_player;

  -- Founding: INACTIVE. No badge is given here until a new rule is chosen.
  return v_player;
end;
$$;

revoke all on function public.claim_my_pass() from public, anon;
grant execute on function public.claim_my_pass() to authenticated;
