#!/usr/bin/env node

import { execFile, spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { sha256 } from "./release-lib.mjs";
import { assertBuildEnvironment, assertReview, fileBytes, readLocalVerification, REPOSITORY,
  requireThat, snapshotAssets } from "./local-release-lib.mjs";

import { nativePublisherEnvironment, withPublicationLease } from "./release-publisher.mjs";

const exec = promisify(execFile);
const trustedTools = dirname(fileURLToPath(import.meta.url));
const encode = (value) => `${JSON.stringify(value, null, 2)}\n`;
const url = `https://github.com/${REPOSITORY}.git`;
export function parseArgs(argv) {
  const options = { tag: null, publish: false };
  const names = { "--source": "source", "--out": "out", "--review": "review", "--tag": "tag", "--notes-file": "notesFile" };
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    requireThat(!seen.has(flag), `duplicate option: ${flag}`); seen.add(flag);
    if (flag === "--publish") options.publish = true;
    else {
      requireThat(names[flag] && argv[i + 1] && !argv[i + 1].startsWith("--"), `unknown or incomplete option: ${flag}`);
      options[names[flag]] = argv[++i];
    }
  }
  requireThat(options.source && options.out && options.review, "usage: local-release --source CLEAN_CHECKOUT --out NEW_EVIDENCE --review REVIEW_JSON [--tag vVERSION] [--publish --notes-file NOTES]");
  requireThat(!options.publish || (options.tag && options.notesFile), "publication requires --tag and --notes-file");
  requireThat(!options.tag || /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(options.tag), "release tag must be vVERSION");
  for (const key of ["source", "out", "review", "notesFile"]) if (options[key]) options[key] = resolve(options[key]);
  return options;
}
async function git(source, ...args) { return (await exec("git", args, { cwd: source })).stdout.trim(); }
export async function inspectSource(source, tag = null) {
  requireThat(await realpath(await git(source, "rev-parse", "--show-toplevel")) === source, "--source must be the checkout root");
  requireThat(!(await git(source, "status", "--porcelain", "--untracked-files=all")), "source checkout must be clean");
  const commit = await git(source, "rev-parse", "HEAD"), tree = await git(source, "rev-parse", "HEAD^{tree}");
  const project = JSON.parse(await fileBytes(join(source, "src/core/project.json")));
  requireThat(project.name === "oh-my-stack", "wrong source project");
  if (tag) {
    requireThat(tag === `v${project.version}` && await git(source, "rev-parse", `${tag}^{commit}`) === commit,
      "release tag/version must resolve to exact source HEAD");
  }
  return { commit, tree, ref: tag ?? "HEAD", worktreeDirty: false, cleanTaggedCheckout: Boolean(tag) };
}
export function assertReleaseCompatible(release, records, tag, notes) {
  requireThat(release.tag_name === tag && release.prerelease === false && Array.isArray(release.assets), "existing release identity or prerelease mismatch");
  requireThat(typeof release.draft === "boolean" && Number.isSafeInteger(release.id), "invalid existing release state");
  if (release.draft) requireThat(release.body === notes, "existing draft notes differ; refusing mutation");
  else requireThat(Boolean(release.published_at), "release has no publication evidence");
  const local = new Map(records.map((entry) => [entry.name, entry])), seen = new Set();
  for (const asset of release.assets) {
    const entry = local.get(asset.name);
    requireThat(entry && !seen.has(asset.name) && asset.state === "uploaded"
      && asset.digest === `sha256:${entry.sha256}` && asset.size === entry.size,
    `existing release asset differs: ${asset.name}`);
    seen.add(asset.name);
  }
  requireThat(release.draft || seen.size === records.length, "published release asset inventory differs");
  return records.filter((entry) => !seen.has(entry.name));
}
export function assertNoDowngrade(tag, latest) {
  if (!latest) return;
  const parts = (value) => {
    requireThat(/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value), "latest release version is not plain semver");
    return value.slice(1).split(".").map(BigInt);
  };
  const a = parts(tag), b = parts(latest.tag_name);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return;
    requireThat(a[i] === b[i], "release publication cannot downgrade latest");
  }
}
async function runCheck({ name, steps, source, out, env, checks }) {
  const log = `logs/${name}.log`, path = join(out, log);
  const stream = createWriteStream(path, { flags: "wx" });
  let exitCode = 0;
  try {
    for (const [command, args] of steps) {
      stream.write(`$ ${JSON.stringify([command, ...args])}\n`);
      exitCode = await new Promise((accept, reject) => {
        const child = spawn(command, args, { cwd: source, env, stdio: ["ignore", "pipe", "pipe"] });
        child.stdout.pipe(stream, { end: false }); child.stderr.pipe(stream, { end: false });
        child.on("error", reject); child.on("close", (code) => accept(code ?? 1));
      });
      if (exitCode !== 0) break;
    }
  } catch (error) { stream.write(`${error.message}\n`); exitCode = 1; }
  await new Promise((accept, reject) => { stream.on("error", reject); stream.end(accept); });
  checks.push({ name, exitCode, log, sha256: sha256(await readFile(path)) });
  await writeFile(join(out, "checks.json"), encode(checks));
  requireThat(exitCode === 0, `${name} failed (exit ${exitCode}); evidence retained in ${path}`);
  console.log(`Passed ${name}.`);
}

async function publishRelease({ options, source, receiptPath, manifest, records, out, verify }) {
  requireThat(process.env.GITHUB_ACTIONS !== "true", "publication requires the local maintainer pipeline");
  const origin = await git(options.source, "remote", "get-url", "origin");
  requireThat([url, `https://github.com/${REPOSITORY}`, `git@github.com:${REPOSITORY}.git`, `ssh://git@github.com/${REPOSITORY}.git`].includes(origin), "source origin is not the official repository");
  const neutral = join(out, "github"); await mkdir(neutral);
  const env = nativePublisherEnvironment();
  const gh = async (...args) => (await exec("gh", args, { cwd: neutral, env, maxBuffer: 16 * 1024 * 1024 })).stdout;
  const api = async (endpoint) => JSON.parse(await gh("api", "--hostname", "github.com", endpoint));
  const optional = async (endpoint) => {
    try { return await api(endpoint); }
    catch (error) { if (/\(HTTP 404\)/.test(error.stderr ?? "")) return null; throw error; }
  };
  const account = (await api("user")).login, repo = await api(`repos/${REPOSITORY}`);
  requireThat(typeof account === "string" && account && repo.full_name === REPOSITORY
    && repo.default_branch === "main" && repo.permissions?.push === true, "native account lacks write access to the exact repository");
  const notes = (await fileBytes(options.notesFile)).toString();
  const frozenNotes = join(out, "release-notes.md"); await writeFile(frozenNotes, notes, { flag: "wx" });
  const progress = { repository: REPOSITORY, account, tag: options.tag, source, stages: [] };
  const stage = async (name, detail = {}) => {
    progress.stages.push({ name, ...detail }); await writeFile(join(out, "publication.json"), encode(progress));
    console.log(`Release stage: ${name}.`);
  };
  // The tag endpoint can hide drafts. Enumerate authenticated releases and
  // select one exact ID; a bounded, incomplete search must never create a draft.
  const releaseByTag = async () => {
    const matches = [];
    for (let page = 1; page <= 10; page++) {
      const entries = await api(`repos/${REPOSITORY}/releases?per_page=100&page=${page}`);
      requireThat(Array.isArray(entries), "invalid GitHub releases listing");
      matches.push(...entries.filter((entry) => entry.tag_name === options.tag));
      requireThat(matches.length <= 1, "multiple releases use the exact tag; refusing mutation");
      if (entries.length < 100) return matches.length ? api(`repos/${REPOSITORY}/releases/${matches[0].id}`) : null;
    }
    throw new Error("release lookup exceeded 1000 entries; refusing incomplete draft lookup");
  };
  const download = async (release, label) => {
    assertReleaseCompatible(release, records, options.tag, notes);
    const directory = join(neutral, label); await mkdir(directory);
    if (release.assets.length) {
      await gh("release", "download", options.tag, "--repo", REPOSITORY, "--dir", directory);
      for (const asset of release.assets) {
        const bytes = await fileBytes(join(directory, asset.name)), entry = records.find((value) => value.name === asset.name);
        requireThat(bytes.length === entry.size && sha256(bytes) === entry.sha256, `downloaded asset differs: ${asset.name}`);
      }
    }
    return directory;
  };
  return withPublicationLease({ remote: url, env, directory: join(neutral, "publication-lease"), source, account }, async (assertLease) => {
    const check = async () => { await assertLease(); await verify(); };
    let release = await releaseByTag();
    if (release) await download(release, "existing-downloads");
    await stage("remote-inspected", { existingRelease: release ? (release.draft ? "draft" : "published") : "absent" });
    const remoteTag = async () => {
      const lines = (await exec("git", ["ls-remote", "--tags", url, `refs/tags/${options.tag}`, `refs/tags/${options.tag}^{}`], { cwd: neutral, env })).stdout.trim().split("\n").filter(Boolean);
      if (!lines.length) return null;
      const peeled = lines.find((line) => line.endsWith("^{}"));
      return (peeled ?? lines[0]).split(/\s/)[0];
    };
    const before = await remoteTag();
    requireThat(!before || before === source.commit, "remote tag resolves to another commit");
    requireThat(!release || before === source.commit, "existing release must have the exact remote tag");
    if (release && !release.draft) {
      await check();
      await stage("published-release-verified", { resumed: true });
    } else {
      assertNoDowngrade(options.tag, await optional(`repos/${REPOSITORY}/releases/latest`));
      await check();
      if (!before) {
        await exec("git", ["-C", options.source, "-c", "core.hooksPath=/dev/null", "push", url, `refs/tags/${options.tag}:refs/tags/${options.tag}`], { cwd: neutral, env });
        await stage("tag-pushed");
      }
      requireThat(await remoteTag() === source.commit, "remote tag changed before draft creation");
      if (!release) {
        await check();
        await gh("release", "create", options.tag, "--repo", REPOSITORY, "--verify-tag", "--draft", "--title", options.tag, "--notes-file", frozenNotes);
        await stage("draft-created"); release = await releaseByTag();
      }
      // Reinspect before adding missing assets. Never overwrite any existing asset.
      release = await releaseByTag();
      requireThat(release.draft === true, "draft was published concurrently; rerun to verify it");
      const missing = assertReleaseCompatible(release, records, options.tag, notes);
      if (missing.length) {
        await check();
        await gh("release", "upload", options.tag, ...missing.map((entry) => join(out, "assets", entry.name)), "--repo", REPOSITORY);
        await stage("draft-assets-uploaded", { assets: missing.map((entry) => entry.name) });
      }
      release = await releaseByTag();
      requireThat(assertReleaseCompatible(release, records, options.tag, notes).length === 0 && release.draft, "draft asset inventory is incomplete or state changed");
      await download(release, "draft-downloads"); await stage("draft-assets-verified");
      assertNoDowngrade(options.tag, await optional(`repos/${REPOSITORY}/releases/latest`));
      requireThat(await remoteTag() === source.commit, "remote tag changed before publication");
      await check();
      await gh("release", "edit", options.tag, "--repo", REPOSITORY, "--draft=false", "--prerelease=false", "--latest");
      await stage("release-published");
      release = await releaseByTag();
      requireThat(release.draft === false, "release remains a draft");
      await download(release, "published-downloads"); await stage("published-release-verified", { resumed: false });
    }
    await check();
    await exec(process.execPath, [join(trustedTools, "stable-marketplace.mjs"), "--tag", options.tag,
      "--verification", receiptPath, "--out", join(out, "stable-promotion"), "--publish"], { cwd: neutral, env, maxBuffer: 16 * 1024 * 1024 });
    await stage("stable-marketplace-promoted");
  });
}

export async function main(argv = process.argv.slice(2)) {
  assertBuildEnvironment(); // No output or remote side effects before this gate.
  const options = parseArgs(argv);
  options.source = await realpath(options.source);
  requireThat((await lstat(options.source)).isDirectory(), "source must be a directory");
  const outParent = await realpath(dirname(options.out));
  options.out = join(outParent, relative(dirname(options.out), options.out));
  requireThat(options.out !== options.source && !options.out.startsWith(`${options.source}${sep}`), "evidence must be outside source checkout");
  requireThat(!(await lstat(options.out).catch((error) => { if (error.code === "ENOENT") return null; throw error; })), "evidence output already exists");
  const source = await inspectSource(options.source, options.tag);
  const reviewBytes = await fileBytes(options.review), review = assertReview(JSON.parse(reviewBytes), source.tree);
  if (options.publish) { requireThat((await fileBytes(options.notesFile)).toString().trim(), "release notes must not be empty"); }
  const nodeDirectory = dirname(process.execPath);
  const npm = join(nodeDirectory, process.platform === "win32"
    ? "node_modules/npm/bin/npm-cli.js" : "../lib/node_modules/npm/bin/npm-cli.js");
  await fileBytes(npm);
  await mkdir(options.out); await mkdir(join(options.out, "logs"));
  await writeFile(join(options.out, "review.json"), reviewBytes, { flag: "wx" });
  const env = { ...process.env, PATH: `${nodeDirectory}${process.platform === "win32" ? ";" : ":"}${process.env.PATH ?? ""}`, PYTHONDONTWRITEBYTECODE: "1" };
  const checks = [], node = (args) => [process.execPath, args], npmCommand = (args) => node([npm, ...args]);
  const run = (name, steps) => runCheck({ name, steps, source: options.source, out: options.out, env, checks });
  try {
    await run("npm-ci", [npmCommand(["ci", "--ignore-scripts"])]);
    await run("repository-check", [npmCommand(["run", "check"])]);
    const python = join(options.out, "python", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    await run("book-environment", [[process.platform === "win32" ? "python" : "python3", ["-m", "venv", join(options.out, "python")]],
      [python, ["-m", "pip", "install", "-r", join(options.source, "tools/books/requirements.txt")]]]);
    await run("book-validation", [node(["tools/books/validate-pstack-book.mjs", "--complete"])]);
    await run("book-audit", [[python, ["tools/books/audit-source.py"]]]);
    await run("book-tests", [[python, ["tests/pstack-book-audit.test.py"]]]);
    const tagArgs = options.tag ? ["--tag", options.tag] : [];
    await run("release-reproducibility", [node(["tools/build-release.mjs", "--check", ...tagArgs])]);
    await run("release-build", [node(["tools/build-release.mjs", "--out", join(options.out, "assets"), ...tagArgs])]);
    requireThat(JSON.stringify(await inspectSource(options.source, options.tag)) === JSON.stringify(source), "source changed during checks");
    const assets = join(options.out, "assets"), manifest = JSON.parse(await fileBytes(join(assets, "release-manifest.json")));
    const records = await snapshotAssets(assets, manifest.version);
    const receipt = { schemaVersion: 1, kind: "oh-my-stack-local-release", repository: REPOSITORY, source,
      environment: { node: process.versions.node, zlib: process.versions.zlib, platform: process.platform, arch: process.arch },
      checks, assets: records, review, reviewFile: { path: "review.json", sha256: sha256(reviewBytes) } };
    const receiptPath = join(options.out, "verification.json");
    // Validate the exact evidence before exposing the final success receipt.
    const candidate = join(options.out, "verification.pending.json"); await writeFile(candidate, encode(receipt), { flag: "wx" });
    const verifyReceipt = (path) => readLocalVerification({ path, manifest: options.tag ? manifest : undefined,
      tagCommit: source.commit, tagTree: source.tree, assets });
    await verifyReceipt(candidate);
    await import("node:fs/promises").then(({ rename }) => rename(candidate, receiptPath));
    console.log(`Local ${options.tag ? "tagged release" : "HEAD validation-only"} verification: ${receiptPath}`);
    if (options.publish) {
      const digest = sha256(await readFile(receiptPath));
      const verify = async () => {
        requireThat(JSON.stringify(await inspectSource(options.source, options.tag)) === JSON.stringify(source), "source changed before publication");
        await verifyReceipt(receiptPath);
        requireThat(sha256(await readFile(receiptPath)) === digest, "verification receipt changed before publication");
      };
      await publishRelease({ options, source, receiptPath, manifest, records, out: options.out, verify });
    }
    return receipt;
  } catch (error) {
    await writeFile(join(options.out, "failure.json"), encode({ error: error.message, checks,
      verificationSucceeded: Boolean(await lstat(join(options.out, "verification.json")).catch(() => null)),
      remoteStages: "See publication.json when present; remote state is retained for recovery." }));
    throw error;
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
