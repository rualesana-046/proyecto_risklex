#!/bin/sh
set -u
failed=0
CI_FILE=".github/workflows/ci.yml"
PRIVATE_PATTERNS=".claude/hygiene-private-patterns.txt"
REAL_BACKEND_EXPRESSION="inputs.backend == 'real' && secrets.RISKLEX_API_URL || ''"
SECRET_PATTERN='sk-ant-|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|ANTHROPIC_API_KEY *= *[^ ]|x-api-key: *[A-Za-z0-9]'
WORKERS_PATTERN='[A-Za-z0-9-]+\.[A-Za-z0-9-]+\.workers\.dev'
EXAMPLE_WORKERS='example-api\.example-account\.workers\.dev'
LOCAL_PATH_PATTERN='/Users/[^/ ]+/|/private/tmp/|/home/[a-z][^/ ]*/|C:\\\\Users\\\\'
EMAIL_PATTERN='[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}'
TRAILER_PATTERN='co-authored-by|signed-off-by|generated with|claude|anthropic\.com|session_[A-Za-z0-9]|copilot|codex'
SCHEDULE_PATTERN='plazo|fecha l[ií]mite|urgen|profesor|evaluador|calificaci|r[uú]brica|deadline|due date|grader|teacher'

result() {
  if [ "$2" -eq 0 ]; then
    echo "OK    $1"
  else
    echo "FALLO $1"
    failed=1
  fi
}

count_lines() {
  if [ -z "$1" ]; then echo 0; else printf '%s\n' "$1" | wc -l | tr -d ' '; fi
}

show_files() {
  [ -n "$1" ] && printf '%s\n' "$1" | sed 's/^/      /'
}

history_paths() {
  revisions=$(git rev-list --all)
  [ -z "$revisions" ] && return 0
  git grep -I -o -E "$1" $revisions -- . ':(exclude)tooling/hygiene' ':(exclude)**/package-lock.json' \
    ':(exclude)package-lock.json' ':(exclude)**/THIRD-PARTY-NOTICES.txt' 2>/dev/null |
    grep -viE "${2:-^$}" | cut -d: -f2 | sort -u
}

private_paths() {
  [ -f "$PRIVATE_PATTERNS" ] || return 0
  revisions=$(git rev-list --all)
  [ -z "$revisions" ] && return 0
  git grep -I -l -i -E -f "$PRIVATE_PATTERNS" $revisions -- . ':(exclude)tooling/hygiene' \
    ':(exclude)**/package-lock.json' ':(exclude)package-lock.json' \
    ':(exclude)**/THIRD-PARTY-NOTICES.txt' 2>/dev/null | cut -d: -f2 | sort -u
}

check_history() {
  label="$1"; paths="$2"; n=$(count_lines "$paths")
  result "$label en el historial ($n archivos)" "$n"
  show_files "$paths"
}

commits_matching() {
  n=0
  for commit in $(git rev-list "$1"); do
    if git log -1 --format=%B "$commit" | grep -qiE "$2"; then n=$((n + 1)); fi
  done
  echo "$n"
}

push_range() {
  if [ -n "${1:-}" ]; then echo "$1"; return; fi
  upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null)
  if [ -n "$upstream" ]; then echo "$upstream..HEAD"; else echo HEAD; fi
}

check_ci() {
  if [ ! -f "$CI_FILE" ]; then
    result "$CI_FILE existe" 1
    return
  fi
  result "ci.yml sin vars. ($(grep -c 'vars\.' "$CI_FILE") líneas)" "$(grep -c 'vars\.' "$CI_FILE")"
  result "ci.yml sin --no-sandbox ($(grep -c -- '--no-sandbox' "$CI_FILE") líneas)" "$(grep -c -- '--no-sandbox' "$CI_FILE")"
  tagged=$(grep -E '^[[:space:]-]*uses:' "$CI_FILE" | grep -cvE '@[0-9a-f]{40}[[:space:]]*$')
  result "ci.yml con acciones fijadas por hash ($tagged por etiqueta)" "$tagged"
  outside=$(grep 'RISKLEX_API_URL' "$CI_FILE" | grep -v 'MAIN_VITE_RISKLEX_API_URL' | grep -cvF "$REAL_BACKEND_EXPRESSION")
  result "ci.yml con RISKLEX_API_URL solo en la expresión de backend real ($outside fuera)" "$outside"
}

dirty=$(count_lines "$(git status --porcelain)")
result "árbol de trabajo limpio ($dirty cambios)" "$dirty"

identities=$(git log --format='%an%x09%ae%n%cn%x09%ce' | sort -u | grep -c .)
[ "$identities" -eq 1 ]
result "un único autor ($identities identidades)" "$?"

trailers=$(commits_matching --all "$TRAILER_PATTERN")
result "mensajes sin coautorías, sesiones ni herramientas ($trailers commits)" "$trailers"

check_history "claves" "$(history_paths "$SECRET_PATTERN")"
check_history "direcciones reales de Workers" "$(history_paths "$WORKERS_PATTERN" "$EXAMPLE_WORKERS")"
check_history "rutas locales" "$(history_paths "$LOCAL_PATH_PATTERN")"
check_history "correos" "$(history_paths "$EMAIL_PATTERN")"
check_history "identificadores privados" "$(private_paths)"

range=$(push_range "${1:-}")
schedule_commits=$(commits_matching "$range" "$SCHEDULE_PATTERN")
schedule_files=$(git log -p --format= "$range" -- . ':(exclude)tooling/hygiene' 2>/dev/null |
  awk '/^\+\+\+ b\//{file=substr($0,7)} /^\+[^+]/{print file "\t" $0}' |
  grep -iE "$SCHEDULE_PATTERN" | cut -f1 | sort -u)
n=$((schedule_commits + $(count_lines "$schedule_files")))
result "commits por subir sin plazos ni evaluadores ($schedule_commits mensajes, $(count_lines "$schedule_files") archivos)" "$n"
show_files "$schedule_files"

check_ci

if [ "$failed" -eq 0 ]; then
  echo "PRE-PUSH OK"
else
  echo "PRE-PUSH FALLO"
  exit 1
fi
