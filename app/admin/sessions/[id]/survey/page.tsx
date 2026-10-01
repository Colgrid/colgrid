import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { rows } from "@/lib/rows";
import { summarizeSurvey, type SurveyRow } from "@/lib/survey";

export default async function SurveyResults({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [sessionRes, questRes, answerRes, attendRes] = await Promise.all([
    supabase.from("session").select("id, number, neighborhood").eq("id", id).maybeSingle(),
    supabase.from("quest").select("id, title, stop_number, is_hidden, is_judged").eq("session_id", id),
    supabase.from("survey_response").select("*").eq("session_id", id),
    supabase.from("attendance").select("player_id", { count: "exact", head: true }).eq("session_id", id),
  ]);
  const session = sessionRes.data as { id: string; number: number; neighborhood: string | null } | null;
  if (!session) notFound();
  const quests = rows<{ id: string; title: string; stop_number: number | null; is_hidden: boolean; is_judged: boolean }>(questRes.data)
    .filter((q) => !q.is_hidden && !q.is_judged)
    .sort((a, b) => (a.stop_number ?? 99) - (b.stop_number ?? 99));
  const answers = rows<SurveyRow>(answerRes.data);
  const s = summarizeSurvey(answers, quests);
  const avg = (n: number | null) => (n === null ? "–" : n.toFixed(1));

  return (
    <>
      <p className="admin-crumb">
        <Link href={`/admin/sessions/${id}`}>← Session {String(session.number).padStart(2, "0")}</Link>
      </p>
      <h1 className="admin-title">Survey</h1>
      <p className="admin-meta">
        {answers.length} of {attendRes.count ?? 0} players answered. Scales are 1–5.
      </p>
      {answers.length === 0 ? (
        <p className="admin-empty">No answers yet.</p>
      ) : (
        <>
          <section className="admin-section">
            <ul className="admin-list">
              {s.scales.map((r) => (
                <li key={r.key} className="admin-quest">
                  <div className="admin-quest__main">
                    <strong>{r.question}</strong>
                    <span>{r.count} answers</span>
                  </div>
                  <div className="admin-quest__side">
                    <span className="mono admin-quest__xp">{avg(r.average)}</span>
                  </div>
                </li>
              ))}
              {s.choices.map((r) => (
                <li key={r.key} className="admin-quest">
                  <div className="admin-quest__main">
                    <strong>{r.question}</strong>
                    <span>{r.counts.map(([label, n]) => `${label} ${n}`).join(" · ")}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          {[
            ["One thing to change", s.changes],
            ["Comments", s.comments],
          ].map(([title, list]) => (
            <section className="admin-section" key={title as string}>
              <h2>{title as string}</h2>
              {(list as string[]).length === 0 ? (
                <p className="admin-empty">None.</p>
              ) : (
                <ul className="admin-list">
                  {(list as string[]).map((t, i) => (
                    <li key={i} className="admin-quest">
                      <div className="admin-quest__main">
                        <span>{t}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </>
      )}
    </>
  );
}
