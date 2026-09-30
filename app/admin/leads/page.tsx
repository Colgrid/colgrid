import { requireAdmin } from "@/lib/admin/guard";
import { rows } from "@/lib/rows";
import { formatWhen } from "@/lib/time";
import { setLeadStatus } from "../actions";
import Notice from "../Notice";

type Lead = {
  id: string;
  kind: "corporate" | "host" | "contact";
  name: string;
  email: string;
  organization: string | null;
  phone: string | null;
  group_size: number | null;
  preferred_dates: string | null;
  message: string | null;
  status: string;
  created_at: string;
};
const STATUSES = ["new", "contacted", "won", "lost"];

export default async function AdminLeads({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("lead").select("*").order("created_at", { ascending: false }).limit(200);
  const leads = rows<Lead>(data);
  return (
    <>
      <h1 className="admin-title">Leads</h1>
      <p className="admin-meta">From the corporate, host and contact forms. You also get each one by email.</p>
      <Notice msg={msg} />
      {leads.length === 0 ? (
        <p className="admin-empty">No leads yet.</p>
      ) : (
        <ul className="admin-list">
          {leads.map((l) => (
            <li key={l.id} className="admin-quest">
              <div className="admin-quest__main">
                <strong>
                  {l.kind === "host" ? "Host" : l.kind === "contact" ? "Message" : "Corporate"} · {l.organization ?? l.name}
                </strong>
                <span>
                  {l.name} · <a href={`mailto:${l.email}`}>{l.email}</a>
                  {l.phone ? ` · ${l.phone}` : ""}
                  {l.group_size ? ` · ${l.group_size} players` : ""}
                  {l.preferred_dates ? ` · ${l.preferred_dates}` : ""}
                </span>
                {l.message && <span>“{l.message}”</span>}
                <span>{formatWhen(l.created_at)}</span>
              </div>
              <div className="admin-quest__side">
                <form action={setLeadStatus} className="lead-status">
                  <input type="hidden" name="id" value={l.id} />
                  <select name="status" defaultValue={l.status} aria-label="Status">
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="link-button">
                    Save
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
