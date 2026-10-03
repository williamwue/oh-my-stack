import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { validatePstackBook } from "../tools/books/validate-pstack-book.mjs";

const book = "docs/books/pstack";
const snapshot = "upstream/books/pstack/2026-10-03";
const jaBook = "https://zenn.dev/sc30gsw/books/080faba713547b";
const enBook = "https://zenn.dev/sc30gsw/books/7ff701b9811d04";
const source = "# Source\n\n```bash\necho original\n```\n";
const english = "<a id=\"source-heading\"></a>\n# English\n\n```bash\necho original\n```\n\n[back](README.md)\n";
const chinese = "# 中文\n\n```bash\necho original\n```\n\n[English](../en/01-preface.md#source-heading)\n";

function hash(value) { return createHash("sha256").update(value).digest("hex"); }

async function put(root, path, content) {
  const absolute = join(root, path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content);
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "pstack-book-test-"));
  const chapters = Array.from({ length: 48 }, (_, index) => ({
    order: index + 1,
    title_ja: `JA ${index + 1}`,
    title_en: `EN ${index + 1}`,
    title_zh_cn: `ZH ${index + 1}`,
    source_ja: `${jaBook}/viewer/${String(index + 1).padStart(6, "0")}`,
    source_en: `${enBook}/viewer/${String(index + 1).padStart(6, "0")}`,
    translation_status: "not_started",
    translation_file: null,
    english_status: "not_started",
    english_file: null,
    source_snapshot: null,
    review: { status: "not_started", report: null },
  }));
  chapters[0].translation_status = "draft";
  chapters[0].translation_file = "zh-CN/01-preface.md";
  chapters[0].english_status = "imported";
  chapters[0].english_file = "en/01-preface.md";
  chapters[0].source_snapshot = {
    ja_file: `${snapshot}/ja/01.md`,
    en_file: `${snapshot}/en/01.md`,
    ja_sha256: hash(source),
    en_sha256: hash(source),
  };
  const manifest = { japanese_book_url: jaBook, english_book_url: enBook, chapters };
  const save = () => put(root, `${book}/source-manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  await put(root, `${snapshot}/ja/01.md`, source);
  await put(root, `${snapshot}/en/01.md`, source);
  await put(root, `${book}/en/01-preface.md`, english);
  await put(root, `${book}/zh-CN/01-preface.md`, chinese);
  await put(root, `${book}/en/README.md`, "# Contents\n");
  await save();
  return { root, manifest, save };
}

async function withFixture(run) {
  const built = await fixture();
  try { await run(built); }
  finally { await rm(built.root, { recursive: true, force: true }); }
}

test("a valid partial book passes while --complete waits for all 48 ready chapters", async () => {
  await withFixture(async ({ root }) => {
    assert.deepEqual(await validatePstackBook(root), { chapters: 48, ready: 0, warnings: [] });
    await assert.rejects(validatePstackBook(root, { complete: true }), /both editions must be ready/);
  });
});

test("missing claimed chapter and missing table-of-contents entry fail", async () => {
  await withFixture(async ({ root, manifest, save }) => {
    await rm(join(root, book, "en/01-preface.md"));
    await assert.rejects(validatePstackBook(root), /missing file en\/01-preface.md/);
    await put(root, `${book}/en/01-preface.md`, english);
    manifest.chapters.pop();
    await save();
    await assert.rejects(validatePstackBook(root), /exactly 48 chapters/);
  });
});

test("missing local link, missing fragment, and path escape fail offline", async () => {
  await withFixture(async ({ root }) => {
    await put(root, `${book}/en/01-preface.md`, `${english}\n<a id=\"%E4%B8%AD\"></a>\n[encoded](#%E4%B8%AD)\n`);
    await validatePstackBook(root);
    await put(root, `${book}/en/01-preface.md`, `${english}\n[Missing](missing.md)\n`);
    await assert.rejects(validatePstackBook(root), /missing file .*missing.md/);
    await put(root, `${book}/en/01-preface.md`, `${english}\n[Missing](README.md#no-such-anchor)\n`);
    await assert.rejects(validatePstackBook(root), /missing fragment/);
    await put(root, `${book}/en/01-preface.md`, `${english}\n![Escape](..%2f..%2f..%2f..%2f..%2fsecret.png)\n`);
    await assert.rejects(validatePstackBook(root), /link escapes repository/);
  });
});

test("changed executable code needs a per-block approval with rationale", async () => {
  await withFixture(async ({ root, manifest, save }) => {
    await put(root, `${book}/zh-CN/01-preface.md`, chinese.replace("echo original", "echo changed"));
    await assert.rejects(validatePstackBook(root), /changed without approved deviation/);
    manifest.chapters[0].review = {
      status: "reviewed", report: `${book}/reviews/01.md`,
      code_deviations: [{ language: "zh-CN", block: 1, rationale: "Target platform command differs" }],
    };
    await put(root, `${book}/reviews/01.md`, "# Code deviation review\n");
    await save();
    const report = await validatePstackBook(root);
    assert.match(report.warnings[0], /approved code deviation/);
  });
});

test("ready status requires review evidence, and placeholders inside original code are allowed", async () => {
  await withFixture(async ({ root, manifest, save }) => {
    manifest.chapters[0].translation_status = "ready";
    await save();
    await assert.rejects(validatePstackBook(root), /ready edition requires review evidence/);
    manifest.chapters[0].review = { status: "reviewed", report: `${book}/reviews/01.md` };
    await put(root, `${book}/reviews/01.md`, "# Review\n\nChecked both editions.\n");
    const originalWithPlaceholder = source.replace("echo original", "echo TODO: translate");
    manifest.chapters[0].source_snapshot.ja_sha256 = hash(originalWithPlaceholder);
    await put(root, `${snapshot}/ja/01.md`, originalWithPlaceholder);
    await put(root, `${book}/zh-CN/01-preface.md`, chinese.replace("echo original", "echo TODO: translate"));
    await save();
    await validatePstackBook(root);
  });
});

test("snapshot hashes and cross-edition chapter pairing are checked", async () => {
  await withFixture(async ({ root, manifest, save }) => {
    manifest.chapters[0].source_snapshot.en_sha256 = "0".repeat(64);
    await save();
    await assert.rejects(validatePstackBook(root), /snapshot hash drift/);
    manifest.chapters[0].source_snapshot.en_sha256 = hash(source);
    await put(root, `${book}/en/02-chapter.md`, "# Wrong chapter\n");
    manifest.chapters[1].english_status = "imported";
    manifest.chapters[1].english_file = "en/02-chapter.md";
    manifest.chapters[1].source_snapshot = {
      ja_file: `${snapshot}/ja/02.md`, en_file: `${snapshot}/en/02.md`,
      ja_sha256: hash("# Source\n"), en_sha256: hash("# Source\n"),
    };
    await put(root, `${snapshot}/ja/02.md`, "# Source\n");
    await put(root, `${snapshot}/en/02.md`, "# Source\n");
    await put(root, `${book}/zh-CN/01-preface.md`, chinese.replace("../en/01-preface.md#source-heading", "../en/02-chapter.md"));
    await save();
    await assert.rejects(validatePstackBook(root), /cross-edition chapter link points to chapter 2/);
  });
});

test("unlabeled code is protected and apostrophes in quoted HTML anchors work", async () => {
  await withFixture(async ({ root, manifest, save }) => {
    const raw = source.replace("```bash", "```");
    await put(root, `${snapshot}/ja/01.md`, raw);
    manifest.chapters[0].source_snapshot.ja_sha256 = hash(raw);
    await save();
    await put(root, `${book}/zh-CN/01-preface.md`, chinese.replace("```bash", "```").replace("echo original", "echo corrupted"));
    await assert.rejects(validatePstackBook(root), /changed without approved deviation/);
    await put(root, `${book}/zh-CN/01-preface.md`, chinese.replace("```bash", "```"));
    await put(root, `${book}/en/01-preface.md`, `${english}\n<a id="reader's-view%3A-test"></a>\n<a href="#reader's-view%3A-test">View</a>\n[View](#reader's-view%3A-test)\n`);
    await validatePstackBook(root);
  });
});

test("independent review evidence cannot survive a prose edit", async () => {
  await withFixture(async ({ root, manifest, save }) => {
    const path = `${book}/reviews/01.json`;
    manifest.chapters[0].review = { status: "reviewed", report: path };
    await put(root, path, JSON.stringify({
      verdict: "reviewed", reviewer: "independent reviewer", human_review: false,
      unresolved: [], source_sha256: hash(source), translation_sha256: hash(chinese),
    }));
    const wrap = (body) => `<!-- book-body:start -->\n${body}<!-- book-body:end -->\n`;
    await put(root, `${book}/zh-CN/01-preface.md`, wrap(chinese));
    await save();
    await validatePstackBook(root);
    await put(root, `${book}/zh-CN/01-preface.md`, wrap(chinese.replace("中文", "Changed prose")));
    await assert.rejects(validatePstackBook(root), /review translation hash is stale/);
  });
});

test("English prose remains bound to the frozen author's edition", async () => {
  await withFixture(async ({ root }) => {
    const wrap = (body) => `<a id="source-heading"></a>\n<!-- book-body:start -->\n${body}<!-- book-body:end -->\n`;
    await put(root, `${book}/en/01-preface.md`, wrap(source));
    await validatePstackBook(root);
    await put(root, `${book}/en/01-preface.md`, wrap(source.replace("# Source", "# Unreviewed rewrite")));
    await assert.rejects(validatePstackBook(root), /English body differs from frozen/);
  });
});

test("code retained in raw HTML is protected from changes", async () => {
  await withFixture(async ({ root, manifest, save }) => {
    const block = '<pre><code>const name = "original";</code></pre>\n';
    const raw = `${source}\n${block}`;
    await put(root, `${snapshot}/ja/01.md`, raw);
    manifest.chapters[0].source_snapshot.ja_sha256 = hash(raw);
    await save();
    await put(root, `${book}/zh-CN/01-preface.md`, `${chinese}\n${block}`);
    await validatePstackBook(root);
    await put(root, `${book}/zh-CN/01-preface.md`, `${chinese}\n${block.replace('"original"', '"changed"')}`);
    await assert.rejects(validatePstackBook(root), /changed without approved deviation/);
  });
});

test("title review binds all manifest titles and emitted headings", async () => {
  await withFixture(async ({ root, manifest, save }) => {
    const titles = manifest.chapters.map((c) => [c.order, c.title_ja, c.title_zh_cn]);
    await put(root, `${book}/reviews/independent/titles.json`, JSON.stringify({
      verdict: "reviewed", reviewer: "independent title reviewer", human_review: false,
      unresolved: [], canonical_sha256: hash(JSON.stringify(titles)),
      reviewed_orders: manifest.chapters.map((c) => c.order),
    }));
    await put(root, `${book}/en/01-preface.md`, `# EN 1\n\n${english}`);
    await put(root, `${book}/zh-CN/01-preface.md`, `# ZH 1\n\n${chinese}`);
    await validatePstackBook(root);
    manifest.chapters[0].title_zh_cn = "Changed meaning";
    await save();
    await assert.rejects(validatePstackBook(root), /title review hash is stale/);
    manifest.chapters[0].title_zh_cn = "ZH 1";
    await save();
    await put(root, `${book}/zh-CN/01-preface.md`, `# Wrong emitted heading\n\n${chinese}`);
    await assert.rejects(validatePstackBook(root), /emitted heading differs/);
  });
});
