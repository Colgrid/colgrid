// Run with: npm test
// The encoder was also checked end to end by decoding generated codes with OpenCV's QR reader
// (versions 1–19, levels M and Q, including the check-in links used on host plaques).
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeQr, qrSvgPath } from "./qr.ts";

test("a check-in link fits a small, easy-to-scan code", () => {
  const qr = encodeQr("https://getcolgrid.com/check-in?code=TAC-7Q2", "Q");
  assert.equal(qr.version, 4);
  assert.equal(qr.size, 33);
});

test("finder patterns sit in three corners", () => {
  const { modules, size } = encodeQr("A");
  for (const [x, y] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
    assert.equal(modules[y][x], true);
    assert.equal(modules[y + 1][x + 1], false);
    assert.equal(modules[y + 3][x + 3], true);
  }
});

test("same text, same code; SVG path covers the quiet zone", () => {
  const a = encodeQr("Hello");
  assert.deepEqual(a.modules, encodeQr("Hello").modules);
  const svg = qrSvgPath(a, 4);
  assert.equal(svg.viewBox, a.size + 8);
  assert.match(svg.path, /^M\d+,\d+h1v1h-1z/);
});
