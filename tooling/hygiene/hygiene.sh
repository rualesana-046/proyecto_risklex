#!/bin/sh
set -u
bad=0
SELF=':(exclude)tooling/hygiene'
NOTICES=':(exclude)apps/frontend/THIRD-PARTY-NOTICES.txt'
PRIVATE_PATTERNS=".claude/hygiene-private-patterns.txt"

check_names() {
  for f in $1; do
    case "$f" in
      *.env.example) ;;
      *.env|*.env.*|*dev.vars*|*worker-configuration.d.ts|*.live-results*|*.DS_Store|*node_modules/*|*release/*|*/out/*|*.dmg|*.asar)
        echo "  FORBIDDEN FILE: $f"; bad=1 ;;
    esac
  done
}

report() {
  if [ -n "$2" ]; then
    echo "  $1"
    echo "$2"
    bad=1
  fi
}

scan() {
  label="$1"; text="$2"; code="$3"
  report "[$label] SECRET-LIKE:" "$(printf '%s\n' "$text" | grep -nE 'sk-ant-|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|ANTHROPIC_API_KEY *= *[^ ]|x-api-key: *[A-Za-z0-9]')"
  report "[$label] REAL WORKERS URL:" "$(printf '%s\n' "$text" | grep -nE '[A-Za-z0-9-]+\.[A-Za-z0-9-]+\.workers\.dev' | grep -v 'example-api\.example-account\.workers\.dev')"
  report "[$label] LOCAL PATH:" "$(printf '%s\n' "$text" | grep -nE '/Users/[^/ ]+/|/private/tmp/|/home/[a-z][^/ ]*/|C:\\\\Users\\\\')"
  if [ -f "$PRIVATE_PATTERNS" ]; then
    report "[$label] PRIVATE NAME:" "$(printf '%s\n' "$text" | grep -niE -f "$PRIVATE_PATTERNS")"
  fi
  report "[$label] EMAIL-LIKE:" "$(printf '%s\n' "$text" | grep -nE '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}' | grep -vE '@(risklex|testing-library|types|vitejs|fontsource|eslint|tailwindcss|rolldown|swc|babel|cloudflare|quick-start|electron|napi-rs)/' | grep -v '"deprecated": ')"
  report "[$label] TOOL MENTION:" "$(printf '%s\n' "$text" | grep -niE 'co-authored-by|generated with|claude code|anthropic\.com/claude')"
  if [ "$code" = yes ]; then
    report "[$label] COMMENT OR PENDING MARK:" "$(printf '%s\n' "$text" | grep -nE '(^\+[[:space:]]*//|^\+[[:space:]]*/\*|^\+.*[[:space:]]/\*[[:space:]]|TODO|FIXME|XXX)')"
  fi
}

added_lines() {
  grep '^+' | grep -v '^+++'
}

if [ "${1:-}" = "--range" ]; then
  for c in $(git rev-list --reverse "$2"); do
    short=$(git rev-parse --short "$c")
    echo "commit $short $(git log -1 --format=%s "$c")"
    check_names "$(git diff-tree --no-commit-id --name-only -r "$c")"
    scan "$short message" "$(git log -1 --format=%B "$c")" no
    scan "$short diff" "$(git show --format= -U0 "$c" -- . "$SELF" "$NOTICES" | added_lines)" yes
  done
else
  check_names "$(git diff --cached --name-only)"
  scan staged "$(git diff --cached -U0 -- . "$SELF" "$NOTICES" | added_lines)" yes
fi

if [ $bad -eq 0 ]; then
  echo "HYGIENE OK"
else
  echo "HYGIENE FAIL"
  exit 1
fi
