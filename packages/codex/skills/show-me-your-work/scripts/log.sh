#!/usr/bin/env bash
# Append one safe row to an Oh My Stack decision log.
# Usage: log.sh <logfile> <phase> <decision> <why> <evidence> <result>
set -euo pipefail

if [ "$#" -ne 6 ]; then
	printf 'usage: log.sh <logfile> <phase> <decision> <why> <evidence> <result>\n' >&2
	exit 1
fi

logfile="$1"
shift

if [ -L "$logfile" ]; then
	printf 'refusing to append through a symbolic link: %s\n' "$logfile" >&2
	exit 1
fi

logdir="$(dirname "$logfile")"
if [ -n "$logdir" ] && [ "$logdir" != "." ] && [ ! -d "$logdir" ]; then
	mkdir -p "$logdir"
fi

header='ts	phase	decision	why	evidence	result'
if [ ! -f "$logfile" ]; then
	printf '%b\n' "$header" > "$logfile"
else
	IFS= read -r first_line < "$logfile" || true
	if [ "$first_line" != "$(printf '%b' "$header")" ]; then
		printf 'refusing to append to a file with an unexpected header: %s\n' "$logfile" >&2
		exit 1
	fi
fi

clean() {
	local value probe
	value=$(printf '%s' "$1" | tr '\t\n\r' '   ')
	probe="$value"
	while [ "${probe# }" != "$probe" ]; do
		probe=${probe# }
	done
	case "$probe" in
		=*|+*|-*|@*) printf "'%s" "$value" ;;
		*) printf '%s' "$value" ;;
	esac
}

timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
	"$timestamp" "$(clean "$1")" "$(clean "$2")" "$(clean "$3")" "$(clean "$4")" "$(clean "$5")" \
	>> "$logfile"
