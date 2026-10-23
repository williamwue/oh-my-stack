import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { validateLocalMarkdownLinks, validatePublicHygiene } from "../tools/validate.mjs";

test("immutable snapshots may contain upstream template links; published instructions may not", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-links-"));
  try {
    const snapshot = join(root, "upstream/snapshots/example");
    const published = join(root, "packages/codex/skills/example");
    await mkdir(snapshot, { recursive: true });
    await mkdir(published, { recursive: true });
    await writeFile(join(snapshot, "SKILL.md"), "[Example](url)\n");
    await validateLocalMarkdownLinks(root);
    await writeFile(join(published, "SKILL.md"), "[Reference](missing.md)\n");
    await assert.rejects(validateLocalMarkdownLinks(root), /missing local link missing.md/);
    await writeFile(join(published, "missing.md"), "# Reference\n");
    await validateLocalMarkdownLinks(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("snapshot path examples remain verbatim while private keys remain forbidden", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-snapshot-hygiene-"));
  try {
    const snapshot = join(root, "upstream/snapshots/example");
    const source = join(snapshot, "SKILL.md");
    await mkdir(snapshot, { recursive: true });
    for (const name of [
      "CHANGELOG.md", "CONTRIBUTING.md", "LICENSE", "README.md",
      "SECURITY.md", "THIRD_PARTY_NOTICES.md", "package.json", "package-lock.json",
    ]) await writeFile(join(root, name), "example\n");
    const upstreamExample = ["", "Users", "example", "repo"].join("/");
    await writeFile(source, `Read ${upstreamExample} as an upstream path example.\n`);
    await validatePublicHygiene(root);
    await writeFile(source, `${"-----BEGIN "}PRIVATE KEY-----\nexample\n`);
    await assert.rejects(validatePublicHygiene(root), /contains a private key/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Markdown links allow internal parent paths and reject encoded escapes", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-link-paths-"));
  try {
    const document = join(root, "docs", "guide.md");
    await mkdir(join(root, "docs"), { recursive: true });
    await writeFile(join(root, "README.md"), "# Home\n");
    await writeFile(document, "[Home](../README.md)\n");
    await validateLocalMarkdownLinks(root);
    await writeFile(document, "[Escape](..%2f..%2fsibling.md)\n");
    await assert.rejects(validateLocalMarkdownLinks(root), /link escapes repository/);
    await writeFile(document, "[Bad](%GG)\n");
    await assert.rejects(validateLocalMarkdownLinks(root), /malformed local link/);
    await writeFile(document, "[Missing](missing.md)\n");
    await assert.rejects(validateLocalMarkdownLinks(root), /missing local link/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("only exact snapshots, node_modules, .git, and root .tmp are excluded", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-link-prune-"));
  try {
    for (const path of [
      "upstream/snapshots/source/SKILL.md", "node_modules/package/README.md",
      ".git/README.md", ".tmp/run/README.md", "docs/node_modules/package/README.md",
    ]) {
      const target = join(root, path);
      await mkdir(join(target, ".."), { recursive: true });
      await writeFile(target, "[Upstream template](missing.md)\n");
    }
    await validateLocalMarkdownLinks(root);
    for (const path of ["upstream/snapshots-copy/SKILL.md", "docs/node_modules-notes/README.md"]) {
      const target = join(root, path);
      await mkdir(join(target, ".."), { recursive: true });
      await writeFile(target, "[Missing](missing.md)\n");
      await assert.rejects(validateLocalMarkdownLinks(root), /missing local link/);
      await rm(target);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("source-model dependencies reject rather than silently reducing hygiene coverage", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-source-deps-"));
  try {
    const dependency = join(root, "src", "core", "skills", "example", "node_modules", "secret.md");
    await mkdir(join(dependency, ".."), { recursive: true });
    await writeFile(dependency, "secret\n");
    await assert.rejects(validatePublicHygiene(root), /inside the source model is unsupported/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test("frozen historical reports keep original paths without exempting changed or copied content", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-history-hygiene-"));
  try {
    for (const name of [
      "CHANGELOG.md", "CONTRIBUTING.md", "LICENSE", "README.md",
      "SECURITY.md", "THIRD_PARTY_NOTICES.md", "package.json", "package-lock.json",
    ]) await writeFile(join(root, name), "example\n");
    const relative = "docs/operations/cloud-management-acceptance-2026-10-01.md";
    const original = await readFile(new URL(`../${relative}`, import.meta.url));
    const report = join(root, relative);
    await mkdir(join(report, ".."), { recursive: true });
    await writeFile(report, original);
    await validatePublicHygiene(root);
    await writeFile(report, `${original}\nchanged\n`);
    await assert.rejects(validatePublicHygiene(root), /historical evidence hash drift/);
    await writeFile(report, original);
    const copied = join(root, "docs/copied-report.md");
    await writeFile(copied, original);
    await assert.rejects(validatePublicHygiene(root), /absolute macOS home path/);
    await writeFile(copied, `${"-----BEGIN "}PRIVATE KEY-----\nexample\n`);
    await assert.rejects(validatePublicHygiene(root), /contains a private key/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test("Markdown destinations support angle brackets, nesting, escapes, titles and references", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-destinations-"));
  try {
    for (const name of ["guide (draft).md", "nested(one(two)).md", "compact(draft).md", "plain.md"])
      await writeFile(join(root, name), "# Guide\n");
    for (const link of [
      '[guide](<guide (draft).md>)',
      '[guide](<guide (draft).md> "A title")',
      '[guide](nested(one(two)).md)',
      String.raw`[guide](<guide \(draft\).md> 'A title')`,
      '[guide](plain.md (A title))',
      String.raw`[guide](compact\(draft\).md)`,
      String.raw`[guide](plain.md "A \"quoted\" title")`,
      '[guide][ref]\n\n[ref]: <guide (draft).md> "A title"',
      '[guide][ref]\n\n[ref]: nested(one(two)).md',
      '`[example](missing.md)`\n~~~md\n[example](missing.md)\n~~~',
      '[remote](https://example.com/a(b) "Remote")',
    ]) {
      await writeFile(join(root, "README.md"), link);
      await validateLocalMarkdownLinks(root);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});


test("parsed destinations retain missing, URI, traversal and symlink rejection", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-link-controls-"));
  const outside = await mkdtemp(join(tmpdir(), "oh-my-stack-link-outside-"));
  try {
    await writeFile(join(outside, "secret.md"), "outside\n");
    await symlink(outside, join(root, "escape"), "dir");
    for (const [destination, error] of [
      ['<missing (draft).md> "Title"', /missing local link/],
      ['missing(one(two)).md', /missing local link/],
      ['<%GG> "Title"', /malformed local link/],
      ['<&#37;GG>', /malformed local link/],
      ['<%FF>', /malformed local link/],
      ['<..%2f..%2foutside.md>', /link escapes repository/],
      ['<escape/secret.md> "Title"', /link escapes repository/],
    ]) {
      for (const markdown of [
        `[guide](${destination})`,
        `[guide][ref]\n\n[ref]: ${destination}`,
      ]) {
        await writeFile(join(root, "README.md"), markdown);
        await assert.rejects(validateLocalMarkdownLinks(root), error);
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});


for (const [label, markdown] of [
  ["nested labels", "[outer [inner]](../outside.md)"],
  ["multiline labels", "[first\nsecond](../outside.md)"],
  ["blockquote references", "> [guide][ref]\n>\n> [ref]: ../outside.md"],
  ["list references", "- [guide][ref]\n\n  [ref]: ../outside.md"],
  ["entity traversal", "[guide](&period;&period;&sol;outside.md)"],
  ["numeric traversal", "[guide](&#46;&#x2e;&#47;outside.md)"],
  ["entity image traversal", "![guide](&period;&period;&sol;outside.md)"],
]) {
  test(`rendered Markdown rejects traversal through ${label}`, async () => {
    const root = await mkdtemp(join(tmpdir(), "oh-my-stack-rendered-links-"));
    try {
      await writeFile(join(root, "README.md"), markdown);
      await assert.rejects(validateLocalMarkdownLinks(root), /link escapes repository/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
}

test("rendered destinations decode named and numeric entities before splitting fragments", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-entity-links-"));
  try {
    for (const name of ["guide.md", "a&b.md", "guide draft.md", "hash#name.md", "%GG"])
      await writeFile(join(root, name), "# Guide\n");
    for (const markdown of [
      "[readme](README&#46;md)",
      "[guide](guide&#46;md)",
      "[guide](guide&period;md)",
      "[guide](guide&#x2e;md&#35;section)",
      "[guide](guide.md&num;section)",
      "[fragment](&num;section)",
      "[guide](a&amp;b.md)",
      "![guide](<guide&#32;draft.md>)",
      "[guide](hash%23name.md#section)",
      "[percent](%25GG)",
      "[guide][ref]\n\n[ref]: guide&#46;md&#35;section",
    ]) {
      await writeFile(join(root, "README.md"), markdown);
      await validateLocalMarkdownLinks(root);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("literal code and unused references do not create rendered destinations", async () => {
  const root = await mkdtemp(join(tmpdir(), "oh-my-stack-literal-links-"));
  try {
    for (const markdown of [
      "    [example](missing.md)",
      "> ```md\n> [example](missing.md)\n> ```",
      "- ~~~md\n  [example](missing.md)\n  ~~~",
      "``[example](missing`file.md)``",
      String.raw`\[example](missing.md)`,
      "[unused]: missing.md",
    ]) {
      await writeFile(join(root, "README.md"), markdown);
      await validateLocalMarkdownLinks(root);
    }
    await writeFile(join(root, "README.md"), "![example](missing.png)");
    await assert.rejects(validateLocalMarkdownLinks(root), /missing local link missing.png/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
