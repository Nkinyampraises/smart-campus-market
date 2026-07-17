#!/usr/bin/env bash
set -euo pipefail

production_repository=https://github.com/Nkinyampraises/smart-campus-market.git
production_target=/home/azureuser/campusmarket
production_env=/srv/campustrade/shared/backend.env
test_mode="${ALLOW_TEST_TARGET:-false}"

if [[ "$test_mode" == true ]]; then
  repository="${REPOSITORY:-$production_repository}"
  branch="${BRANCH:-main}"
  target="${TARGET:-}"
  canonical_env="${CANONICAL_ENV:-}"
else
  repository="$production_repository"
  branch=main
  target="$production_target"
  canonical_env="$production_env"
fi

[[ "$branch" =~ ^[A-Za-z0-9._/-]+$ && "$branch" != -* ]] || {
  echo "Refusing invalid Git branch: $branch" >&2
  exit 1
}

resolved_target="$(readlink -m -- "$target")"
if [[ "$test_mode" == true ]]; then
  [[ "$resolved_target" == /tmp/* ]] || {
    echo "Refusing non-temporary test target: $resolved_target" >&2
    exit 1
  }
elif [[ "$resolved_target" != "$production_target" ]]; then
  echo "Refusing to synchronize unexpected target: $resolved_target" >&2
  exit 1
fi
target="$resolved_target"

resolved_canonical_env="$(readlink -m -- "$canonical_env")"
if [[ "$test_mode" == true ]]; then
  [[ "$resolved_canonical_env" == /tmp/* ]] || {
    echo "Refusing non-temporary test environment: $resolved_canonical_env" >&2
    exit 1
  }
elif [[ "$resolved_canonical_env" != "$production_env" ]]; then
  echo "Refusing unexpected production environment: $resolved_canonical_env" >&2
  exit 1
fi
canonical_env="$resolved_canonical_env"

[[ -f "$canonical_env" ]] || {
  echo "Missing canonical environment: $canonical_env" >&2
  exit 1
}
command -v git >/dev/null
command -v rsync >/dev/null

work_dir="$(mktemp -d /tmp/campustrade-source-sync.XXXXXX)"
cleanup() {
  if [[ "$work_dir" == /tmp/campustrade-source-sync.* && -d "$work_dir" ]]; then
    rm -rf --one-file-system -- "$work_dir"
  fi
}
trap cleanup EXIT

git clone --quiet --single-branch --branch "$branch" -- \
  "$repository" "$work_dir/repo"
source_dir="$work_dir/repo/campusmarket"

for required_file in \
  Jenkinsfile \
  ansible/playbooks/provision-vps.yml \
  ansible/playbooks/deploy-platform.yml \
  backend/docker-compose.prod.yml
do
  [[ -f "$source_dir/$required_file" ]] || {
    echo "Reviewed source is missing $required_file" >&2
    exit 1
  }
done

source_commit="$(git -C "$work_dir/repo" rev-parse --short=12 HEAD)"
[[ "$source_commit" =~ ^[0-9a-f]{12}$ ]] || {
  echo 'Git did not return a valid 12-character source commit.' >&2
  exit 1
}

rsync -a --delete \
  --exclude=backend/.env \
  --exclude=node_modules \
  --exclude=coverage \
  --exclude=dist \
  "$source_dir/" "$target/"

ln -sfnT -- "$canonical_env" "$target/backend/.env"
[[ "$(readlink -f "$target/backend/.env")" == "$canonical_env" ]] || {
  echo 'Source environment does not resolve to the canonical environment.' >&2
  exit 1
}
printf '%s\n' "$source_commit" >"$target/.source-commit"
chmod 0644 "$target/.source-commit"
echo "Synchronized Git source commit $source_commit from branch $branch."
