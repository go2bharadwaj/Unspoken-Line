#!/usr/bin/env bash
# Usage: smoke_frontend.sh <base-url>  -- fails unless the deployed SPA is actually servable.
set -euo pipefail
URL="${1:?base url}"; URL="${URL%/}"
html="$(curl -fsS --retry 5 --retry-delay 3 --retry-all-errors "$URL/")"
grep -q 'id="root"' <<<"$html" || { echo "index.html has no #root" >&2; exit 1; }
assets="$(grep -oE '/assets/[^"]+\.(js|css)' <<<"$html" | sort -u)"
[ -n "$assets" ] || { echo "index.html references no assets" >&2; exit 1; }
for a in $assets /sw.js /manifest.json; do
  curl -fsS -o /dev/null --retry 3 --retry-delay 2 "$URL$a" || { echo "missing $a" >&2; exit 1; }
done
echo "smoke ok: $URL ($(wc -w <<<"$assets") assets)"
