"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Record a photo the participant just uploaded to their own folder. The database checks the ask
// needs a photo, the challenge is open, the caller is on a team, and the file is in the caller's folder.
export async function recordPhoto(questId: string, path: string): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_photo", { p_quest_id: questId, p_storage_path: path });
  if (error) return "error";
  const status = String((data as { status?: string } | null)?.status ?? "error");
  if (status === "ok") revalidatePath("/pass");
  return status;
}
