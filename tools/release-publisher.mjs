import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { requireThat } from "./local-release-lib.mjs";

const exec = promisify(execFile);
export const PUBLICATION_REF = "refs/heads/oms-release-lock";

// No global config mutation or token extraction: Git invokes the same native
// gh credential helper as the account lookup, with inherited overrides removed.
export function nativePublisherEnvironment(input = process.env) {
  const env = { ...input, GH_HOST: "github.com", GH_PROMPT_DISABLED: "1", GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" };
  for (const key of Object.keys(env)) {
    if (["GH_TOKEN", "GITHUB_TOKEN", "GH_ENTERPRISE_TOKEN", "GITHUB_ENTERPRISE_TOKEN", "GH_REPO",
      "GIT_CONFIG_PARAMETERS", "GIT_CONFIG_COUNT", "GIT_ASKPASS", "SSH_ASKPASS"].includes(key)
      || /^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(key)) delete env[key];
  }
  const config = [
    ["credential.helper", ""],
    ["credential.https://github.com.helper", ""],
    ["credential.https://github.com.helper", "!gh auth git-credential"],
    ["credential.https://github.com/williamwue/oh-my-stack.git.helper", ""],
    ["credential.https://github.com/williamwue/oh-my-stack.git.helper", "!gh auth git-credential"],
    ["credential.useHttpPath", "false"],
    ["http.extraheader", ""],
    ["http.https://github.com/.extraheader", ""],
    ["http.https://github.com/williamwue/oh-my-stack.git.extraheader", ""],
    ["core.hooksPath", "/dev/null"],
  ];
  env.GIT_CONFIG_COUNT = String(config.length);
  for (const [i, [key, value]] of config.entries()) {
    env[`GIT_CONFIG_KEY_${i}`] = key; env[`GIT_CONFIG_VALUE_${i}`] = value;
  }
  return env;
}

// Compare-and-swap on one repository ref coordinates participating publishers
// across machines. Never steal an existing lease or remove another owner's ref.
// An interrupted or ambiguous push retains its ownership receipt for recovery.
export async function withPublicationLease({ remote, env, directory, source, account }, action) {
  await mkdir(directory);
  const checkout = join(directory, "checkout"); await mkdir(checkout);
  const git = async (...args) => (await exec("git", args, { cwd: checkout, env })).stdout.trim();
  const receiptPath = join(directory, "lease.json");
  const receipt = { schemaVersion: 1, generatedBy: "tools/release-publisher.mjs", remote,
    ref: PUBLICATION_REF, owner: randomUUID(), account, source, createdAt: new Date().toISOString(), status: "prepared" };
  const save = () => writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await git("init", "--quiet");
  await git("config", "user.name", "Oh My Stack release lease");
  await git("config", "user.email", "release@users.noreply.github.com");
  await writeFile(join(checkout, "OMS_PUBLICATION_LEASE.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  await git("add", "OMS_PUBLICATION_LEASE.json"); await git("commit", "--quiet", "-m", "Coordinate maintainer publication [skip ci]");
  receipt.commit = await git("rev-parse", "HEAD"); await save();
  const remoteHead = async () => (await git("ls-remote", remote, PUBLICATION_REF)).split(/\s/)[0];
  try {
    await git("push", `--force-with-lease=${PUBLICATION_REF}:`, remote, `HEAD:${PUBLICATION_REF}`);
  } catch {
    receipt.status = "acquisition-failed-or-ambiguous"; await save();
    throw new Error(`Publication lease unavailable; inspect ${receiptPath} and ${PUBLICATION_REF}. No release mutation attempted.`);
  }
  receipt.status = "held"; await save();
  const assertLease = async () => requireThat(await remoteHead() === receipt.commit, "publication lease ownership changed; refusing mutation");
  let failure;
  try { await assertLease(); return await action(assertLease); }
  catch (error) { failure = error; throw error; }
  finally {
    try {
      await git("push", `--force-with-lease=${PUBLICATION_REF}:${receipt.commit}`, remote, `:${PUBLICATION_REF}`);
      receipt.status = "released"; await save();
    } catch {
      receipt.status = "cleanup-failed"; await save();
      const message = `Publication lease cleanup failed; inspect ${receiptPath}. Never delete a different owner's ref.`;
      if (failure) failure.message += ` ${message}`;
      else throw new Error(message);
    }
  }
}
