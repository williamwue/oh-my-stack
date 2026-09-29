import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const SCHEMA_VERSION = 1;
const TERMINAL_STATUSES = new Set(["completed", "failed"]);
const EVENT_TYPES = new Set(["start", "checkpoint", "continuation", "completed", "failed"]);
const SECRET_KEY = /(?:secret|token|password|passwd|credential|private.?key|api.?key)/i;

export class DurableRunStateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DurableRunStateError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new DurableRunStateError(code, message);
}

function assert(condition, code, message) {
  if (!condition) fail(code, message);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isWithin(root, candidate) {
  const difference = relative(root, candidate);
  return difference !== "" && difference !== ".." && !difference.startsWith(`..${sep}`) && !isAbsolute(difference);
}

function isSameOrWithin(root, candidate) {
  const difference = relative(root, candidate);
  return difference === "" || (difference !== ".." && !difference.startsWith(`..${sep}`) && !isAbsolute(difference));
}

async function existingRealpath(path) {
  try {
    return await realpath(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function assertStorePathContainment(root, storePath) {
  const canonicalRoot = (await existingRealpath(root)) ?? root;
  const components = relative(root, storePath).split(sep).filter(Boolean);
  let current = root;
  for (const component of components) {
    current = join(current, component);
    const currentStat = await lstat(current).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (!currentStat) break;
    assert(!currentStat.isSymbolicLink(), "PATH_OUTSIDE_STORE", "storePath cannot traverse a symlinked parent");
    const resolvedCurrent = await existingRealpath(current);
    assert(resolvedCurrent !== null && isSameOrWithin(canonicalRoot, resolvedCurrent), "PATH_OUTSIDE_STORE", "storePath resolves outside storeRoot");
  }
}

async function storePaths({ storePath, storeRoot }) {
  assert(typeof storePath === "string" && storePath.length > 0, "INVALID_PATH", "storePath is required");
  const absoluteStorePath = resolve(storePath);
  const root = resolve(storeRoot ?? dirname(absoluteStorePath));
  assert(isWithin(root, absoluteStorePath), "PATH_OUTSIDE_STORE", "storePath must remain inside storeRoot");
  await assertStorePathContainment(root, absoluteStorePath);
  return { storePath: absoluteStorePath, storeRoot: root };
}

function assertJson(value, label, { storeRoot, inspectPaths = true } = {}, depth = 0) {
  assert(depth <= 30, "INVALID_JSON", `${label} is too deeply nested`);
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    assert(Number.isFinite(value), "INVALID_JSON", `${label} contains a non-finite number`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertJson(entry, `${label}[${index}]`, { storeRoot, inspectPaths }, depth + 1));
    return;
  }
  assert(isPlainObject(value), "INVALID_JSON", `${label} must contain JSON values only`);
  for (const [key, child] of Object.entries(value)) {
    assert(!SECRET_KEY.test(key), "SECRET_DATA", `${label}.${key} cannot contain secret material`);
    if (inspectPaths && /(?:^|[_.-])(path|file|artifact)(?:Path|_path|-path)?$/i.test(key) && typeof child === "string") {
      assert(typeof storeRoot === "string", "PATH_OUTSIDE_STORE", `${label}.${key} cannot be checked without storeRoot`);
      const candidate = resolve(storeRoot, child);
      assert(!isAbsolute(child) && isWithin(storeRoot, candidate), "PATH_OUTSIDE_STORE", `${label}.${key} escapes storeRoot`);
    }
    assertJson(child, `${label}.${key}`, { storeRoot, inspectPaths }, depth + 1);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateId(value, label) {
  assert(typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value), "INVALID_EVENT", `${label} is invalid`);
}

function validateGeneration(value) {
  assert(Number.isSafeInteger(value) && value >= 0, "INVALID_GENERATION", "generation must be a non-negative integer");
}

function validateDocument(document, { storeRoot, runId, generation } = {}) {
  assert(isPlainObject(document), "STORE_INVALID", "durable run store must contain an object");
  assert(document.schemaVersion === SCHEMA_VERSION, "STORE_INVALID", "unsupported durable run store schema");
  validateId(document.runId, "runId");
  validateGeneration(document.generation);
  assert(Number.isSafeInteger(document.revision) && document.revision >= 0, "STORE_INVALID", "invalid store revision");
  assert(["running", "waiting", "completed", "failed"].includes(document.status), "STORE_INVALID", "invalid store status");
  assert(typeof document.createdAt === "string" && typeof document.updatedAt === "string", "STORE_INVALID", "store timestamps are required");
  assert(isPlainObject(document.metadata), "STORE_INVALID", "store metadata must be an object");
  assertJson(document.metadata, "metadata", { storeRoot });
  assert(Array.isArray(document.events), "STORE_INVALID", "store events must be an array");
  assert(document.events.length === document.revision, "STORE_INVALID", "store revision does not match event count");
  let expectedRevision = 1;
  const eventIds = new Set();
  let status = "running";
  for (const event of document.events) {
    assert(isPlainObject(event), "STORE_INVALID", "store event must be an object");
    validateId(event.eventId, "eventId");
    assert(!eventIds.has(event.eventId), "STORE_INVALID", "eventIds must be unique");
    eventIds.add(event.eventId);
    validateGeneration(event.generation);
    assert(event.generation === document.generation, "STORE_INVALID", "event generation does not match run generation");
    assert(event.revision === expectedRevision, "STORE_INVALID", "event revisions must be contiguous");
    assert(EVENT_TYPES.has(event.type), "STORE_INVALID", `unsupported event type ${event.type}`);
    assert(event.type === "start" ? expectedRevision === 1 : expectedRevision > 1, "STORE_INVALID", "start must be the first and only initial event");
    assert(!TERMINAL_STATUSES.has(status), "STORE_INVALID", "event follows a terminal run event");
    assertJson(event.payload, `events.${event.eventId}.payload`, { storeRoot });
    assert(typeof event.recordedAt === "string", "STORE_INVALID", "event timestamp is required");
    status = event.type === "completed" ? "completed"
      : event.type === "failed" ? "failed"
        : event.type === "checkpoint" && event.payload?.status === "waiting" ? "waiting"
          : "running";
    expectedRevision += 1;
  }
  assert(document.status === status, "STORE_INVALID", "store status does not match its event history");
  if (runId !== undefined) assert(document.runId === runId, "RUN_MISMATCH", "runId does not match the requested run");
  if (generation !== undefined) assert(document.generation === generation, "STALE_GENERATION", "store generation is stale");
  return document;
}

async function atomicWrite(path, document) {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function readDocument(path, options) {
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") fail("STORE_MISSING", "durable run store does not exist");
    throw error;
  }
  let document;
  try {
    document = JSON.parse(raw);
  } catch {
    fail("STORE_INVALID", "durable run store contains malformed JSON");
  }
  return validateDocument(document, options);
}

async function acquireStoreLock(path) {
  const lockPath = `${path}.lock`;
  const deadline = Date.now() + 2000;
  while (true) {
    try {
      const handle = await open(lockPath, "wx");
      return async () => {
        try { await handle.close(); }
        finally { await rm(lockPath, { force: true }); }
      };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (Date.now() >= deadline) fail("STORE_LOCKED", "durable run store is locked; inspect the lock before manual recovery");
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 25));
    }
  }
}

export class DurableRunState {
  constructor({ storePath, storeRoot, document }) {
    this.storePath = storePath;
    this.storeRoot = storeRoot;
    this._document = document;
  }

  get state() {
    return clone(this._document);
  }

  async append(event) {
    assert(isPlainObject(event), "INVALID_EVENT", "event must be an object");
    validateId(event.eventId, "eventId");
    validateGeneration(event.generation);
    assert(event.generation === this._document.generation, "STALE_GENERATION", "event belongs to an older generation");
    assert(EVENT_TYPES.has(event.type), "INVALID_EVENT", `unsupported event type ${event.type}`);
    assert(Number.isSafeInteger(event.revision) && event.revision > 0, "INVALID_EVENT", "event revision must be a positive integer");
    assertJson(event.payload, "event.payload", { storeRoot: this.storeRoot });

    await assertStorePathContainment(this.storeRoot, this.storePath);
    const release = await acquireStoreLock(this.storePath);
    try {
      await assertStorePathContainment(this.storeRoot, this.storePath);
      const disk = await readDocument(this.storePath, { storeRoot: this.storeRoot, runId: this._document.runId });
      assert(disk.generation === this._document.generation && event.generation === disk.generation,
        "STALE_GENERATION", "event belongs to an older generation");
      return await this._appendLocked(event, disk);
    } finally {
      await release();
    }
  }

  async _appendLocked(event, disk) {
    const existing = disk.events.find((entry) => entry.eventId === event.eventId);
    if (existing) {
      const same = existing.generation === event.generation
        && existing.revision === event.revision
        && existing.type === event.type
        && JSON.stringify(existing.payload) === JSON.stringify(event.payload);
      if (!same) fail("EVENT_CONFLICT", "eventId already exists with a different payload or revision");
      this._document = disk;
      return { state: this.state, duplicate: true };
    }

    assert(!TERMINAL_STATUSES.has(disk.status), "RUN_TERMINAL", "cannot append to a terminal run");
    assert(event.revision === disk.revision + 1, "REVISION_CONFLICT", "event revision is stale or has a gap");
    assert(event.type === "start" ? event.revision === 1 : event.revision > 1, "INVALID_EVENT", "start must be the first and only initial event");
    const recordedAt = new Date().toISOString();
    const next = clone(disk);
    next.events.push({
      eventId: event.eventId,
      generation: event.generation,
      revision: event.revision,
      type: event.type,
      payload: clone(event.payload),
      recordedAt,
    });
    next.revision = event.revision;
    next.status = event.type === "completed" ? "completed"
      : event.type === "failed" ? "failed"
        : event.type === "checkpoint" && event.payload?.status === "waiting" ? "waiting"
          : "running";
    next.updatedAt = recordedAt;
    validateDocument(next, { storeRoot: this.storeRoot });
    await assertStorePathContainment(this.storeRoot, this.storePath);
    await atomicWrite(this.storePath, next);
    this._document = next;
    return { state: this.state, duplicate: false };
  }

  async recover() {
    const recovered = await DurableRunState.load({
      storePath: this.storePath,
      storeRoot: this.storeRoot,
      runId: this._document.runId,
      generation: this._document.generation,
    });
    this._document = recovered._document;
    return this.state;
  }

  static async create({ storePath, storeRoot, runId, generation, metadata = {} }) {
    const paths = await storePaths({ storePath, storeRoot });
    validateId(runId, "runId");
    validateGeneration(generation);
    assertJson(metadata, "metadata", { storeRoot: paths.storeRoot });
    const now = new Date().toISOString();
    const document = {
      schemaVersion: SCHEMA_VERSION,
      runId,
      generation,
      revision: 0,
      status: "running",
      createdAt: now,
      updatedAt: now,
      metadata: clone(metadata),
      events: [],
    };
    await mkdir(dirname(paths.storePath), { recursive: true });
    try {
      await writeFile(paths.storePath, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      if (error.code === "EEXIST") fail("STORE_EXISTS", "durable run store already exists");
      throw error;
    }
    return new DurableRunState({ ...paths, document });
  }

  static async load({ storePath, storeRoot, runId, generation } = {}) {
    const paths = await storePaths({ storePath, storeRoot });
    const document = await readDocument(paths.storePath, { storeRoot: paths.storeRoot, runId, generation });
    return new DurableRunState({ ...paths, document });
  }
}

export const createRun = (options) => DurableRunState.create(options);
export const loadRun = (options) => DurableRunState.load(options);
export const recoverRun = (options) => DurableRunState.load(options);
export const appendEvent = (run, event) => run.append(event);
export const STORE_SCHEMA_VERSION = SCHEMA_VERSION;
