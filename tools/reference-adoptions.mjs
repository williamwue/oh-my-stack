import { realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gitBlob, localBytes, portablePath, sha256 } from "./pstack-source.mjs";
import { readSourceRecord } from "./sync-upstream.mjs";

export const officialRepository = "https://github.com/cursor/plugins";
export const referenceRepository = "https://github.com/michael-denyer/pstack-claude";
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const revision = value => assert(typeof value === "string" && /^[a-f0-9]{40}$/.test(value), "Expected full revision");
const digest = value => assert(typeof value === "string" && /^[a-f0-9]{64}$/.test(value), "Expected SHA-256");
const text = value => assert(typeof value === "string" && value.trim(), "Expected nonempty rationale");
const list = value => assert(Array.isArray(value) && value.length > 0 && value.length <= 4096, "Expected bounded nonempty list");
const defaultRoot = fileURLToPath(new URL("../", import.meta.url));

/** Local receipts and decisions only. No Git, provider, network or writes. */
export async function readReferenceAdoptions({ root = defaultRoot } = {}) {
  root = await realpath(resolve(root));
  const json = async path => JSON.parse((await localBytes(root, path)).toString("utf8"));
  const registry = await json("upstream/reference-adoptions.json");
  assert(registry.schemaVersion === 1, "Unsupported reference adoption schema");
  const { official, reference } = registry.sources ?? {};
  assert(official?.repository === officialRepository && reference?.repository === referenceRepository, "Unexpected reference repositories");
  revision(official.assessedRevision); revision(reference.assessedRevision);
  const imports = await json("upstream/imports.json");
  assert(imports.revision === official.assessedRevision, "Official assessment must match active import pin");
  const officialReceipt = await json(imports.sourceReceipt);
  assert(officialReceipt.repository === officialRepository && officialReceipt.revision === official.assessedRevision, "Official receipt identity mismatch");
  const officialFiles = new Map();
  for (const file of officialReceipt.files) {
    portablePath(file.upstreamPath); portablePath(file.path); digest(file.sha256);
    assert(!officialFiles.has(file.upstreamPath), "Duplicate official receipt path");
    assert(sha256(await localBytes(root, file.path)) === file.sha256, `Official snapshot drift: ${file.path}`);
    officialFiles.set(file.upstreamPath, file);
  }
  const sourceText = (await localBytes(root, "upstream/sources.yaml")).toString("utf8");
  const source = readSourceRecord(sourceText, "pstack-claude").fields;
  assert(source.inspected_commit === reference.assessedRevision, "Reference assessment and source record disagree");
  list(reference.receipts);
  const receipts = new Map();
  for (const path of reference.receipts) {
    const receipt = await json(portablePath(path));
    revision(receipt.revision); revision(receipt.officialRevision);
    assert(receipt.repository === referenceRepository && !receipts.has(receipt.revision), "Reference receipt identity mismatch");
    list(receipt.files);
    const files = new Map();
    for (const file of receipt.files) {
      portablePath(file.path); portablePath(file.snapshot); digest(file.sha256);
      assert(["100644", "100755"].includes(file.mode) && /^[a-f0-9]{40}$/.test(file.blobSha1), "Invalid reference Git entry");
      assert(!files.has(file.path), "Duplicate reference receipt path");
      assert(file.snapshot.startsWith(`upstream/snapshots/pstack-claude/${receipt.revision}/`), "Reference snapshot outside revision");
      const bytes = await localBytes(root, file.snapshot);
      assert(sha256(bytes) === file.sha256 && gitBlob(bytes) === file.blobSha1, `Reference snapshot drift: ${file.path}`);
      files.set(file.path, { ...file, bytes });
    }
    assert(files.has("LICENSE") && files.has("tools/upstream.json"), "Reference license and upstream identity are required");
    const upstream = JSON.parse(files.get("tools/upstream.json").bytes.toString("utf8"));
    assert(upstream.remote === officialRepository && upstream.components?.pstack?.sha === receipt.officialRevision, "Reference upstream identity mismatch");
    receipts.set(receipt.revision, { receipt, files });
  }
  assert(receipts.has(reference.assessedRevision), "Missing assessed reference receipt");
  list(registry.adoptions);
  const ids = new Set();
  for (const adoption of registry.adoptions) {
    assert(typeof adoption.id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adoption.id) && !ids.has(adoption.id), "Invalid or duplicate adoption ID");
    ids.add(adoption.id);
    assert(["adopted", "adapted", "deferred", "rejected"].includes(adoption.decision), `Invalid decision: ${adoption.id}`);
    assert(["implementation", "policy"].includes(adoption.kind), `Invalid adoption kind: ${adoption.id}`);
    text(adoption.rationale); text(adoption.revisit); text(adoption.officialNote);
    revision(adoption.referenceRevision); revision(adoption.assessedRevision);
    assert(receipts.has(adoption.assessedRevision), `Missing adoption assessment receipt: ${adoption.id}`);
    const receipt = receipts.get(adoption.referenceRevision);
    assert(receipt, `Missing adoption receipt: ${adoption.id}`);
    list(adoption.referencePaths);
    for (const path of adoption.referencePaths) assert(receipt.files.has(portablePath(path)), `Unreceipted reference: ${path}`);
    assert(Array.isArray(adoption.officialPaths), "Expected official path list");
    for (const path of adoption.officialPaths) assert(officialFiles.has(portablePath(path)), `Unknown official path: ${path}`);
    list(adoption.evidence);
    for (const path of adoption.evidence) await localBytes(root, portablePath(path));
    assert(Array.isArray(adoption.outputs), "Expected output list");
    if (["adopted", "adapted"].includes(adoption.decision)) list(adoption.outputs);
    else assert(adoption.outputs.length === 0, "Unadopted decisions cannot claim outputs");
    const outputs = new Set();
    for (const output of adoption.outputs) {
      portablePath(output.path); digest(output.sha256);
      assert(!outputs.has(output.path), "Duplicate adoption output"); outputs.add(output.path);
      assert(sha256(await localBytes(root, output.path)) === output.sha256, `Adoption output drift: ${output.path}; reassess both references and refresh the record`);
    }
    if (adoption.kind === "policy" && ["adopted", "adapted"].includes(adoption.decision)) {
      list(adoption.derivations);
      const parity = await json(imports.derivationManifest);
      for (const path of adoption.derivations) assert(parity.entries.some(entry => entry.output === path
        && adoption.outputs.some(output => output.path === path)
        && entry.replacements.some(replacement => replacement.category === "policy" && replacement.adoptionId === adoption.id)), `Policy deviation lacks exact derivation: ${path}`);
    }
  }
  return { registry, receipts, officialFiles };
}
