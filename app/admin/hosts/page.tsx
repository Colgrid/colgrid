import { requireAdmin } from "@/lib/admin/guard";
import { rows } from "@/lib/rows";
import { createHost, deleteHost } from "../actions";
import Notice from "../Notice";

type Host = { id: string; business: string; name: string; contact: string | null };

export default async function Hosts({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const { supabase } = await requireAdmin();
  const [hostRes, questRes] = await Promise.all([
    supabase.from("host").select("id, business, name, contact").order("business"),
    supabase.from("quest").select("host_id"),
  ]);
  const hosts = rows<Host>(hostRes.data);
  const used = new Set(rows<{ host_id: string | null }>(questRes.data).map((q) => q.host_id));

  return (
    <>
      <h1 className="admin-title">Hosts</h1>
      <p className="admin-meta">The local makers, kitchens and guides who run quests. Plan on 3–4 for the pilot.</p>
      <Notice msg={msg} />

      <section className="admin-section">
        {hosts.length === 0 ? (
          <p className="admin-empty">No hosts yet.</p>
        ) : (
          <ul className="admin-list">
            {hosts.map((h) => (
              <li key={h.id} className="admin-quest">
                <div className="admin-quest__main">
                  <strong>{h.business}</strong>
                  <span>
                    {h.name}
                    {h.contact ? ` · ${h.contact}` : ""}
                  </span>
                </div>
                <div className="admin-quest__side">
                  {used.has(h.id) ? (
                    <span className="admin-hint">Hosting a quest</span>
                  ) : (
                    <form action={deleteHost}>
                      <input type="hidden" name="id" value={h.id} />
                      <button type="submit" className="link-button link-button--danger">
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-section">
        <h2>Add a host</h2>
        <form action={createHost} className="admin-form">
          <label>
            Business
            <input name="business" required maxLength={120} placeholder="e.g. Ninth & Ninth Pottery" />
          </label>
          <label>
            Contact name
            <input name="name" required maxLength={80} />
          </label>
          <label>
            Email or phone (optional)
            <input name="contact" maxLength={160} />
          </label>
          <button className="button button--primary" type="submit">
            Add host
          </button>
        </form>
      </section>
    </>
  );
}
