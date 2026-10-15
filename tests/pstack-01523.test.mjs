import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseSkillFrontmatter } from "../tools/generate.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(join(root, path), "utf8");
const json = async (path) => JSON.parse(await read(path));
const receipt = await json("docs/acceptance/2026-10-14-pstack-sync/source/provenance.json");

async function paths(directory, prefix = "") {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await paths(join(directory, entry.name), path));
    else result.push(path);
  }
  return result.sort();
}

test("the 0.15.23 snapshot covers every GitHub tree blob and preserves the older snapshot", async () => {
  assert.equal(receipt.revision, "ce649c03ac3b75b6ae80cbd15b7e2c536caedb5a");
  assert.equal(receipt.tree, "0317938cdda8aaa9535d17f720dae6323604a72b");
  assert.equal(receipt.version, "0.15.23");
  assert.equal(receipt.files.length, 168);
  assert.deepEqual(await paths(join(root, receipt.sourceRoot)), receipt.files.map((file) => file.path));
  for (const file of receipt.files) {
    const bytes = await readFile(join(root, receipt.sourceRoot, file.path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256, file.path);
    assert.equal(createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"), file.gitBlob, file.path);
  }
  const old = await json("docs/acceptance/2026-10-11-parity/upstream-files.json");
  for (const file of old.files) {
    const bytes = await readFile(join(root, file.path));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256, file.path);
  }
  assert.equal(receipt.delta.oldCount, 165);
  assert.equal(receipt.delta.modified.length, 61);
  assert.deepEqual(receipt.delta.added, ["plugin.json", "skills/in-your-own-words/SKILL.md", "skills/poteto-mode/scripts/check-plan.test.ts"]);
  assert.deepEqual(receipt.delta.deleted, []);
});

test("in-your-own-words is discoverable as an explicit public core entry", async () => {
  const body = await read("src/core/skills/in-your-own-words/SKILL.md");
  const frontmatter = parseSkillFrontmatter(body);
  const metadata = await json("src/core/skills/in-your-own-words/skill.json");
  assert.equal(frontmatter.name, "in-your-own-words");
  assert.equal(metadata.invocation, "explicit");
  const catalog = await json("src/core/skill-catalog.json");
  assert.ok(catalog.public.includes("in-your-own-words"));
  assert.deepEqual(catalog.entries.find((item) => item.name === "in-your-own-words"), {
    kind: "skill", name: "in-your-own-words", path: "src/core/skills/in-your-own-words", origin: "pstack", distribution: "core", audience: "public",
  });
  assert.match(body, /Restate in your own words what you think the user's goals are/);
});

test("delegates preserve parent playbook ownership, effort policy, aliases, and family fallback", async () => {
  const mode = await read("src/core/skills/poteto-mode/SKILL.md");
  const delegate = await read("src/core/roles/poteto-agent/instructions.md");
  for (const text of ["The chat that receives `/poteto-mode` runs the playbook", "Never spawn a `poteto-agent` to run the playbook itself", "this file's absolute path in every `poteto-agent` prompt", "Raise it one supported step", "Lower it one step for judgment and two or more steps for routine work", "CI or trunk is red", "Otherwise use standard speed", "Verification is the exception", "Keep the model family", "`auto` or `inherit-parent`", "do not try another adjusted selection", "Use the role's original line or default", "strongest judgment model"])
    assert.ok(mode.includes(text), text);
  assert.match(delegate, /owns the playbook, the todo list, and every native child spawn/);
  assert.match(delegate, /Use the absolute path your parent gave you/);
  assert.doesNotMatch(delegate, /search `~\/\.cursor\/plugins\//);
  for (const name of ["arena", "interrogate"]) {
    const body = await read(`src/core/skills/${name}/SKILL.md`);
    assert.match(body, /`cursor-grok-\*` and `composer-\*` belong to the `grok-\*` family/);
    assert.match(body, /(?:Aliases inherit|Never treat an alias entry)/);
  }
});

test("latest landing and verification contracts retain root authority and merge-result checks", async () => {
  const full = await read("src/core/skills/autopilot-full/SKILL.md");
  for (const text of ["A full swarm runs once", "a single verifier at the new head", "does not gate the PR", "copies or newly reaches", "SHA you last pushed or took over", "on any push you did not make, stop", "run the patch's checks on the merge result", "a third rebase past merge prep", "fresh countersign", "disabled or soft-failed check always comes out", "root agent's store"])
    assert.ok(full.includes(text), text);
  assert.match(full, /trunk changed a caller of the patch or something the patch depends on/);
  const stack = await read("src/core/skills/autopilot-stack/SKILL.md");
  assert.match(stack, /never rebase onto another branch, trunk included/);
  assert.match(stack, /Only you rebase or retarget a link/);
  assert.match(stack, /Once landing starts, nobody writes to the chain except the post-merge retarget/);
  const shipping = await read("src/core/skills/shipping/SKILL.md");
  assert.match(shipping, /move its patch onto the merge result, and push with `--force-with-lease`/);
  assert.match(shipping, /verdict covers the patch, not its commits/);
  const orchestrate = await read("src/core/skills/orchestrate/SKILL.md");
  assert.match(orchestrate, /walks the PR base chain through the checkout's current branch/);
  assert.match(orchestrate, /Workers never rebase and never retarget or merge PRs/);
});

const rule = "Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.";
const validPlan = `# Demo

## How to read this
One box is one unit of work and names the evidence. Check a box only when its evidence exists. See playbooks/.
${rule}

## Program checklist
### Arm the program
### Spawn owners
### PR mechanics
### Verdict and merge
### Boot recipe
\`git show origin/main:\` /loop 1h status message

## PR 1
**Depends on.** None.
**Files.**
- [ ] Write the plan.
**Build.**
- [ ] Build the artifact.
**You see.**
- [ ] Observe the artifact.
**Verify, unit.** ${rule}
- [ ] Run the checks.
**Verify, live.** ${rule} Ten lanes on \`example-model\` at the PR head
${Array.from({ length: 10 }, (_, i) => `- [ ] Lane ${i + 1}. Save \`lane-${i + 1}.png\`. Pass when evidence exists.`).join("\n")}
**Verify, perf.** ${rule}
- [ ] Metric. Recorded.
- [ ] Probe. Recorded.
- [ ] Baseline. Recorded.
- [ ] Rule. Recorded.
**Review gate.** None.
**Merge.**
- [ ] Merge when approved.

## Close the program
Close.

## Appendix Prototype evidence
Recorded.
`;
const report = "PR 1  boxes=19  files=1 build=1 you-see=1 verify-unit=1 verify-live=10 verify-perf=4 review-gate=0 merge=1\n1 PR sections, 0 problems\n";

async function checker(t) {
  const directory = await mkdtemp(join(tmpdir(), "oms-pstack-01523-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "plan.md");
  return async (example, expectedStatus, diagnostic) => {
    await writeFile(file, validPlan + example);
    for (const script of [join(root, receipt.sourceRoot, "skills/poteto-mode/scripts/check-plan.mjs"), join(root, "src/core/skills/poteto-mode/scripts/check-plan.mjs")]) {
      const result = spawnSync(process.execPath, [script, file], { encoding: "utf8" });
      assert.equal(result.status, expectedStatus, result.stderr);
      if (expectedStatus === 0) assert.equal(result.stdout, report);
      else assert.ok(result.stderr.includes(diagnostic), result.stderr);
    }
  };
}

test("portable checker accepts CommonMark fences with indentation, longer closes, tilde info, and nested examples", async (t) => {
  const run = await checker(t);
  for (const indent of ["", " ", "  ", "   "])
    await run(`${indent}\`\`\`markdown\n## Example only\n${indent}\`\`\`\n`, 0);
  for (const example of ["```markdown\n## Example only\n````\n", "````markdown\n```markdown\n## Example only\n```\n````\n", "~~~markdown `info`\n## Example only\n ~~~\n", "````markdown\n~~~\n## Example only\n````\n", "````markdown\n```\n## Example only\n````\n", "````markdown\n``` info\n## Example only\n````\n"])
    await run(example, 0);
});

test("portable checker rejects headings and prose after valid closes and rejects invalid backtick info", async (t) => {
  const run = await checker(t);
  for (const suffix of ["  ", "\t"])
    await run(`\`\`\`markdown\n## Example only\n\`\`\`${suffix}\n## Example only\n`, 1, '"## Example only" after Close the program is not an appendix');
  await run("```markdown\nProse has a colon: inside code\n```\nProse has a colon: bad.\n", 1, "mid-sentence colon");
  await run("```markdown `invalid`\n## Example only\n```\n", 1, '"## Example only" after Close the program is not an appendix');
  await run("    ```markdown\n## Example only\n    ```\n", 1, '"## Example only" after Close the program is not an appendix');
});

test("both multi-phase entries resolve the bundled checker without an upstream checkout prefix", async () => {
  for (const path of ["src/core/skills/multi-phase-plan/SKILL.md", "src/core/skills/poteto-mode/playbooks/multi-phase-plan.md"]) {
    const body = await read(path);
    assert.match(body, /node "<absolute installed package>\/skills\/poteto-mode\/scripts\/check-plan\.mjs" <plan\.md>/);
    assert.doesNotMatch(body, /pstack\/skills\//);
    const reference = body.match(/\[bundled checker\]\(([^)]+)\)/)[1];
    assert.equal(resolve(dirname(join(root, path)), reference), join(root, "src/core/skills/poteto-mode/scripts/check-plan.mjs"));
    assert.equal(await readFile(resolve(dirname(join(root, path)), reference), "utf8"), await read("src/core/skills/poteto-mode/scripts/check-plan.mjs"));
  }
});


test("the historical checker reproduces the indented-fence regression repaired by 0.15.23", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "oms-pstack-01517-baseline-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "plan.md");
  await writeFile(file, validPlan + "   ```markdown\n## Example only\n   ```\n");
  const script = join(root, "upstream/snapshots/cursor-pstack-october-11/978ca6e9c0e012047cd5058b8e829240336e704e/pstack/skills/poteto-mode/scripts/check-plan.mjs");
  const result = spawnSync(process.execPath, [script, file], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.ok(result.stderr.includes('"## Example only" after Close the program is not an appendix'));
  const run = await checker(t);
  await run("   ```markdown\n## Example only\n   ```\n", 0);
});
