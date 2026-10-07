import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const evidence = JSON.parse(await readFile(new URL("../../../docs/acceptance/aihero-0.10.0/live.json", import.meta.url), "utf8"));
const entries = ["research", "to-questionnaire", "setup-matt-pocock-skills", "to-spec", "to-tickets"];
assert.equal(evidence.fixtures.length, 10);
for (const host of ["codex", "claude-code"]) {
  for (const entry of entries) {
    const fixture = evidence.fixtures.find((f) => f.host === host && f.entry === entry);
    assert(fixture, `${host}/${entry}: missing fixture`);
    assert.equal(fixture.status, "completed");
    assert(fixture.rounds.every((r) => r.completed));
    const initial = fixture.initialFiles;
    const final = fixture.rounds.at(-1).files;
    for (const path of ["orders.mjs", "orders.test.mjs", "package.json", "AGENTS.md"]) {
      assert.equal(final[path], initial[path], `${host}/${entry}: changed ${path}`);
    }
    for (const [path, hash] of Object.entries(fixture.sanitizedArtifactHashes)) {
      assert.equal(createHash("sha256").update(final[path]).digest("hex"), hash, `${host}/${entry}: artifact hash drift`);
    }
    const added = Object.keys(final).filter((path) => !Object.hasOwn(initial, path));
    if (entry !== "research") {
      for (const round of fixture.rounds.slice(0, -1)) {
        assert.deepEqual(round.files, initial, `${host}/${entry}: wrote before approval or facts`);
      }
    }
    if (entry === "research") {
      assert.equal(added.length, 1);
      assert.match(added[0], /^docs\/research\/.+\.md$/);
      assert.match(final[added[0]], /issue-tracker\.md/);
      assert.match(final[added[0]], /\.scratch/);
      assert.equal(fixture.delegation.completedChild, true);
      assert.equal(fixture.delegation.childReadPrimarySource, true);
      assert.equal(fixture.delegation.childWroteNote, true);
      assert.equal(fixture.delegation.parentActiveWhileChildRunning, true);
      assert(fixture.delegation.primaryReads.length > 0);
      assert(fixture.delegation.noteWrites.length > 0);
      assert(fixture.delegation.parentCommandsWhileRunning.length > 0);
    } else if (entry === "to-questionnaire") {
      assert.equal(fixture.rounds.length, 3);
      assert.equal(added.length, 1);
      assert.match(added[0], /^to-questionnaire-.+\.md$/);
      const body = final[added[0]];
      for (const pattern of [/Maya/, /Friday/, /10 minutes/, /coverage/i, /escalation/i, /per day/i, /^>/m, /Anything else\?/]) assert.match(body, pattern);
    } else if (entry === "setup-matt-pocock-skills") {
      assert.deepEqual(added.sort(), ["docs/agents/domain.md", "docs/agents/issue-tracker.md"]);
      assert.equal(final["CLAUDE.md"].split("## Agent skills").length - 1, 1);
      assert(final["CLAUDE.md"].startsWith(initial["CLAUDE.md"]));
      assert.doesNotMatch(final["CLAUDE.md"], /### Triage labels/);
      assert.match(final["docs/agents/issue-tracker.md"], /\.scratch/);
      assert.match(final["docs/agents/domain.md"], /GLOSSARY\.md/);
    } else if (entry === "to-spec") {
      assert.equal(added.length, 1);
      assert.match(added[0], /^\.scratch\/[^/]+\/spec\.md$/);
      const body = final[added[0]];
      for (const title of ["Problem Statement", "Solution", "User Stories", "Implementation Decisions", "Testing Decisions", "Out of Scope", "Further Notes"]) assert.match(body, new RegExp(`^## ${title}`, "m"));
      assert.match(body, /ready-for-agent/);
      assert.match(body, /cancelOrder/);
      assert.doesNotMatch(body, /orders\.mjs|orders\.test\.mjs/);
      assert.match(body, /cancelOrder\(orderLine, quantity\)/);
      const implementation = body.split("## Implementation Decisions")[1].split("## Testing Decisions")[0];
      for (const line of implementation.split("\n").filter((line) => line.includes("cancelOrderLine"))) {
        assert.match(line, /Do not|there is no/);
      }
      assert(body.match(/^\d+\. As /gm)?.length >= 10);
    } else if (entry === "to-tickets") {
      assert.equal(final[".scratch/partial-cancellation/spec.md"], initial[".scratch/partial-cancellation/spec.md"]);
      assert.equal(added.length, 2);
      for (const [index, path] of added.sort().entries()) {
        assert.match(path, new RegExp(`^\\.scratch/partial-cancellation/issues/0${index + 1}-.+\\.md$`));
        const body = final[path];
        for (const pattern of [/What to build/, /Blocked by/, /ready-for-agent/, /- \[ \]/]) assert.match(body, pattern);
        if (index === 1) assert.match(body, /\*\*Blocked by:\*\*[^\n]*0?1/);
      }
    }
    if (entry !== "setup-matt-pocock-skills") assert.equal(final["CLAUDE.md"], initial["CLAUDE.md"]);
  }
}
console.log("Verified ten recorded AIHero host fixtures: approval snapshots, delegation, artifacts, and source preservation.");
