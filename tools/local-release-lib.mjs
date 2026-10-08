import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { sha256 } from "./release-lib.mjs";

export const BUILD_ENVIRONMENT = Object.freeze({ node: "22.23.3", zlib: "1.3.1-e00f703" });
export const REQUIRED_CHECKS = Object.freeze([
  "npm-ci", "repository-check", "book-validation", "book-audit", "book-tests", "release-reproducibility",
]);
export const REPOSITORY = "williamwue/oh-my-stack";
const hash = /^[a-f0-9]{64}$/;
const objectId = /^[a-f0-9]{40}$/;
export function requireThat(condition, message) { if (!condition) throw new Error(message); }
export function assertBuildEnvironment(environment = process.versions) {
  requireThat(environment?.node === BUILD_ENVIRONMENT.node && environment?.zlib === BUILD_ENVIRONMENT.zlib,
    `release requires Node ${BUILD_ENVIRONMENT.node} with zlib ${BUILD_ENVIRONMENT.zlib}; received Node ${environment?.node}, zlib ${environment?.zlib}`);
}
export function assertReview(review, tree) {
  requireThat(review?.schemaVersion === 1 && review.tree === tree && review.verdict === "approved"
    && Array.isArray(review.evidence) && review.evidence.length > 0
    && review.evidence.every((entry) => typeof entry === "string" && entry.trim()),
  "review must approve the exact source tree with nonempty evidence");
  return review;
}
export function assetNames(version) {
  requireThat(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version), "release version must be plain semver");
  return ["omp", "codex", "claude-code", "codex-plugin", "claude-plugin"]
    .map((target) => `oh-my-stack-${target}-${version}.tar.gz`).concat("release-manifest.json", "SHA256SUMS").sort();
}
// Resolve only system ancestors (for example macOS /var -> /private/var).
// Every directory inside the selected evidence root must remain a real directory.
export async function regularFile(root, name) {
  requireThat(typeof name === "string" && name && !isAbsolute(name) && !name.includes("\\")
    && name.split("/").every((part) => part && part !== "." && part !== "..") && !name.includes("\0"), "unsafe evidence path");
  const selected = resolve(root), canonical = await realpath(selected);
  const systemAlias = process.platform === "darwin" && /^\/(tmp|var|etc)(\/|$)/.test(selected)
    && canonical === `/private${selected}`;
  requireThat(canonical === selected || systemAlias, "evidence ancestor directories must not be symlinks");
  const base = await lstat(canonical);
  requireThat(base.isDirectory() && !base.isSymbolicLink(), "evidence root must be a regular directory");
  const parts = name.split("/");
  let current = canonical;
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]);
    const info = await lstat(current);
    requireThat(!info.isSymbolicLink() && (i === parts.length - 1 ? info.isFile() : info.isDirectory()),
      `evidence must use regular files and directories: ${name}`);
  }
  return readFile(current);
}
export async function fileBytes(path) { return regularFile(dirname(resolve(path)), basename(path)); }
export async function snapshotAssets(assets, version) {
  const names = assetNames(version);
  requireThat(JSON.stringify((await readdir(assets)).sort()) === JSON.stringify(names), "assets must contain exactly seven release files");
  return Promise.all(names.map(async (name) => {
    const bytes = await regularFile(assets, name);
    return { name, sha256: sha256(bytes), size: bytes.length };
  }));
}

// These are locally trusted maintainer records, not signatures or remote CI attestations.
export async function readLocalVerification({ path, manifest, tagCommit, tagTree, assets }) {
  const receipt = JSON.parse(await fileBytes(path));
  const root = dirname(resolve(path));
  requireThat(receipt?.schemaVersion === 1 && receipt.kind === "oh-my-stack-local-release"
    && receipt.repository === REPOSITORY, "invalid local release receipt identity");
  assertBuildEnvironment(receipt.environment);
  requireThat(typeof receipt.environment.platform === "string" && receipt.environment.platform
    && typeof receipt.environment.arch === "string" && receipt.environment.arch, "missing build platform or architecture");
  const source = receipt.source;
  requireThat(objectId.test(source?.commit) && objectId.test(source?.tree)
    && source.commit === tagCommit && source.tree === tagTree && source.worktreeDirty === false,
  "local verification source commit/tree mismatch or dirty checkout");
  const storedManifest = JSON.parse(await regularFile(assets, "release-manifest.json"));
  requireThat(storedManifest.schemaVersion === 1 && storedManifest.name === "oh-my-stack", "invalid asset manifest identity");
  if (manifest) {
    requireThat(JSON.stringify(storedManifest) === JSON.stringify(manifest), "supplied manifest differs from verified asset manifest");
    requireThat(source.cleanTaggedCheckout === true && source.ref === `v${manifest.version}`
      && manifest.source?.ref === source.ref && manifest.source.commit === source.commit
      && manifest.source.worktreeDirty === false && manifest.source.cleanTaggedCheckout === true,
    "release verification requires the exact clean tagged checkout");
  } else {
    requireThat(source.ref === "HEAD" && source.cleanTaggedCheckout === false
      && storedManifest.source?.ref === "HEAD" && storedManifest.source.commit === source.commit
      && storedManifest.source.worktreeDirty === false && storedManifest.source.cleanTaggedCheckout === false,
    "validation-only verification requires a clean HEAD checkout");
  }
  requireThat(Array.isArray(receipt.checks) && receipt.checks.length >= REQUIRED_CHECKS.length, "missing required checks");
  const seen = new Set(), paths = new Set();
  for (const check of receipt.checks) {
    requireThat(typeof check.name === "string" && check.name && !seen.has(check.name), "duplicate or invalid check name");
    seen.add(check.name);
    requireThat(check.exitCode === 0 && hash.test(check.sha256), `missing successful check: ${check.name}`);
    requireThat(!paths.has(check.log), "duplicate evidence log path");
    paths.add(check.log);
    requireThat(sha256(await regularFile(root, check.log)) === check.sha256, `check log digest mismatch: ${check.name}`);
  }
  requireThat(REQUIRED_CHECKS.every((name) => seen.has(name)), "missing required checks");
  assertReview(receipt.review, source.tree);
  requireThat(hash.test(receipt.reviewFile?.sha256) && !paths.has(receipt.reviewFile.path), "invalid review file record");
  const reviewBytes = await regularFile(root, receipt.reviewFile.path);
  requireThat(sha256(reviewBytes) === receipt.reviewFile.sha256, "review file digest mismatch");
  const review = assertReview(JSON.parse(reviewBytes), source.tree);
  requireThat(JSON.stringify(review) === JSON.stringify(receipt.review), "review file differs from receipt review");
  const actual = await snapshotAssets(assets, storedManifest.version);
  requireThat(Array.isArray(receipt.assets) && receipt.assets.length === 7, "missing release assets");
  const records = new Map();
  for (const entry of receipt.assets) {
    requireThat(!records.has(entry.name) && hash.test(entry.sha256) && Number.isSafeInteger(entry.size) && entry.size >= 0,
      "duplicate or invalid release asset record");
    records.set(entry.name, entry);
  }
  for (const entry of actual) {
    const recorded = records.get(entry.name);
    requireThat(recorded?.sha256 === entry.sha256 && recorded.size === entry.size, `release asset digest/size mismatch: ${entry.name}`);
  }
  return receipt;
}
