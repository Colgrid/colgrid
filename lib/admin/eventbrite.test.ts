// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, readEventbriteExport } from "./eventbrite.ts";

test("CSV: quotes, commas and newlines inside fields, BOM, CRLF", () => {
  const rows = parseCsv('﻿a,b,c\r\n"x, y","he said ""hi""","two\nlines"\r\n');
  assert.deepEqual(rows, [["a", "b", "c"], ["x, y", 'he said "hi"', "two\nlines"]]);
});

test("reads an Eventbrite attendee export", () => {
  const csv = [
    "Order #,Order Date,First Name,Last Name,Email,Quantity,Ticket Type,Attendee Status,Who are you coming with?,I'm 18 or older",
    "1001,2026-10-01,Rosa,Delgado,Rosa@Example.com,1,Colgrid Pilot,Attending,Friends,Yes",
    "1001,2026-10-01,Jonah,Kim,jonah@example.com,1,Colgrid Pilot,Attending,Friends,Yes",
    "1002,2026-10-02,Sam,Ortiz,sam@example.com,1,Colgrid Pilot,Refunded,Solo,Yes",
    "1003,2026-10-02,Ivy,,,1,Colgrid Pilot,Attending,Partner,Yes",
  ].join("\n");
  const r = readEventbriteExport(csv);
  assert.equal(r.problem, null);
  assert.equal(r.columns.email, "Email");
  assert.equal(r.columns.comingWith, "Who are you coming with?");
  assert.equal(r.columns.order, "Order #");
  assert.deepEqual(r.rows[0], {
    email: "rosa@example.com", name: "Rosa Delgado", coming_with: "Friends", order_ref: "1001", ticket_type: "Colgrid Pilot",
  });
  assert.equal(r.rows.length, 2);
  assert.deepEqual(r.skipped.map((s) => s.line), [4, 5]);
  assert.match(r.skipped[0].reason, /Refunded/);
});

test("a file with no email column is refused with a plain reason", () => {
  const r = readEventbriteExport("Name,Phone\nRosa,555");
  assert.equal(r.rows.length, 0);
  assert.match(r.problem ?? "", /No email column/);
});

test("an empty file is refused", () => {
  assert.ok(readEventbriteExport("").problem);
});
