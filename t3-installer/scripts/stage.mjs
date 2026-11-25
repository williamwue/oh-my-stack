// prepack: copy the T3 installer and the plugin it installs into t3-installer/
// at their repository paths, so tools/install.mjs runs from the tarball as it
// runs from a checkout. The copies are gitignored.
import { cpSync, rmSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(pkg, "..");

const STAGED = [
  "tools/install.mjs",
  "tools/install",
  "tools/plugin.mjs",
  "tools/frozen-hooks.json",
  "plugins/pstack",
  "LICENSE",
  "LICENSE-cursor-team-kit",
  "LICENSE-thermos",
  "LICENSE-oms",
  "LICENSE-t3-pstack",
  "NOTICE.md",
  "NOTICE-skills.md",
];

rmSync(join(pkg, "tools"), { recursive: true, force: true });
rmSync(join(pkg, "plugins"), { recursive: true, force: true });
for (const path of STAGED) {
  const source = join(repo, path);
  cpSync(source, join(pkg, path), {
    recursive: true,
    filter: (src) => !relative(source, src).split(sep).includes("node_modules"),
  });
}
