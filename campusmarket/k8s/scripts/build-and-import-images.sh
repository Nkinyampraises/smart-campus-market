#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root_dir"

env_file="${ENV_FILE:-backend/.env}"
image_tag="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date -u +%Y%m%d%H%M%S)}"
project_name="${SOURCE_PROJECT:-campustrade-build}"
services=(frontend api-gateway auth-service user-service listing-service chat-service admin-service ai-service search-service notification-service)

[[ -f "$env_file" ]] || { echo "Missing protected environment file: $env_file" >&2; exit 1; }
command -v docker >/dev/null
command -v k3s >/dev/null

if [[ "${SKIP_BUILD:-false}" != "true" ]]; then
  docker compose -p "$project_name" --env-file "$env_file" \
    -f backend/docker-compose.prod.yml build --pull "${services[@]}"
fi

images=()
for service in "${services[@]}"; do
  source_image="${project_name}-${service}:latest"
  target_image="campustrade/${service}:${image_tag}"
  docker image inspect "$source_image" >/dev/null
  docker tag "$source_image" "$target_image"
  images+=("$target_image")
done

docker save "${images[@]}" | sudo k3s ctr images import -
printf 'Imported %s application images with tag %s into K3s.\n' "${#images[@]}" "$image_tag"
