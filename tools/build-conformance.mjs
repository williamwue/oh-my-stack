#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { filesUnder, loadModel, readJson, repoRoot } from "./generate.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fixtureRecord(sourceRoot, fixture) {
  const root = join(sourceRoot, "evals", "fixtures", fixture);
  const files = await filesUnder(root);
  assert(files.length > 0, `${fixture}: fixture is empty`);
  const artifacts = [];
  for (const path of files) {
    artifacts.push({
      path: relative(root, path).split(sep).join("/"),
      sha256: sha256(await readFile(path)),
    });
  }
  const revision = sha256(artifacts.map((entry) => `${entry.path}\0${entry.sha256}\n`).join(""));
  return { path: `evals/fixtures/${fixture}`, revision, artifacts };
}

function assertionMap(sourceEvidence) {
  return new Map(sourceEvidence.assertions.map((entry) => [entry.id, entry]));
}

export async function buildConformance({ check = false, root = repoRoot } = {}) {
  const model = await loadModel(root);
  const manifest = await readJson(join(root, "conformance", "scenarios.json"));
  const observations = await readJson(join(root, "conformance", "source-observations.json"));
  assert(observations.schemaVersion === 1 && observations.kind === "reviewed-historical-snapshot"
    && /^\d{4}-\d{2}-\d{2}$/.test(observations.reviewedAt) && observations.migrationNote?.trim(), "Invalid conformance observation record");
  assert(Array.isArray(observations.observations), "Conformance observation pins are required");
  const pins = new Map();
  for (const pin of observations.observations) {
    const id = `${pin.scenario}/${pin.profile}`;
    assert(!pins.has(id) && /^[a-f0-9]{64}$/.test(pin.sha256) && /^[a-f0-9]{64}$/.test(pin.fixtureRevision), `Invalid or duplicate conformance observation: ${id}`);
    pins.set(id, pin);
  }
  const usedPins = new Set();
  assert(manifest.schemaVersion === 1, "conformance scenarios: schemaVersion must be 1");
  const ids = manifest.scenarios.map((scenario) => scenario.id);
  assert(new Set(ids).size === ids.length, "conformance scenarios: duplicate id");
  assert(
    JSON.stringify([...ids].sort()) === JSON.stringify([...manifest.requiredScenarioFamilies].sort()),
    "conformance scenarios: required families must appear exactly once",
  );
  const outputRoot = join(root, "conformance", "results");
  const expected = new Map();
  for (const scenario of manifest.scenarios) {
    assert(["verified", "pending"].includes(scenario.status), `${scenario.id}: invalid status`);
    if (scenario.status === "pending") continue;
    const fixture = await fixtureRecord(root, scenario.fixture);
    for (const [profileId, evidencePath] of Object.entries(scenario.evidence)) {
      const profile = model.profiles.get(profileId);
      assert(profile, `${scenario.id}: unknown profile ${profileId}`);
      const id = `${scenario.id}/${profileId}`;
      const pin = pins.get(id);
      assert(pin?.evidence === evidencePath, `${id}: missing or mismatched observation pin`);
      usedPins.add(id);
      assert(pin.fixtureRevision === fixture.revision, `${id}: fixture observation drift; new runtime evidence is required`);
      const sourceBytes = await readFile(join(root, evidencePath));
      assert(pin.sha256 === sha256(sourceBytes), `${id}: source evidence observation drift; review the evidence before recording a new observation`);
      const source = JSON.parse(sourceBytes);
      assert(source.result === "pass", `${scenario.id}/${profileId}: source evidence is not passing`);
      assert(source.profile === profileId, `${scenario.id}/${profileId}: source evidence profile drift`);
      assert(source.fixture === scenario.fixture, `${scenario.id}/${profileId}: source fixture drift`);
      const sourceAssertions = assertionMap(source);
      const trace = scenario.trace.map(([event, actor, evidenceAssertion], index) => {
        assert(sourceAssertions.get(evidenceAssertion)?.status === "pass", `${scenario.id}/${profileId}: trace lacks ${evidenceAssertion}`);
        return { sequence: index + 1, event, actor, evidenceAssertion };
      });
      const assertions = Object.entries(scenario.assertions).map(([id, required]) => {
        for (const sourceId of required) {
          assert(sourceAssertions.get(sourceId)?.status === "pass", `${scenario.id}/${profileId}: assertion lacks ${sourceId}`);
        }
        return { id, status: required.length ? "pass" : "not-applicable", sourceAssertions: required };
      });
      const runtime = profile.target.runtime;
      const inventoryEvidence = runtime === "omp"
        ? "evals/evidence/omp-18.2.6/setup-live.json"
        : "evals/evidence/codex-cli-0.155.1/setup-live.json";
      const document = {
        $schema: "../../../src/schemas/conformance-result.schema.json",
        schemaVersion: 1,
        scenario: scenario.id,
        profile: profileId,
        sourceEvidence: evidencePath,
        sourceBinding: {
          kind: observations.kind,
          reviewedAt: observations.reviewedAt,
          record: "conformance/source-observations.json",
          sourceSha256: pin.sha256,
          fixtureRevision: pin.fixtureRevision,
        },
        result: "pass",
        coordinate: {
          runtime,
          surface: profile.target.surface,
          version: profile.target.runtimeVersion,
          platform: profile.target.platform,
          configurationFingerprint: profile.target.configurationFingerprint,
          permissionProfile: source.runtime.permissionProfile,
        },
        providerInventoryEvidence: inventoryEvidence,
        modelResolution: {
          status: "not-recorded",
          details: "The scenario evidence does not independently record the resolved root and worker model identities; the separate routing probe establishes the capability only.",
        },
        fixture,
        repetitions: { required: 1, attempts: 1, passed: 1, acceptableFailures: 0 },
        semanticTrace: trace,
        assertions,
      };
      const path = join(outputRoot, profileId, `${scenario.id}.json`);
      expected.set(path, `${JSON.stringify(document, null, 2)}\n`);
    }
  }
  assert(usedPins.size === pins.size, "Unexpected conformance observation pins");
  if (check) {
    for (const [path, content] of expected) {
      assert(await readFile(path, "utf8") === content, `${relative(root, path)}: generated conformance drift`);
    }
    const actual = (await filesUnder(outputRoot)).filter((path) => path.endsWith(".json"));
    assert(actual.length === expected.size, "conformance/results contains unexpected records");
  } else {
    await rm(outputRoot, { recursive: true, force: true });
    for (const [path, content] of expected) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content);
    }
  }
  return { verifiedScenarios: manifest.scenarios.filter((entry) => entry.status === "verified").length, records: expected.size };
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  buildConformance({ check: process.argv.includes("--check") }).then((result) => {
    console.log(`${process.argv.includes("--check") ? "Verified" : "Generated"} ${result.records} conformance records from ${result.verifiedScenarios} scenarios.`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
