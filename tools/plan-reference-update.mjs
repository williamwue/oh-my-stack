#!/usr/bin/env node
import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { planPstackUpdate } from "./plan-pstack-update.mjs";
import { blobs, collisions, compare, git, sha256, tree } from "./pstack-source.mjs";
import { readReferenceAdoptions, referenceRepository } from "./reference-adoptions.mjs";

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const defaultRoot = fileURLToPath(new URL("../", import.meta.url));
const referenceOrigin = value => /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)michael-denyer\/pstack-claude(?:\.git)?\/?$/i.test(value);

/** Preview both committed sources and their effect on recorded OMS decisions. */
export async function planReferenceUpdate({ root = defaultRoot, sourceCheckout, revision, referenceCheckout, referenceRevision } = {}) {
  const { registry, receipts } = await readReferenceAdoptions({ root });
  const official = await planPstackUpdate({ root, sourceCheckout, revision });
  assert(typeof referenceCheckout === "string" && referenceCheckout.length, "referenceCheckout is required");
  assert(typeof referenceRevision === "string" && /^[a-f0-9]{40}$/.test(referenceRevision), "referenceRevision must be a full SHA");
  referenceCheckout = await realpath(resolve(referenceCheckout));
  assert(await realpath(git(referenceCheckout, ["rev-parse", "--show-toplevel"]).toString().trim()) === referenceCheckout, "referenceCheckout must be a Git root");
  const origins = git(referenceCheckout, ["config", "--get-all", "remote.origin.url"]).toString().trim().split("\n");
  assert(origins.length === 1 && referenceOrigin(origins[0]), "Only the pstack-claude reference origin is accepted");
  const baseline = registry.sources.reference.assessedRevision;
  for (const commit of [baseline, referenceRevision]) assert(git(referenceCheckout, ["rev-parse", "--verify", `${commit}^{commit}`]).toString().trim() === commit, "Expected exact reference commit identity");
  assert(git(referenceCheckout, ["merge-base", "--is-ancestor", baseline, referenceRevision], { allowOne: true }) === 0, "Reference candidate must descend from assessed revision");
  const before = tree(referenceCheckout, baseline, ""), after = tree(referenceCheckout, referenceRevision, "");
  const content = blobs(referenceCheckout, [before, after]);
  const { receipt } = receipts.get(baseline);
  for (const file of receipt.files) {
    const item = before.get(file.path);
    assert(item?.mode === file.mode && item.oid === file.blobSha1 && sha256(content.get(item.oid)) === file.sha256, `Reference baseline Git mismatch: ${file.path}`);
  }
  const issues = collisions(after.keys()).map(issue => ({ code: "PORTABLE_PATH_COLLISION", ...issue }));
  for (const item of after.values()) if (item.type !== "blob" || !["100644", "100755"].includes(item.mode)) issues.push({ code: "UNSUPPORTED_GIT_ENTRY", path: item.path, mode: item.mode });
  const upstreamFile = after.get("tools/upstream.json");
  assert(upstreamFile?.mode === "100644", "Missing reference upstream metadata");
  const upstream = JSON.parse(content.get(upstreamFile.oid).toString("utf8"));
  const upstreamRevision = upstream.components?.pstack?.sha;
  assert(upstream.remote === "https://github.com/cursor/plugins" && typeof upstreamRevision === "string" && /^[a-f0-9]{40}$/.test(upstreamRevision), "Invalid reference upstream metadata");
  const officialByPath = new Map(official.files.map(file => [`plugins/pstack/${file.path}`, file]));
  const files = [...new Set([...before.keys(), ...after.keys()])].sort(compare).map(path => {
    const old = before.get(path), candidate = after.get(path);
    const oldSha256 = old?.type === "blob" ? sha256(content.get(old.oid)) : null;
    const newSha256 = candidate?.type === "blob" ? sha256(content.get(candidate.oid)) : null;
    const officialFile = officialByPath.get(path);
    return { path, change: !old ? "added" : !candidate ? "deleted" : old.oid !== candidate.oid || old.mode !== candidate.mode ? "modified" : "unchanged",
      oldMode: old?.mode ?? null, newMode: candidate?.mode ?? null, oldSha256, newSha256,
      officialCandidateComparison: !officialFile ? "unmapped" : newSha256 !== null && newSha256 === officialFile.newSha256 && candidate.mode === officialFile.newMode ? "byte-equal" : "different-or-adapted" };
  });
  const byPath = new Map(files.map(file => [file.path, file]));
  const mapped = new Set(registry.adoptions.flatMap(adoption => adoption.referencePaths));
  const adoptionImpacts = registry.adoptions.map(adoption => {
    const adoptedFiles = receipts.get(adoption.referenceRevision).files;
    const assessedFiles = receipts.get(adoption.assessedRevision).files;
    const unassessedReferenceChanges = adoption.referencePaths.filter(path => {
      const candidate = byPath.get(path), assessed = assessedFiles.get(path);
      return candidate?.newSha256 !== assessed?.sha256 || candidate?.newMode !== assessed?.mode;
    });
    const referenceChanges = adoption.referencePaths.filter(path => {
      const candidate = byPath.get(path), recorded = adoptedFiles.get(path);
      return candidate?.newSha256 !== recorded.sha256 || candidate.newMode !== recorded.mode;
    });
    const officialChanges = adoption.officialPaths.filter(path => officialByPath.get(`plugins/${path}`)?.change !== "unchanged");
    const convergenceCandidates = adoption.referencePaths.filter(path => byPath.get(path)?.officialCandidateComparison === "byte-equal"
      && (referenceChanges.includes(path) || officialChanges.includes(path.replace(/^plugins\//, ""))));
    return { id: adoption.id, decision: adoption.decision, kind: adoption.kind, referenceRevision: adoption.referenceRevision, assessedRevision: adoption.assessedRevision,
      referenceChanges, unassessedReferenceChanges, officialChanges, convergenceCandidates,
      status: unassessedReferenceChanges.length || officialChanges.length ? "reassess" : "unchanged", revisit: adoption.revisit };
  });
  const changed = files.filter(file => file.change !== "unchanged");
  const unmappedChanges = changed.filter(file => !mapped.has(file.path)).map(file => file.path);
  const upstreamChanged = upstreamRevision !== receipt.officialRevision;
  return { schemaVersion: 1, operation: "preview-only",
    status: official.status === "blocked" || issues.length ? "blocked" : official.status !== "unchanged" || changed.length || upstreamChanged
      || adoptionImpacts.some(impact => impact.status === "reassess") ? "review-required" : "unchanged",
    official, reference: { repository: referenceRepository, baseline, candidate: referenceRevision,
      baselineOfficialRevision: receipt.officialRevision, candidateOfficialRevision: upstreamRevision, upstreamChanged, files, issues, unmappedChanges },
    adoptionImpacts,
    interpretation: "Byte equality identifies possible upstream convergence only. Different bytes may be a host adaptation or policy fork; compare the saved rationale and reference tools/forks.json before deciding. Unmapped changes remain unassessed.",
    application: "Read-only. Review both sources, update decisions and receipts, then use exact derivation, generation and required checks. No fetch, writes, pin advancement or installation." };
}

const usage = "Usage: node tools/plan-reference-update.mjs --source-checkout OFFICIAL_GIT_ROOT --revision OFFICIAL_SHA --reference-checkout REFERENCE_GIT_ROOT --reference-revision REFERENCE_SHA [--root OMS_ROOT]\nRead-only JSON preview. Exit 0: unchanged/review-required; 1: blocked; 2: invalid input. No fetch or apply.";
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), options = {};
    if (args.length === 1 && args[0] === "--help") console.log(usage);
    else {
      const names = { "--root": "root", "--source-checkout": "sourceCheckout", "--revision": "revision", "--reference-checkout": "referenceCheckout", "--reference-revision": "referenceRevision" };
      for (let i = 0; i < args.length; i += 2) {
        assert(Object.hasOwn(names, args[i]) && args[i + 1] && !args[i + 1].startsWith("--") && !Object.hasOwn(options, names[args[i]]), usage);
        options[names[args[i]]] = args[i + 1];
      }
      const plan = await planReferenceUpdate(options);
      console.log(JSON.stringify(plan, null, 2));
      if (plan.status === "blocked") process.exitCode = 1;
    }
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
