// Reads Eventbrite's attendee export (CSV) into rows for import_players().
// Pure, so it can be unit-tested (eventbrite.test.ts). Column names are matched loosely because
// Eventbrite's export varies with the event's order form.

export type ImportRow = {
  email: string;
  name: string;
  coming_with: string | null;
  order_ref: string | null;
  ticket_type: string | null;
};

export type ParsedImport = {
  rows: ImportRow[];
  skipped: { line: number; reason: string }[];
  columns: { email: string | null; name: string | null; comingWith: string | null; order: string | null; ticketType: string | null };
  problem: string | null; // set when the file can't be used at all
};

// RFC 4180-style CSV: quoted fields, doubled quotes, commas and newlines inside quotes, BOM.
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

function findColumn(headers: string[], tests: RegExp[]): number {
  for (const test of tests) {
    const i = headers.findIndex((h) => test.test(h.trim()));
    if (i !== -1) return i;
  }
  return -1;
}

const INACTIVE = /refund|cancel|not attending|transferred|deleted/i;

export function readEventbriteExport(text: string): ParsedImport {
  const table = parseCsv(text);
  const empty = { email: null, name: null, comingWith: null, order: null, ticketType: null };
  if (table.length < 2) {
    return { rows: [], skipped: [], columns: empty, problem: "The file has no attendee rows." };
  }
  const headers = table[0];
  const col = {
    email: findColumn(headers, [/^email$/i, /^attendee e-?mail$/i, /e-?mail/i]),
    first: findColumn(headers, [/^first name$/i, /first/i]),
    last: findColumn(headers, [/^last name$/i, /(last|sur)name/i]),
    name: findColumn(headers, [/^name$/i, /^attendee name$/i, /full name/i]),
    comingWith: findColumn(headers, [/coming with/i, /who are you/i]),
    order: findColumn(headers, [/^order ?#$/i, /order (number|no\.?|id)/i, /^order$/i]),
    ticketType: findColumn(headers, [/ticket type/i]),
    status: findColumn(headers, [/attendee status/i, /^status$/i]),
  };
  const nameHeader = col.name !== -1 ? headers[col.name] : col.first !== -1 ? [headers[col.first], col.last !== -1 ? headers[col.last] : ""].filter(Boolean).join(" + ") : null;
  const columns = {
    email: col.email !== -1 ? headers[col.email] : null,
    name: nameHeader,
    comingWith: col.comingWith !== -1 ? headers[col.comingWith] : null,
    order: col.order !== -1 ? headers[col.order] : null,
    ticketType: col.ticketType !== -1 ? headers[col.ticketType] : null,
  };
  if (col.email === -1) {
    return { rows: [], skipped: [], columns, problem: "No email column found. Export the attendee list from Eventbrite and try again." };
  }

  const get = (r: string[], i: number) => (i === -1 ? "" : (r[i] ?? "").trim());
  const rows: ImportRow[] = [];
  const skipped: ParsedImport["skipped"] = [];
  table.slice(1).forEach((r, idx) => {
    const line = idx + 2; // spreadsheet line number, counting the header
    const email = get(r, col.email).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      skipped.push({ line, reason: email ? `"${email}" isn't an email` : "no email" });
      return;
    }
    const status = get(r, col.status);
    if (status && INACTIVE.test(status)) {
      skipped.push({ line, reason: `${email}: ${status}` });
      return;
    }
    const name = get(r, col.name) || [get(r, col.first), get(r, col.last)].filter(Boolean).join(" ");
    rows.push({
      email,
      name,
      coming_with: get(r, col.comingWith) || null,
      order_ref: get(r, col.order) || null,
      ticket_type: get(r, col.ticketType) || null,
    });
  });
  return { rows, skipped, columns, problem: rows.length ? null : "No usable attendee rows in this file." };
}
