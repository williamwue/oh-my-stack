// Kiro: T3 starts each kiro instance as `<config.binaryPath || kiro-cli> acp
// --agent-engine=v3 --auth-method=cli`, with the instance's environment over
// its own (packages/provider-kiro/src/server/acpSupport.ts), and Kiro reads
// its skills and hooks from $KIRO_HOME, else ~/.kiro. It loads a skill from
// <home>/skills/<name> and a hook from any file in <home>/hooks, so the
// installer keeps a copy of the plugin at <home>/oms-pstack, links each skill
// into it, and writes a hooks file that runs the copy's session-start hook.
import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";

import { check, isPlainCopy, readJson, tempBeside } from "./common.mjs";
import { INSTALL_RECORD } from "../plugin.mjs";

const SESSION_START_FILES = ["hooks/session-start.sh", "hooks/session-start-context.md", "skills/setup-pstack/scripts/read-sheet.sh"];
const copyPath = (home) => join(real(home.dir), "oms-pstack");
const hooksPath = (home) => join(home.dir, "hooks", "oms-pstack.json");
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

const quote = (text) => `'${text.replaceAll("'", "'\\''")}'`;

// Kiro tells a hook no plugin root, so the command passes the copy's.
export const hookCommand = (root) => `sh ${quote(join(root, "hooks", "session-start.sh"))} kiro ${quote(root)}`;

// Kiro adds a PostCompact hook's output after compaction, so the routing
// text outlives it.
export const hooksFile = (root) =>
  JSON.stringify(
    {
      version: "v1",
      hooks: ["SessionStart", "PostCompact"].map((trigger) => ({
        name: "oms-pstack",
        trigger,
        timeout: 10,
        action: { type: "command", command: hookCommand(root) },
      })),
    },
    null,
    2,
  ) + "\n";

const real = (path) => (existsSync(path) ? realpathSync(path) : path);
const inside = (path, dir) => path.startsWith(dir + sep);

function classify(path, name, root, skills) {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (!stat) return { kind: "missing" };
  if (!stat.isSymbolicLink()) return { kind: isPlainCopy(name, join(path, "SKILL.md"), skills) ? "copy" : "own" };
  const linked = resolve(dirname(path), readlinkSync(path));
  return { kind: inside(linked, root) || inside(real(path), real(root)) ? "ours" : "link", linked };
}

// Kiro has no skill namespace, so an entry of the same name that oms-pstack
// did not make keeps the plugin's skill from loading.
const COLLISIONS = {
  own: { kind: "your own skill", fix: "rename your skill" },
  copy: { kind: "a plain copy of oms-pstack's skill", fix: "delete the copy" },
  link: { kind: "a link into another checkout", fix: "remove the link" },
};

function skillPlan(home, skills) {
  const dir = join(home.dir, "skills");
  const root = join(copyPath(home), "skills");
  const names = new Set([...skills.keys(), ...(existsSync(dir) ? readdirSync(dir) : [])]);
  const entries = [...names].map((name) => ({
    name,
    path: join(dir, name),
    target: join(root, name),
    shipped: skills.has(name),
    ...classify(join(dir, name), name, root, skills),
  }));
  return {
    link: entries.filter((e) => e.shipped && e.kind === "missing"),
    repoint: entries.filter((e) => e.shipped && e.kind === "ours" && e.linked !== e.target),
    unlink: entries.filter((e) => !e.shipped && e.kind === "ours"),
    collisions: entries.filter((e) => e.shipped && e.kind in COLLISIONS),
  };
}

const names = (entries) => entries.map((e) => e.name).join(", ");

// "junction" lets Windows link a directory without the symlink privilege.
// The link is made beside its path and renamed in, so it is never missing.
function link(target, path) {
  const fresh = tempBeside(path);
  symlinkSync(target, fresh, "junction");
  renameSync(fresh, path);
}

function linkSkills(home, skills) {
  const plan = skillPlan(home, skills);
  mkdirSync(join(home.dir, "skills"), { recursive: true });
  for (const entry of [...plan.link, ...plan.repoint]) link(entry.target, entry.path);
  for (const entry of plan.unlink) unlinkSync(entry.path);
  return [
    plan.link.length && `linked ${plan.link.length} skill${plan.link.length === 1 ? "" : "s"}`,
    plan.repoint.length && `repointed ${names(plan.repoint)} at the copy`,
    plan.unlink.length && `unlinked ${names(plan.unlink)}, which this release dropped`,
  ].filter(Boolean);
}

// readdirSync's `recursive` follows a symlinked directory, so this walk
// recurses only into real ones.
function* files(dir, prefix = "") {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) yield* files(join(dir, entry.name), join(prefix, entry.name));
    else yield join(prefix, entry.name);
  }
}

function readRecord(path) {
  const file = join(path, INSTALL_RECORD);
  const record = existsSync(file) ? readJson(file) : undefined;
  return record?.installer === "oms-pstack" ? { ...record, hooks: [record.hooks].flat() } : undefined;
}

function extraFiles(path, record) {
  const listed = new Set(record.files);
  return [...files(path)].filter((file) => file !== INSTALL_RECORD && !listed.has(file));
}

const stale = (path, record, { version, skills, pluginRoot }) =>
  record.version !== version ||
  !record.files.every((file) => existsSync(join(path, file))) ||
  ![...skills.keys()].every((name) => existsSync(join(path, "skills", name, "SKILL.md"))) ||
  !SESSION_START_FILES.every((file) => readFileSync(join(path, file)).equals(readFileSync(join(pluginRoot, file))));

function copyState(path, context) {
  if (!lstatSync(path, { throwIfNoEntry: false })) return { kind: "missing" };
  const record = readRecord(path);
  if (!record) return { kind: "foreign" };
  const extra = extraFiles(path, record);
  if (extra.length) return { kind: "extra", record, extra };
  return { kind: stale(path, record, context) ? "stale" : "current", record };
}

const theirs = (state) => state.kind === "foreign" || state.kind === "extra";

function writeRecord(fresh, version, hooks, old) {
  const found = hooksState(hooks.path, old, hooks.text);
  const record = { installer: "oms-pstack", version, files: [...files(fresh)], hooks: [sha256(hooks.text), ...(found.kind === "stale" ? [found.hash] : [])] };
  writeFileSync(join(fresh, INSTALL_RECORD), JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
}

const copyStep = ({ kind, record }, version) => {
  if (kind === "missing") return `installed ${version}`;
  return record.version === version ? `reinstalled ${version}, whose files were missing or changed` : `updated ${record.version} to ${version}`;
};

// A whole tree swapped in by rename, so a session never loads half a plugin
// and files a release dropped do not linger.
function replaceCopy(path, state, hooks, context) {
  if (state.kind === "current") return [];
  const fresh = tempBeside(path);
  // cpSync copies a linked root as the link, so the record would land in the source.
  cpSync(realpathSync(context.pluginRoot), fresh, { recursive: true });
  writeRecord(fresh, context.version, hooks, state.record);
  const old = lstatSync(path, { throwIfNoEntry: false }) ? tempBeside(path) : undefined;
  if (old) renameSync(path, old);
  // Checked again once moved aside, so nothing that landed at the path after
  // copyState read it gets deleted.
  if (old && theirs(copyState(old, context))) {
    renameSync(old, path);
    rmSync(fresh, { recursive: true, force: true });
    throw new Error(`${path} changed while the installer ran, so the installer left it as it was`);
  }
  renameSync(fresh, path);
  if (old) rmSync(old, { recursive: true, force: true });
  return [copyStep(state, context.version)];
}

function hooksState(path, record, text) {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (!stat) return { kind: "missing" };
  if (!stat.isFile()) return { kind: "foreign" };
  const hash = sha256(readFileSync(path));
  if (hash === sha256(text)) return { kind: "current" };
  return { kind: record?.hooks.includes(hash) ? "stale" : "foreign", hash };
}

const HOOK_STEPS = { missing: (path) => `wrote ${path}`, stale: (path) => `rewrote ${path}, which had changed` };

function writeHooks(path, record, text) {
  // Read just before the rename, so a file that landed during the swap stays.
  const { kind } = hooksState(path, record, text);
  if (!(kind in HOOK_STEPS)) return [];
  mkdirSync(dirname(path), { recursive: true });
  // writeAtomic lands on a link's target, so this renames over the path itself.
  const fresh = tempBeside(path);
  writeFileSync(fresh, text, { flag: "wx" });
  renameSync(fresh, path);
  return [HOOK_STEPS[kind](path)];
}

export function installKiro(home, context) {
  // Kiro creates its home private.
  mkdirSync(home.dir, { recursive: true, mode: 0o700 });
  const path = copyPath(home);
  const state = copyState(path, context);
  // The links and the hooks file point into the copy, so neither goes in
  // while its path holds anything the installer did not put there.
  if (theirs(state)) return [];
  const hooks = { path: hooksPath(home), text: hooksFile(path) };
  // state.record was read before the swap, so it still names the text an earlier release wrote.
  return [...replaceCopy(path, state, hooks, context), ...linkSkills(home, context.skills), ...writeHooks(hooks.path, state.record, hooks.text)];
}

const INSTALLED = {
  missing: (path, state, { hint }) => ["not installed", hint],
  foreign: (path, state, { hint }) => [`${path} is not oms-pstack's copy, since it has no ${INSTALL_RECORD} from the installer`, `move ${path} out of the way, then ${hint}`],
  extra: (path, { extra }, { hint }) => [`${path} holds files the installer did not put there: ${extra.join(", ")}`, `move or delete them, then ${hint}`],
  stale: (path, { record }, { version, hint }) => [
    record.version === version ? `${version}, but its files at ${path} are missing or changed` : `${record.version}, expected ${version}`,
    hint,
  ],
};

function installedCheck(path, state, context) {
  if (state.kind === "current") return check("installed", true, context.version);
  return check("installed", false, ...INSTALLED[state.kind](path, state, context));
}

function skillsCheck({ link, repoint, unlink, collisions }, skills, hint) {
  const faults = [
    link.length && `not linked: ${names(link)}`,
    repoint.length && `linked to the wrong target: ${names(repoint)}`,
    unlink.length && `linked but dropped from this release: ${names(unlink)}`,
  ].filter(Boolean);
  return check("skills", !faults.length, faults.join("; ") || `${skills.size - collisions.length} linked`, hint);
}

const collisionCheck = ({ name, path, kind, linked }, hint) =>
  check(
    `skill ${name}`,
    false,
    `${path} is ${COLLISIONS[kind].kind}${linked ? `, ${linked}` : ""}, so oms-pstack's ${name} cannot load`,
    `${COLLISIONS[kind].fix}, then ${hint}`,
  );

const HOOK = {
  missing: (path, hint) => [`${path} is missing`, hint],
  stale: (path, hint) => [`${path} is not the file this release writes`, hint],
  foreign: (path, hint) => [`${path} is not a file the installer wrote`, `move or delete it, then ${hint}`],
};

function hookCheck(home, record, hint) {
  const path = hooksPath(home);
  const { kind } = hooksState(path, record, hooksFile(copyPath(home)));
  return kind === "current" ? check("hook", true, path) : check("hook", false, ...HOOK[kind](path, hint));
}

const ignoredCheck = (ignored, hint) =>
  check(
    "KIRO_HOME",
    false,
    `Kiro reads this home, since it ignores ${ignored.map(({ value, from }) => `"${value}" from ${from}`).join(", ")}`,
    `make KIRO_HOME an absolute path that does not hold your home folder, or unset it, then ${hint}`,
    true,
  );

export function doctorKiro(home, context) {
  const warnings = home.ignored ? [ignoredCheck(home.ignored, context.hint)] : [];
  const path = copyPath(home);
  const state = copyState(path, context);
  const installed = installedCheck(path, state, context);
  if (theirs(state)) return [...warnings, installed];
  const plan = skillPlan(home, context.skills);
  return [
    ...warnings,
    installed,
    skillsCheck(plan, context.skills, context.hint),
    ...plan.collisions.map((entry) => collisionCheck(entry, context.hint)),
    hookCheck(home, state.record, context.hint),
  ];
}
