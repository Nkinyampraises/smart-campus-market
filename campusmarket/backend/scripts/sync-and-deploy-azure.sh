#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-feat/production-hardening-release-gate}"
TARGET="${2:-/home/azureuser/campusmarket}"
REPOSITORY="https://github.com/Nkinyampraises/smart-campus-market.git"

if [[ "$TARGET" != "/home/azureuser/campusmarket" ]]; then
  echo "Refusing to synchronize unexpected target: $TARGET" >&2
  exit 1
fi

test -f "$TARGET/backend/.env"

release_dir="$(mktemp -d /tmp/campustrade-release.XXXXXX)"
cleanup() {
  if [[ "$release_dir" == /tmp/campustrade-release.* && -d "$release_dir" ]]; then
    rm -rf -- "$release_dir"
  fi
}
trap cleanup EXIT

git clone --quiet --single-branch --branch "$BRANCH" "$REPOSITORY" \
  "$release_dir/repo"
test -f "$release_dir/repo/campusmarket/Jenkinsfile"

rsync -a --delete --exclude 'backend/.env' \
  "$release_dir/repo/campusmarket/" "$TARGET/"

cd "$TARGET"
echo "Deploying Git commit $(git -C "$release_dir/repo" rev-parse --short HEAD)"

compose=(
  docker compose
  -p campusmarket
  --env-file backend/.env
  -f backend/docker-compose.prod.yml
)

"${compose[@]}" up -d --build --remove-orphans
"${compose[@]}" exec -T postgres \
  sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < backend/init.sql

backend/scripts/smoke-test-running.sh
