import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
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
