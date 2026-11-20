import { describe, expect, it } from "bun:test";
import { main } from "./cli.ts";
import {
  fakeReader,
  pendingCheck,
  type FakeReaderOptions,
} from "./fakes.test-helper.ts";
import { WatcherQueryError } from "./github.ts";
import { runSimple } from "./policy.ts";
import { renderPretty } from "./render.ts";
import {
  EYES_HOLD_CAP_SECONDS,
  parseHeadPush,
  parseReviewActivity,
  readReviewActivity,
  type ReviewActivity,
  type ReviewActivityItem,
} from "./settle.ts";
import type {
  GitHubReader,
  PrContext,
  ProgressVerdict,
  TerminalVerdict,
} from "./types.ts";
import { parsePrNumber } from "./types.ts";

const context = { owner: "owner", repo: "repo", number: parsePrNumber(1) };
const PUSH = Date.parse("2026-07-26T12:00:00Z") / 1_000;
const at = (offset: number): string =>
  new Date((PUSH + offset) * 1_000).toISOString();
type Wait = Extract<ProgressVerdict, { readonly kind: "WAITING" }>["reason"];
const bot = (offset: number, eyes = false): ReviewActivityItem => ({
  login: "review-bot",
  at: at(offset),
  eyes,
});

// Polls every 60 seconds, from 30 seconds after the push unless `start` says
// otherwise. Each poll sees only the items whose time has come.
async function watch(
  items: readonly ReviewActivityItem[],
  options: {
    readonly settle?: number;
    readonly headPushedAt?: string | null;
    readonly pushRecordUntil?: number;
    readonly openedAt?: string;
    readonly readyAt?: string | null;
    readonly start?: number;
    readonly timeout?: number;
    readonly facts?: FakeReaderOptions["facts"];
  } = {}
): Promise<{
  readonly verdict: TerminalVerdict;
  readonly after: number;
  readonly waits: readonly Wait[];
}> {
  let now = PUSH + (options.start ?? 30);
  const waits: Wait[] = [];
  const reader = {
    ...fakeReader({ facts: options.facts }),
    async reviewActivity(): Promise<ReviewActivity> {
      return {
        authorLogin: "author",
        viewerLogin: "viewer",
        openedAt: options.openedAt ?? at(-3_600),
        readyAt: options.readyAt ?? null,
        headPushedAt:
          now - PUSH >= (options.pushRecordUntil ?? Number.POSITIVE_INFINITY)
            ? null
            : options.headPushedAt === undefined
              ? at(0)
              : options.headPushedAt,
        items: items.filter((item) => Date.parse(item.at) / 1_000 <= now),
      };
    },
  } satisfies GitHubReader;
  const verdict = await runSimple({
    dependencies: {
      reader,
      clock: {
        now: () => now,
        observedAt: () => new Date(now * 1_000).toISOString(),
        async sleep(seconds) {
          now += seconds;
        },
      },
      emit(verdict) {
        if (verdict.kind === "WAITING") waits.push(verdict.reason);
      },
    },
    contexts: [context],
    mode: "single",
    statusOnly: false,
    options: {
      interval: 60,
      sweepInterval: 300,
      timeout: options.timeout ?? 7_200,
      maxQueryErrors: 5,
      allowDraft: false,
      settle: options.settle ?? 300,
    },
  });
  return { verdict, after: now - PUSH, waits };
}

describe("review settle window", () => {
  it("returns READY once other accounts have been quiet for the window", async () => {
    const { verdict, after, waits } = await watch([bot(60)]);
    expect(verdict.kind).toBe("READY");
    expect(after).toBe(390);
    expect(
      waits.map((wait) => wait.kind === "review-settling" && wait.endsAt)
    ).toEqual([at(300), at(360), at(360), at(360), at(360), at(360)]);
  });

  it("returns READY on the poll that lands exactly at the window's end", async () => {
    const { verdict, after } = await watch([bot(90)]);
    expect(verdict.kind).toBe("READY");
    expect(after).toBe(390);
  });

  it("restarts the window on activity inside it", async () => {
    const { verdict, after } = await watch([bot(60), bot(250)]);
    expect(verdict.kind).toBe("READY");
    expect(after).toBe(570);
  });

  it("counts an edit to a comment posted before the push", async () => {
    const { items } = parseReviewActivity(
      graphql({
        comments: [
          {
            author: { login: "codex-bot" },
            createdAt: at(-600),
            lastEditedAt: at(200),
            reactions: { nodes: [] },
          },
        ],
      })
    );
    const { verdict, after } = await watch(items);
    expect(verdict.kind).toBe("READY");
    expect(after).toBe(510);
  });

  it("ignores the PR author's and the gh viewer's own activity", async () => {
    const { verdict, after } = await watch([
      { login: "author", at: at(200), eyes: false },
      { login: "Viewer[bot]", at: at(250), eyes: true },
    ]);
    expect(verdict.kind).toBe("READY");
    expect(after).toBe(330);
  });

  it("holds on an eyes reaction from the push's own second until the cap, then releases", async () => {
    const { verdict, after, waits } = await watch([bot(0, true)]);
    expect(verdict.kind).toBe("READY");
    expect(after).toBe(EYES_HOLD_CAP_SECONDS + 30);
    expect(waits.at(-1)).toMatchObject({
      kind: "review-settling",
      heldBy: "eyes",
      endsAt: at(EYES_HOLD_CAP_SECONDS),
    });
  });

  it("applies only the quiet rule after the eyes cap", async () => {
    const { verdict, after } = await watch([
      bot(10, true),
      bot(EYES_HOLD_CAP_SECONDS - 100),
    ]);
    expect(verdict.kind).toBe("READY");
    expect(after).toBe(EYES_HOLD_CAP_SECONDS + 210);
  });

  it("ignores an eyes reaction added before the head was pushed", async () => {
    const { verdict, after } = await watch([bot(-100, true)]);
    expect(verdict.kind).toBe("READY");
    expect(after).toBe(330);
  });

  it("starts the window at the last ready for review when it follows the push", async () => {
    const { verdict, after, waits } = await watch([], { readyAt: at(600) });
    expect(verdict.kind).toBe("READY");
    expect(after).toBe(930);
    expect(waits[0]).toMatchObject({ endsAt: at(900) });
  });

  it("starts the window at the PR's opening when it follows the push", async () => {
    const { verdict, after, waits } = await watch([], { openedAt: at(600) });
    expect(verdict.kind).toBe("READY");
    expect(after).toBe(930);
    expect(waits[0]).toMatchObject({ endsAt: at(900) });
  });

  it("keeps a push time it has read when a later read has none", async () => {
    const { verdict, after } = await watch([bot(500, true)], {
      start: 600,
      pushRecordUntil: 900,
    });
    expect(verdict.kind).toBe("READY");
    expect(after).toBe(EYES_HOLD_CAP_SECONDS);
  });

  it("starts the window when the watcher first sees a head GitHub has no push record for", async () => {
    const { verdict, after, waits } = await watch([], { headPushedAt: null });
    expect(verdict.kind).toBe("READY");
    expect(after).toBe(330);
    expect(waits[0]).toMatchObject({ endsAt: at(330) });
  });

  it("holds a draft-pr gate until the window ends", async () => {
    const { verdict, after, waits } = await watch([bot(60)], {
      facts: { isDraft: true },
    });
    expect(waits[0]).toMatchObject({ kind: "review-settling" });
    expect(verdict).toMatchObject({
      kind: "BLOCKER",
      blocker: { kind: "merge-gate", reason: "draft-pr" },
    });
    expect(after).toBe(390);
  });

  it("waits on the lowest settling PR of a stack before an upstack PR's pending checks", async () => {
    const emitted: ProgressVerdict[] = [];
    const base = fakeReader();
    const reader = {
      ...base,
      async checksFastPath(pr: PrContext) {
        return pr.number === 2
          ? { kind: "checks" as const, checks: [pendingCheck()] }
          : base.checksFastPath(pr);
      },
      async reviewActivity(): Promise<ReviewActivity> {
        return {
          authorLogin: "author",
          viewerLogin: "viewer",
          openedAt: at(-3_600),
          readyAt: null,
          headPushedAt: at(0),
          items: [bot(40)],
        };
      },
    } satisfies GitHubReader;
    await expect(
      runSimple({
        dependencies: {
          reader,
          clock: {
            now: () => 0,
            observedAt: () => at(100),
            async sleep() {
              throw new Error("stop after the first wait");
            },
          },
          emit: (verdict) => emitted.push(verdict),
        },
        contexts: [context, { ...context, number: parsePrNumber(2) }],
        mode: "stack",
        statusOnly: false,
        options: {
          interval: 60,
          sweepInterval: 300,
          timeout: 0,
          maxQueryErrors: 5,
          allowDraft: false,
          settle: 300,
        },
      })
    ).rejects.toThrow("stop after the first wait");
    expect(emitted.at(-1)).toMatchObject({
      kind: "WAITING",
      frontier: { number: 1 },
      reason: { kind: "review-settling", heldBy: "activity", endsAt: at(340) },
    });
  });

  it("renders a review-settling wait with the time left", () => {
    expect(
      renderPretty({
        schemaVersion: 1,
        sequence: 1,
        observedAt: at(100),
        mode: "single",
        kind: "WAITING",
        terminal: false,
        frontier: context,
        reason: { kind: "review-settling", endsAt: at(1_800), heldBy: "eyes" },
      })
    ).toBe(
      `WAITING: frontier=#1; review activity has not settled (an eyes reaction is on the PR); can end in 1700s, at ${at(1_800)}\n`
    );
  });

  it("times out as review-settling with the time left", async () => {
    const { verdict } = await watch([bot(60)], { timeout: 120 });
    expect(verdict).toMatchObject({
      kind: "TIMEOUT",
      exitCode: 5,
      observedAt: at(150),
      reason: { kind: "review-settling", heldBy: "activity", endsAt: at(360) },
    });
    expect(renderPretty(verdict)).toBe(
      `TIMEOUT: review activity has not settled (quiet window since the push, opening, or last activity); can end in 210s, at ${at(360)}\n`
    );
  });
});

function cliRuntime(reader: GitHubReader, stdout: string[]) {
  return {
    reader,
    clock: {
      now: () => 0,
      observedAt: () => at(100),
      async sleep() {
        throw new Error("test unexpectedly slept");
      },
    },
    stdout: (value: string) => stdout.push(value),
    stderr: () => {},
  };
}

describe("watch-pr --settle", () => {
  const recent: ReviewActivity = {
    authorLogin: "author",
    viewerLogin: "viewer",
    openedAt: at(-3_600),
    readyAt: null,
    headPushedAt: at(0),
    items: [bot(40)],
  };

  it("disables the window at 0 and reads no review activity", async () => {
    const stdout: string[] = [];
    const reader = fakeReader({ reviewActivity: recent });
    expect(
      await main(["--pr", "1", "--settle", "0"], cliRuntime(reader, stdout))
    ).toBe(0);
    expect(JSON.parse(stdout[0] ?? "")).toMatchObject({ kind: "READY" });
    expect(reader.calls).not.toContain("reviewActivity");
  });

  it("shows the settling state in the --status-only table and JSON", async () => {
    const pretty: string[] = [];
    await main(
      ["--pr", "1", "--status-only", "--pretty"],
      cliRuntime(fakeReader({ reviewActivity: recent }), pretty)
    );
    expect(pretty.join("")).toContain("| ✅, ⏳ settling, 4m left |");
    const eyes: string[] = [];
    await main(
      ["--pr", "1", "--status-only", "--pretty"],
      cliRuntime(
        fakeReader({ reviewActivity: { ...recent, items: [bot(40, true)] } }),
        eyes
      )
    );
    expect(eyes.join("")).toContain("| ✅, 👀 reviewing, 29m left |");
    const json: string[] = [];
    await main(
      ["--pr", "1", "--status-only"],
      cliRuntime(fakeReader({ reviewActivity: recent }), json)
    );
    expect(JSON.parse(json[0] ?? "").rows[0].settle).toEqual({
      kind: "settling",
      since: { at: at(0), source: "push" },
      lastActivityAt: at(40),
      endsAt: at(340),
      secondsLeft: 240,
      heldBy: "activity",
    });
  });

  it("does not settle a queued stack's status table", async () => {
    const json: string[] = [];
    const reader = fakeReader({ reviewActivity: recent });
    await main(
      ["--queued-stack", "--stack-prs", "1", "--status-only"],
      cliRuntime(reader, json)
    );
    expect(JSON.parse(json[0] ?? "").rows[0].settle).toEqual({ kind: "off" });
    expect(reader.calls).not.toContain("reviewActivity");
  });
});

function graphql(pr: {
  readonly comments?: readonly unknown[];
  readonly reviews?: readonly unknown[];
  readonly threads?: readonly unknown[];
  readonly reactions?: readonly unknown[];
  readonly readyAt?: string;
}): unknown {
  return {
    data: {
      viewer: { login: "viewer" },
      repository: {
        pullRequest: {
          author: { login: "author" },
          createdAt: at(-3_600),
          headRefName: "feature",
          headRepository: { name: "repo", owner: { login: "fork" } },
          timelineItems: {
            nodes: pr.readyAt === undefined ? [] : [{ createdAt: pr.readyAt }],
          },
          comments: { nodes: pr.comments ?? [] },
          reviews: { nodes: pr.reviews ?? [] },
          reviewThreads: {
            nodes: (pr.threads ?? []).map((comment) => ({
              comments: { nodes: [comment] },
            })),
          },
          reactions: { nodes: pr.reactions ?? [] },
        },
      },
    },
  };
}

describe("review activity reader", () => {
  it("collects comments and their reactions, submitted reviews, review comments, and PR reactions", () => {
    expect(
      parseReviewActivity(
        graphql({
          readyAt: at(-60),
          comments: [
            {
              author: null,
              createdAt: at(1),
              lastEditedAt: null,
              reactions: {
                nodes: [
                  {
                    content: "EYES",
                    createdAt: at(2),
                    user: { login: "chatgpt-codex-connector[bot]" },
                  },
                ],
              },
            },
          ],
          reviews: [
            {
              author: { login: "coderabbitai" },
              submittedAt: at(3),
              lastEditedAt: null,
            },
            {
              author: { login: "author" },
              submittedAt: null,
              lastEditedAt: null,
            },
          ],
          threads: [
            {
              author: { login: "macroscopeapp" },
              createdAt: at(4),
              lastEditedAt: at(1),
            },
          ],
          reactions: [
            {
              content: "THUMBS_UP",
              createdAt: at(5),
              user: { login: "chatgpt-codex-connector[bot]" },
            },
          ],
        })
      )
    ).toEqual({
      authorLogin: "author",
      viewerLogin: "viewer",
      openedAt: at(-3_600),
      readyAt: at(-60),
      head: { owner: "fork", repo: "repo", ref: "feature" },
      items: [
        { login: null, at: at(1), eyes: false },
        { login: "chatgpt-codex-connector[bot]", at: at(2), eyes: true },
        { login: "coderabbitai", at: at(3), eyes: false },
        { login: "macroscopeapp", at: at(4), eyes: false },
        { login: "chatgpt-codex-connector[bot]", at: at(5), eyes: false },
      ],
    });
  });

  it("fails closed on a response that carries GraphQL errors", () => {
    const failure = (() => {
      try {
        parseReviewActivity({
          ...(graphql({}) as object),
          errors: [{ message: "Something went wrong" }],
        });
      } catch (error) {
        return error;
      }
    })();
    expect(failure).toBeInstanceOf(WatcherQueryError);
    expect((failure as WatcherQueryError).failure).toMatchObject({
      kind: "missing-key",
      retryable: true,
    });
  });

  it("dates the head only by the branch's newest push", () => {
    expect(
      parseHeadPush(
        [{ activity_type: "force_push", after: "head", timestamp: at(0) }],
        "head"
      )
    ).toBe(at(0));
    expect(
      parseHeadPush(
        [
          { activity_type: "push", after: "newer", timestamp: at(50) },
          { activity_type: "push", after: "head", timestamp: at(0) },
        ],
        "head"
      )
    ).toBeNull();
    expect(parseHeadPush([], "head")).toBeNull();
  });

  const failingLog = (detail: string) => async (argv: readonly string[]) => {
    if (argv[2] === "graphql") return graphql({});
    throw new WatcherQueryError({
      kind: "command-exit",
      retryable: true,
      detail,
      code: 1,
    });
  };

  it("falls back to no push record when the activity log is not readable", async () => {
    for (const detail of [
      "gh: Not Found (HTTP 404)",
      "gh: Forbidden (HTTP 403)",
    ])
      expect(
        (await readReviewActivity(failingLog(detail), context, "head"))
          .headPushedAt
      ).toBeNull();
  });

  it("retries any other activity log failure", async () => {
    await expect(
      readReviewActivity(
        failingLog("gh: Service Unavailable (HTTP 503)"),
        context,
        "head"
      )
    ).rejects.toBeInstanceOf(WatcherQueryError);
  });
});
