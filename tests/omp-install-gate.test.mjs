import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkOmpInstall } from "../tools/check-omp-install.mjs";
import { buildRelease, repoRoot } from "../tools/build-release.mjs";
import { extractArchive } from "../tools/release-lib.mjs";

test("OMP gate preflights bytes, installs in one isolated profile, and cleans up even on partial failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "oms-omp-gate-"));
  try {
    const output = join(root, "dist");
    const packagePath = join(root, "oh-my-stack");
    const manifest = await buildRelease({ root: repoRoot, out: output });
    const artifact = manifest.artifacts.find((item) => item.target === "omp");
    const archive = await readFile(join(output, artifact.file));
    await extractArchive(archive, manifest.archiveRoot, packagePath);
    const manifestPath = join(output, "release-manifest.json");
    const profile = "oms-release-0123456789abcdef";

    function fakeRun({ failInstall = false } = {}) {
      const calls = [];
      let active = false;
      return { calls, run: async (binary, args) => {
        calls.push({ binary, args });
        assert.equal(binary, "omp");
        assert.deepEqual(args.slice(0, 2), ["--profile", profile]);
        assert.equal(args[2], "--cwd");
        assert.equal(args.includes("--dry-run"), false);
        const action = args.slice(4).join(" ");
        if (action === "plugin list --json") return { stdout: JSON.stringify({
          npm: active ? [{ name: "oh-my-stack", version: manifest.version,
            enabled: true, path: packagePath }] : [], marketplace: [],
        }) };
        if (action === `plugin install ${packagePath}`) {
          active = true;
          if (failInstall) throw new Error("injected failure after link");
          return { stdout: "linked" };
        }
        if (action === "plugin doctor --json") return { stdout: JSON.stringify([
          { name: "package_manifest", status: "warning", message: "Not created yet" },
          { name: "plugin:oh-my-stack", status: "ok" },
        ]) };
        if (action === "read skill://prove-it-works") {
          if (!active) throw Object.assign(new Error("Unknown skill"),
            { stderr: "Unknown skill: prove-it-works" });
          return { stdout: "# Prove It Works" };
        }
        if (action === "plugin uninstall oh-my-stack") {
          active = false;
          return { stdout: "uninstalled" };
        }
        throw new Error(`unexpected command: ${action}`);
      } };
    }

    const pass = fakeRun();
    const result = await checkOmpInstall({ manifestPath, packagePath, profile, run: pass.run });
    assert.equal(result.isolatedInstall, "verified");
    assert.equal(result.cleanup, "verified");
    assert.equal(pass.calls.some((call) => call.args.includes("uninstall")), true);

    const partial = fakeRun({ failInstall: true });
    await assert.rejects(checkOmpInstall({ manifestPath, packagePath, profile, run: partial.run }),
      /injected failure after link/);
    assert.equal(partial.calls.some((call) => call.args.includes("uninstall")), true);

    const tampered = join(packagePath, artifact.files[0].path);
    const original = await readFile(tampered);
    await writeFile(tampered, "tampered\n");
    const refused = fakeRun();
    await assert.rejects(checkOmpInstall({ manifestPath, packagePath, profile, run: refused.run }),
      /installed files do not match/);
    assert.equal(refused.calls.length, 0);
    await writeFile(tampered, original);

    await assert.rejects(checkOmpInstall({ manifestPath, packagePath,
      profile: "default", run: refused.run }), /unsafe probe profile/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
