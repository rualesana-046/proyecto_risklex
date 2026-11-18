#!/bin/sh
set -u
here=$(cd "$(dirname "$0")" && pwd)
message="$1"
shift
if [ "$#" -gt 6 ]; then
  echo "ABORT: more than 6 files"
  exit 1
fi
case "$message" in
  *"("*")"*)
    echo "ABORT: plan numbers in message"
    exit 1
    ;;
esac
"$here/validate-gate.sh" || { echo "ABORT: validate failed, no commit"; exit 1; }
git add -- "$@" || { echo "ABORT: git add failed"; exit 1; }
unexpected=$(git status --porcelain | grep -v '^[AMRD] ')
if [ -n "$unexpected" ]; then
  echo "ABORT: files outside the commit:"
  echo "$unexpected"
  git reset -q
  exit 1
fi
git status --short
"$here/hygiene.sh" || { echo "ABORT: hygiene failed, no commit"; git reset -q; exit 1; }
git commit -q -m "$message" || { echo "ABORT: commit failed"; exit 1; }
git log --oneline -1
