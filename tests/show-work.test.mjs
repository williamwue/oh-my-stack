import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { repoRoot } from "../tools/generate.mjs";
import { bashExecutable, bashPath } from "./helpers/bash.mjs";

const helper = join(repoRoot, "src/core/skills/show-me-your-work/scripts/log.sh");

function append(log, fields) {
  if (process.platform !== "win32") {
    return spawnSync(bashExecutable(), [helper, log, ...fields], { encoding: "utf8" });
  }
  // Windows process arguments split embedded newlines before Git Bash receives them.
  const env = { ...process.env };
  for (const [index, value] of fields.entries()) env[`OMS_TEST_FIELD_${index}`] = value;
  return spawnSync(bashExecutable(), [
    "-c", 'exec "$1" "$2" "$OMS_TEST_FIELD_0" "$OMS_TEST_FIELD_1" "$OMS_TEST_FIELD_2" "$OMS_TEST_FIELD_3" "$OMS_TEST_FIELD_4"',
    "show-work-test", bashPath(helper), bashPath(log),
  ], { encoding: "utf8", env });
}

test("decision-log helper creates one header and appends sanitized rows", async () => {
  const directory = await mkdtemp(join(tmpdir(), "oh-my-stack-log-"));
  try {
    const log = join(directory, "nested", "decisions.tsv");
    const first = append(log, ["frame", "choose\tpath", "why\nnow", " =SUM(A1:A2)", "open"]);
    assert.equal(first.status, 0, first.stderr);
    const second = append(log, ["verify", "run check", "prove result", "commit abc", "tests green"]);
    assert.equal(second.status, 0, second.stderr);
    const lines = (await readFile(log, "utf8")).trimEnd().split("\n");
    assert.equal(lines.length, 3);
    assert.equal(lines[0], "ts\tphase\tdecision\twhy\tevidence\tresult");
    assert.match(lines[1], /\tframe\tchoose path\twhy now\t' =SUM\(A1:A2\)\topen$/);
    assert.match(lines[2], /\tverify\trun check\tprove result\tcommit abc\ttests green$/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("decision-log helper refuses unexpected headers and symbolic links", async () => {
  const directory = await mkdtemp(join(tmpdir(), "oh-my-stack-log-safety-"));
  try {
    const unexpected = join(directory, "unexpected.tsv");
    await writeFile(unexpected, "not-a-decision-log\n");
    const wrongHeader = append(unexpected, ["phase", "decision", "why", "evidence", "result"]);
    assert.notEqual(wrongHeader.status, 0);
    assert.equal(await readFile(unexpected, "utf8"), "not-a-decision-log\n");

    const target = join(directory, "target.tsv");
    const link = join(directory, "link.tsv");
    await writeFile(target, "ts\tphase\tdecision\twhy\tevidence\tresult\n");
    await symlink(target, link);
    const linked = append(link, ["phase", "decision", "why", "evidence", "result"]);
    assert.notEqual(linked.status, 0);
    assert.equal((await readFile(target, "utf8")).split("\n").length, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("decision-log helper initializes an empty file without replacing valid rows", async () => {
  const directory = await mkdtemp(join(tmpdir(), "oh-my-stack-log-empty-"));
  try {
    const log = join(directory, "decisions.tsv");
    await writeFile(log, "");
    const first = append(log, ["frame", "first", "reason", "evidence", "open"]);
    assert.equal(first.status, 0, first.stderr);
    const before = await readFile(log, "utf8");
    const second = append(log, ["verify", "second", "reason", "evidence", "pass"]);
    assert.equal(second.status, 0, second.stderr);
    const after = await readFile(log, "utf8");
    assert.ok(after.startsWith(before));
    assert.equal(after.trimEnd().split("\n").length, 3);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
