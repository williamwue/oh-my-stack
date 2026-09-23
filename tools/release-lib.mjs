import { createHash } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertSafeRelative(path, context = "path") {
  if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").includes("..")) {
    throw new Error(`${context}: unsafe relative path ${JSON.stringify(path)}`);
  }
}

async function walkFiles(root) {
  const output = [];
  async function walk(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`release packages cannot contain symbolic links: ${path}`);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) output.push(path);
      else throw new Error(`release packages cannot contain special files: ${path}`);
    }
  }
  await walk(root);
  return output;
}

export async function packageInventory(root) {
  const files = [];
  for (const path of await walkFiles(root)) {
    const info = await stat(path);
    const contents = await readFile(path);
    files.push({
      path: relative(root, path).split(sep).join("/"),
      size: contents.length,
      mode: info.mode & 0o111 ? "0755" : "0644",
      sha256: sha256(contents),
    });
  }
  return files;
}

function writeString(buffer, offset, length, value) {
  const encoded = Buffer.from(value);
  if (encoded.length > length) throw new Error(`tar field too long: ${value}`);
  encoded.copy(buffer, offset);
}

function writeOctal(buffer, offset, length, value) {
  const encoded = value.toString(8).padStart(length - 1, "0");
  if (encoded.length >= length) throw new Error(`tar numeric field overflow: ${value}`);
  writeString(buffer, offset, length, `${encoded}\0`);
}

function splitTarPath(path) {
  if (Buffer.byteLength(path) <= 100) return { name: path, prefix: "" };
  for (let index = path.lastIndexOf("/"); index > 0; index = path.lastIndexOf("/", index - 1)) {
    const prefix = path.slice(0, index);
    const name = path.slice(index + 1);
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100) return { name, prefix };
  }
  throw new Error(`tar path is too long: ${path}`);
}

function tarHeader(path, size, mode) {
  const header = Buffer.alloc(512);
  const { name, prefix } = splitTarPath(path);
  writeString(header, 0, 100, name);
  writeOctal(header, 100, 8, mode);
  writeOctal(header, 108, 8, 0);
  writeOctal(header, 116, 8, 0);
  writeOctal(header, 124, 12, size);
  writeOctal(header, 136, 12, 0);
  header.fill(0x20, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeString(header, 257, 6, "ustar\0");
  writeString(header, 263, 2, "00");
  writeString(header, 265, 32, "oh-my-stack");
  writeString(header, 297, 32, "oh-my-stack");
  writeString(header, 345, 155, prefix);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeString(header, 148, 8, `${checksum.toString(8).padStart(6, "0")}\0 `);
  return header;
}

export async function createArchive(packageRoot, archiveRoot) {
  const blocks = [];
  for (const entry of await packageInventory(packageRoot)) {
    const contents = await readFile(join(packageRoot, ...entry.path.split("/")));
    blocks.push(tarHeader(`${archiveRoot}/${entry.path}`, contents.length, Number.parseInt(entry.mode, 8)));
    blocks.push(contents);
    const padding = (512 - (contents.length % 512)) % 512;
    if (padding) blocks.push(Buffer.alloc(padding));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks), { level: 9, mtime: 0 });
}

function readTarString(buffer, offset, length) {
  return buffer.subarray(offset, offset + length).toString("utf8").replace(/\0.*$/, "");
}

function readTarOctal(buffer, offset, length) {
  const value = readTarString(buffer, offset, length).trim();
  return value ? Number.parseInt(value, 8) : 0;
}

export function parseArchive(archive, expectedRoot) {
  const tar = gunzipSync(archive);
  const files = [];
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const storedChecksum = readTarOctal(header, 148, 8);
    const checksumHeader = Buffer.from(header);
    checksumHeader.fill(0x20, 148, 156);
    const actualChecksum = checksumHeader.reduce((sum, byte) => sum + byte, 0);
    if (storedChecksum !== actualChecksum) throw new Error("archive contains an invalid tar checksum");
    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const path = prefix ? `${prefix}/${name}` : name;
    const type = String.fromCharCode(header[156] || 48);
    const size = readTarOctal(header, 124, 12);
    const mode = readTarOctal(header, 100, 8);
    if (type !== "0") throw new Error(`archive contains unsupported entry type ${type}: ${path}`);
    assertSafeRelative(path, "archive entry");
    const rootPrefix = `${expectedRoot}/`;
    if (!path.startsWith(rootPrefix)) throw new Error(`archive entry is outside ${expectedRoot}: ${path}`);
    const relativePath = path.slice(rootPrefix.length);
    assertSafeRelative(relativePath, "archive entry");
    const dataOffset = offset + 512;
    const end = dataOffset + size;
    if (end > tar.length) throw new Error(`truncated archive entry: ${path}`);
    files.push({ path: relativePath, mode, contents: Buffer.from(tar.subarray(dataOffset, end)) });
    offset = dataOffset + Math.ceil(size / 512) * 512;
  }
  if (files.length === 0) throw new Error("archive has no files");
  const names = files.map((file) => file.path);
  if (new Set(names).size !== names.length) throw new Error("archive contains duplicate paths");
  return files;
}

export async function extractArchive(archive, expectedRoot, destination) {
  for (const file of parseArchive(archive, expectedRoot)) {
    const output = resolve(destination, ...file.path.split("/"));
    if (!output.startsWith(`${resolve(destination)}${sep}`)) throw new Error(`archive path escapes destination: ${file.path}`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, file.contents);
    await chmod(output, file.mode & 0o111 ? 0o755 : 0o644);
  }
}

export async function verifyInstalledTree(directory, expectedInventory) {
  const actual = await packageInventory(directory);
  if (JSON.stringify(actual) !== JSON.stringify(expectedInventory)) {
    throw new Error(`installed files do not match the release inventory for ${directory}`);
  }
}

async function readGeneration(directory) {
  return JSON.parse(await readFile(join(directory, "GENERATION.json"), "utf8"));
}

async function assertOwnedInstall(directory, target) {
  const marker = await readGeneration(directory);
  if (marker.generatedBy !== "tools/generate.mjs" || marker.target !== target) {
    throw new Error(`${directory} is not an Oh My Stack ${target} installation`);
  }
}

export async function installArchive({ archive, artifact, destination, archiveRoot, faultAfterBackup = false }) {
  if (sha256(archive) !== artifact.sha256) throw new Error(`checksum mismatch for ${artifact.file}`);
  const parent = dirname(resolve(destination));
  await mkdir(parent, { recursive: true });
  const work = await mkdtemp(join(parent, `.${basename(destination)}.install-`));
  const stage = join(work, "stage");
  const backup = join(work, "backup");
  let backedUp = false;
  try {
    await mkdir(stage);
    await extractArchive(archive, archiveRoot, stage);
    await verifyInstalledTree(stage, artifact.files);
    await assertOwnedInstall(stage, artifact.target);
    const destinationExists = await lstat(destination).then(
      () => true,
      (error) => {
        if (error.code === "ENOENT") return false;
        throw error;
      },
    );
    if (destinationExists) {
      await assertOwnedInstall(destination, artifact.target);
      await rename(destination, backup);
      backedUp = true;
    }
    if (faultAfterBackup) throw new Error("injected failure after backup");
    await rename(stage, destination);
    await verifyInstalledTree(destination, artifact.files);
    if (backedUp) await rm(backup, { recursive: true, force: true });
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    if (backedUp) {
      await rm(destination, { recursive: true, force: true });
      await rename(backup, destination);
    }
    throw error;
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

export async function uninstallOwned({ destination, target }) {
  await assertOwnedInstall(destination, target);
  const parent = dirname(resolve(destination));
  const work = await mkdtemp(join(parent, `.${basename(destination)}.uninstall-`));
  const removed = join(work, "removed");
  try {
    await rename(destination, removed);
    await rm(removed, { recursive: true, force: true });
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
