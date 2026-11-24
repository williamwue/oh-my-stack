// The T3 sheet grammar and its check against an orchestrator_capabilities
// catalog. The fixture is a trimmed copy of a real catalog: Claude names its
// reasoning option `effort`, Codex and Grok name it `reasoningEffort`,
// Antigravity 1.5 names it `thought_level`, and an unauthenticated provider
// lists models it cannot run.
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { checkSheet, family, parseEntry, parseSheet } from "../plugins/pstack/skills/setup-pstack/scripts/t3-sheet.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const script = join(root, "plugins/pstack/skills/setup-pstack/scripts/t3-sheet.mjs");
const catalogPath = join(root, "tests/fixtures/t3-catalog.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const { roles, tiers: defaults, retired } = JSON.parse(readFileSync(join(root, "plugins/pstack/models.t3.json"), "utf8"));
const check = (text, over = catalog) => checkSheet(parseSheet(text), { roles, defaults, catalog: over, retired });
const PANEL = "interrogate reviewers";

describe("parseEntry", () => {
  test("keeps a Pi model ID that has its own provider prefix", () => {
    expect(parseEntry("pi/openai-codex/gpt-6.1-sol thinking=medium")).toEqual({
      providerInstanceId: "pi",
      model: "openai-codex/gpt-6.1-sol",
      options: { thinking: "medium" },
    });
    expect(family("openai-codex/gpt-6.1-sol")).toBe(family("gpt-6.1-sol"));
  });

  test("maps an entry onto a delegate_task target", () => {
    expect(parseEntry(" codex/gpt-6.1-sol reasoningEffort=xhigh serviceTier=priority ")).toEqual({
      providerInstanceId: "codex",
      model: "gpt-6.1-sol",
      options: { reasoningEffort: "xhigh", serviceTier: "priority" },
    });
  });

  test("inherit-parent and auto have no target and take no options", () => {
    expect(parseEntry("inherit-parent")).toBeNull();
    expect(parseEntry("auto")).toBeNull();
    expect(() => parseEntry("inherit-parent effort=high")).toThrow("inherit-parent takes no options");
  });

  test("splits at the first slash, so an OpenCode model ID keeps its own", () => {
    expect(parseEntry("opencode/openrouter/x-ai/grok-4.7 reasoningEffort=high")).toEqual({
      providerInstanceId: "opencode",
      model: "openrouter/x-ai/grok-4.7",
      options: { reasoningEffort: "high" },
    });
    expect(() => parseEntry("opencode/openrouter/")).toThrow("does not start with <providerInstanceId>/<modelId>");
  });

  test("a route prefix in the model ID does not decide its family", () => {
    expect(family("openrouter/x-ai/grok-4.7")).toBe("grok");
    expect(family("openrouter/anthropic/claude-opus-5-5")).toBe("claude");
    expect(family("gpt-6.1-sol")).toBe("gpt");
  });

  test("Fable is its own family, apart from the other Claude models", () => {
    expect(family("claude-fable-5-2")).toBe("claude-fable");
    expect(family("openrouter/anthropic/claude-fable-5-2")).toBe("claude-fable");
    expect(family("claude-opus-5-5")).toBe("claude");
  });

  test("rejects a bare alias, an @level, and a repeated option", () => {
    expect(() => parseEntry("opus")).toThrow("does not start with <providerInstanceId>/<modelId>");
    expect(() => parseEntry("claudeAgent/claude-opus-5-5 @high")).toThrow('"@high" is not <optionId>=<value>');
    expect(() => parseEntry("grok/grok-4.7 reasoningEffort=high reasoningEffort=low")).toThrow('sets "reasoningEffort" twice');
  });
});

describe("checkSheet without a catalog", () => {
  test("checks the grammar and the panel rule, not whether a target dispatches here", () => {
    expect(check("bug-fix: someprovider/unlisted-model effort=max\nsession hook: on\n", null)).toEqual([]);
    expect(check(`bug-fix: claude-opus\n${PANEL}: someprovider/claude-a, otherprovider/claude-b\n`, null)).toEqual([
      'bug-fix: "claude-opus" does not start with <providerInstanceId>/<modelId>',
      `${PANEL}: a panel needs at least two model families among its targets (inherit-parent does not count), got claude`,
    ]);
  });
});

describe("checkSheet against a catalog", () => {
  test("the default sheet setup-pstack writes dispatches", () => {
    const setup = readFileSync(join(root, "plugins/pstack/skills/setup-pstack/references/t3.md"), "utf8");
    const sheet = setup.match(/```markdown\n(# pstack model configuration \(T3\)[\s\S]*?)```/)[1];
    expect(parseSheet(sheet)).toHaveLength(roles.length + 1);
    expect(check(sheet)).toEqual([]);
  });

  test("names each entry that cannot dispatch here", () => {
    expect(
      check(
        [
          "bug-fix: claudeCode/claude-opus-5-5",
          "perf-issue: cursor/grok-4.7",
          "judgment and prose: grok/grok-9",
          "swarm workers: claudeAgent/claude-opus-5-5 reasoningEffort=high",
          "feature, refactoring: codex/gpt-6.1-sol reasoningEffort=extreme",
          "hillclimb: claudeAgent/claude-opus-5-5 fastMode=yes",
        ].join("\n"),
      ),
    ).toEqual([
      'bug-fix: claudeCode/claude-opus-5-5: no provider instance "claudeCode" in this T3',
      'perf-issue: cursor/grok-4.7: "cursor" cannot run child tasks (Provider is not authenticated.)',
      'judgment and prose: grok/grok-9: "grok" does not list model "grok-9"',
      'swarm workers: claudeAgent/claude-opus-5-5: no option "reasoningEffort" (has effort, fastMode)',
      "feature, refactoring: codex/gpt-6.1-sol: reasoningEffort=extreme is not one of low, medium, high, xhigh, max, ultra",
      "hillclimb: claudeAgent/claude-opus-5-5: fastMode=yes is not one of true, false",
    ]);
  });

  test("a catalog that lists each option's values as a plain array, as orchestrator_capabilities returns, checks values", () => {
    // This historical catalog omits the new defaults, but its explicit targets still validate.
    const values = JSON.parse(readFileSync(join(root, "tests/fixtures/t3-catalog-values.json"), "utf8"));
    const problems = (lines) => check(lines.join("\n"), values).filter((p) => !p.includes("(no line, tier default)"));
    const valid = [
      "bug-fix: claudeAgent/claude-opus-5-5 effort=high fastMode=true",
      "feature, refactoring: codex/gpt-6.1-sol reasoningEffort=xhigh serviceTier=priority",
      "perf-issue: cursor/grok-4.7 reasoning_effort=high fastMode=false contextWindow=256k",
    ];
    expect(problems(valid)).toEqual([]);
    const invalid = [
      "bug-fix: claudeAgent/claude-opus-5-5 effort=extreme",
      "hillclimb: claudeAgent/claude-opus-5-5 fastMode=yes",
      "judgment and prose: grok/grok-4.7 reasoningEffort=high",
    ];
    expect(problems(invalid)).toEqual([
      "bug-fix: claudeAgent/claude-opus-5-5: effort=extreme is not one of low, medium, high, xhigh, max, ultracode, ultrathink",
      "hillclimb: claudeAgent/claude-opus-5-5: fastMode=yes is not one of false, true",
      'judgment and prose: grok/grok-4.7: "grok" cannot run child tasks (Provider instance is disabled.)',
    ]);
  });

  test("a model whose options are omitted or null reports the option instead of crashing", () => {
    for (const options of [undefined, null]) {
      const bare = structuredClone(catalog);
      bare.providers.find((p) => p.providerInstanceId === "claudeAgent").models.push({ id: "claude-x", options });
      expect(check("bug-fix: claudeAgent/claude-x effort=high", bare)).toEqual([
        'bug-fix: claudeAgent/claude-x: no option "effort" (has none)',
      ]);
    }
  });

  test("a role with no line is checked on its tier default, as on a machine without Antigravity", () => {
    const noGemini = structuredClone(catalog);
    noGemini.providers = noGemini.providers.filter((p) => p.providerInstanceId !== "antigravity");
    const panelRoles = roles.filter((r) => Array.isArray(defaults[r.tier])).map((r) => r.role);
    expect(check("session hook: on", noGemini)).toEqual(
      panelRoles.map(
        (role) => `${role} (no line, tier default): antigravity/gemini-4-neon: no provider instance "antigravity" in this T3`,
      ),
    );
    const lines = panelRoles.map((role) => `${role}: claudeAgent/claude-opus-5-5, codex/gpt-6.1-sol`).join("\n");
    expect(check(lines, noGemini)).toEqual([]);
  });

  test("a panel on one family fails, whatever providers serve it", () => {
    expect(check(`${PANEL}: claudeAgent/claude-opus-5-5, codex_pool/claude-opus-5-5`)).toEqual([
      `${PANEL}: a panel needs at least two model families among its targets (inherit-parent does not count), got claude`,
    ]);
    expect(check(`${PANEL}: claudeAgent/claude-opus-5-5, grok/grok-4.7`)).toEqual([]);
    expect(check(`${PANEL}: claudeAgent/claude-fable-5-2 effort=high, claudeAgent/claude-opus-5-5`)).toEqual([]);
  });

  test("inherit-parent does not count toward a panel's two families", () => {
    expect(check(`${PANEL}: inherit-parent, grok/grok-4.7`)).toEqual([
      `${PANEL}: a panel needs at least two model families among its targets (inherit-parent does not count), got grok`,
    ]);
    expect(check(`${PANEL}: auto, claudeAgent/claude-fable-5-1, grok/grok-4.7`)).toEqual([]);
  });

  test("an option named like an Object prototype key is checked, not dropped", () => {
    expect(check("bug-fix: claudeAgent/claude-opus-5-5 __proto__=bogus")).toEqual([
      'bug-fix: claudeAgent/claude-opus-5-5: no option "__proto__" (has effort, fastMode)',
    ]);
  });

  test("a panel that repeats a target fails", () => {
    expect(check(`${PANEL}: claudeAgent/claude-opus-5-5, grok/grok-4.7, claudeAgent/claude-opus-5-5`)).toEqual([
      `${PANEL}: lists the same target twice`,
    ]);
  });

  test("a provider that cannot run cross-provider children fails, and its entries do not count as a family", () => {
    const noCross = structuredClone(catalog);
    noCross.providers.find((p) => p.providerInstanceId === "grok").canRunCrossProviderChildTask = false;
    expect(check(`${PANEL}: claudeAgent/claude-opus-5-5, grok/grok-4.7`, noCross)).toEqual([
      `${PANEL}: grok/grok-4.7: "grok" cannot run child tasks`,
      `${PANEL}: a panel needs at least two model families among its targets (inherit-parent does not count), got claude`,
    ]);
  });

  test("only a panel role takes a list", () => {
    expect(check("bug-fix: claudeAgent/claude-fable-5-1, grok/grok-4.7")).toEqual(["bug-fix: takes one entry, not a list"]);
  });

  test("the cross-judge pool takes a list of two families, as a panel does", () => {
    const pool = "arena cross-judge pool";
    expect(check(`${pool}: claudeAgent/claude-opus-5-5 effort=high, antigravity/gemini-4-carbon thought_level=high`)).toEqual([]);
    expect(check(`${pool}: claudeAgent/claude-opus-5-5 effort=high`)).toEqual([
      `${pool}: a panel needs at least two model families among its targets (inherit-parent does not count), got claude`,
    ]);
  });

  test("a role set twice fails rather than letting the last line win", () => {
    expect(check("swarm workers: grok/grok-4.7 effort=high\nswarm workers: grok/grok-4.7")).toEqual([
      'swarm workers: grok/grok-4.7: no option "effort" (has reasoningEffort)',
      '"swarm workers" appears twice; only one line may set it',
    ]);
  });

  test("a line shaped like a role line but malformed fails instead of being skipped", () => {
    const bad = [
      "bug-fix:  grok/grok-4.7",
      "hillclimb:",
      "  perf-issue: grok/grok-4.7",
      "Bug-fix: grok/grok-9",
      "- bug-fix: grok/grok-9",
      "`bug-fix`: grok/grok-9",
      "**bug-fix**: grok/grok-9",
      "1. bug-fix: grok/grok-9",
      "bug_fix: grok/grok-9",
      "Delete a line to use the tier default.",
    ];
    expect(check(bad.join("\n"))).toEqual(
      bad.map((_, i) => `line ${i + 1}: not a "<role>: <value>" line (lowercase role, one space after the colon, no indent or markup)`),
    );
  });

  test("CRLF line ends and a byte-order mark parse like plain lines", () => {
    expect(check("\uFEFFbug-fix: grok/grok-9\r\nsession hook: on\r\n")).toEqual([
      'bug-fix: grok/grok-9: "grok" does not list model "grok-9"',
    ]);
  });

  // 2.3.0 retired the how and why roles. Every sheet setup-pstack wrote before
  // that carries their four lines, which no skill reads now.
  test("a sheet written before the how and why roles retired still passes", () => {
    const released = [
      "# pstack model configuration (T3)",
      "",
      "feature, refactoring: claudeAgent/claude-opus-5-5 effort=xhigh",
      "strongest judgment: claudeAgent/claude-fable-5-1 effort=xhigh",
      "how explorer: claudeAgent/claude-opus-5-5 effort=medium",
      "how explainer: claudeAgent/claude-opus-5-5 effort=xhigh",
      "why investigators: claudeAgent/claude-opus-5-5 effort=medium",
      "why synthesizer: claudeAgent/claude-opus-5-5 effort=xhigh",
      `${PANEL}: claudeAgent/claude-fable-5-1 effort=xhigh, codex/gpt-6.1-sol reasoningEffort=xhigh`,
      "session hook: on",
    ];
    expect(check(released.join("\n"))).toEqual([]);
    expect(check("how explorer: provider-gone/model-gone")).toEqual([]);
  });

  // 2.4.0 retired hardest tasks (strongest judgment before upstream's 0.15.21),
  // the two reflect roles, and architect runners, with pstack 0.15.43. Every
  // sheet setup-pstack wrote before that carries their lines. 2.3.0 also wrote
  // Antigravity 1.4's `thinking_level`, which Antigravity 1.5 renamed
  // `thought_level`, so only that live line fails until /setup-pstack reruns.
  test("a sheet written by 2.3.0 passes the lines of the roles 2.4.0 retired", () => {
    const released = [
      "# defaults: 2",
      "# budget: large (xhigh)",
      "bug-fix: claudeAgent/claude-opus-5-5 effort=xhigh",
      "hardest tasks: claudeAgent/claude-fable-5-2 effort=max",
      "reflect tooling: claudeAgent/claude-opus-5-5 effort=high fastMode=true",
      "reflect judgment, divergent, synthesizer: claudeAgent/claude-opus-5-5 effort=xhigh",
      "arena cross-judge pool: claudeAgent/claude-fable-5-2 effort=high, claudeAgent/claude-opus-5-5 effort=high fastMode=true, antigravity/gemini-4-carbon thinking_level=high",
      "architect runners: claudeAgent/claude-fable-5-2 effort=high, claudeAgent/claude-opus-5-5 effort=high fastMode=true, antigravity/gemini-4-carbon thinking_level=high",
      "session hook: on",
    ];
    expect(check(released.join("\n"))).toEqual([
      'arena cross-judge pool: antigravity/gemini-4-carbon: no option "thinking_level" (has thought_level)',
    ]);
    expect(check("strongest judgment: provider-gone/model-gone\narchitect runners: provider-gone/model-gone")).toEqual([]);
  });

  test("default effort, an unknown role, and a bad hook value fail; headings and blank lines pass", () => {
    expect(check("# Sheet\n\ndefault effort: session\nhow critics: grok/grok-4.7\nsession hook: of")).toEqual([
      "default effort: T3 entries carry their own options; delete this line",
      '"how critics" is not a pstack role',
      'session hook: "of" is not on or off',
    ]);
  });
});

// Each test spawns real node processes, and the first node start on a cold CI
// runner can take several seconds.
const CLI_TIMEOUT = 30_000;

describe("t3-sheet.mjs CLI", () => {
  const dir = mkdtempSync(join(tmpdir(), "t3-sheet-"));
  const current = join(dir, "current.md");
  const candidate = (budget, sheet) => {
    if (sheet !== undefined) writeFileSync(current, sheet);
    const args = [script, "--candidate", budget, catalogPath, ...(sheet === undefined ? [] : [current])];
    const result = spawnSync("node", args, { encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    if (sheet !== undefined) expect(readFileSync(current, "utf8")).toBe(sheet);
    return result;
  };
  const run = (path, sheet) => {
    writeFileSync(join(dir, "sheet.md"), sheet);
    return spawnSync("node", [path, join(dir, "sheet.md"), catalogPath], { encoding: "utf8" });
  };

  test("prints each problem and exits 1, through a symlink too", () => {
    symlinkSync(script, join(dir, "linked.mjs"));
    for (const path of [script, join(dir, "linked.mjs")]) {
      const result = run(path, "bug-fix: grok/grok-9\n");
      expect({ status: result.status, stdout: result.stdout }).toEqual({
        status: 1,
        stdout: 'bug-fix: grok/grok-9: "grok" does not list model "grok-9"\n',
      });
    }
  }, CLI_TIMEOUT);

  test("exits 0 on a sheet that dispatches", () => {
    expect(run(script, "bug-fix: grok/grok-4.7 reasoningEffort=xhigh\n").status).toBe(0);
  }, CLI_TIMEOUT);

  test("fresh medium produces the documented seats and repeating it preserves every option", () => {
    const { stdout, stderr } = candidate("medium");
    const sol = "codex/gpt-6.2-sol reasoningEffort=high";
    const opus = "claudeAgent/claude-opus-5-5 effort=medium";
    const neon = "antigravity/gemini-4-neon thought_level=high";
    const panel = `codex/gpt-6.2-astra reasoningEffort=medium, ${opus}, ${neon}`;
    expect(stderr).toBe("");
    expect(parseSheet(stdout).map(({ key, value }) => [key, value])).toEqual([
      ["feature, refactoring", sol],
      ["bug-fix", sol],
      ["perf-issue", sol],
      ["hillclimb", sol],
      ["judgment and prose", sol],
      ["arena runners", panel],
      ["arena cross-judge pool", `${opus}, ${neon}`],
      ["swarm workers", "opencode/opencode-go/deepseek-v4.1-flash variant=high"],
      ["interrogate reviewers", panel],
      ["session hook", "on"],
    ]);
    expect(candidate("medium", stdout)).toMatchObject({ stdout, stderr: "" });
  }, CLI_TIMEOUT);

  test("large and small adjust preset effort and preserve explicit targets and hook settings", () => {
    const medium = candidate("medium").stdout
      .replace(/^bug-fix: .+$/m, "bug-fix: auto")
      .replace(/^hillclimb: .+$/m, "hillclimb: inherit-parent")
      .replace(/^perf-issue: .+$/m, "perf-issue: codex/gpt-6.2-sol reasoningEffort=medium")
      .replace("session hook: on", "session hook: off");
    const large = candidate("large", medium).stdout;
    expect(large).toContain("feature, refactoring: codex/gpt-6.2-sol reasoningEffort=xhigh");
    expect(large).toContain("arena runners: codex/gpt-6.2-astra reasoningEffort=high, claudeAgent/claude-opus-5-5 effort=high, antigravity/gemini-4-neon thought_level=xhigh");
    const small = candidate("small", large).stdout;
    expect(small).toContain("feature, refactoring: codex/gpt-6.2-sol reasoningEffort=medium");
    expect(small).toContain("arena runners: codex/gpt-6.2-astra reasoningEffort=low, claudeAgent/claude-opus-5-5 effort=low, antigravity/gemini-4-neon thought_level=medium");
    for (const sheet of [large, small]) {
      expect(sheet).toContain("swarm workers: opencode/opencode-go/deepseek-v4.1-flash variant=high");
      expect(sheet).toContain("bug-fix: auto");
      expect(sheet).toContain("perf-issue: codex/gpt-6.2-sol reasoningEffort=medium");
      expect(sheet).toContain("hillclimb: inherit-parent");
      expect(sheet).toContain("session hook: off");
    }
    expect(candidate("medium", small).stdout).toBe(medium);
  }, CLI_TIMEOUT);

  test("large uses an available lower effort while medium requires its exact built-in option", () => {
    const limited = structuredClone(catalog);
    const sol = limited.providers.find((p) => p.providerInstanceId === "codex").models.find((m) => m.id === "gpt-6.2-sol");
    sol.options[0].values = ["low", "medium", "high"];
    const path = join(dir, "limited.json");
    writeFileSync(path, JSON.stringify(limited));
    const runCandidate = (budget) => spawnSync("node", [script, "--candidate", budget, path], { encoding: "utf8" });
    const large = runCandidate("large");
    expect(large.status, large.stderr).toBe(0);
    expect(large.stdout).toContain("feature, refactoring: codex/gpt-6.2-sol reasoningEffort=high");
    sol.options[0].values = ["low", "medium"];
    writeFileSync(path, JSON.stringify(limited));
    const medium = runCandidate("medium");
    expect(medium.status).toBe(1);
    expect(medium.stderr).toContain("reasoningEffort=high is not one of low, medium");
    expect(medium.stdout).toContain("feature, refactoring: codex/gpt-6.2-sol reasoningEffort=high");
  }, CLI_TIMEOUT);

  test("migrates released default signatures and preserves current Neon high and explicit options", () => {
    const old = [
      "# budget: unlimited",
      "bug-fix: claudeAgent/claude-fable-5-1 effort=xhigh",
      "swarm workers: claudeAgent/claude-opus-5-5 effort=high",
      "arena runners: codex/gpt-6.1-sol, claudeAgent/claude-opus-5-5, grok/grok-4.7",
      "arena cross-judge pool: claudeAgent/claude-fable-5-2, claudeAgent/claude-opus-5-5, antigravity/gemini-4-carbon thinking_level=high",
      "interrogate reviewers: claudeAgent/claude-opus-5-5 effort=medium, antigravity/gemini-4-carbon thinking_level=high",
      "how explorer: auto",
    ].join("\n");
    const { stdout, stderr } = candidate("medium", old);
    expect(stdout).toContain("bug-fix: codex/gpt-6.2-sol reasoningEffort=high");
    expect(stdout).toContain("swarm workers: opencode/opencode-go/deepseek-v4.1-flash variant=high");
    expect(stdout).toContain("arena runners: codex/gpt-6.2-astra reasoningEffort=medium");
    expect(stdout).toContain("arena cross-judge pool: claudeAgent/claude-opus-5-5 effort=medium, antigravity/gemini-4-neon thought_level=high");
    expect(stdout).toContain("interrogate reviewers: claudeAgent/claude-opus-5-5 effort=medium, antigravity/gemini-4-neon thought_level=high");
    expect(stderr).toContain("Dropped line 7 (how explorer)");

    const panel = "interrogate reviewers: claudeAgent/claude-opus-5-5 effort=high fastMode=true, antigravity/gemini-4-neon thought_level=high";
    const released = `# defaults: 3\n# budget: medium (high)\n${panel}\n`;
    expect(candidate("medium", released).stdout).toContain(panel);
    const renamed = candidate("medium", released.replace("thought_level=high", "thinking_level=high"));
    expect(renamed.stdout).toContain(panel);
    expect(renamed.stderr).toContain("Migrated interrogate reviewers");
    const handwritten = "swarm workers: claudeAgent/claude-opus-5-5 effort=high\n";
    expect(candidate("medium", handwritten).stdout).toContain(handwritten);
  }, CLI_TIMEOUT);
});
