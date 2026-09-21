import assert from "node:assert/strict";
import test from "node:test";

import { renderProject, renderTask } from "../lib/labels.mjs";

test("renders task labels with exact trimming and state behavior", () => {
  assert.equal(renderTask({ name: " Draft ", completed: false }), "Task Draft: open");
  assert.equal(renderTask({ name: "Ship", completed: true }), "Task Ship: done");
});

test("renders project labels with exact trimming and state behavior", () => {
  assert.equal(renderProject({ name: " Alpha ", archived: false }), "Project Alpha: open");
  assert.equal(renderProject({ name: "Legacy", archived: true }), "Project Legacy: done");
});
