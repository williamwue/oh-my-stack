#!/usr/bin/env node

import { execFile } from "node:child_process";
import { chmod, cp, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { packageInventory, parseArchive, sha256 } from "./release-lib.mjs";

export const REPOSITORY = "williamwue/oh-my-stack";
const URL = `https://github.com/${REPOSITORY}`;
const exec = promisify(execFile);
const encode = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
function requireThat(condition, message) { if (!condition) throw new Error(message); }
function compare(a, b) {
  requireThat(semver.test(a) && semver.test(b), "stable versions must be plain semantic versions");
  const left = a.split(".").map(BigInt), right = b.split(".").map(BigInt);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}
function cleanSource(manifest) {
  requireThat(semver.test(manifest.version) && manifest.source?.ref === `v${manifest.version}`
    && /^[a-f0-9]{40}$/.test(manifest.source.commit)
    && manifest.source.cleanTaggedCheckout === true && manifest.source.worktreeDirty === false,
  "stable requires a clean, exact tagged release manifest");
}
export function assertPublisherIdentity({ repo, account, automation = null, run = null }) {
  requireThat(repo.full_name === REPOSITORY && repo.default_branch === "main", "wrong publishing repository");
  if (!automation) {
    requireThat(typeof account === "string" && account && repo.permissions?.push === true,
      "native GitHub account does not have write permission for the expected repository");
    return { kind: "maintainer", account };
  }
  // Installation tokens do not expose the user's repository permissions object.
  // Bind automation to the server-observed run; the Git server enforces write access.
  requireThat(automation.repository === REPOSITORY && /^\d+$/.test(automation.runId)
    && Number.isSafeInteger(Number(automation.runId)) && Number(automation.runId) > 0,
  "wrong automation repository or run ID");
  requireThat(run?.id === Number(automation.runId) && run.repository?.full_name === REPOSITORY
    && run.head_repository?.full_name === REPOSITORY && run.path === ".github/workflows/stable-marketplace.yml"
    && ["release", "workflow_dispatch"].includes(run.event) && run.event === automation.event
    && /^[a-f0-9]{40}$/.test(automation.sha) && run.head_sha === automation.sha
    && (run.event !== "workflow_dispatch" || run.head_branch === "main"),
  "automation is not the expected publishing workflow run");
  return { kind: "github-actions", account: "github-actions[bot]", runId: run.id };
}
export function assertPromotion({ manifest, tagCommit, runs, previous = null }) {
  cleanSource(manifest);
  requireThat(manifest.source.commit === tagCommit, "release tag and manifest commit differ");
  const run = runs.find((entry) => entry.conclusion === "success" && entry.event === "push"
    && entry.headBranch === "main" && entry.headSha === tagCommit);
  requireThat(run, "stable promotion requires successful main push CI at the exact release commit");
  if (previous) requireThat(compare(manifest.version, previous.version) >= 0, "stable cannot downgrade");
  return run;
}
export async function assertTaggedRebuild({ assets, rebuilt }) {
  const manifest = JSON.parse(await readFile(join(rebuilt, "release-manifest.json")));
  const normalized = [];
  for (const entry of [...manifest.artifacts, ...manifest.pluginBundles]) {
    const original = await readFile(join(assets, entry.file));
    const reproduced = await readFile(join(rebuilt, entry.file));
    requireThat(original.length >= 10 && reproduced.length >= 10
      && original[0] === 0x1f && original[1] === 0x8b && original[2] === 8 && original[3] === 0
      && reproduced[0] === 0x1f && reproduced[1] === 0x8b && reproduced[2] === 8 && reproduced[3] === 0,
    `unexpected gzip header: ${entry.file}`);
    // zlib records the operating system in byte 9. Accept only that header
    // difference; every other compressed byte must reproduce exactly.
    if (reproduced[9] !== original[9]) normalized.push({ file: entry.file, rebuilt: reproduced[9], published: original[9] });
    reproduced[9] = original[9];
    requireThat(reproduced.equals(original), `tagged rebuild differs: ${entry.file}`);
    entry.sha256 = sha256(reproduced);
    entry.size = reproduced.length;
  }
  const manifestBytes = encode(manifest);
  requireThat(manifestBytes.equals(await readFile(join(assets, "release-manifest.json"))), "tagged rebuild differs: release-manifest.json");
  const sums = [...manifest.artifacts, ...manifest.pluginBundles].map((entry) => `${entry.sha256}  ${entry.file}`);
  sums.push(`${sha256(manifestBytes)}  release-manifest.json`);
  requireThat(Buffer.from(`${sums.join("\n")}\n`).equals(await readFile(join(assets, "SHA256SUMS"))), "tagged rebuild differs: SHA256SUMS");
  return normalized;
}
function inventory(files) {
  return files.map((file) => ({ path: file.path, size: file.contents.length,
    mode: file.mode & 0o111 ? "0755" : "0644", sha256: sha256(file.contents) }));
}
function validateArchive(bytes, entry, root) {
  requireThat(sha256(bytes) === entry.sha256 && bytes.length === entry.size, `manifest digest/size mismatch: ${entry.file}`);
  const files = parseArchive(bytes, root);
  requireThat(JSON.stringify(inventory(files)) === JSON.stringify(entry.files), `archive inventory mismatch: ${entry.file}`);
  if (entry.contentSha256) requireThat(sha256(Buffer.from(`${JSON.stringify(entry.files)}\n`)) === entry.contentSha256,
    `content inventory digest mismatch: ${entry.file}`);
  return files;
}

// Offline builder: no upstream network or working-tree package inputs.
export async function buildStableMarketplace({ assets, release, out }) {
  const version = release.tag_name?.slice(1);
  requireThat(release.draft === false && release.prerelease === false && release.published_at
    && Number.isSafeInteger(release.id) && semver.test(version) && release.tag_name === `v${version}`
    && release.html_url === `${URL}/releases/tag/v${version}`, "not a published stable release of the expected repository");
  const archiveNames = ["omp", "codex", "claude-code", "codex-plugin", "claude-plugin"]
    .map((target) => `oh-my-stack-${target}-${version}.tar.gz`);
  const names = [...archiveNames, "release-manifest.json", "SHA256SUMS"].sort();
  requireThat(JSON.stringify(release.assets.map((asset) => asset.name).sort()) === JSON.stringify(names),
    "release assets must contain exactly the five archives, manifest, and checksums");
  const downloads = new Map();
  for (const asset of release.assets) {
    requireThat(asset.state === "uploaded" && /^sha256:[a-f0-9]{64}$/.test(asset.digest), `missing GitHub asset digest: ${asset.name}`);
    const info = await lstat(join(assets, asset.name));
    requireThat(info.isFile() && !info.isSymbolicLink(), `asset is not a regular file: ${asset.name}`);
    const bytes = await readFile(join(assets, asset.name));
    requireThat(`sha256:${sha256(bytes)}` === asset.digest, `GitHub asset digest mismatch: ${asset.name}`);
    downloads.set(asset.name, bytes);
  }
  const sums = downloads.get("SHA256SUMS").toString().trim().split("\n").map((line) => {
    const match = /^([a-f0-9]{64})  ([a-zA-Z0-9.-]+)$/.exec(line);
    requireThat(match, "invalid checksum entry");
    return { hash: match[1], name: match[2] };
  });
  requireThat(JSON.stringify(sums.map((entry) => entry.name).sort()) === JSON.stringify(names.filter((name) => name !== "SHA256SUMS")),
    "checksum inventory differs from release assets");
  for (const entry of sums) requireThat(sha256(downloads.get(entry.name)) === entry.hash, `checksum mismatch: ${entry.name}`);
  const manifest = JSON.parse(downloads.get("release-manifest.json"));
  requireThat(manifest.schemaVersion === 1 && manifest.name === "oh-my-stack" && manifest.archiveRoot === "oh-my-stack"
    && manifest.version === version, "release manifest identity mismatch");
  cleanSource(manifest);
  const entries = [...manifest.artifacts, ...manifest.pluginBundles];
  requireThat(JSON.stringify(entries.map((entry) => entry.file).sort()) === JSON.stringify(archiveNames.sort()), "manifest archive inventory mismatch");
  requireThat(JSON.stringify(manifest.artifacts.map((entry) => entry.target).sort()) === JSON.stringify(["claude-code", "codex", "omp"])
    && JSON.stringify(manifest.pluginBundles.map((entry) => entry.target).sort()) === JSON.stringify(["claude-code", "codex"]), "manifest target inventory mismatch");
  const unpacked = new Map();
  for (const entry of entries) unpacked.set(entry.file, validateArchive(downloads.get(entry.file), entry, entry.archiveRoot ?? manifest.archiveRoot));
  const outputFiles = [];
  for (const target of ["codex", "claude-code"]) {
    const artifact = manifest.artifacts.find((entry) => entry.target === target);
    const bundle = manifest.pluginBundles.find((entry) => entry.target === target);
    const files = unpacked.get(artifact.file);
    const getJson = (path) => JSON.parse(files.find((entry) => entry.path === path)?.contents ?? "null");
    const generation = getJson("GENERATION.json");
    const plugin = getJson(`${target === "codex" ? ".codex-plugin" : ".claude-plugin"}/plugin.json`);
    requireThat(generation?.generatedBy === "tools/generate.mjs" && generation.target === target && generation.sourceVersion === version
      && plugin?.name === "oh-my-stack" && plugin.version === version, `released ${target} payload identity mismatch`);
    const bundleFiles = unpacked.get(bundle.file);
    const catalogPath = target === "codex" ? ".agents/plugins/marketplace.json" : ".claude-plugin/marketplace.json";
    const catalog = JSON.parse(bundleFiles.find((file) => file.path === catalogPath)?.contents ?? "null");
    requireThat(catalog?.name === "oh-my-stack" && catalog.plugins?.length === 1 && catalog.plugins[0].name === "oh-my-stack", "invalid released marketplace catalog");
    requireThat(JSON.stringify(inventory(bundleFiles.filter((file) => file.path.startsWith("plugins/oh-my-stack/"))
      .map((file) => ({ ...file, path: file.path.slice("plugins/oh-my-stack/".length) })))) === JSON.stringify(artifact.files),
    "released marketplace payload differs from target archive");
    if (target === "codex") {
      requireThat(catalog.plugins[0].source?.source === "local" && catalog.plugins[0].source.path === "./plugins/oh-my-stack", "invalid Codex source");
      catalog.plugins[0].source.path = "./plugins/codex";
    } else {
      requireThat(catalog.plugins[0].source === "./plugins/oh-my-stack", "invalid Claude source");
      catalog.plugins[0].source = "./plugins/claude-code";
    }
    outputFiles.push({ path: catalogPath, contents: encode(catalog), mode: 0o644 });
    outputFiles.push(...files.map((file) => ({ ...file, path: `plugins/${target}/${file.path}` })));
  }
  outputFiles.push({ path: "README.md", mode: 0o644, contents: Buffer.from(`# Oh My Stack stable marketplace\n\nPublished release: [v${version}](${release.html_url}).\n\nThis generated branch contains released Codex and Claude Code payloads.\nOriginal Skill files retain their release bytes; STABLE_RELEASE.json records provenance.\n\nCodex:\n\n\`\`\`bash\ncodex plugin marketplace add williamwue/oh-my-stack --ref stable\ncodex plugin add oh-my-stack@oh-my-stack\n\`\`\`\n\nClaude Code:\n\n\`\`\`bash\nclaude plugin marketplace add https://github.com/williamwue/oh-my-stack.git#stable\nclaude plugin install oh-my-stack@oh-my-stack --scope user\n\`\`\`\n\n[Installation and update guides](${URL}/blob/main/docs/README.md).\n`) });
  const receipt = { schemaVersion: 1, generatedBy: "tools/stable-marketplace.mjs", repository: REPOSITORY,
    version, releaseId: release.id, releaseUrl: release.html_url, publishedAt: release.published_at, source: manifest.source,
    assets: names.map((name) => ({ name, sha256: sha256(downloads.get(name)) })),
    files: inventory(outputFiles).sort((a, b) => a.path.localeCompare(b.path)) };
  outputFiles.push({ path: "STABLE_RELEASE.json", contents: encode(receipt), mode: 0o644 });
  try { await lstat(out); throw new Error("output already exists"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  await mkdir(dirname(resolve(out)), { recursive: true });
  const stage = await mkdtemp(join(dirname(resolve(out)), ".oms-stable-"));
  try {
    for (const file of outputFiles) {
      const path = join(stage, file.path);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, file.contents);
      await chmod(path, file.mode & 0o111 ? 0o755 : 0o644);
    }
    await rename(stage, out);
  } finally { await rm(stage, { recursive: true, force: true }); }
  return { manifest, receipt };
}

async function head(remote, cwd) {
  return (await exec("git", ["ls-remote", remote, "refs/heads/stable"], { cwd })).stdout.trim().split(/\s/)[0];
}
async function verifySnapshot(directory) {
  const bytes = await readFile(join(directory, "STABLE_RELEASE.json"));
  const receipt = JSON.parse(bytes);
  requireThat(receipt.schemaVersion === 1 && receipt.generatedBy === "tools/stable-marketplace.mjs" && receipt.repository === REPOSITORY,
    "stable branch has no recognized ownership receipt");
  cleanSource(receipt);
  const actual = await packageInventory(directory);
  requireThat(JSON.stringify(actual.filter((entry) => entry.path !== "STABLE_RELEASE.json")) === JSON.stringify(receipt.files), "stable snapshot inventory mismatch");
  return receipt;
}

// The exported remote argument allows disposable bare-repository tests. The CLI pins GitHub coordinates.
export async function promoteSnapshot({ snapshot, remote, expectedHead, publish = false }) {
  const receipt = await verifySnapshot(snapshot);
  const workspace = await mkdtemp(join(tmpdir(), "oms-stable-git-"));
  const checkout = join(workspace, "checkout");
  const oldTree = join(workspace, "previous");
  const git = async (...args) => (await exec("git", args, { cwd: checkout })).stdout.trim();
  try {
    await mkdir(checkout);
    await git("init", "--quiet");
    await git("config", "user.name", "Oh My Stack release");
    await git("config", "user.email", "release@users.noreply.github.com");
    requireThat(await head(remote, checkout) === expectedHead, "stable branch changed since planning");
    let previous = null;
    if (expectedHead) {
      await git("fetch", "--quiet", remote, "refs/heads/stable");
      requireThat(await git("rev-parse", "FETCH_HEAD") === expectedHead, "stable branch changed during fetch");
      await git("checkout", "--quiet", "--detach", expectedHead);
      await cp(checkout, oldTree, { recursive: true, filter: (path) => path !== join(checkout, ".git") });
      previous = await verifySnapshot(oldTree);
      requireThat(compare(receipt.version, previous.version) >= 0, "stable cannot downgrade");
      if (receipt.version === previous.version) {
        requireThat(JSON.stringify(await packageInventory(snapshot)) === JSON.stringify(await packageInventory(oldTree)), "same-version stable payload cannot change");
        return { status: "unchanged", version: receipt.version, commit: expectedHead };
      }
      await git("rm", "--quiet", "-r", ".");
    }
    await cp(snapshot, checkout, { recursive: true });
    await git("add", ".");
    await git("commit", "--quiet", "-m", `Publish stable marketplace v${receipt.version}`);
    const commit = await git("rev-parse", "HEAD");
    if (!publish) return { status: "prepared", version: receipt.version, previous: previous?.version ?? null, expectedHead, commit };
    await git("push", `--force-with-lease=refs/heads/stable:${expectedHead}`, remote, "HEAD:refs/heads/stable");
    requireThat(await head(remote, checkout) === commit, "remote stable ref does not match the published commit");
    return { status: "published", version: receipt.version, previous: previous?.version ?? null, commit };
  } finally { await rm(workspace, { recursive: true, force: true }); }
}

async function main(argv) {
  const options = { publish: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--publish") options.publish = true;
    else if (["--tag", "--out", "--assets", "--release-info"].includes(arg)) {
      requireThat(argv[i + 1] && !argv[i + 1].startsWith("--"), `missing value for ${arg}`);
      options[arg.slice(2)] = argv[++i];
    } else throw new Error(`unknown argument: ${arg}`);
  }
  if (options.assets || options["release-info"]) {
    requireThat(options.assets && options["release-info"] && options.out && !options.publish && !options.tag, "offline build requires --assets, --release-info, --out only");
    const result = await buildStableMarketplace({ assets: resolve(options.assets), release: JSON.parse(await readFile(options["release-info"])), out: resolve(options.out) });
    console.log(JSON.stringify({ status: "built", version: result.receipt.version, out: resolve(options.out) }, null, 2));
    return;
  }
  requireThat(/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(options.tag), "promotion requires --tag vMAJOR.MINOR.PATCH");
  requireThat(options.out, "promotion requires a new --out evidence directory");
  const evidence = resolve(options.out);
  try { await lstat(evidence); throw new Error("evidence output already exists"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const workspace = await mkdtemp(join(tmpdir(), "oms-stable-admin-"));
  const run = async (binary, args) => (await exec(binary, args, { cwd: workspace, maxBuffer: 20 * 1024 * 1024 })).stdout.trim();
  const ghJson = async (...args) => JSON.parse(await run("gh", args));
  try {
    const automation = process.env.GITHUB_ACTIONS === "true";
    const context = automation ? { repository: process.env.GITHUB_REPOSITORY, runId: process.env.GITHUB_RUN_ID,
      sha: process.env.GITHUB_SHA, event: process.env.GITHUB_EVENT_NAME } : null;
    if (automation) requireThat(context.repository === REPOSITORY && /^\d+$/.test(context.runId), "wrong automation repository or run ID");
    const account = automation ? "github-actions[bot]" : (await ghJson("api", "user")).login;
    const repo = await ghJson("api", `repos/${REPOSITORY}`);
    const workflowRun = automation ? await ghJson("api", `repos/${REPOSITORY}/actions/runs/${context.runId}`) : null;
    const identity = assertPublisherIdentity({ repo, account, automation: context, run: workflowRun });
    const release = await ghJson("api", `repos/${REPOSITORY}/releases/tags/${options.tag}`);
    requireThat(release.tag_name === options.tag && release.draft === false && release.prerelease === false, "tag is not a published stable release");
    const tagCommit = (await ghJson("api", `repos/${REPOSITORY}/commits/${options.tag}`)).sha;
    const runs = await ghJson("run", "list", "--repo", REPOSITORY, "--workflow", "CI", "--commit", tagCommit, "--status", "completed", "--limit", "100",
      "--json", "databaseId,conclusion,headSha,headBranch,event");
    await mkdir(evidence, { recursive: true });
    const assets = join(evidence, "downloads");
    await mkdir(assets);
    await run("gh", ["release", "download", options.tag, "--repo", REPOSITORY, "--dir", assets]);
    await writeFile(join(evidence, "release-info.json"), encode(release));
    const snapshot = join(evidence, "snapshot");
    const { manifest } = await buildStableMarketplace({ assets, release, out: snapshot });
    const ci = assertPromotion({ manifest, tagCommit, runs });
    // Independently reproduce the published assets using the release's own clean tagged tools.
    const source = join(workspace, "source");
    await run("git", ["clone", "--quiet", "--depth", "1", "--branch", options.tag, `${URL}.git`, source]);
    requireThat((await exec("git", ["rev-parse", "HEAD"], { cwd: source })).stdout.trim() === tagCommit, "tag moved during clone");
    const rebuilt = join(workspace, "rebuilt");
    await exec(process.execPath, ["tools/build-release.mjs", "--tag", options.tag, "--out", rebuilt], { cwd: source });
    const gzipOperatingSystemNormalized = await assertTaggedRebuild({ assets, rebuilt });
    const remote = `${URL}.git`;
    const expectedHead = await head(remote, workspace);
    const result = await promoteSnapshot({ snapshot, remote, expectedHead, publish: options.publish });
    const report = { repository: REPOSITORY, account, identity, release: options.tag, sourceCommit: tagCommit, ciRun: ci.databaseId,
      taggedRebuildMatched: true, gzipOperatingSystemNormalized, ...result };
    await writeFile(join(evidence, "promotion.json"), encode(report));
    console.log(JSON.stringify(report, null, 2));
  } finally { await rm(workspace, { recursive: true, force: true }); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
