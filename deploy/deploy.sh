#!/usr/bin/env bash
# Runs on the VM as root: ./deploy.sh <git-sha> <backend.tgz>
# Blue/green: build new image, start it beside the live one, switch Caddy only after it is healthy.
set -euo pipefail

SHA="${1:?git sha}"; TGZ="${2:?tarball}"
[[ "$SHA" =~ ^[0-9a-f]{12,40}$ ]] || { echo "bad sha: $SHA" >&2; exit 2; }
APP=/opt/app; NET=app_default
NEW="api-${SHA:0:12}"; IMG="unspoken-api:${SHA:0:12}"
OLD="$(cat "$APP/current")"

mkdir -p "$APP/src/$SHA" && tar xzf "$TGZ" -C "$APP/src/$SHA" 2>/dev/null
docker build -q -t "$IMG" "$APP/src/$SHA"

docker rm -f "$NEW" >/dev/null 2>&1 || true
docker run -d --name "$NEW" --network "$NET" --restart always --env-file "$APP/app.env" "$IMG" >/dev/null

fail() { echo "DEPLOY FAILED: $1" >&2; docker logs --tail 30 "$NEW" >&2 || true; docker rm -f "$NEW" >/dev/null 2>&1 || true; exit 1; }

# Stable = 5 consecutive healthy checks, 2s apart, within 60s.
ok=0
for _ in $(seq 1 30); do
  if docker exec "$NEW" python -c "import urllib.request,json,sys; sys.exit(0 if json.load(urllib.request.urlopen('http://localhost:8080/api/v1/health',timeout=3)).get('status')=='ok' else 1)" 2>/dev/null; then
    ok=$((ok+1)); [ "$ok" -ge 5 ] && break
  else ok=0; fi
  sleep 2
done
[ "$ok" -ge 5 ] || fail "new container never became healthy; $OLD still serving"

# Switch: rewrite in place (keeps the bind-mounted inode), then graceful reload.
point_caddy() {
  cat > "$APP/Caddyfile" <<C
34-58-192-9.nip.io {
	reverse_proxy $1:8080
}
C
  docker exec app-caddy-1 caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1
}
point_caddy "$NEW"
# Verify end to end through Caddy (public cert); roll Caddy back if it fails.
sleep 2
curl -fsS --retry 5 --retry-delay 2 --retry-all-errors https://34-58-192-9.nip.io/api/v1/health >/dev/null \
  || { point_caddy "$OLD"; fail "not healthy through Caddy; rolled back to $OLD"; }
echo "$NEW" > "$APP/current"
[ "$OLD" != "$NEW" ] && docker rm -f "$OLD" >/dev/null 2>&1 || true

# Keep last 3 images and source dirs for rollback.
docker images unspoken-api --format '{{.ID}}' | tail -n +4 | xargs -r docker rmi -f >/dev/null 2>&1 || true
ls -dt "$APP"/src/*/ | tail -n +4 | xargs -r rm -rf
echo "DEPLOYED $NEW (replaced $OLD)"
