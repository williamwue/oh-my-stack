#!/usr/bin/env bash
# Worktree prune audit, read-only unless --fetch is given. Classifies every git
# worktree by size, merge state, uncommitted work, ignored files outside build
# and cache directories, commits only its HEAD or HEAD reflog reaches,
# remote/PR state, and the most recent chat that operated in it. Emits a table
# sorted by size with a suggested bucket. Never deletes anything; deletion stays
# a human-gated step in the playbook.
#
# Usage: worktree-audit.sh [-b|--base <ref>] [--fetch] [repo-path]
#   repo-path defaults to the current repo.
#   -b sets the ref the MERGED column checks against (e.g. origin/integration).
#   Without it the base is origin/HEAD, then origin/main, then origin/master.
#   origin/HEAD is the remote's default branch, not necessarily the branch PRs
#   merge into; pass -b when they differ.
#   --fetch refreshes an origin/* base from origin before the merge check.
set -u
# git status would otherwise refresh each worktree's index, a write that can
# collide with an agent working in that worktree.
export GIT_OPTIONAL_LOCKS=0

base=""
fetch=""
while [ $# -gt 0 ]; do
	case "$1" in
	-b|--base) [ $# -ge 2 ] || { echo "error: $1 needs a ref" >&2; exit 2; }; base="$2"; shift 2 ;;
	--fetch) fetch=1; shift ;;
	-h|--help) sed -n '2,/^set -u/p' "$0" | sed '$d; s/^# \{0,1\}//'; exit 0 ;;
	-*) echo "error: unknown option: $1" >&2; exit 2 ;;
	*) break ;;
	esac
done

repo="${1:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -z "$repo" ] && { echo "not in a git repo; pass a repo path" >&2; exit 1; }
cd "$repo" || exit 1
git rev-parse --git-dir >/dev/null 2>&1 || { echo "error: not a git repo: $repo" >&2; exit 1; }

# Main worktree is the first entry; everything else is a candidate.
main_wt=$(git worktree list --porcelain | awk '/^worktree /{print substr($0, 10); exit}')

if [ -z "$base" ]; then
	origin_head=$(git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null)
	for cand in "${origin_head#refs/remotes/}" origin/main origin/master; do
		[ -n "$cand" ] && git rev-parse --verify --quiet "refs/remotes/$cand^{commit}" >/dev/null && { base="$cand"; break; }
	done
	[ -z "$base" ] && { echo "error: no base ref (origin/HEAD, origin/main, origin/master all missing); pass -b <ref>" >&2; exit 1; }
	echo "warn: no -b given; MERGED checks against $base" >&2
fi

# The base drives the merge check. --fetch is best-effort (stale is fine for
# a first pass) and runs before the check, since -b may name a branch not
# fetched yet. The explicit refspec creates it even in a single-branch clone.
if [ -n "$fetch" ]; then
	case "$base" in
	origin/*) git fetch origin "+refs/heads/${base#origin/}:refs/remotes/$base" --quiet 2>/dev/null \
		|| echo "warn: could not fetch $base; merged column may be stale" >&2 ;;
	esac
fi
# A local branch or tag named origin/main wins git's shorthand lookup over
# refs/remotes/origin/main, so a base under a remote's name is read by its
# full name.
base_ref="$base"
while IFS= read -r name; do
	case "$base" in "$name"/*) base_ref="refs/remotes/$base" ;; esac
done < <(git remote)
git rev-parse --verify --quiet "$base_ref^{commit}" >/dev/null 2>&1 \
	|| { echo "error: base ref not found: $base; --fetch fetches an origin/* base" >&2; exit 1; }

disposable='(\.build|\.cache|\.dart_tool|\.DS_Store|\.gradle|\.lake|\.lycheecache|\.mypy_cache|\.next|\.nuxt'
disposable+='|\.parcel-cache|\.pytest_cache|\.ruff_cache|\.svelte-kit|\.tox|\.turbo|\.venv|__pycache__|build'
disposable+='|coverage|DerivedData|dist|node_modules|target|venv)'

# Branch reflogs live in the shared logs and outlive a worktree, so a rebased
# branch's old tip is not lost with it.
branch_logged=$(git rev-list --walk-reflogs --branches 2>/dev/null | awk '!seen[$0]++ { print "^" $0 }')

# GNU coreutils (Linux, Homebrew gnubin) reads `stat -f` as file system status
# and `date -r` as a file, so pick the stat and date flags once.
if stat -c %Y / >/dev/null 2>&1; then
	stat_fmt=(-c '%Y %n'); fmt_day() { date -d "@$1" '+%Y-%m-%d'; }
else
	stat_fmt=(-f '%m %N'); fmt_day() { date -r "$1" '+%Y-%m-%d'; }
fi

# PR state by branch, fetched once as [{number, state, head}] with a lowercase
# state. Origin when its CLI can read this repo's PRs, otherwise gh. Empty when
# neither can.
prs=$(mktemp)
if command -v origin >/dev/null 2>&1 \
	&& raw=$(origin pr list --author "@me" --state all --limit 1000 \
		--json number,status,headRef 2>/dev/null); then
	printf '%s' "$raw" | jq '[.[] | {number, state: .status, head: .headRef}]' > "$prs" 2>/dev/null
elif raw=$(gh pr list --author "@me" --state all --limit 1000 \
	--json number,state,headRefName 2>/dev/null); then
	printf '%s' "$raw" | jq '[.[] | {number, state: (.state | ascii_downcase), head: .headRefName}]' > "$prs" 2>/dev/null
fi
[ -s "$prs" ] || echo "[]" > "$prs"

# T3 keeps chats in threads, not files, so LAST_CHAT stays empty and the
# playbook checks each thread's worktreePath instead.
transcripts=""
now=$(date +%s)

echo "# base: $base"
printf "SIZE\tAGE\tMERGED\tDIRTY\tREMOTE\tPR\tLAST_CHAT\tBUCKET\tWORKTREE\n"

git worktree list --porcelain | awk '/^worktree /{print substr($0, 10)}' | while IFS= read -r wt; do
	[ "$wt" = "$main_wt" ] && continue

	size=$(du -sh "$wt" 2>/dev/null | awk '{print $1}')
	head=$(git -C "$wt" rev-parse HEAD 2>/dev/null)
	head_ts=$(git -C "$wt" log -1 --format='%ct' HEAD 2>/dev/null || echo 0)
	age=$([ "$head_ts" -gt 0 ] 2>/dev/null && echo "$(( (now - head_ts) / 86400 ))d" || echo "?")

	# Squash-merged branches are not ancestors of the base, so PR state is the
	# real signal; merge-base only catches fast-forward/rebase merges.
	git merge-base --is-ancestor "$head" "$base_ref" 2>/dev/null && merged=YES || merged=no

	# `git worktree remove` deletes ignored files without asking, and a .env or
	# .claude/settings.local.json may exist nowhere else. An explicit
	# --untracked-files beats a status.showUntrackedFiles=no config, which would
	# hide scratch and make --ignored fail.
	dirty=""
	if porcelain=$(git -C "$wt" status --porcelain --untracked-files=normal --ignored=matching 2>/dev/null); then
		wip=$(printf '%s\n' "$porcelain" | grep -cvE '^(\?\?|!!) |^$')
		scratch=$(printf '%s\n' "$porcelain" | grep -c '^?? ')
		ignored=$(printf '%s\n' "$porcelain" | grep '^!! ' | grep -cvE "^!! \"?(.*/)?$disposable/?\"?\$")
		[ "$wip" -gt 0 ] && dirty="wip:$wip"
		[ "$scratch" -gt 0 ] && dirty="${dirty:+$dirty,}scratch:$scratch"
		[ "$ignored" -gt 0 ] && dirty="${dirty:+$dirty,}ignored:$ignored"
	else dirty=unknown; fi

	# Removing the worktree deletes its HEAD reflog, which leaves commits only
	# HEAD or that reflog reaches for gc. --not before --stdin leaves stdin's
	# revisions as given, and --stdin stops at the first blank line.
	reflog_only=$(head_log=$(git -C "$wt" rev-list --walk-reflogs HEAD 2>/dev/null) \
		&& printf '%s\n' "$head" "$head_log" "$branch_logged" | grep . \
		| git -C "$wt" rev-list --count --not --branches --tags --remotes --stdin 2>/dev/null) || reflog_only='?'
	[ "$reflog_only" != 0 ] && dirty="${dirty:+$dirty,}reflog:$reflog_only"
	[ -z "$dirty" ] && dirty=clean

	branch=$(git -C "$wt" symbolic-ref --quiet HEAD 2>/dev/null || echo "")
	branch=${branch#refs/heads/}
	if [ -z "$branch" ]; then remote=detached
	elif git -C "$wt" show-ref --verify --quiet "refs/remotes/origin/$branch"; then
		[ "$(git -C "$wt" rev-parse "refs/remotes/origin/$branch" 2>/dev/null)" = "$head" ] \
			&& remote=pushed \
			|| remote="ahead$(git -C "$wt" rev-list --count "refs/remotes/origin/$branch..HEAD" 2>/dev/null)"
	else remote=no-remote; fi

	# PRs come newest first, so a newer closed or merged PR for the branch
	# would hide an older one that is still open. An open record wins.
	pr=$([ -n "$branch" ] && jq -r --arg b "$branch" '[.[] | select(.head==$b)]
		| (map(select(.state=="open" or .state=="draft")) + .)[0] // empty
		| "#\(.number)/\(.state)"' "$prs" 2>/dev/null)
	[ -z "$pr" ] && pr="-"

	# Most recent chat whose transcript operated in this worktree. Match path
	# followed by "/" or a quote so glint-482 does not match glint-482-r37.
	last="-"; last_ts=0
	if [ -d "$transcripts" ]; then
		f=$(rg -l -e "${wt}/" -e "${wt}\"" "$transcripts" 2>/dev/null \
			| xargs stat "${stat_fmt[@]}" 2>/dev/null | sort -rn | head -1)
		if [ -n "$f" ]; then last_ts=$(echo "$f" | awk '{print $1}')
			last=$(fmt_day "$last_ts" 2>/dev/null); fi
	fi
	recent=$([ "$last_ts" -gt 0 ] 2>/dev/null && [ $(( (now - last_ts) / 86400 )) -le 4 ] && echo yes || echo no)

	case "$dirty" in wip:*|unknown*) bucket=hold-wip ;; scratch:*) bucket=hold-scratch ;;
	*reflog:*) bucket=hold-reflog ;; *ignored:*) bucket=hold-ignored ;; *)
		case "$pr" in */open|*/draft) bucket=hold-open-pr ;; *)
			if [ "$recent" = yes ]; then bucket=verify-recent-chat
			elif [ "$merged" = YES ] || [ "$pr" != "-" ]; then bucket=safe
			else bucket=review; fi ;;
		esac ;;
	esac

	printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
		"$size" "$age" "$merged" "$dirty" "$remote" "$pr" "$last" "$bucket" "$wt"
done | sort -t$'\t' -k1,1 -rh

rm -f "$prs"
