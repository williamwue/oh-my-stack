#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const BOOK = "docs/books/pstack";
const SNAPSHOT = "upstream/books/pstack/2026-10-03";
const STATUS_ZH = new Set(["not_started", "draft", "reviewed", "ready"]);
const STATUS_EN = new Set(["not_started", "imported", "reviewed", "ready"]);
const REVIEW_STATUS = new Set(["not_started", "draft", "reviewed", "ready"]);

function check(ok, message) {
  if (!ok) throw new Error(message);
}

function inside(root, file, allowRoot = false) {
  const part = relative(root, file);
  return (allowRoot || part !== "") && part !== ".." && !part.startsWith(`..${sep}`) && !isAbsolute(part);
}

function safePath(root, value, label, base = root) {
  check(typeof value === "string" && value.length > 0, `${label}: path is required`);
  check(!/[\\\0:]/.test(value) && !value.startsWith("/")
    && value.split("/").every((part) => part && part !== "." && part !== ".."),
  `${label}: unsafe path ${value}`);
  const file = resolve(base, value);
  check(inside(root, file), `${label}: path escapes repository`);
  return file;
}

async function requiredFile(root, value, label, base = root) {
  const file = safePath(root, value, label, base);
  let info;
  try { info = await stat(file); }
  catch { throw new Error(`${label}: missing file ${value}`); }
  check(info.isFile(), `${label}: expected file ${value}`);
  check(inside(root, await realpath(file)), `${label}: symlink escapes repository ${value}`);
  return file;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function chapterName(order) {
  return order === 1 ? "01-preface.md" : `${String(order).padStart(2, "0")}-chapter.md`;
}

function fences(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  const outside = [];
  let active = null;
  for (const line of lines) {
    if (!active) {
      const open = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (open) {
        active = { mark: open[1][0], length: open[1].length, language: open[2].trim().split(/\s+/)[0].toLowerCase(), lines: [] };
        outside.push("");
      } else outside.push(line);
    } else if (new RegExp(`^ {0,3}${active.mark}{${active.length},}\\s*$`).test(line)) {
      blocks.push({ language: active.language, body: active.lines.join("\n") });
      active = null;
      outside.push("");
    } else {
      active.lines.push(line);
      outside.push("");
    }
  }
  check(!active, "unclosed Markdown code fence");
  return { blocks, outside: outside.join("\n") };
}

function executableBlocks(markdown) {
  const parsed = fences(markdown);
  const html = [...parsed.outside.matchAll(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi)].map((match) => ({ language: "html-pre", body: match[0] }));
  return [...parsed.blocks, ...html];
}

function headingId(text) {
  return text.replace(/<[^>]*>/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "").trim().toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, "").replace(/ /g, "-");
}

function withoutInlineCode(text) {
  return text.replace(/(`+)([\s\S]*?)\1/g, (match) => match.replace(/[^\n]/g, " "))
    .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, (match) => match.replace(/[^\n]/g, " "));
}

function anchors(markdown) {
  const { outside } = fences(markdown);
  const found = new Set();
  const counts = new Map();
  for (const line of outside.split("\n")) {
    for (const match of line.matchAll(/<a\s+[^>]*(?:id|name)=(["'])(.*?)\1[^>]*>/gi)) found.add(match[2]);
    for (const match of line.matchAll(/<[^>]+\sid=(["'])(.*?)\1[^>]*>/gi)) found.add(match[2]);
    const heading = line.match(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const base = headingId(heading[1]);
      const count = counts.get(base) ?? 0;
      counts.set(base, count + 1);
      found.add(count ? `${base}-${count}` : base);
    }
  }
  return found;
}

function links(markdown) {
  const outside = withoutInlineCode(fences(markdown).outside);
  const targets = [];
  // Walk balanced parentheses so filenames such as image(1).png are checked whole.
  for (const match of outside.matchAll(/!?\[[^\]]*\]\(/g)) {
    let depth = 1;
    let cursor = match.index + match[0].length;
    const start = cursor;
    while (cursor < outside.length && depth > 0) {
      if (outside[cursor] === "\\") { cursor += 2; continue; }
      if (outside[cursor] === "(") depth += 1;
      if (outside[cursor] === ")") depth -= 1;
      cursor += 1;
    }
    check(depth === 0, "unclosed Markdown link");
    const raw = outside.slice(start, cursor - 1).trim();
    const destination = raw.match(/^<([^>]+)>|^([^\s]+)/);
    if (destination) targets.push(destination[1] ?? destination[2]);
  }
  for (const match of outside.matchAll(/^\s{0,3}\[[^\]]+\]:\s*(<[^>]+>|\S+)/gm)) targets.push(match[1].replace(/^<|>$/g, ""));
  for (const match of outside.matchAll(/<(?:a|img)\b[^>]*\b(?:href|src)=(["'])(.*?)\1[^>]*>/gi)) targets.push(match[2]);
  return targets;
}

async function markdownFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await markdownFiles(path));
    else if (entry.isFile() && extname(path) === ".md") found.push(path);
  }
  return found;
}

async function checkLinks(root, files, chapterPaths) {
  const anchorCache = new Map();
  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const target of links(content)) {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue;
      check(!target.startsWith("/"), `${relative(root, file)}: absolute local link ${target}`);
      const [rawPath, rawFragment] = target.split("#", 2);
      let pathname;
      let fragment;
      try {
        pathname = decodeURIComponent(rawPath);
        fragment = rawFragment == null ? null : decodeURIComponent(rawFragment);
      }
      catch { throw new Error(`${relative(root, file)}: malformed local link ${target}`); }
      const destination = pathname ? resolve(dirname(file), pathname) : file;
      check(inside(root, destination), `${relative(root, file)}: link escapes repository ${target}`);
      await requiredFile(root, relative(root, destination), `${relative(root, file)}: local link`);
      if (fragment) {
        if (!anchorCache.has(destination)) anchorCache.set(destination, anchors(await readFile(destination, "utf8")));
        check(anchorCache.get(destination).has(fragment) || anchorCache.get(destination).has(rawFragment),
          `${relative(root, file)}: missing fragment #${fragment} in ${target}`);
      }
      const origin = chapterPaths.get(file);
      const dest = chapterPaths.get(destination);
      if (origin && dest && origin.language !== dest.language) {
        check(origin.order === dest.order,
          `${relative(root, file)}: cross-edition chapter link points to chapter ${dest.order}, expected ${origin.order}`);
      }
    }
  }
}

function codeDeviations(chapter) {
  const entries = chapter.review?.code_deviations ?? [];
  check(Array.isArray(entries), `chapter ${chapter.order}: code_deviations must be an array`);
  const seen = new Set();
  for (const item of entries) {
    check(["en", "zh-CN"].includes(item.language) && Number.isInteger(item.block) && item.block > 0
      && typeof item.rationale === "string" && item.rationale.trim().length > 0,
    `chapter ${chapter.order}: code deviation needs language, 1-based block, and rationale`);
    const key = `${item.language}:${item.block}`;
    check(!seen.has(key), `chapter ${chapter.order}: duplicate code deviation ${key}`);
    seen.add(key);
  }
  return new Map(entries.map((entry) => [`${entry.language}:${entry.block}`, entry]));
}

function checkCode(source, edition, chapter, language, deviations, warnings) {
  const sourceBlocks = executableBlocks(source);
  const editionBlocks = executableBlocks(edition);
  const size = Math.max(sourceBlocks.length, editionBlocks.length);
  for (let index = 0; index < size; index += 1) {
    const key = `${language}:${index + 1}`;
    const approved = deviations.get(key);
    if (!sourceBlocks[index] || !editionBlocks[index]) {
      check(approved, `chapter ${chapter.order} ${language}: cannot compare code block ${index + 1}; record an approved deviation`);
      warnings.push(`chapter ${chapter.order} ${language}: code block ${index + 1} cannot be compared (${approved.rationale})`);
    } else if (sourceBlocks[index].body !== editionBlocks[index].body) {
      check(approved, `chapter ${chapter.order} ${language}: code block ${index + 1} changed without approved deviation`);
      warnings.push(`chapter ${chapter.order} ${language}: approved code deviation ${index + 1} (${approved.rationale})`);
    } else {
      check(!approved, `chapter ${chapter.order} ${language}: unused code deviation ${index + 1}`);
    }
  }
  for (const key of deviations.keys()) {
    if (key.startsWith(`${language}:`)) check(Number(key.split(":")[1]) <= size,
      `chapter ${chapter.order} ${language}: unused code deviation ${key}`);
  }
}

function checkPlaceholders(content, chapter, language) {
  const outside = withoutInlineCode(fences(content).outside);
  check(!/(?:\bTODO\s*:\s*(?:translate|translation|import)|\bTBD\b|待翻译|待補完|翻译待完成|translation pending)/i.test(outside),
    `chapter ${chapter.order} ${language}: unfinished placeholder in ready chapter`);
}

function editionBody(content, assets) {
  let body = content?.match(/<!-- book-body:start -->\n([\s\S]*?)<!-- book-body:end -->/)?.[1];
  if (body == null) return null;
  body = body.replace(/\n\n<!-- book-diagram-link:start -->[\s\S]*?<!-- book-diagram-link:end -->/g, "");
  for (const asset of assets) body = body.replaceAll(`src="../assets/${asset.file}"`, `src="${asset.source_url}"`);
  return body;
}

async function checkDiagrams(root, manifest, complete) {
  const dir = join(root, BOOK, "diagrams");
  let content;
  try { content = JSON.parse(await readFile(join(dir, "content.json"), "utf8")); }
  catch (error) { if (error.code === "ENOENT" && !complete) return; throw error; }
  if (complete) {
    const reportFile = await requiredFile(root, `${BOOK}/reviews/independent/diagrams.json`, "diagram review");
    const report = JSON.parse(await readFile(reportFile, "utf8"));
    check(report.verdict === "reviewed" && Array.isArray(report.unresolved) && report.unresolved.length === 0,
      "diagram review has unresolved findings");
    check(typeof report.reviewer === "string" && report.reviewer.length > 0 && typeof report.human_review === "boolean",
      "diagram review attribution is missing");
    check(report.content_sha256 === sha256(await readFile(join(dir, "content.json"))), "diagram review hash is stale");
    check(Array.isArray(report.keys) && JSON.stringify([...report.keys].sort()) === JSON.stringify(Object.keys(content).sort()),
      "diagram review does not cover every figure");
  }
  const rendered = JSON.parse(await readFile(join(dir, "render-manifest.json"), "utf8"));
  const rows = new Map(rendered.diagrams.map((row) => [row.key, row]));
  let count = 0;
  for (const chapter of manifest.chapters) {
    for (const lang of ["ja", "en"]) {
      const source = await readFile(join(root, chapter.source_snapshot[`${lang}_file`]), "utf8");
      const frames = [...source.matchAll(/<iframe\b[^>]*>/g)].filter((m) => m[0].includes("https://embed.zenn.studio/mermaid#"));
      for (const [index, frame] of frames.entries()) {
        const key = `${String(chapter.order).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
        const raw = frame[0].match(/data-content="([^"]+)"/);
        check(raw && content[key]?.[lang] === decodeURIComponent(raw[1]), `diagram ${key}: ${lang} source drift`);
        check(rows.get(key)?.[`${lang}_source_sha256`] === sha256(content[key][lang]), `diagram ${key}: source receipt drift`);
        if (lang === "ja") count += 1;
      }
    }
  }
  check(count === 31 && Object.keys(content).length === count && rows.size === count, "expected 31 complete diagram pairs");
  for (const [key, body] of Object.entries(content)) {
    check(typeof body["zh-CN"] === "string" && body["zh-CN"].length > 0, `diagram ${key}: Chinese translation missing`);
    check(sha256(body["zh-CN"]) === rows.get(key).zh_translation_sha256, `diagram ${key}: translation changed without rerender`);
    for (const lang of ["en", "zh-CN"]) {
      const file = await requiredFile(root, `${BOOK}/diagrams/${lang}/${key}.svg`, `diagram ${key}`);
      const svg = await readFile(file, "utf8");
      check(sha256(svg) === rows.get(key).svg_sha256[lang], `diagram ${key}: SVG hash drift`);
      check(svg.includes("<svg") && !/<(?:script|foreignObject)\b/i.test(svg), `diagram ${key}: invalid static SVG`);
      const markdown = await readFile(join(dir, lang, `${key}.md`), "utf8");
      check(fences(markdown).blocks[0]?.body === body[lang], `diagram ${key}: editable diagram drift`);
    }
  }
}

async function checkTitles(root, manifest, complete) {
  const path = `${BOOK}/reviews/independent/titles.json`;
  let report;
  try { report = JSON.parse(await readFile(join(root, path), "utf8")); }
  catch (error) { if (error.code === "ENOENT" && !complete) return; throw error; }
  check(report.verdict === "reviewed" && Array.isArray(report.unresolved) && report.unresolved.length === 0,
    "title review has unresolved findings");
  check(typeof report.reviewer === "string" && report.reviewer.length > 0 && typeof report.human_review === "boolean",
    "title review attribution is missing");
  const titles = manifest.chapters.map((c) => [c.order, c.title_ja, c.title_zh_cn]);
  check(report.canonical_sha256 === sha256(JSON.stringify(titles)), "title review hash is stale");
  check(JSON.stringify(report.reviewed_orders) === JSON.stringify(manifest.chapters.map((c) => c.order)),
    "title review does not cover every chapter");
  for (const chapter of manifest.chapters) {
    for (const [fileKey, titleKey] of [["translation_file", "title_zh_cn"], ["english_file", "title_en"]]) {
      if (!chapter[fileKey]) continue;
      const content = await readFile(join(root, BOOK, chapter[fileKey]), "utf8");
      check(content.split(/\r?\n/, 1)[0] === `# ${chapter[titleKey]}`,
        `chapter ${chapter.order}: emitted heading differs from manifest title`);
    }
  }
}

export async function validatePstackBook(root, { complete = false } = {}) {
  root = await realpath(root);
  const bookRoot = join(root, BOOK);
  const manifestFile = await requiredFile(root, `${BOOK}/source-manifest.json`, "source manifest");
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestFile, "utf8")); }
  catch { throw new Error("source manifest: invalid JSON"); }
  check(Array.isArray(manifest.chapters) && manifest.chapters.length === 48,
    "source manifest: exactly 48 chapters are required");
  const urls = { ja: new Set(), en: new Set() };
  const fileClaims = new Set();
  const reportClaims = new Set();
  const chapterPaths = new Map();
  const warnings = [];
  let assets = [];
  try { assets = JSON.parse(await readFile(join(bookRoot, "assets/sources.json"), "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  let ready = 0;
  for (const [index, chapter] of manifest.chapters.entries()) {
    const order = index + 1;
    check(chapter.order === order, `chapter ${order}: order must be consecutive from 1 to 48`);
    for (const lang of ["ja", "en"]) {
      const url = chapter[`source_${lang}`];
      const book = manifest[lang === "ja" ? "japanese_book_url" : "english_book_url"];
      check(typeof url === "string" && url.startsWith(`${book}/viewer/`) && /^https:\/\/zenn\.dev\//.test(url),
        `chapter ${order}: incorrect ${lang} source URL`);
      check(!urls[lang].has(url), `chapter ${order}: duplicate ${lang} source URL`);
      urls[lang].add(url);
    }
    check(STATUS_ZH.has(chapter.translation_status), `chapter ${order}: invalid translation_status`);
    check(STATUS_EN.has(chapter.english_status), `chapter ${order}: invalid english_status`);
    const paired = [
      ["zh-CN", "translation_status", "translation_file"],
      ["en", "english_status", "english_file"],
    ];
    const contents = new Map();
    for (const [language, statusKey, fileKey] of paired) {
      const status = chapter[statusKey];
      const value = chapter[fileKey];
      if (status === "not_started") {
        check(value == null, `chapter ${order} ${language}: not_started must have null file`);
        continue;
      }
      check(typeof value === "string" && value.startsWith(`${language}/`)
        && value === `${language}/${chapterName(order)}`,
      `chapter ${order} ${language}: incorrect chapter filename`);
      const file = await requiredFile(root, value, `chapter ${order} ${language}`, bookRoot);
      check(inside(bookRoot, file), `chapter ${order} ${language}: path escapes book`);
      check(!fileClaims.has(file), `chapter ${order}: duplicate chapter file ${value}`);
      fileClaims.add(file);
      chapterPaths.set(file, { order, language });
      const content = await readFile(file, "utf8");
      check(content.trim().length > 0, `chapter ${order} ${language}: empty chapter`);
      if (status === "ready") checkPlaceholders(content, chapter, language);
      contents.set(language, content);
    }
    const snapshot = chapter.source_snapshot;
    if (contents.size || snapshot) {
      check(snapshot && typeof snapshot === "object", `chapter ${order}: source_snapshot is required`);
      const sourceBodies = new Map();
      for (const lang of ["ja", "en"]) {
        const value = snapshot[`${lang}_file`];
        check(value === `${SNAPSHOT}/${lang}/${String(order).padStart(2, "0")}.md`,
          `chapter ${order}: incorrect ${lang} source snapshot path`);
        const file = await requiredFile(root, value, `chapter ${order} ${lang} snapshot`);
        const body = await readFile(file, "utf8");
        const expected = snapshot[`${lang}_sha256`];
        check(typeof expected === "string" && /^[a-f0-9]{64}$/.test(expected),
          `chapter ${order}: invalid ${lang} snapshot hash`);
        check(sha256(body) === expected, `chapter ${order}: ${lang} source snapshot hash drift`);
        sourceBodies.set(lang, body);
      }
      const deviations = codeDeviations(chapter);
      const englishBody = editionBody(contents.get("en"), assets);
      if (englishBody != null) check(englishBody.trimEnd() === sourceBodies.get("en").trimEnd(),
        `chapter ${order}: English body differs from frozen author edition`);
      if (contents.has("en")) checkCode(sourceBodies.get("en"), contents.get("en"), chapter, "en", deviations, warnings);
      if (contents.has("zh-CN")) checkCode(sourceBodies.get("ja"), contents.get("zh-CN"), chapter, "zh-CN", deviations, warnings);
    }
    const review = chapter.review;
    if (review != null) {
      check(REVIEW_STATUS.has(review.status), `chapter ${order}: invalid review status`);
      if (review.report != null) {
        check(typeof review.report === "string", `chapter ${order}: invalid review report`);
        const reportFile = await requiredFile(root, review.report, `chapter ${order} review report`);
        check(!reportClaims.has(reportFile), `chapter ${order}: review report is already assigned to another chapter`);
        reportClaims.add(reportFile);
        check((await readFile(reportFile, "utf8")).trim().length > 0,
          `chapter ${order}: empty review report`);
        if (review.report.endsWith(".json") && ["reviewed", "ready"].includes(review.status)) {
          const evidence = JSON.parse(await readFile(reportFile, "utf8"));
          check(evidence.verdict === "reviewed" && Array.isArray(evidence.unresolved) && evidence.unresolved.length === 0,
            `chapter ${order}: review has unresolved findings`);
          check(typeof evidence.reviewer === "string" && evidence.reviewer.length > 0 && typeof evidence.human_review === "boolean",
            `chapter ${order}: review attribution is missing`);
          check(evidence.source_sha256 === chapter.source_snapshot.ja_sha256,
            `chapter ${order}: review source hash is stale`);
          const body = editionBody(contents.get("zh-CN"), assets);
          check(body != null, `chapter ${order}: reviewed translation needs body boundaries`);
          check(sha256(body) === evidence.translation_sha256,
            `chapter ${order}: review translation hash is stale`);
        }
      }
    }
    if (chapter.translation_status === "ready" || chapter.english_status === "ready") {
      check(review && ["reviewed", "ready"].includes(review.status) && review.report,
        `chapter ${order}: ready edition requires review evidence`);
    }
    if (review?.code_deviations?.length) {
      check(["reviewed", "ready"].includes(review.status) && review.report,
        `chapter ${order}: code deviations require review evidence`);
    }
    if (complete) {
      check(chapter.translation_status === "ready" && chapter.english_status === "ready",
        `chapter ${order}: both editions must be ready for --complete`);
      check(review && ["reviewed", "ready"].includes(review.status) && review.report,
        `chapter ${order}: --complete requires review evidence`);
      check(review.report.endsWith(".json"), `chapter ${order}: --complete requires hash-bound review JSON`);
      check(editionBody(contents.get("en"), assets) != null, `chapter ${order}: complete English edition needs body boundaries`);
    }
    if (chapter.translation_status === "ready" && chapter.english_status === "ready") ready += 1;
  }
  await checkTitles(root, manifest, complete);
  await checkDiagrams(root, manifest, complete);
  await checkLinks(root, await markdownFiles(bookRoot), chapterPaths);
  return { chapters: manifest.chapters.length, ready, warnings };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  check(args.every((arg) => arg === "--complete"), "usage: validate-pstack-book.mjs [--complete]");
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  validatePstackBook(root, { complete: args.includes("--complete") })
    .then((result) => { console.log(JSON.stringify(result, null, 2)); })
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
