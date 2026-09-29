// Every admin page and admin action starts here. Row-level security enforces the same rule in the
// database; this check just sends non-admins somewhere useful instead of showing empty screens.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin?next=/admin");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) redirect("/pass");
  return { supabase, user };
}
