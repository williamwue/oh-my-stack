import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

export const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
export const gitBlob = bytes => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
export const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

export function portablePath(value) {
  assert(typeof value === "string" && value.length && !isAbsolute(value) && !/[:\\\x00-\x1f\x7f]/.test(value)
    && value.split("/").every(part => part && part !== "." && part !== ".."), `Unsafe path: ${value}`);
  return value;
}
async function localPath(root, path) {
  let target = root;
  for (const part of portablePath(path).split("/")) {
    target = join(target, part);
    try { assert(!(await lstat(target)).isSymbolicLink(), `Symlink in local path: ${path}`); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return target;
}
export async function localBytes(root, path, optional = false) {
  try { return await readFile(await localPath(root, path)); }
  catch (error) { if (optional && error.code === "ENOENT") return null; throw error; }
}
export async function localFiles(root, path) {
  const result = [];
  const visit = async prefix => {
    for (const entry of await readdir(await localPath(root, prefix), { withFileTypes: true })) {
      const path = `${prefix}/${entry.name}`;
      assert(!entry.isSymbolicLink(), `Symlink in local path: ${path}`);
      if (entry.isDirectory()) await visit(path);
      else { assert(entry.isFile(), `Unsupported local file: ${path}`); result.push(path); }
    }
  };
  await visit(path);
  return result.sort(compare);
}
export async function localCollision(root, path) {
  let prefix = "";
  const parts = portablePath(path).split("/");
  for (const [index, part] of parts.entries()) {
    const directory = prefix ? await localPath(root, prefix) : root;
    let names;
    try { names = await readdir(directory); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
    const aliases = names.filter(name => name.normalize("NFC").toLowerCase() === part.normalize("NFC").toLowerCase());
    if (!aliases.length) return null;
    if (aliases.some(name => name !== part)) return prefix ? `${prefix}/${aliases.sort(compare)[0]}` : aliases.sort(compare)[0];
    prefix = prefix ? `${prefix}/${part}` : part;
    const info = await lstat(await localPath(root, prefix));
    if (index === parts.length - 1 || !info.isDirectory()) return prefix;
  }
  return null;
}
export function git(checkout, args, { input, allowOne = false } = {}) {
  const result = spawnSync("git", ["--no-replace-objects", "-C", checkout, ...args], {
    input, maxBuffer: 64 * 1024 * 1024, timeout: 10000,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_NO_LAZY_FETCH: "1", GIT_TERMINAL_PROMPT: "0" },
    windowsHide: true,
  });
  assert(!result.error && (result.status === 0 || (allowOne && result.status === 1)),
    `Git ${args[0]} failed: ${result.error?.message ?? result.stderr?.toString().trim() ?? result.status}`);
  return allowOne ? result.status : result.stdout;
}
export function tree(checkout, revision, prefix = "pstack") {
  const bytes = git(checkout, ["ls-tree", "-r", "-z", "--full-tree", revision, "--", ...(prefix ? [portablePath(prefix)] : [])]);
  assert(Buffer.from(bytes.toString("utf8")).equals(bytes), "Git paths must be UTF-8");
  const entries = bytes.toString("utf8").split("\0").filter(Boolean).map(record => {
      const match = /^(\d{6}) (blob|commit) ([a-f0-9]{40})\t(.+)$/s.exec(record);
      assert(match, "Unsupported pstack Git tree record");
      const name = prefix ? match[4].slice(prefix.length + 1) : match[4];
      assert(!prefix || match[4].startsWith(`${prefix}/`), "Git tree escaped prefix");
      return { path: portablePath(name), mode: match[1], type: match[2], oid: match[3] };
    });
  assert(entries.length > 0 && entries.length <= 4096, "Expected a bounded nonempty pstack tree");
  return new Map(entries.sort((a, b) => compare(a.path, b.path)).map(entry => [entry.path, entry]));
}
export function blobs(checkout, trees) {
  const ids = [...new Set(trees.flatMap(tree => [...tree.values()].filter(file => file.type === "blob").map(file => file.oid)))].sort(compare);
  const data = git(checkout, ["cat-file", "--batch"], { input: `${ids.join("\n")}\n` });
  const result = new Map();
  let offset = 0;
  for (const id of ids) {
    const end = data.indexOf(10, offset);
    assert(end >= offset, "Incomplete Git batch header");
    const header = /^([a-f0-9]{40}) blob (\d+)$/.exec(data.subarray(offset, end).toString());
    assert(header?.[1] === id, "Missing or invalid Git blob");
    const size = Number(header[2]);
    assert(Number.isSafeInteger(size) && size <= 8 * 1024 * 1024, "Git blob exceeds 8 MiB limit");
    offset = end + 1;
    const bytes = data.subarray(offset, offset + size);
    assert(bytes.length === size && data[offset + size] === 10 && gitBlob(bytes) === id, "Corrupt Git blob payload");
    result.set(id, bytes);
    offset += size + 1;
  }
  assert(offset === data.length, "Unexpected Git batch output");
  return result;
}
export function collisions(paths) {
  const seen = new Map(), conflicts = [];
  for (const path of [...paths].sort(compare)) {
    const parts = path.split("/");
    for (let i = 1; i <= parts.length; i++) {
      const prefix = parts.slice(0, i).join("/");
      const key = prefix.normalize("NFC").toLowerCase();
      if (seen.has(key) && seen.get(key) !== prefix) conflicts.push({ path: prefix, other: seen.get(key) });
      else seen.set(key, prefix);
    }
  }
  return conflicts;
}

