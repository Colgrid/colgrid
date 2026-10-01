import assert from "node:assert/strict";
import { test } from "node:test";
import { isInviteToken, isIos, isRouteSlug, mapsUrl, openThrough } from "./routes.ts";

test("Open in Maps uses the pin, Apple Maps on iPhone, Google Maps elsewhere", () => {
  assert.equal(mapsUrl({ lat: 40.75, lng: -111.86, where: "Mural on 9th" }, true), "https://maps.apple.com/?ll=40.75,-111.86&q=Mural%20on%209th");
  assert.equal(mapsUrl({ lat: 40.75, lng: -111.86 }, false), "https://www.google.com/maps/search/?api=1&query=40.75%2C-111.86");
  assert.equal(mapsUrl({ where: "Kiln & Co, 912 E 900 S" }, false), "https://www.google.com/maps/search/?api=1&query=Kiln%20%26%20Co%2C%20912%20E%20900%20S");
  assert.equal(mapsUrl({ where: "  " }, true), null);
  assert.equal(isIos("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"), true);
  assert.equal(isIos("Mozilla/5.0 (Linux; Android 15)"), false);
});

test("route window, invite tokens and slugs", () => {
  assert.equal(openThrough("2026-10-22T06:00:00Z"), "Open through Oct 21"); // midnight Salt Lake time
  assert.equal(openThrough(null), null);
  assert.equal(isInviteToken("a1b2c3d4e5"), true);
  assert.equal(isInviteToken("../etc"), false);
  assert.equal(isRouteSlug("route-01"), true);
  assert.equal(isRouteSlug("-bad"), false);
});
