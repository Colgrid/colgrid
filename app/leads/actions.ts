"use server";

// The two home-page forms: corporate private runs and quest hosts. Anyone can send one; the
// database checks and stores it (submit_lead), and Matt gets an email so no lead sits unseen.
import { redirect } from "next/navigation";
import { FROM, escapeHtml, sendBatch, shell } from "@/lib/email/resend";
import { SITE } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { turnstilePasses } from "@/lib/turnstile";

const field = (form: FormData, key: string, max = 200) => {
  const v = String(form.get(key) ?? "").trim().slice(0, max);
  return v === "" ? null : v;
};

export async function submitLead(form: FormData) {
  const raw = form.get("kind");
  const kind = raw === "host" ? "host" : raw === "contact" ? "contact" : "corporate";
  // Hidden field real people never fill in; bots do. Pretend it worked.
  if (field(form, "website")) redirect(`/thanks?kind=${kind}`);
  // Cloudflare Turnstile (when switched on): no token or a failed check = likely a bot.
  if (!(await turnstilePasses(field(form, "cf-turnstile-response", 4096)))) redirect(`/thanks?kind=${kind}&error=bot`);

  const lead = {
    name: field(form, "name", 120),
    email: field(form, "email", 200),
    organization: field(form, "organization", 160),
    phone: field(form, "phone", 40),
    groupSize: kind === "corporate" ? Number(field(form, "group_size", 6)) || null : null,
    dates: field(form, "preferred_dates", 200),
    message: field(form, "message", 2000),
  };
  // The challenge form (home page) also asks where. There is no column for it, so it rides in the message.
  const location = field(form, "location", 160);
  if (location) lead.message = `Challenge inquiry. Location: ${location}\n\n${lead.message ?? ""}`.slice(0, 2000);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_lead", {
    p_kind: kind,
    p_name: lead.name,
    p_email: lead.email,
    p_organization: lead.organization,
    p_phone: lead.phone,
    p_group_size: lead.groupSize,
    p_preferred_dates: lead.dates,
    p_message: lead.message,
  });
  if (error || data === "busy") redirect(`/thanks?kind=${kind}&error=busy`);
  if (data === "invalid") redirect(`/thanks?kind=${kind}&error=invalid`);

  if (data === "ok") {
    const title = kind === "host" ? "New quest host lead" : kind === "contact" ? "New message from the website" : "New corporate run lead";
    const rows: [string, string | number | null][] = [
      ["Name", lead.name],
      ["Email", lead.email],
      [kind === "host" ? "Business" : "Company", lead.organization],
      ["Phone", lead.phone],
      ["Group size", lead.groupSize],
      ["Dates", lead.dates],
      ["Message", lead.message],
    ];
    const filled = rows.filter(([, v]) => v != null && v !== "");
    await sendBatch([
      {
        from: FROM,
        to: [SITE.notifyEmail],
        reply_to: lead.email ?? undefined,
        subject: `${title}: ${lead.organization ?? lead.name}`,
        text: [...filled.map(([k, v]) => `${k}: ${v}`), "", `All leads: ${SITE.appUrl}/admin/leads`].join("\n"),
        html: shell(
          title,
          filled.map(([k, v]) => `<strong style="color:#F4F5F7;">${k}:</strong> ${escapeHtml(String(v))}`),
          { label: "Open leads", href: `${SITE.appUrl}/admin/leads` },
        ),
      },
    ]).catch(() => null); // the lead is saved either way
  }
  redirect(`/thanks?kind=${kind}`);
}
