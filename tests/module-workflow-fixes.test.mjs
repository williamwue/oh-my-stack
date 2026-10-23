import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import MarkdownIt from "markdown-it";
import { validateRequirementSupport } from "../tools/generate.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = path => readFile(resolve(root, path), "utf8");
const markdown = new MarkdownIt();
const scripts = resolve(root, "src/core/skills/poteto-mode/scripts");
const vendor = join(scripts, "vendor/markdown-it");
const referenceFence = "- Item\n\n  [a]:/url\n  2. ```md\n     colon: code only\n     ```\n";
const rule = "Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.";
const plan = `# Demo

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
- [ ] Do the thing.
**Build.**
- [ ] Do the thing.
**You see.**
- [ ] Do the thing.
**Verify, unit.** ${rule}
- [ ] Check the thing.
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
function check(input, checker = resolve(root, "src/core/skills/poteto-mode/scripts/check-plan.mjs")) {
  const directory = mkdtempSync(join(tmpdir(), "oms-workflow-plan-"));
  const file = join(directory, "plan.md");
  try {
    writeFileSync(file, input);
    return spawnSync(process.execPath, [checker, file], { encoding: "utf8", timeout: 10_000 });
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("portable plan checker accepts a BOM without changing its plan contract", () => {
  for (const input of [plan, `\uFEFF${plan}`, `\uFEFF---\ntitle: Demo\n---\n${plan}`]) {
    const result = check(input);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /1 PR sections, 0 problems/);
  }
  const invalid = check(`\uFEFF${plan.replace("# Demo", "Demo")}`);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /no H1 title/);
});

test("portable fence classification agrees with rendered list containers", () => {
  assert.equal(check(plan + "\n- Item\n\n  [a]:/url\n").status, 0, "reference-definition-only control");
  const setextExamples = [
    ...["=", "==", "===", "-", "--", "---"].flatMap(underline =>
      ["", "   "].map(indent => `- First\n  ${indent}${underline}\n  2) \`\`\`md\n     colon: code only\n     \`\`\`\n`)),
    "- First\nlazy continuation\n  ===\n  2. ```md\n     colon: code only\n     ```\n",
    "1. Outer\n   - First\n     -\n     2. ```md\n        colon: code only\n        ```\n",
    "First\n-\n2. ```md\n   colon: code only\n   ```\n",
  ];
  for (const example of setextExamples) {
    assert.ok(markdown.parse(example, {}).some(token => token.type === "heading_open"), example);
  }
  const examples = [
    "- Example\n    ```md\n    colon: code only\n    ```\n",
    "- ```md\n  colon: code only\n  ```\n",
    "1. Example\n\n   ```md\n   colon: code only\n   ```\n",
    "- First\n  ===\n  2. ```md\n     colon: code only\n     ```\n",
    "- Item\n\n  [a]:/url\n  2. ```md\n     colon: code only\n     ```\n",
    "1. First item\n2. ```md\n   colon: code only\n   ```\n",
    "1. First item\nlazy continuation\n2. ```md\n   colon: code only\n   ```\n",
    "1. First item\n   indented continuation\n2. ```md\n   colon: code only\n   ```\n",
    "1) First item\nlazy continuation\n2) ```md\n   colon: code only\n   ```\n",
    "1. First item\nlazy one\n  lazy two\n2. ```md\n   colon: code only\n   ```\n",
    "- First item\nlazy continuation\n- ```md\n  colon: code only\n  ```\n",
    "- First item\nlazy continuation\n  ```md\n  colon: code only\n  ```\n",
    "- Outer\n  1. Inner\nlazy continuation\n  2. ```md\n     colon: code only\n     ```\n",
    "- Outer\n  1) Inner\nlazy continuation\n  2) ```md\n     colon: code only\n     ```\n",
    "1. Outer\n   - Inner\nlazy continuation\n   - ```md\n     colon: code only\n     ```\n",
    "1) First item\n2) ```md\n   colon: code only\n   ```\n",
    "- Outer\n  1. First item\n  2. ```md\n     colon: code only\n     ```\n",
    "- Outer\n  1) First item\n  2) ```md\n     colon: code only\n     ```\n",
    "1. Outer\n   1. Inner\n2. ```md\n   colon: code only\n   ```\n",
    "1) Outer\n   1) Inner\n2) ```md\n   colon: code only\n   ```\n",
    "9. First item\n10. ```md\n    colon: code only\n    ```\n",
    "1. First item\n2. 3. ```md\n      colon: code only\n      ```\n",
    "1. First item\n2) ```md\n   colon: code only\n   ```\n",
    "1) First item\n2. ```md\n   colon: code only\n   ```\n",
    "- First item\n2. ```md\n   colon: code only\n   ```\n",
    "- Outer\n  - Inner\n\n      ~~~md `info`\n      colon: code only\n      ~~~~\n",
    "- Example\n\n\t```md\n\tcolon: code only\n\t```\n",
    ...setextExamples,
  ];
  for (const example of examples) {
    const tokens = markdown.parse(example, {});
    assert.ok(tokens.some(token => token.type === "fence" && token.content.includes("colon: code only")), example);
    const result = check(plan + "\n" + example);
    assert.equal(result.status, 0, `${example}\n${result.stderr}`);
  }
});

test("nested unclosed fences cannot swallow prose after their list ends", () => {
  for (const example of [
    "- Example\n    ```md\n    colon: code only\n\nOutside colon: visible.\n",
    "- Outer\n  - Inner\n      ```md\n      colon: code only\n  Parent colon: visible.\n",
    "- Example\n    ```md\n    colon: code only\n- Sibling colon: visible.\n",
    "- Example\n    ```md\n    colon: code only\n    ```\nOutside colon: visible.\n",
  ]) {
    const tokens = markdown.parse(example, {});
    const fence = tokens.find(token => token.type === "fence");
    assert.ok(fence && !fence.content.includes("visible"), example);
    assert.ok(tokens.some(token => token.type === "inline" && token.content.includes("visible")), example);
    const result = check(plan + example);
    assert.equal(result.status, 1, `${example}\n${result.stdout}`);
    assert.match(result.stderr, /mid-sentence colon/);
  }
});

test("new ordered lists cannot hide prose by interrupting a paragraph with a non-one start", () => {
  for (const example of [
    "Paragraph continues\n2. ```md\n   colon: visible prose\n",
    "Paragraph continues\n2) ```md\n   colon: visible prose\n",
    "1. First item\n   2. ```md\n      colon: visible prose\n",
    "1. First item\n   2) ```md\n      colon: visible prose\n",
    "1) First item\n   2. ```md\n      colon: visible prose\n",
    "- First item\n  2. ```md\n     colon: visible prose\n",
    "- First item\n  2) ```md\n     colon: visible prose\n",
    "- First\n  ordinary continuation\n  2. ```md\n     colon: visible prose\n",
    "- Item\n\n  ordinary continuation\n  2. ```md\n     colon: visible prose\n",
    "===\n2. ```md\n   colon: visible prose\n",
    "- ===\n  2. ```md\n     colon: visible prose\n",
    "- First\n\n  ===\n  2. ```md\n     colon: visible prose\n",
    "- First\n===\n  2. ```md\n     colon: visible prose\n",
    "- First\nlazy continuation\n===\n  2. ```md\n     colon: visible prose\n",
    "- First\n      ===\n  2. ```md\n     colon: visible prose\n",
    "- First\n  === text\n  2. ```md\n     colon: visible prose\n",
    "- First\n  --- text\n  2. ```md\n     colon: visible prose\n",
    "- First\n  ===\n  ===\n  2. ```md\n     colon: visible prose\n",
    "- First\n  ---\n  ===\n  2. ```md\n     colon: visible prose\n",
    "## Heading\n===\n2. ```md\n   colon: visible prose\n",
    "    Code block\n===\n2. ```md\n   colon: visible prose\n",
    "-     Code block\n  ===\n  2. ```md\n     colon: visible prose\n",
    "-\n===\n2. ```md\n   colon: visible prose\n",
    "- First\n\n  -\n  Paragraph continues\n  2. ```md\n     colon: visible prose\n",
    "1. First item\n\nParagraph continues\n2. ```md\n   colon: visible prose\n",
    "1. First item\n\nParagraph continues\n2) ```md\n   colon: visible prose\n",
    "- First item\n\nParagraph continues\n2. ```md\n   colon: visible prose\n",
    "1. First item\nlazy continuation\n\nParagraph continues\n2. ```md\n   colon: visible prose\n",
    "1) First item\nlazy continuation\n\nParagraph continues\n2) ```md\n   colon: visible prose\n",
    "- Outer\n  1. Inner\nlazy continuation\n\nParagraph continues\n2. ```md\n   colon: visible prose\n",
    "1. First item\n2.\nParagraph continues\n3. ```md\n   colon: visible prose\n",
    ...["# Heading", "---", "> Quote\n", "```md\ncode\n```", "- Replacement item\n"].map(block =>
      `1. First item\nlazy continuation\n${block}\nParagraph continues\n2. \`\`\`md\n   colon: visible prose\n`),
    "1. First item\nlazy continuation colon: visible prose\n2. ```md\n   colon: code only\n   ```\n",
    "1. First item\nabc```md\ncolon: visible prose\n2. ```md\n   colon: code only\n   ```\n",
    "- First item\nab~~~md\ncolon: visible prose\n- ```md\n  colon: code only\n  ```\n",
    "- Outer\n  1. Inner\nabcde```md\ncolon: visible prose\n  2. ```md\n     colon: code only\n     ```\n",
  ]) {
    const tokens = markdown.parse(example, {});
    assert.ok(!tokens.some(token => token.type === "fence" && token.content.includes("colon: visible prose")), example);
    assert.ok(tokens.some(token => token.type === "inline" && token.content.includes("colon: visible prose")), example);
    const result = check(plan + "\n" + example);
    assert.equal(result.status, 1, `${example}\n${result.stdout}`);
    assert.match(result.stderr, /mid-sentence colon/);
  }
});

test("root fence indent, info string, delimiter and closer length rules remain intact", () => {
  for (const indent of ["", " ", "  ", "   "]) {
    assert.equal(check(plan + `${indent}\`\`\`md\ncolon: code\n${indent}\`\`\`\`\n`).status, 0);
  }
  for (const falseClose of ["```", "~~~", "```` info"]) {
    assert.equal(check(plan + `\`\`\`\`md\n${falseClose}\ncolon: code\n\`\`\`\`\n`).status, 0);
  }
  for (const example of [
    "```md `invalid`\ncolon: visible\n```\n",
    "    ```md\ncolon: visible\n    ```\n",
    "```md\ncolon: code\n```\t\ncolon: visible\n",
  ]) {
    assert.equal(check(plan + example).status, 1, example);
  }
});

test("promoted transcript paths survive and their intended helper directory resolves", async () => {
  for (const name of ["eval", "session-pickup", "orchestrate"]) {
    const path = `src/core/skills/${name}/SKILL.md`;
    const body = await read(path);
    const canonical = await read(`src/core/skills/poteto-mode/playbooks/${name}.md`);
    assert.ok(canonical.includes("`agent-transcripts/`"));
    assert.ok(body.includes("`agent-transcripts/`"), name);
    const helper = body.match(/Source-host helpers under `([^`]+)`/);
    assert.ok(helper, name);
    const resolved = resolve(dirname(resolve(root, path)), helper[1], "check-plan.mjs");
    const run = check(plan, resolved);
    assert.equal(run.status, 0, `${name}\n${run.stderr}`);
  }
});

test("missing independent-review capabilities retain an incomplete outcome in the metadata contract", async () => {
  const metadata = JSON.parse(await read("src/core/skills/interrogate/skill.json"));
  for (const missing of ["agents.spawn", "agents.read_result", "agents.wait"]) {
    const profile = {
      id: "missing-review-capability",
      capabilities: Object.fromEntries(metadata.requires.map(name => [name, { status: name === missing ? "unsupported" : "native" }])),
    };
    assert.doesNotThrow(() => validateRequirementSupport({ metadata }, [profile]));
    const outcome = metadata.fallbacks[missing];
    assert.match(outcome, /incomplete|blocked/, missing);
    assert.match(outcome, /preserve.*independent.*findings/, missing);
    assert.match(outcome, /without.*verdict/, missing);
    const noFallback = structuredClone(metadata);
    delete noFallback.fallbacks[missing];
    assert.throws(() => validateRequirementSupport({ metadata: noFallback }, [profile]), /has no fallback/);
  }
  assert.match(metadata.fallbacks["agents.spawn_parallel"], /independent_reviewers_sequentially_without_cross_contamination/);
});

test("help invocation and routing advice follows the installed contract", async () => {
  const body = await read("src/core/skills/poteto-help/SKILL.md");
  const setup = JSON.parse(await read("src/core/skills/setup-oh-my-stack/skill.json"));
  assert.equal(setup.invocation, "explicit");
  assert.doesNotMatch(body, /Only `\/setup-oh-my-stack` loads from the user's words|Enter on `\/poteto-mode`|It was started with Enter/);
  for (const token of ["SKILL_CATALOG.json", "skill.json", "runtime binding", "routing", "manifest"]) assert.ok(body.includes(token), token);
  assert.match(body, /4ec7ffa173eaa70d3d9467a627baf0954645a353/);
});

test("complete reference definitions and nested quotes retain rendered fences", () => {
  for (const example of [
    referenceFence,
    '- Item\n\n  [a]:\n    /url\n    "title"\n  2. ```md\n     colon: code only\n     ```\n',
    '> - Item\n>\n>   [a]:/url\n>   2. ```md\n>      colon: code only\n>      ```\n',
    '- Item\n\n  [a]:/url\n    "title"\n  2. ~~~md\n     colon: code only\n',
  ]) {
    assert.match(markdown.render(example), /<pre><code[^>]*>colon: code only/);
    const result = check(plan + "\n" + example);
    assert.equal(result.status, 0, `${example}\n${result.stderr}`);
  }
  for (const example of [
    '- Item\n\n  [a]:/bad target\n  2. ```md\n     colon: visible prose\n',
    '- Item\n\n  [a]:/url\n    "unterminated\n  2. ```md\n     colon: visible prose\n',
  ]) {
    const rendered = markdown.render(example);
    assert.doesNotMatch(rendered, /<pre><code/);
    assert.match(rendered, /colon: visible prose/);
    assert.equal(check(plan + "\n" + example).status, 1, example);
  }
});

test("default HTML and table dialects exempt fences only", () => {
  const htmlFence = "<div>\n```md\ncolon: code only\n```\n</div>\n";
  assert.match(markdown.render(htmlFence), /&lt;div&gt;/);
  assert.match(markdown.render(htmlFence), /<pre><code/);
  assert.equal(check(plan + "\n" + htmlFence).status, 0);
  const table = "| A | B |\n| -- | -- |\n| ```md | cell |\n| colon: visible prose | cell |\n";
  assert.match(markdown.render(table), /<table>/);
  assert.doesNotMatch(markdown.render(table), /<pre><code/);
  for (const example of [table, "<div>colon: visible prose</div>\n", "    colon: visible prose\n", '[a]:/url "colon: visible prose"\n']) {
    const result = check(plan + "\n" + example);
    assert.equal(result.status, 1, example);
    assert.match(result.stderr, /mid-sentence colon/);
  }
});

test("normalized source offsets retain diagnostics through frontmatter and fence termination", () => {
  const baseLines = plan.split("\n").length - 1;
  for (const [prefix, prefixLines] of [["", 0], ["\uFEFF", 0], ["---\ntitle: Demo\n---\n", 3], ["\uFEFF---\ntitle: Demo\n---\n", 3], ["---\n", 1]]) {
    for (const ending of ["\n", "\r\n", "\r"]) {
      for (const tail of ["```md\ncolon: code only\n```\nVisible colon: marker.", "```md\n\n```\nVisible colon: marker.", "- Item\n  ```md\n  colon: code only\nOutside colon: marker."]) {
        const result = check((prefix + plan + "\n" + tail).replaceAll("\n", ending));
        assert.equal(result.status, 1, result.stderr);
        assert.equal(result.stderr.trim().split("\n").length, 1, result.stderr);
        assert.ok(result.stderr.includes(`plan.md:${baseLines + prefixLines + 5}: mid-sentence colon`), result.stderr);
      }
      const open = check((prefix + plan + "\n```md\ncolon: code only").replaceAll("\n", ending));
      assert.equal(open.status, 0, open.stderr);
    }
  }
  const unmatched = check("---\ntitle: visible prose\n" + plan);
  assert.equal(unmatched.status, 1);
  assert.match(unmatched.stderr, /plan\.md:2: mid-sentence colon/);
});

test("fenced fake headings, subblocks and checkboxes cannot satisfy plan policy", () => {
  const cases = [
    [plan.replace("# Demo", "Demo") + "\n```md\n# Fake title\n```\n", /no H1 title/],
    [plan.replace("## Program checklist", "```md\n## Program checklist\n```"), /no "## Program checklist" section/],
    [plan.replace("**Build.**", "```md\n**Build.**\n```"), /sub-blocks are/],
    [plan.replace("**Files.**\n- [ ] Do the thing.", "**Files.**\n```md\n- [ ] Fake file.\n```"), /Files\. has no box/],
    [plan.replace("- [ ] Lane 10. Save `lane-10.png`. Pass when evidence exists.", "```md\n- [ ] Lane 10. Save `lane-10.png`. Pass when evidence exists.\n```"), /lanes are \[1,2,3,4,5,6,7,8,9\]/],
  ];
  for (const [input, diagnostic] of cases) {
    const result = check(input);
    assert.equal(result.status, 1);
    assert.match(result.stderr, diagnostic);
  }
  const usage = spawnSync(process.execPath, [join(scripts, "check-plan.mjs")], { encoding: "utf8" });
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /^Usage: node check-plan\.mjs <plan\.md>/);
});

test("default nesting is bounded at 100 rather than accepting unlimited containers", () => {
  assert.equal(markdown.options.maxNesting, 100);
  for (const [depth, expected] of [[99, 0], [100, 1]]) {
    const prefix = "> ".repeat(depth);
    const example = `${prefix}\`\`\`md\n${prefix}colon: payload\n${prefix}\`\`\`\n`;
    assert.equal(markdown.render(example).includes("<pre><code"), expected === 0);
    const result = check(plan + "\n" + example);
    assert.equal(result.status, expected, result.stderr);
    if (expected) assert.match(result.stderr, /mid-sentence colon/);
  }
});

function installedPackage(name) {
  let directory = dirname(createRequire(import.meta.url).resolve(name));
  while (!existsSync(join(directory, "package.json")) || JSON.parse(readFileSync(join(directory, "package.json"))).name !== name) directory = dirname(directory);
  return directory;
}

test("vendored bytes and complete local notices match the fixed artifact and lock receipt", () => {
  const hash = bytes => createHash("sha256").update(bytes).digest("hex");
  const bytes = readFileSync(join(vendor, "markdown-it.esm.min.mjs"));
  const installed = readFileSync(join(installedPackage("markdown-it"), "dist/browser/markdown-it.esm.min.mjs"));
  const source = JSON.parse(readFileSync(join(vendor, "SOURCE.json")));
  const notices = readFileSync(join(vendor, "LICENSES.txt"));
  const lock = JSON.parse(readFileSync(resolve(root, "package-lock.json"))).packages["node_modules/markdown-it"];
  assert.ok(bytes.equals(installed));
  assert.equal(bytes.length, 137975);
  assert.equal(hash(bytes), "6f98af51c9dafe4f8f666ad5f9cf087c08f13bbd069604b334aa692025d9c930");
  assert.equal(source.version, "15.0.1");
  assert.equal(source.artifact.upstreamPath, "dist/browser/markdown-it.esm.min.mjs");
  assert.equal(source.artifact.sha256, hash(bytes));
  assert.equal(source.artifact.byteLength, bytes.length);
  assert.equal(source.lockReceipt.integrity, lock.integrity);
  assert.equal(source.lockReceipt.tarball, "https://registry.npmjs.org/markdown-it/-/markdown-it-15.0.1.tgz");
  assert.equal(source.provenance.tarballIndependentlyFetched, false);
  assert.match(source.provenance.bundleInternalDependencyVersions, /Not independently established/);
  assert.equal(source.parserContract.preset, "default");
  assert.equal(source.parserContract.maxNesting, 100);
  assert.match(source.parserContract.lineEndings, /Bare CR.*extends/);
  assert.ok(source.updateProcedure.length > 0);
  assert.equal(source.notices.sha256, hash(notices));
  assert.deepEqual(source.notices.sources.map(item => [item.package, item.localPackageVersion]), [["markdown-it", "15.0.1"], ["mdurl", "2.1.0"], ["entities", "8.1.0"], ["linkify-it", "6.1.0"], ["uc.micro", "3.0.0"], ["punycode.js", "2.3.1"]]);
  for (const item of source.notices.sources) {
    const license = readFileSync(join(installedPackage(item.package), basename(item.installedLicensePath)));
    assert.equal(item.sha256, hash(license));
    assert.equal(item.byteLength, license.length);
    assert.ok(notices.includes(license), item.package);
    assert.ok(!item.installedLicensePath.startsWith("/"));
  }
  assert.match(notices.toString(), /Copyright Joyent, Inc\./);
  assert.match(notices.toString(), /Redistributions in binary form/);
  assert.match(notices.toString(), /Felix Böhm/);
  const catalog = JSON.parse(readFileSync(resolve(root, "src/core/skill-catalog.json")));
  for (const file of ["markdown-it.esm.min.mjs", "LICENSES.txt", "SOURCE.json"]) {
    const path = `src/core/skills/poteto-mode/scripts/vendor/markdown-it/${file}`;
    assert.deepEqual(catalog.entries.find(entry => entry.path === path), { kind: "reference", path, origin: "oms", distribution: "core", owner: "poteto-mode" });
  }
  const inventory = JSON.parse(readFileSync(resolve(root, "security/executables.json")));
  for (const path of ["src/core/skills/poteto-mode/scripts/check-plan.mjs", "src/core/skills/poteto-mode/scripts/vendor/markdown-it/markdown-it.esm.min.mjs"]) {
    const entry = inventory.entries.find(item => item.path === path);
    assert.equal(entry.network, false);
    assert.deepEqual(entry.writes, []);
  }
  const probe = spawnSync(process.execPath, ["--experimental-vm-modules", "--input-type=module", "-e", 'import fs from "node:fs"; import vm from "node:vm"; console.log(JSON.stringify(new vm.SourceTextModule(fs.readFileSync(process.argv[1], "utf8")).dependencySpecifiers));', join(vendor, "markdown-it.esm.min.mjs")], { encoding: "utf8" });
  assert.equal(probe.status, 0, probe.stderr);
  assert.deepEqual(JSON.parse(probe.stdout), []);
  assert.doesNotMatch(bytes.toString(), /\b(?:import|require)\s*\(/);
});

function isolatedRuntime(runtime) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "oms-plan-isolated-")));
  try {
    assert.ok(!directory.startsWith(realpathSync(root) + sep));
    for (let parent = directory; ; parent = dirname(parent)) {
      assert.equal(existsSync(join(parent, "node_modules")), false, parent);
      if (parent === dirname(parent)) break;
    }
    const copy = join(directory, "scripts");
    cpSync(scripts, copy, { recursive: true });
    const cwd = join(directory, "unrelated");
    mkdirSync(cwd);
    assert.equal(realpathSync(copy), copy);
    const file = join(directory, "plan.md");
    const options = { cwd, encoding: "utf8", env: { ...process.env, NODE_PATH: "", NODE_OPTIONS: "" }, timeout: 10_000 };
    for (const [input, expected] of [[plan, 0], [plan + "\n" + referenceFence, 0], [plan + "\nVisible colon: prose.\n", 1]]) {
      writeFileSync(file, input);
      const result = spawnSync(runtime, [join(copy, "check-plan.mjs"), file], options);
      assert.equal(result.status, expected, result.stderr);
      assert.match(result.stdout, expected ? /1 PR sections, 1 problems/ : /1 PR sections, 0 problems/);
      if (expected) assert.match(result.stderr, /plan\.md:\d+: mid-sentence colon/);
    }
    const usage = spawnSync(runtime, [join(copy, "check-plan.mjs")], options);
    assert.equal(usage.status, 2, usage.stderr);
    rmSync(join(copy, "vendor/markdown-it/markdown-it.esm.min.mjs"));
    const missing = spawnSync(runtime, [join(copy, "check-plan.mjs"), file], options);
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /markdown-it\.esm\.min\.mjs/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("isolated Node copy runs without repository or ancestor dependencies", () => isolatedRuntime(process.execPath));
test("isolated Bun copy runs without repository or ancestor dependencies", t => {
  const probe = spawnSync("bun", ["--version"], { encoding: "utf8" });
  if (probe.error?.code === "ENOENT") return t.skip("Bun is unavailable");
  assert.equal(probe.status, 0, probe.stderr);
  isolatedRuntime("bun");
});
