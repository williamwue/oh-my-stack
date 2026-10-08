import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { nativePublisherEnvironment, PUBLICATION_REF, withPublicationLease } from "../tools/release-publisher.mjs";
import { assertNoDowngrade } from "../tools/local-release.mjs";

const exec = promisify(execFile);
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "oms-publisher-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const remote = join(root, "remote.git"); await exec("git", ["init", "--bare", remote]);
  return { root, remote, env: nativePublisherEnvironment(), source: { commit: "a".repeat(40) }, account: "maintainer" };
}

test("Git authentication selects native gh even with inherited token and global credential overrides", async (t) => {
  const { root } = await fixture(t);
  const bin = join(root, "bin"); await mkdir(bin);
  const helper = join(bin, "gh");
  await writeFile(helper, '#!/bin/sh\n[ "$1 $2" = "auth git-credential" ] || exit 2\n[ -z "$GH_TOKEN$GITHUB_TOKEN$GH_ENTERPRISE_TOKEN$GITHUB_ENTERPRISE_TOKEN" ] || exit 3\nprintf "username=native-maintainer\\npassword=fixture-placeholder\\n"\n');
  await chmod(helper, 0o755);
  const global = join(root, "config");
  await writeFile(global, '[credential "https://github.com/williamwue/oh-my-stack.git"]\nhelper = !exit 9\n[http]\nextraHeader = fixture-unauthorized\n');
  const env = nativePublisherEnvironment({ ...process.env, GH_TOKEN: "fixture-override", GITHUB_TOKEN: "fixture-override",
    GIT_CONFIG_GLOBAL: global, GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "credential.helper", GIT_CONFIG_VALUE_0: "!exit 8",
    PATH: `${bin}:${process.env.PATH}` });
  const result = await new Promise((accept, reject) => {
    const child = spawn("git", ["credential", "fill"], { cwd: root, env, stdio: ["pipe", "pipe", "pipe"] });
    let output = "", errors = "";
    child.stdout.on("data", (value) => { output += value; }); child.stderr.on("data", (value) => { errors += value; });
    child.on("error", reject); child.on("close", (code) => code === 0 ? accept(output) : reject(new Error(errors)));
    child.stdin.end("protocol=https\nhost=github.com\npath=williamwue/oh-my-stack.git\n\n");
  });
  assert.match(result, /username=native-maintainer/);
  assert.equal(env.GIT_CONFIG_GLOBAL, "/dev/null");
  assert.equal(env.GH_TOKEN, undefined);
});

test("cross-process publishers cannot race latest and a later lower version is rejected", async (t) => {
  const f = await fixture(t);
  let acquired, release;
  const ready = new Promise((accept) => { acquired = accept; });
  const held = new Promise((accept) => { release = accept; });
  let latest = { tag_name: "v1.2.3" };
  const first = withPublicationLease({ ...f, directory: join(f.root, "higher") }, async (check) => {
    acquired(); await held; await check(); assertNoDowngrade("v1.2.5", latest); latest = { tag_name: "v1.2.5" };
  });
  await ready;
  try {
    // A separate Node process must fail acquisition before its mutation marker.
    const moduleUrl = new URL("../tools/release-publisher.mjs", import.meta.url).href;
    const script = `import {withPublicationLease,nativePublisherEnvironment} from ${JSON.stringify(moduleUrl)};
      import {writeFile} from 'node:fs/promises';
      await withPublicationLease({...${JSON.stringify({ remote: f.remote, directory: join(f.root, "lower"), source: f.source, account: f.account })},env:nativePublisherEnvironment()},async()=>writeFile(${JSON.stringify(join(f.root, "wrong-mutation"))},'changed'));`;
    await assert.rejects(exec(process.execPath, ["--input-type=module", "-e", script]), /Publication lease unavailable/);
    await assert.rejects(readFile(join(f.root, "wrong-mutation")), { code: "ENOENT" });
  } finally { release(); await first; }
  await assert.rejects(withPublicationLease({ ...f, directory: join(f.root, "retry") }, async (check) => {
    await check(); assertNoDowngrade("v1.2.4", latest); latest = { tag_name: "v1.2.4" };
  }), /downgrade/);
  assert.equal(latest.tag_name, "v1.2.5");
  assert.equal((await exec("git", ["ls-remote", f.remote, PUBLICATION_REF])).stdout.trim(), "");
  assert.equal(JSON.parse(await readFile(join(f.root, "retry", "lease.json"))).status, "released");
});

test("lease cleanup refuses to delete a replacement owner's ref", async (t) => {
  const f = await fixture(t);
  const directory = join(f.root, "owner");
  let replacement;
  await assert.rejects(withPublicationLease({ ...f, directory }, async (check) => {
    const checkout = join(directory, "checkout");
    await writeFile(join(checkout, "replacement.txt"), "replacement");
    await exec("git", ["add", "."], { cwd: checkout });
    await exec("git", ["commit", "-qm", "Replacement"], { cwd: checkout });
    replacement = (await exec("git", ["rev-parse", "HEAD"], { cwd: checkout })).stdout.trim();
    await exec("git", ["push", f.remote, `HEAD:${PUBLICATION_REF}`], { cwd: checkout });
    await check();
  }), /ownership changed.*cleanup failed/);
  assert.equal((await exec("git", ["--git-dir", f.remote, "rev-parse", PUBLICATION_REF])).stdout.trim(), replacement);
  assert.equal(JSON.parse(await readFile(join(directory, "lease.json"))).status, "cleanup-failed");
});
