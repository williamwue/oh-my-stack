import { WatcherQueryError } from "./github.ts";
import type { WatchClock } from "./policy.ts";
import type * as T from "./types.ts";

// t3-pstack's review settle window. Review bots post minutes after CI turns
// green, so READY waits until no account other than the PR author and the gh
// viewer has commented, reviewed, or reacted for the settle window since the
// review was triggered: the push, the PR opening, or its last ready for review.
// An eyes reaction, the common "reviewing now" signal, holds READY until this
// many seconds after that start.
export const EYES_HOLD_CAP_SECONDS = 1_800;

/** One comment, review, or reaction; `at` is its latest create or edit. */
export interface ReviewActivityItem {
  readonly login: string | null;
  readonly at: string;
  readonly eyes: boolean;
}
export interface ReviewActivity {
  readonly authorLogin: string | null;
  readonly viewerLogin: string;
  readonly openedAt: string;
  readonly readyAt: string | null;
  /** GitHub's push record for the head, or null when it has none. */
  readonly headPushedAt: string | null;
  readonly items: readonly ReviewActivityItem[];
}
export interface SettleSince {
  readonly at: string;
  readonly source: "push" | "first-seen" | "opened" | "ready-for-review";
}
export type ReviewSettle =
  | { readonly kind: "off" }
  | {
      readonly kind: "settled";
      readonly since: SettleSince;
      readonly lastActivityAt: string | null;
    }
  | {
      readonly kind: "settling";
      readonly since: SettleSince;
      readonly lastActivityAt: string | null;
      readonly endsAt: string;
      readonly secondsLeft: number;
      readonly heldBy: "activity" | "eyes";
    };
type Settling = Extract<ReviewSettle, { readonly kind: "settling" }>;
export type SettleWait = { readonly kind: "review-settling" } & Pick<
  Settling,
  "endsAt" | "heldBy"
>;
export interface SettleDecision {
  readonly kind: "settling";
  readonly frontier: T.PrContext;
  readonly settle: Settling;
}

const seconds = (iso: string): number => Date.parse(iso) / 1_000;
const iso = (at: number): string => new Date(at * 1_000).toISOString();
// GraphQL names a bot `coderabbitai` on a comment and `coderabbitai[bot]` on a
// reaction.
const account = (login: string): string =>
  login.toLowerCase().replace(/\[bot\]$/, "");

export const REVIEW_ACTIVITY_QUERY = `query ReviewActivity($owner: String!, $repo: String!, $pr: Int!) {
  viewer { login }
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      author { login }
      createdAt
      headRefName
      headRepository { name owner { login } }
      timelineItems(last: 1, itemTypes: [READY_FOR_REVIEW_EVENT]) {
        nodes { ... on ReadyForReviewEvent { createdAt } }
      }
      comments(last: 100, orderBy: { field: UPDATED_AT, direction: ASC }) {
        nodes {
          author { login } createdAt lastEditedAt
          reactions(last: 20) { nodes { content createdAt user { login } } }
        }
      }
      reviews(last: 100) { nodes { author { login } submittedAt lastEditedAt } }
      reviewThreads(last: 100) {
        nodes { comments(last: 100) { nodes { author { login } createdAt lastEditedAt } } }
      }
      reactions(last: 100) { nodes { content createdAt user { login } } }
    }
  }
}`;

function invalid(detail: string): never {
  throw new WatcherQueryError({ kind: "missing-key", retryable: true, detail });
}
function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    invalid(`${label} must be an object`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0)
    invalid(`${label} must be a non-empty string`);
  return value;
}
const nullableText = (value: unknown, label: string): string | null =>
  value === null ? null : text(value, label);

function nodes(connection: unknown, label: string): readonly unknown[] {
  const value = object(connection, label).nodes;
  if (!Array.isArray(value))
    throw new WatcherQueryError({
      kind: "missing-key",
      retryable: true,
      detail: `${label}.nodes must be a list`,
    });
  return value;
}
const login = (value: unknown, label: string): string | null =>
  value === null ? null : text(object(value, label).login, `${label}.login`);
function posted(
  value: unknown,
  label: string,
  created: string
): ReviewActivityItem | null {
  const item = object(value, label);
  // A pending review has not been submitted, so nobody else can see it yet.
  const createdAt = nullableText(item[created], `${label}.${created}`);
  if (createdAt === null) return null;
  const editedAt = nullableText(item.lastEditedAt, `${label}.lastEditedAt`);
  return {
    login: login(item.author, `${label}.author`),
    at:
      editedAt !== null && seconds(editedAt) > seconds(createdAt)
        ? editedAt
        : createdAt,
    eyes: false,
  };
}
function reaction(value: unknown): ReviewActivityItem {
  const item = object(value, "reaction");
  return {
    login: login(item.user, "reaction.user"),
    at: text(item.createdAt, "reaction.createdAt"),
    eyes: item.content === "EYES",
  };
}

export interface ParsedReviewActivity
  extends Omit<ReviewActivity, "headPushedAt"> {
  readonly head: {
    readonly owner: string;
    readonly repo: string;
    readonly ref: string;
  } | null;
}
export function parseReviewActivity(value: unknown): ParsedReviewActivity {
  // Fails closed on `errors` like GhGitHubReader.graphql, which this query
  // cannot go through because it also reads the top-level `viewer`.
  const response = object(value, "response");
  if (response.errors !== undefined)
    throw new WatcherQueryError({
      kind: "missing-key",
      retryable: true,
      detail: `invalid GraphQL errors: ${JSON.stringify(response.errors)}`,
    });
  const data = object(response.data, "data");
  const pr = object(
    object(data.repository, "repository").pullRequest,
    "pullRequest"
  );
  const comments = nodes(pr.comments, "comments");
  const items = [
    ...comments.map((item) => posted(item, "comment", "createdAt")),
    ...comments.flatMap((item) =>
      nodes(object(item, "comment").reactions, "comment.reactions").map(
        reaction
      )
    ),
    ...nodes(pr.reviews, "reviews").map((item) =>
      posted(item, "review", "submittedAt")
    ),
    ...nodes(pr.reviewThreads, "reviewThreads").flatMap((thread) =>
      nodes(
        object(thread, "reviewThread").comments,
        "reviewThread.comments"
      ).map((item) => posted(item, "review comment", "createdAt"))
    ),
    ...nodes(pr.reactions, "reactions").map(reaction),
  ].filter((item): item is ReviewActivityItem => item !== null);
  const ready = nodes(pr.timelineItems, "timelineItems")[0];
  const headRepository =
    pr.headRepository === null
      ? null
      : object(pr.headRepository, "headRepository");
  return {
    authorLogin: login(pr.author, "pullRequest.author"),
    viewerLogin: text(object(data.viewer, "viewer").login, "viewer.login"),
    openedAt: text(pr.createdAt, "pullRequest.createdAt"),
    readyAt:
      ready === undefined
        ? null
        : text(
            object(ready, "readyForReview").createdAt,
            "readyForReview.createdAt"
          ),
    head:
      headRepository === null
        ? null
        : {
            owner: text(
              object(headRepository.owner, "headRepository.owner").login,
              "headRepository.owner.login"
            ),
            repo: text(headRepository.name, "headRepository.name"),
            ref: text(pr.headRefName, "pullRequest.headRefName"),
          },
    items,
  };
}

// The repository activity log is GitHub's record of each push. A commit's own
// dates are not: a rebase pushed later keeps its author date, and a commit
// can be pushed long after it was committed. Only the branch's newest entry
// counts, so a force-push back to an older tip that GitHub has not logged yet
// does not match that tip's earlier push.
export function parseHeadPush(
  value: unknown,
  headRefOid: string
): string | null {
  const newest: unknown = Array.isArray(value) ? value[0] : undefined;
  if (newest === undefined) return null;
  const entry = object(newest, "activity[0]");
  return entry.after === headRefOid
    ? text(entry.timestamp, "activity[0].timestamp")
    : null;
}

export async function readReviewActivity(
  runJson: (argv: readonly [string, ...string[]]) => Promise<unknown>,
  context: T.PrContext,
  headRefOid: string | null
): Promise<ReviewActivity> {
  const { head, ...activity } = parseReviewActivity(
    await runJson([
      "gh",
      "api",
      "graphql",
      "-f",
      `query=${REVIEW_ACTIVITY_QUERY}`,
      "-f",
      `owner=${context.owner}`,
      "-f",
      `repo=${context.repo}`,
      "-F",
      `pr=${context.number}`,
    ])
  );
  if (head === null || headRefOid === null)
    return { ...activity, headPushedAt: null };
  try {
    const log = await runJson([
      "gh",
      "api",
      "--method",
      "GET",
      `repos/${head.owner}/${head.repo}/activity`,
      "-f",
      `ref=refs/heads/${head.ref}`,
      "-f",
      "direction=desc",
      "-F",
      "per_page=1",
    ]);
    return { ...activity, headPushedAt: parseHeadPush(log, headRefOid) };
  } catch (error) {
    // A fork the viewer cannot read has no log to give; the window then
    // starts when the watcher first sees the head. Any other failure retries.
    if (
      !(error instanceof WatcherQueryError) ||
      error.failure.kind !== "command-exit" ||
      !/\(HTTP 40[34]\)/.test(error.failure.detail)
    )
      throw error;
    return { ...activity, headPushedAt: null };
  }
}

export function settleState(args: {
  readonly activity: ReviewActivity;
  readonly head: Pick<SettleSince, "at"> & {
    readonly source: "push" | "first-seen";
  };
  readonly now: number;
  readonly settle: number;
}): Exclude<ReviewSettle, { readonly kind: "off" }> {
  const starts: readonly SettleSince[] = [
    args.head,
    { at: args.activity.openedAt, source: "opened" },
    ...(args.activity.readyAt === null
      ? []
      : [{ at: args.activity.readyAt, source: "ready-for-review" } as const]),
  ];
  const since = starts.reduce((latest, start) =>
    seconds(start.at) > seconds(latest.at) ? start : latest
  );
  const start = seconds(since.at);
  const own = new Set(
    [args.activity.authorLogin, args.activity.viewerLogin].flatMap((login) =>
      login === null ? [] : [account(login)]
    )
  );
  const after = args.activity.items.filter(
    (item) =>
      !(item.login !== null && own.has(account(item.login))) &&
      seconds(item.at) >= start
  );
  const last = Math.max(start, ...after.map((item) => seconds(item.at)));
  const lastActivityAt = after.length === 0 ? null : iso(last);
  const quietEnd = last + args.settle;
  const eyesEnd = after.some((item) => item.eyes)
    ? start + EYES_HOLD_CAP_SECONDS
    : Number.NEGATIVE_INFINITY;
  const end = Math.max(quietEnd, eyesEnd);
  if (args.now >= end) return { kind: "settled", since, lastActivityAt };
  return {
    kind: "settling",
    since,
    lastActivityAt,
    endsAt: iso(end),
    secondsLeft: Math.ceil(end - args.now),
    heldBy: eyesEnd > quietEnd ? "eyes" : "activity",
  };
}

export type ReviewSettler = (
  head: Pick<T.PullRequestFacts, "context" | "headRefOid">
) => Promise<ReviewSettle>;

export function reviewSettler(args: {
  readonly dependencies: {
    readonly reader: Pick<T.GitHubReader, "reviewActivity">;
    readonly clock: Pick<WatchClock, "observedAt">;
  };
  readonly mode: T.WatchMode;
  readonly options: Pick<T.PollingOptions, "settle">;
}): ReviewSettler | undefined {
  // A queued stack waits for the merge queue, so it has no READY to hold.
  const settle = args.mode === "queued-stack" ? 0 : args.options.settle;
  if (settle === 0) return undefined;
  const { reader, clock } = args.dependencies;
  // Per PR: when this process first saw the head, and the push time once
  // GitHub has given it, so a later read without one cannot move the start.
  const heads = new Map<
    T.PrNumber,
    {
      readonly headRefOid: string | null;
      readonly firstSeen: string;
      readonly pushedAt: string | null;
    }
  >();
  return async ({ context, headRefOid }) => {
    const activity = await reader.reviewActivity(context, headRefOid);
    // observedAt is the watcher's wall clock; now() is monotonic.
    const observedAt = clock.observedAt();
    const prior = heads.get(context.number);
    const same = prior?.headRefOid === headRefOid ? prior : undefined;
    const head = {
      headRefOid,
      firstSeen: same?.firstSeen ?? observedAt,
      pushedAt: activity.headPushedAt ?? same?.pushedAt ?? null,
    };
    heads.set(context.number, head);
    return settleState({
      activity,
      head:
        head.pushedAt === null
          ? { at: head.firstSeen, source: "first-seen" }
          : { at: head.pushedAt, source: "push" },
      now: seconds(observedAt),
      settle,
    });
  };
}

export const waitReason = (decision: T.WaitingDecision | SettleDecision) =>
  decision.kind === "waiting"
    ? { kind: "pending-checks" as const, pending: decision.pending }
    : ({
        kind: "review-settling",
        endsAt: decision.settle.endsAt,
        heldBy: decision.settle.heldBy,
      } satisfies SettleWait);

const left = (secondsLeft: number): string =>
  secondsLeft < 60 ? `${secondsLeft}s` : `${Math.ceil(secondsLeft / 60)}m`;

export function settleCell(row: T.PrSnapshot): string {
  if (row.kind !== "open" || row.settle.kind !== "settling") return "";
  return row.settle.heldBy === "eyes"
    ? `, 👀 reviewing, ${left(row.settle.secondsLeft)} left`
    : `, ⏳ settling, ${left(row.settle.secondsLeft)} left`;
}

// A TIMEOUT carries the reason from the last read, so the time left is
// counted from the verdict's own observedAt.
export const settleText = (reason: SettleWait, observedAt: string): string =>
  `review activity has not settled (${reason.heldBy === "eyes" ? "an eyes reaction is on the PR" : "quiet window since the push, opening, or last activity"}); can end in ${Math.max(0, Math.ceil(seconds(reason.endsAt) - seconds(observedAt)))}s, at ${reason.endsAt}`;
