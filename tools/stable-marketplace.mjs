#!/usr/bin/env node

import { execFile } from "node:child_process";
import { chmod, cp, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { packageInventory, parseArchive, sha256 } from "./release-lib.mjs";
import { assertBuildEnvironment, BUILD_ENVIRONMENT, readLocalVerification, REQUIRED_CHECKS } from "./local-release-lib.mjs";

import { nativePublisherEnvironment } from "./release-publisher.mjs";

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
export function assertPublisherIdentity({ repo, account, automation = null }) {
  requireThat(!automation, "stable publication requires the maintainer's local pipeline");
  requireThat(repo.full_name === REPOSITORY && repo.default_branch === "main", "wrong publishing repository");
  requireThat(typeof account === "string" && account && repo.permissions?.push === true,
    "native GitHub account does not have write permission for the expected repository");
  return { kind: "maintainer", account };
}
export function assertPromotion({ manifest, tagCommit, tagTree, verification, previous = null }) {
  cleanSource(manifest);
  requireThat(manifest.source.commit === tagCommit, "release tag and manifest commit differ");
  requireThat(verification?.schemaVersion === 1 && verification.kind === "oh-my-stack-local-release"
    && verification.repository === REPOSITORY, "stable promotion requires a local verification receipt");
  requireThat(verification.source?.commit === tagCommit && verification.source?.tree === tagTree
    && /^[a-f0-9]{40}$/.test(tagTree) && verification.source?.ref === manifest.source.ref
    && verification.source?.worktreeDirty === false && verification.source?.cleanTaggedCheckout === true,
  "local verification does not bind the exact clean release tag and tree");
  requireThat(verification.environment?.node === BUILD_ENVIRONMENT.node
    && verification.environment?.zlib === BUILD_ENVIRONMENT.zlib, "local verification used a different build environment");
  requireThat(verification.review?.tree === tagTree && verification.review?.verdict === "approved"
    && Array.isArray(verification.review?.evidence) && verification.review.evidence.some((value) => typeof value === "string" && value.trim()),
  "local verification requires a review of the exact source tree");
  const required = REQUIRED_CHECKS;
  requireThat(Array.isArray(verification.checks) && required.every((name) => verification.checks.filter((check) => check.name === name && check.exitCode === 0).length === 1),
    "local verification is missing successful checks");
  if (previous) requireThat(compare(manifest.version, previous.version) >= 0, "stable cannot downgrade");
  return verification;
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

async function head(remote, cwd, env = process.env) {
  return (await exec("git", ["ls-remote", remote, "refs/heads/stable"], { cwd, env })).stdout.trim().split(/\s/)[0];
}
async function verifySnapshot(directory) {
  const bytes = await readFile(join(directory, "STABLE_RELEASE.json"));
  const receipt = JSON.parse(bytes);
  requireThat(receipt.schemaVersion === 1 && receipt.generatedBy === "tools/stable-marketplace.mjs" && receipt.repository === REPOSITORY,
    "stable branch has no recognized ownership receipt");
  cleanSource(receipt);
  const actual = await packageInventory(directory);
  const payload = actual.filter((entry) => entry.path !== "STABLE_RELEASE.json")
    .sort((a, b) => a.path.localeCompare(b.path));
  requireThat(JSON.stringify(payload) === JSON.stringify(receipt.files), "stable snapshot inventory mismatch");
  return receipt;
}

// The exported remote argument allows disposable bare-repository tests. The CLI pins GitHub coordinates.
export async function promoteSnapshot({ snapshot, remote, expectedHead, publish = false, env = process.env }) {
  const receipt = await verifySnapshot(snapshot);
  const workspace = await mkdtemp(join(tmpdir(), "oms-stable-git-"));
  const checkout = join(workspace, "checkout");
  const oldTree = join(workspace, "previous");
  const git = async (...args) => (await exec("git", args, { cwd: checkout, env })).stdout.trim();
  try {
    await mkdir(checkout);
    await git("init", "--quiet");
    await git("config", "core.autocrlf", "false");
    await git("config", "core.eol", "lf");
    await git("config", "user.name", "Oh My Stack release");
    await git("config", "user.email", "release@users.noreply.github.com");
    requireThat(await head(remote, checkout, env) === expectedHead, "stable branch changed since planning");
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
    for (const file of receipt.files.filter((entry) => entry.mode === "0755")) {
      await git("update-index", "--chmod=+x", "--", file.path);
    }
    const stagedModes = new Map((await git("ls-files", "--stage", "-z")).split("\0").filter(Boolean).map((entry) => {
      const match = /^(\d{6}) [a-f0-9]+ 0\t([\s\S]+)$/.exec(entry);
      requireThat(match, "unexpected stable index entry");
      return [match[2], match[1]];
    }));
    const expectedModes = [...receipt.files, { path: "STABLE_RELEASE.json", mode: "0644" }];
    requireThat(stagedModes.size === expectedModes.length && expectedModes.every((file) =>
      stagedModes.get(file.path) === (file.mode === "0755" ? "100755" : "100644")), "stable Git index mode mismatch");
    await git("commit", "--quiet", "-m", `Publish stable marketplace v${receipt.version}`);
    const commit = await git("rev-parse", "HEAD");
    if (!publish) return { status: "prepared", version: receipt.version, previous: previous?.version ?? null, expectedHead, commit };
    await git("push", `--force-with-lease=refs/heads/stable:${expectedHead}`, remote, "HEAD:refs/heads/stable");
    requireThat(await head(remote, checkout, env) === commit, "remote stable ref does not match the published commit");
    return { status: "published", version: receipt.version, previous: previous?.version ?? null, commit };
  } finally { await rm(workspace, { recursive: true, force: true }); }
}

async function main(argv) {
  const options = { publish: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--publish") options.publish = true;
    else if (["--tag", "--out", "--assets", "--release-info", "--verification"].includes(arg)) {
      requireThat(argv[i + 1] && !argv[i + 1].startsWith("--"), `missing value for ${arg}`);
      options[arg.slice(2)] = argv[++i];
    } else throw new Error(`unknown argument: ${arg}`);
  }
  if (options.assets || options["release-info"]) {
    requireThat(options.assets && options["release-info"] && options.out && !options.publish && !options.tag && !options.verification, "offline build requires --assets, --release-info, --out only");
    const result = await buildStableMarketplace({ assets: resolve(options.assets), release: JSON.parse(await readFile(options["release-info"])), out: resolve(options.out) });
    console.log(JSON.stringify({ status: "built", version: result.receipt.version, out: resolve(options.out) }, null, 2));
    return;
  }
  requireThat(/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(options.tag), "promotion requires --tag vMAJOR.MINOR.PATCH");
  requireThat(options.out, "promotion requires a new --out evidence directory");
  requireThat(options.verification, "promotion requires --verification from the local release command");
  assertBuildEnvironment();
  const evidence = resolve(options.out);
  try { await lstat(evidence); throw new Error("evidence output already exists"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const workspace = await mkdtemp(join(tmpdir(), "oms-stable-admin-"));
  const nativeEnv = nativePublisherEnvironment();
  const run = async (binary, args) => (await exec(binary, args, { cwd: workspace, env: nativeEnv, maxBuffer: 20 * 1024 * 1024 })).stdout.trim();
  const ghJson = async (...args) => JSON.parse(await run("gh", args));
  try {
    requireThat(process.env.GITHUB_ACTIONS !== "true", "stable publication runs locally, not in Actions");
    const account = (await ghJson("api", "user")).login;
    const repo = await ghJson("api", `repos/${REPOSITORY}`);
    const identity = assertPublisherIdentity({ repo, account });
    const release = await ghJson("api", `repos/${REPOSITORY}/releases/tags/${options.tag}`);
    requireThat(release.tag_name === options.tag && release.draft === false && release.prerelease === false, "tag is not a published stable release");
    const tag = await ghJson("api", `repos/${REPOSITORY}/commits/${options.tag}`);
    const tagCommit = tag.sha, tagTree = tag.commit?.tree?.sha;
    await mkdir(evidence, { recursive: true });
    const assets = join(evidence, "downloads");
    await mkdir(assets);
    await run("gh", ["release", "download", options.tag, "--repo", REPOSITORY, "--dir", assets]);
    await writeFile(join(evidence, "release-info.json"), encode(release));
    const snapshot = join(evidence, "snapshot");
    const { manifest } = await buildStableMarketplace({ assets, release, out: snapshot });
    const verification = await readLocalVerification({ path: resolve(options.verification), manifest, tagCommit, tagTree, assets });
    assertPromotion({ manifest, tagCommit, tagTree, verification });
    const verificationSha256 = sha256(await readFile(resolve(options.verification)));
    // Independently reproduce the published assets using the release's own clean tagged tools.
    const source = join(workspace, "source");
    await run("git", ["clone", "--quiet", "--depth", "1", "--branch", options.tag, `${URL}.git`, source]);
    requireThat((await exec("git", ["rev-parse", "HEAD"], { cwd: source, env: nativeEnv })).stdout.trim() === tagCommit, "tag moved during clone");
    const rebuilt = join(workspace, "rebuilt");
    await exec(process.execPath, ["tools/build-release.mjs", "--tag", options.tag, "--out", rebuilt], { cwd: source, env: nativeEnv });
    const gzipOperatingSystemNormalized = await assertTaggedRebuild({ assets, rebuilt });
    const remote = `${URL}.git`;
    const expectedHead = await head(remote, workspace, nativeEnv);
    await readLocalVerification({ path: resolve(options.verification), manifest, tagCommit, tagTree, assets });
    requireThat(sha256(await readFile(resolve(options.verification))) === verificationSha256, "local verification changed during promotion");
    const result = await promoteSnapshot({ snapshot, remote, expectedHead, publish: options.publish, env: nativeEnv });
    const report = { repository: REPOSITORY, account, identity, release: options.tag, sourceCommit: tagCommit, verification: { kind: verification.kind, sha256: verificationSha256,
      tree: verification.source.tree, environment: verification.environment },
      taggedRebuildMatched: true, gzipOperatingSystemNormalized, ...result };
    await writeFile(join(evidence, "promotion.json"), encode(report));
    console.log(JSON.stringify(report, null, 2));
  } finally { await rm(workspace, { recursive: true, force: true }); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
