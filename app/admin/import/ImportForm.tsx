"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { readEventbriteExport, type ParsedImport } from "@/lib/admin/eventbrite";
import { importPlayers, sendWelcome, type ImportResult, type WelcomeResult } from "../actions";

type SessionOption = { id: string; label: string };

export default function ImportForm({ sessions, preselected }: { sessions: SessionOption[]; preselected: string | null }) {
  const [sessionId, setSessionId] = useState(sessions.find((s) => s.id === preselected)?.id ?? sessions[0].id);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [welcome, setWelcome] = useState<WelcomeResult | null>(null);
  const [pending, startTransition] = useTransition();

  const onFile = async (file: File | undefined) => {
    setResult(null);
    setWelcome(null);
    if (!file) return;
    setFileName(file.name);
    setParsed(readEventbriteExport(await file.text()));
  };

  const breakdown = parsed
    ? Object.entries(
        parsed.rows.reduce<Record<string, number>>((acc, r) => {
          const k = r.coming_with || "No answer";
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      ).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="admin-form">
      <label>
        Session these tickets are for
        <select value={sessionId} onChange={(e: { target: { value: string } }) => setSessionId(e.target.value)}>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Eventbrite export (CSV)
        <input type="file" accept=".csv,text/csv" onChange={(e: { target: { files: FileList | null } }) => onFile(e.target.files?.[0])} />
      </label>

      {parsed?.problem && <p className="admin-error">{parsed.problem}</p>}

      {parsed && !parsed.problem && !result && (
        <div className="admin-preview">
          <p>
            <strong>{parsed.rows.length} players</strong> ready from {fileName}
            {parsed.skipped.length > 0 ? `, ${parsed.skipped.length} rows skipped` : ""}.
          </p>
          <p className="admin-hint">
            Columns found: email = “{parsed.columns.email}”, name = {parsed.columns.name ? `“${parsed.columns.name}”` : "none"}, coming with ={" "}
            {parsed.columns.comingWith ? `“${parsed.columns.comingWith}”` : "not found"}, order = {parsed.columns.order ? `“${parsed.columns.order}”` : "none"}
          </p>
          {breakdown.length > 0 && (
            <p className="admin-hint">
              Coming with: {breakdown.map(([k, n]) => `${k} ${n}`).join(" · ")}
            </p>
          )}
          {parsed.skipped.length > 0 && (
            <details>
              <summary>Skipped rows</summary>
              <ul>
                {parsed.skipped.map((s) => (
                  <li key={s.line}>
                    Line {s.line}: {s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Coming with</th>
                <th>Order</th>
              </tr>
            </thead>
            <tbody>
              {parsed.rows.slice(0, 12).map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.coming_with ?? "—"}</td>
                  <td>{r.order_ref ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsed.rows.length > 12 && <p className="admin-hint">…and {parsed.rows.length - 12} more.</p>}
          <button
            type="button"
            className="button button--primary"
            disabled={pending}
            onClick={() => startTransition(async () => setResult(await importPlayers(sessionId, parsed.rows)))}
          >
            {pending ? "Importing…" : `Import ${parsed.rows.length} players`}
          </button>
        </div>
      )}

      {result && !result.ok && <p className="admin-error">{result.error}</p>}

      {result && result.ok && (
        <div className="admin-preview">
          <p>
            <strong>Done.</strong> {result.players_created} new players, {result.players_existing} already had a pass. {result.tickets_added} tickets
            added{result.tickets_existing ? `, ${result.tickets_existing} were already in` : ""}.
          </p>
          {result.skipped.length > 0 && (
            <p className="admin-hint">
              Skipped: {result.skipped.map((s) => `${s.email ?? `row ${s.row}`} (${s.reason})`).join("; ")}
            </p>
          )}
          <p>Next, send everyone who hasn&apos;t had it yet the “You&apos;re in” email with the link to their pass.</p>
          <button
            type="button"
            className="button button--dark"
            disabled={pending || !!welcome}
            onClick={() => startTransition(async () => setWelcome(await sendWelcome(sessionId)))}
          >
            {pending ? "Sending…" : "Send welcome emails"}
          </button>
          {welcome && (
            <p className={welcome.error ? "admin-error" : "admin-hint"}>
              {welcome.error ? `${welcome.error} ` : ""}
              {welcome.sent} sent{welcome.alreadyWelcomed ? `, ${welcome.alreadyWelcomed} already had it` : ""}.
            </p>
          )}
          <Link href={`/admin/players?session=${sessionId}`}>See this session&apos;s players →</Link>
        </div>
      )}
    </div>
  );
}
