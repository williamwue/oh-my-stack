import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const doc = await readFile(new URL("../docs/run-locally.md", import.meta.url), "utf8");

test("local run guide is a direct how-to that preserves every fact", () => {
  assert.equal(doc.match(/^# /gm)?.length, 1, "use one h1");
  assert.match(doc, /^# Run the service locally$/m);

  const facts = [
    "npm test",
    "4 passing, 0 failing",
    "node server.mjs --port 4100",
    "listening on 4100",
    "curl http://127.0.0.1:4100/health",
    '{"status":"ok"}',
    "Ctrl+C",
  ];
  for (const fact of facts) {
    assert.ok(doc.includes(fact), `preserve ${fact}`);
  }

  const orderedActions = [
    "npm test",
    "node server.mjs --port 4100",
    "curl http://127.0.0.1:4100/health",
    "Ctrl+C",
  ];
  let previous = -1;
  for (const action of orderedActions) {
    const current = doc.indexOf(action);
    assert.ok(current > previous, `keep ${action} in operational order`);
    previous = current;
  }

  assert.doesNotMatch(
    doc,
    /Of course|I hope this helps|It is important to note|In order to|\bsimply\b|\butilize\b|\bleverage\b|\bvibrant\b|\bshowcases?\b|\bunderscor\w*\b|\bseamlessly\b|serves as|must be installed|should be terminated/i,
  );
  assert.doesNotMatch(doc, /[—“”🚀]/u);
  assert.doesNotMatch(doc, /^## [A-Z][A-Za-z]+ [A-Z][A-Za-z]+$/m, "use sentence case headings");
  assert.ok(/^\d+\. /m.test(doc), "write the ordered procedure as numbered steps");
});
