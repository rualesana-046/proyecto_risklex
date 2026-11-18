#!/bin/sh
set -u
log=$(mktemp)
rm -f apps/backend/worker-configuration.d.ts
if ! npm run validate > "$log" 2>&1; then
  grep -E 'error|✖|FAIL|×|\[warn\]' "$log" | head -20
  echo "VALIDATE FAILED"
  rm -f "$log"
  exit 1
fi
grep -E 'Test Files|Tests ' "$log"
rm -f "$log"
echo "VALIDATE OK"
