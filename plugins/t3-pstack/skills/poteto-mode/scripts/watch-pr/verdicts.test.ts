// Michael Denyer's watch-pr fixes from pstack-claude, carried by t3-pstack:
// a PR that waits on a required review or another protection rule is not
// READY (#95), a stale check fails instead of pending forever (#97), a
// repository with no checks configured gets a verdict instead of retrying
// forever (#151, #152, #153), and a BLOCKED read stops the watcher only once
// it has held for 60 seconds (#223).
import { afterEach, describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type CliRuntime, main } from "./cli.ts";
import {
  type FakeReaderOptions,
  fakeReader,
  passingCheck,
  pendingCheck,
} from "./fakes.test-helper.ts";
import {
  ChecksUnavailable,
  WatcherQueryError,
  parseFastCheck,
  resolveChecks,
} from "./github.ts";
import {
  classifyPr,
  readSnapshot,
  selectTierMajorStackDecision,
} from "./policy.ts";
import type { GitHubReader, NonEmpty, PrContext, PrSnapshot } from "./types.ts";
import { parsePrNumber } from "./types.ts";

const context = (number: number) => ({
  owner: "owner",
  repo: "repo",
  number: parsePrNumber(number),
});

// A clock that moves only when the watcher sleeps, so a reader can change what
// GitHub reports between polls.
function tickingRuntime() {
  let now = 0;
  const stdout: string[] = [];
  return {
    now: () => now,
    text: () => stdout.join(""),
    verdicts: () => stdout.map((line) => JSON.parse(line) as unknown),
    runtime: (reader: GitHubReader): CliRuntime => ({
      reader,
      clock: {
        now: () => now,
        observedAt: () =>
          new Date(
            Date.parse("2026-07-26T00:00:00.000Z") + now * 1_000
          ).toISOString(),
        async sleep(seconds) {
          now += seconds;
          if (now > 3_600) throw new Error("watched for over an hour");
        },
      },
      stdout: (value) => stdout.push(value),
      stderr: () => {},
    }),
  };
}

// gh reports no checks, and the head commit has no rollup.
const noChecks = {
  fastPath: { kind: "none-reported" },
  rollupPages: [{ kind: "no-rollup" }],
  commitRollups: [{ oid: "head", state: null }],
} as const;

function testRuntime(reader: GitHubReader) {
  const stdout: string[] = [];
  const runtime: CliRuntime = {
    reader,
    clock: {
      now: () => 0,
      observedAt: () => "2026-07-26T00:00:00.000Z",
      async sleep() {
        throw new Error("test unexpectedly slept");
      },
    },
    stdout: (value) => stdout.push(value),
    stderr: () => {},
  };
  return { runtime, stdout };
}

const single = [
  "--owner",
  "owner",
  "--repo",
  "repo",
  "--pr",
  "1",
  "--settle",
  "0",
];

describe("review gate", () => {
  it("blocks on a required review instead of reporting a blocked PR ready", async () => {
    const snapshot = await readSnapshot({
      reader: fakeReader({
        facts: {
          reviewDecision: "REVIEW_REQUIRED",
          mergeStateStatus: "BLOCKED",
        },
      }),
      context: context(23),
      pendingHistory: "omit",
      allowDraft: false,
    });
    expect(classifyPr(snapshot)).toEqual({
      kind: "blocker",
      blocker: {
        kind: "merge-gate",
        pr: context(23),
        reason: "review-required",
      },
    });
    expect(
      selectTierMajorStackDecision([snapshot] as NonEmpty<PrSnapshot>)
    ).toMatchObject({
      kind: "blocker",
      blocker: { kind: "merge-gate", reason: "review-required" },
    });
  });

  it("blocks when branch protection holds an approved PR with clean CI", async () => {
    const snapshot = await readSnapshot({
      reader: fakeReader({ facts: { mergeStateStatus: "BLOCKED" } }),
      context: context(24),
      pendingHistory: "omit",
      allowDraft: false,
    });
    expect(classifyPr(snapshot)).toMatchObject({
      kind: "blocker",
      blocker: { kind: "merge-gate", reason: "merge-blocked" },
    });
  });

  it("waits for pending checks before reporting the review gate", async () => {
    const snapshot = await readSnapshot({
      reader: fakeReader({
        facts: {
          reviewDecision: "REVIEW_REQUIRED",
          mergeStateStatus: "BLOCKED",
        },
        fastPath: { kind: "checks", checks: [pendingCheck()] },
      }),
      context: context(26),
      pendingHistory: "omit",
      allowDraft: false,
    });
    expect(classifyPr(snapshot)).toMatchObject({ kind: "waiting" });
  });

  it("waits out t3-pstack's review settle window before reporting the review gate", async () => {
    const read = (settling: boolean) =>
      readSnapshot({
        reader: fakeReader({
          facts: {
            reviewDecision: "REVIEW_REQUIRED",
            mergeStateStatus: "BLOCKED",
          },
        }),
        context: context(27),
        pendingHistory: "include",
        allowDraft: false,
        settler: async () =>
          settling
            ? {
                kind: "settling",
                since: { at: "2026-07-26T00:00:00.000Z", source: "push" },
                lastActivityAt: null,
                endsAt: "2026-07-26T00:05:00.000Z",
                secondsLeft: 300,
                heldBy: "activity",
              }
            : {
                kind: "settled",
                since: { at: "2026-07-26T00:00:00.000Z", source: "push" },
                lastActivityAt: null,
              },
      });
    expect(classifyPr(await read(true))).toMatchObject({ kind: "settling" });
    expect(classifyPr(await read(false))).toMatchObject({
      kind: "blocker",
      blocker: { kind: "merge-gate", reason: "review-required" },
    });
  });

  it("still reports changes requested as a merge-gate blocker", async () => {
    const snapshot = await readSnapshot({
      reader: fakeReader({
        facts: {
          reviewDecision: "CHANGES_REQUESTED",
          mergeStateStatus: "BLOCKED",
        },
      }),
      context: context(25),
      pendingHistory: "omit",
      allowDraft: false,
    });
    expect(classifyPr(snapshot)).toMatchObject({
      kind: "blocker",
      blocker: { kind: "merge-gate", reason: "changes-requested" },
    });
  });

  it("exits 6 and names the review in the status table and the blocker", async () => {
    const reader = () =>
      fakeReader({
        facts: {
          reviewDecision: "REVIEW_REQUIRED",
          mergeStateStatus: "BLOCKED",
        },
      });
    const status = testRuntime(reader());
    expect(
      await main([...single, "--pretty", "--status-only"], status.runtime)
    ).toBe(0);
    expect(status.stdout.join("")).toContain(
      "| [#1](https://github.com/owner/repo/pull/1) | ✅ | 👀 review required | ⛔ blocked |"
    );
    const watch = tickingRuntime();
    expect(await main([...single, "--pretty"], watch.runtime(reader()))).toBe(
      6
    );
    expect(watch.text()).toBe(
      "WAITING: frontier=#1; confirming merge block (GitHub reads BLOCKED; stops if the same head still does after 60s)\nBLOCKER: review-required\npr=1\naction=human action needed: a required approving review is missing; report it and wait for a reviewer\n"
    );
  });

  it("gates only the stack's frontier on a review or branch protection", async () => {
    const approved = await readSnapshot({
      reader: fakeReader(),
      context: context(31),
      pendingHistory: "include",
      allowDraft: false,
    });
    const needsReview = await readSnapshot({
      reader: fakeReader({
        facts: {
          reviewDecision: "REVIEW_REQUIRED",
          mergeStateStatus: "BLOCKED",
        },
      }),
      context: context(32),
      pendingHistory: "include",
      allowDraft: false,
    });
    expect(selectTierMajorStackDecision([approved, needsReview])).toMatchObject(
      { kind: "clear", prs: [{ kind: "ready-pr" }, { kind: "ready-pr" }] }
    );
    expect(selectTierMajorStackDecision([needsReview, approved])).toMatchObject(
      {
        kind: "blocker",
        blocker: {
          kind: "merge-gate",
          pr: context(32),
          reason: "review-required",
        },
      }
    );
  });

  it("waits on a queued frontier while the PRs above it need review, then stops at the next one", async () => {
    const base = fakeReader();
    let frontierReads = 0;
    const reader = {
      ...base,
      async pullRequest(pr: PrContext) {
        const facts = await base.pullRequest(pr);
        if (pr.number !== 1)
          return {
            ...facts,
            reviewDecision: "REVIEW_REQUIRED" as const,
            mergeStateStatus: "BLOCKED" as const,
          };
        frontierReads += 1;
        return frontierReads === 1
          ? facts
          : {
              ...facts,
              state: "MERGED" as const,
              mergedAt: "2026-07-26T00:01:00Z",
            };
      },
    } satisfies GitHubReader;
    const watch = tickingRuntime();
    expect(
      await main(
        [
          "--owner",
          "owner",
          "--repo",
          "repo",
          "--queued-stack",
          "--stack-prs",
          "1,2,3",
        ],
        watch.runtime(reader)
      )
    ).toBe(6);
    expect(watch.verdicts()).toMatchObject([
      { kind: "QUEUE" },
      { kind: "STATUS", reason: "whole-stack-sweep" },
      {
        kind: "WAITING",
        frontier: { number: 1 },
        reason: { kind: "merge-queue", unmergedCount: 3 },
      },
      {
        kind: "WAITING",
        frontier: { number: 2 },
        reason: { kind: "confirming-block" },
      },
      {
        kind: "BLOCKER",
        exitCode: 6,
        blocker: {
          kind: "merge-gate",
          pr: { number: 2 },
          reason: "review-required",
        },
      },
    ]);
  });
});

describe("a frontier with clean CI that reads BLOCKED for a moment", () => {
  // Reads as `fakeReader(polls[n])` during the nth 60-second poll.
  function pollsReader(now: () => number, polls: readonly FakeReaderOptions[]) {
    const readers = polls.map((options) => fakeReader(options));
    const at = () => {
      const reader = readers[Math.floor(now() / 60)];
      if (reader === undefined) throw new Error("read past the last poll");
      return reader;
    };
    return {
      ...fakeReader(),
      pullRequest: (pr: PrContext) => at().pullRequest(pr),
      checksFastPath: (pr: PrContext) => at().checksFastPath(pr),
      commitRollups: (pr: PrContext) => at().commitRollups(pr),
    } satisfies GitHubReader;
  }
  const blocked = { facts: { mergeStateStatus: "BLOCKED" } } as const;

  it("reaches READY when the block clears within 60 seconds", async () => {
    const watch = tickingRuntime();
    expect(
      await main(single, watch.runtime(pollsReader(watch.now, [blocked, {}])))
    ).toBe(0);
    expect(watch.verdicts()).toMatchObject([
      {
        kind: "WAITING",
        frontier: { number: 1 },
        reason: { kind: "confirming-block" },
      },
      { kind: "READY", exitCode: 0 },
    ]);
  });

  it("stops confirming at the deadline instead of sleeping past it", async () => {
    const watch = tickingRuntime();
    expect(
      await main(
        [...single, "--timeout", "30"],
        watch.runtime(pollsReader(watch.now, [blocked, blocked]))
      )
    ).toBe(5);
    expect(watch.verdicts()).toMatchObject([
      { kind: "WAITING", reason: { kind: "confirming-block" } },
      { kind: "WAITING", reason: { kind: "confirming-block" } },
      { kind: "TIMEOUT", exitCode: 5, reason: { kind: "confirming-block" } },
    ]);
    expect(watch.now()).toBe(30);
  });

  it("does not count BLOCKED reads while a check is pending", async () => {
    const pending = {
      ...blocked,
      fastPath: { kind: "checks", checks: [pendingCheck()] },
      commitRollups: [{ oid: "head", state: "PENDING" }],
    } as const;
    const watch = tickingRuntime();
    expect(
      await main(
        single,
        watch.runtime(pollsReader(watch.now, [pending, pending, blocked, {}]))
      )
    ).toBe(0);
    expect(watch.verdicts()).toMatchObject([
      { kind: "WAITING", reason: { kind: "pending-checks" } },
      { kind: "WAITING", reason: { kind: "pending-checks" } },
      { kind: "WAITING", reason: { kind: "confirming-block" } },
      { kind: "READY", exitCode: 0 },
    ]);
  });

  it("confirms again each time a queued frontier flips back to BLOCKED", async () => {
    const watch = tickingRuntime();
    expect(
      await main(
        [
          "--owner",
          "owner",
          "--repo",
          "repo",
          "--queued-stack",
          "--stack-prs",
          "1",
        ],
        watch.runtime(
          pollsReader(watch.now, [
            blocked,
            {},
            blocked,
            { facts: { state: "MERGED", mergedAt: "2026-07-26T00:03:00Z" } },
          ])
        )
      )
    ).toBe(0);
    expect(watch.verdicts()).toMatchObject([
      { kind: "QUEUE" },
      { kind: "STATUS", reason: "whole-stack-sweep" },
      { kind: "WAITING", reason: { kind: "confirming-block" } },
      { kind: "WAITING", reason: { kind: "merge-queue" } },
      { kind: "WAITING", reason: { kind: "confirming-block" } },
      { kind: "COMPLETE", exitCode: 0 },
    ]);
  });
});

describe("a just-pushed head that GitHub blocks before any check registers", () => {
  // Reads `noChecks` and BLOCKED until `registersAt`, then a pending required
  // check, then the check passed and the PR clean.
  function pushedReader(now: () => number, registersAt: number) {
    const phases = [
      fakeReader({ ...noChecks, facts: { mergeStateStatus: "BLOCKED" } }),
      fakeReader({
        facts: { mergeStateStatus: "BLOCKED" },
        fastPath: { kind: "checks", checks: [pendingCheck()] },
        commitRollups: [{ oid: "head", state: "PENDING" }],
      }),
      fakeReader(),
    ] as const;
    const at = () =>
      phases[now() < registersAt ? 0 : now() < registersAt + 60 ? 1 : 2];
    return {
      ...phases[0],
      pullRequest: (pr: PrContext) => at().pullRequest(pr),
      checksFastPath: (pr: PrContext) => at().checksFastPath(pr),
      checkRollupPage: async () => ({ kind: "no-rollup" }) as const,
      commitRollups: (pr: PrContext) => at().commitRollups(pr),
    } satisfies GitHubReader;
  }

  it("waits for the required check with the settle window off", async () => {
    const watch = tickingRuntime();
    expect(await main(single, watch.runtime(pushedReader(watch.now, 60)))).toBe(
      0
    );
    expect(watch.verdicts()).toMatchObject([
      { kind: "WAITING", reason: { kind: "confirming-block" } },
      { kind: "WAITING", reason: { kind: "pending-checks" } },
      { kind: "READY", exitCode: 0 },
    ]);
  });

  it("stops at the merge gate once the block has held for 60 seconds, without spending the query-error budget", async () => {
    const watch = tickingRuntime();
    expect(
      await main(
        [...single, "--max-query-errors", "1"],
        watch.runtime(pushedReader(watch.now, Infinity))
      )
    ).toBe(6);
    expect(watch.now()).toBe(60);
    expect(watch.verdicts()).toMatchObject([
      { kind: "WAITING", reason: { kind: "confirming-block" } },
      {
        kind: "BLOCKER",
        exitCode: 6,
        blocker: { kind: "merge-gate", reason: "merge-blocked" },
      },
    ]);
  });
});

describe("fast-path check mapping", () => {
  // gh's aggregate.go files every state it does not name into the pending
  // bucket, including completed conclusions.
  it("fails completed conclusions that gh buckets as pending", () => {
    for (const state of ["STARTUP_FAILURE", "STALE"]) {
      expect(
        parseFastCheck({ name: "ci", state, bucket: "pending" })
      ).toMatchObject({
        kind: "failed",
        reportedState: state,
      });
    }
  });

  it("keeps in-flight states pending", () => {
    for (const state of [
      "EXPECTED",
      "REQUESTED",
      "WAITING",
      "QUEUED",
      "PENDING",
      "IN_PROGRESS",
    ]) {
      expect(
        parseFastCheck({ name: "ci", state, bucket: "pending" })
      ).toMatchObject({
        kind: "pending",
        reportedState: state,
      });
    }
  });

  it("stops at a stale check instead of waiting on it", async () => {
    const stale = parseFastCheck({
      name: "ci",
      state: "STALE",
      bucket: "pending",
    });
    const watch = testRuntime(
      fakeReader({
        fastPath: { kind: "checks", checks: [passingCheck("lint"), stale] },
      })
    );
    expect(await main(single, watch.runtime)).toBe(4);
    expect(JSON.parse(watch.stdout[0])).toMatchObject({
      kind: "BLOCKER",
      blocker: {
        kind: "failing-checks",
        ci: { failed: [{ name: "ci", reportedState: "STALE" }] },
      },
    });
  });
});

describe("checks with none configured", () => {
  it("reads no checks when gh reports none and the head commit has no rollup", async () => {
    const reader = fakeReader({
      fastPath: { kind: "none-reported" },
      rollupPages: [{ kind: "no-rollup" }],
    });
    expect(await resolveChecks(reader, context(42))).toEqual({
      source: "none",
      checks: [],
    });
    expect(reader.calls).toEqual(["checksFastPath", "checkRollupPage:null"]);
  });

  it("fails closed when only one read says there are no checks", async () => {
    const oneSided = [
      {
        fastPath: { kind: "unusable", exitCode: 1, stderr: "HTTP 401" },
        rollupPages: [{ kind: "no-rollup" }],
      },
      {
        fastPath: { kind: "checks", checks: [] },
        rollupPages: [{ kind: "no-rollup" }],
      },
      {
        fastPath: { kind: "none-reported" },
        rollupPages: [{ checks: [], endCursor: null }],
      },
    ] as const;
    for (const options of oneSided)
      await expect(
        resolveChecks(fakeReader(options), context(42))
      ).rejects.toBeInstanceOf(ChecksUnavailable);
  });

  it("propagates a failed rollup query instead of reading it as no checks", async () => {
    const reader = fakeReader({ fastPath: { kind: "none-reported" } });
    const failure = new WatcherQueryError({
      kind: "command-exit",
      retryable: true,
      code: 1,
      detail: "HTTP 502",
    });
    reader.checkRollupPage = async () => {
      throw failure;
    };
    await expect(resolveChecks(reader, context(42))).rejects.toBe(failure);
  });
});

describe("a PR with no checks configured", () => {
  const read = (overrides: Parameters<typeof fakeReader>[0] = {}) =>
    readSnapshot({
      reader: fakeReader({ ...noChecks, ...overrides }),
      context: context(30),
      pendingHistory: "omit",
      allowDraft: false,
    });

  it("is ready when GitHub reports it mergeable", async () => {
    const snapshot = await read({ facts: { reviewDecision: null } });
    expect(classifyPr(snapshot)).toMatchObject({
      kind: "ready",
      pr: { proof: { ci: { kind: "ci-none" } } },
    });
  });

  it("still stops on conflicts, review threads, and merge gates", async () => {
    const thread = {
      id: "thread",
      firstComment: null,
      isBugbot: false,
      bugbotReviewPasses: 0,
    };
    const cases = [
      [{ facts: { mergeable: "CONFLICTING" } }, { kind: "merge-conflicts" }],
      [{ threads: [thread] }, { kind: "review-threads" }],
      [
        { facts: { reviewDecision: "REVIEW_REQUIRED" } },
        { kind: "merge-gate", reason: "review-required" },
      ],
      [
        { facts: { mergeStateStatus: "BLOCKED" } },
        { kind: "merge-gate", reason: "merge-blocked" },
      ],
      [
        { facts: { isDraft: true } },
        { kind: "merge-gate", reason: "draft-pr" },
      ],
    ] as const;
    for (const [overrides, blocker] of cases)
      expect(classifyPr(await read(overrides))).toMatchObject({
        kind: "blocker",
        blocker,
      });
  });

  it("fails closed while the head may not have reported yet", async () => {
    const unsettled = [
      {
        commitRollups: [
          { oid: "earlier", state: "SUCCESS" },
          { oid: "head", state: null },
        ],
      },
      { commitRollups: [{ oid: "head", state: "PENDING" }] },
      { facts: { mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN" } },
    ] as const;
    for (const overrides of unsettled)
      await expect(read(overrides)).rejects.toMatchObject({
        failure: { kind: "checks-unavailable", retryable: true },
      });
  });

  it("names the absence of checks in the status table and the READY verdict", async () => {
    const reader = () =>
      fakeReader({ ...noChecks, facts: { reviewDecision: null } });
    const status = testRuntime(reader());
    expect(
      await main([...single, "--pretty", "--status-only"], status.runtime)
    ).toBe(0);
    expect(status.stdout.join("")).toContain(
      "| [#1](https://github.com/owner/repo/pull/1) | ➖ no checks | ✅ | ✅ |"
    );
    const ready = testRuntime(reader());
    expect(await main([...single, "--pretty"], ready.runtime)).toBe(0);
    expect(ready.stdout.join("")).toBe(
      "READY: no merge conflicts, no unresolved review threads, no failing or pending checks\nmergeStateStatus=CLEAN\nreviewDecision=null\nisDraft=false\nchecks=none reported on the head commit\n"
    );
  });
});

// These replay through the real gh reader what gh returned for a mergeable PR
// in a repository with no checks configured: `gh pr checks` exits 1 with "no
// checks reported" and the head commit's statusCheckRollup is null.
describe("the gh reader on a repository with no checks configured", () => {
  const directories: string[] = [];
  afterEach(() => {
    for (const dir of directories.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function run(scenario: string, extra: readonly string[]) {
    const dir = mkdtempSync(join(tmpdir(), "watch-no-ci-"));
    directories.push(dir);
    const bin = join(dir, "bin");
    mkdirSync(bin);
    const gh = join(bin, "gh");
    writeFileSync(
      gh,
      `#!${process.execPath}
const args = process.argv.slice(2);
const scenario = process.env.WATCH_FIXTURE;
const fail = (stderr) => { console.error(stderr); process.exit(1); };
const graphql = (name) => args.some((a) => a.includes('query ' + name));
const commits = (commit) => ({ data: { repository: { pullRequest: { commits: { nodes: [{ commit }] } } } } });
let value;
if (args[0] === 'pr' && args[1] === 'view') {
  value = { mergeable: 'MERGEABLE', mergeStateStatus: scenario === 'blocked' ? 'BLOCKED' : 'CLEAN', reviewDecision: '', headRefOid: 'head', headRefName: 'feature', baseRefName: 'main', state: 'OPEN', mergedAt: null, isDraft: false };
} else if (args[0] === 'pr' && args[1] === 'checks') {
  if (scenario === 'unauthorized') fail('HTTP 401: Bad credentials (https://api.github.com/graphql)');
  fail("no checks reported on the 'feature' branch");
} else if (graphql('PrCheckRollup')) {
  if (scenario === 'rollup-fails') fail('HTTP 502: Bad Gateway (https://api.github.com/graphql)');
  value = commits({ statusCheckRollup: null });
} else if (graphql('PrCommitStatuses')) {
  value = commits({ oid: 'head', statusCheckRollup: null });
} else if (graphql('ReviewThreads')) {
  value = { data: { repository: { pullRequest: { reviewThreads: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } } } } };
} else {
  fail('unexpected fixture command: ' + JSON.stringify(args));
}
console.log(JSON.stringify(value));
`
    );
    chmodSync(gh, 0o755);
    const entry = join(dir, "entry.ts");
    writeFileSync(
      entry,
      `import { main } from ${JSON.stringify(join(import.meta.dir, "cli.ts"))}; process.exitCode = await main(process.argv.slice(2));\n`
    );
    const result = spawnSync(
      process.execPath,
      [entry, ...single, "--max-query-errors", "1", ...extra],
      {
        encoding: "utf8",
        timeout: 10_000,
        env: { PATH: `${bin}:${process.env.PATH}`, WATCH_FIXTURE: scenario },
      }
    );
    return {
      status: result.status,
      verdicts: result.stdout
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as unknown),
    };
  }

  it("finishes a status-only pass", () => {
    expect(run("clean", ["--status-only"])).toMatchObject({
      status: 0,
      verdicts: [
        {
          kind: "STATUS",
          terminal: true,
          rows: [{ kind: "open", ci: { kind: "ci-none" } }],
        },
      ],
    });
  });

  it("reports a clean PR as READY", () => {
    expect(run("clean", [])).toMatchObject({
      status: 0,
      verdicts: [
        {
          kind: "READY",
          scope: {
            pr: { kind: "ready-pr", proof: { ci: { kind: "ci-none" } } },
          },
        },
      ],
    });
  });

  it("does not stop at the merge gate on the first read of a blocked PR", () => {
    expect(run("blocked", ["--timeout", "0.001"])).toMatchObject({
      status: 5,
      verdicts: [
        { kind: "WAITING", reason: { kind: "confirming-block" } },
        { kind: "TIMEOUT", reason: { kind: "confirming-block" } },
      ],
    });
  });

  it("fails closed when a check query fails instead of reporting no checks", () => {
    for (const scenario of ["unauthorized", "rollup-fails"])
      expect(run(scenario, ["--status-only"])).toMatchObject({
        status: 7,
        verdicts: [{ kind: "BLOCKER", blocker: { kind: "status-query" } }],
      });
  });
});
