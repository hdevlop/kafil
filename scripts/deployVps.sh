#!/usr/bin/env bash
set -Eeuo pipefail

readonly git_sha="${1:-}"
readonly release_dir="${2:-/opt/kafil/releases/${git_sha}}"
readonly expected_digest="${3:-}"
readonly infra_env="${KAFIL_INFRA_ENV:-/opt/kafil/env/infrastructure.env}"
readonly state_dir="${KAFIL_STATE_DIR:-/opt/kafil/state}"
readonly lock_file="${KAFIL_DEPLOY_LOCK:-/opt/kafil/deploy.lock}"

if [[ ! "${git_sha}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Expected a full lowercase 40-character Git SHA." >&2
  exit 2
fi
if [[ ! "${expected_digest}" =~ ^sha256:[0-9a-f]{64}$ ]]; then
  echo "Expected a sha256 image digest." >&2
  exit 2
fi
for required in compose.production.yml deploy/Caddyfile scripts/verifyVpsDeployment.sh release.sha256; do
  if [[ ! -f "${release_dir}/${required}" ]]; then
    echo "Missing release file: ${release_dir}/${required}" >&2
    exit 2
  fi
done
if [[ ! -r "${infra_env}" ]]; then
  echo "Infrastructure environment is not readable: ${infra_env}" >&2
  exit 2
fi

exec 9>"${lock_file}"
if ! flock -n 9; then
  echo "Another Kafil deployment is running." >&2
  exit 3
fi

(cd "${release_dir}" && sha256sum --check --strict release.sha256)

set -a
# shellcheck disable=SC1090 -- the protected deployment environment is the contract.
source "${infra_env}"
set +a

export KAFIL_IMAGE="ghcr.io/hdevlop/kafil:sha-${git_sha}"
compose=(docker compose --env-file "${infra_env}" -f "${release_dir}/compose.production.yml")

"${compose[@]}" config --quiet
"${compose[@]}" --profile edge run --rm --no-deps caddy \
  caddy validate --config /etc/caddy/Caddyfile

app_id="$("${compose[@]}" ps -q app 2>/dev/null || true)"
previous_image=""
if [[ -n "${app_id}" ]]; then
  previous_image="$(docker inspect --format '{{.Config.Image}}' "${app_id}")"
fi
previous_release="$(readlink -f /opt/kafil/current 2>/dev/null || true)"

"${compose[@]}" pull app migrate
pulled_digest="$(docker image inspect "${KAFIL_IMAGE}" --format '{{index .RepoDigests 0}}' | sed 's/^.*@//')"
if [[ "${pulled_digest}" != "${expected_digest}" ]]; then
  echo "Pulled digest ${pulled_digest} does not match expected ${expected_digest}." >&2
  exit 4
fi

mkdir -p "${state_dir}"
migration_log="${state_dir}/migration-${git_sha}.log"
if ! "${compose[@]}" --profile tools run --rm migrate 2>&1 | tee "${migration_log}"; then
  echo "Migration failed; the running application was not replaced." >&2
  exit 5
fi

ln -sfn "${release_dir}" /opt/kafil/current
"${compose[@]}" up -d --no-deps app

rollback() {
  echo "Readiness failed; restoring the previous application image." >&2
  if [[ -z "${previous_image}" || -z "${previous_release}" || ! -d "${previous_release}" ]]; then
    echo "No previous application candidate is available." >&2
    return 1
  fi
  export KAFIL_IMAGE="${previous_image}"
  local previous_compose=(docker compose --env-file "${infra_env}" -f "${previous_release}/compose.production.yml")
  "${previous_compose[@]}" up -d --no-deps app
  ln -sfn "${previous_release}" /opt/kafil/current
  KAFIL_INFRA_ENV="${infra_env}" "${previous_release}/scripts/verifyVpsDeployment.sh"
}

healthy=false
for _ in {1..24}; do
  if KAFIL_INFRA_ENV="${infra_env}" "${release_dir}/scripts/verifyVpsDeployment.sh"; then
    healthy=true
    break
  fi
  sleep 5
done
if [[ "${healthy}" != true ]]; then
  rollback || true
  exit 6
fi

app_id="$("${compose[@]}" ps -q app)"
running_image="$(docker inspect --format '{{.Config.Image}}' "${app_id}")"
running_digest="$(docker image inspect "${running_image}" --format '{{index .RepoDigests 0}}' | sed 's/^.*@//')"
record="${state_dir}/deployment-${git_sha}.txt"
{
  printf 'deployed_at=%s\n' "$(date -u +%FT%TZ)"
  printf 'git_sha=%s\n' "${git_sha}"
  printf 'image=%s\n' "${running_image}"
  printf 'image_digest=%s\n' "${running_digest}"
  printf 'migration_log_sha256=%s\n' "$(sha256sum "${migration_log}" | cut -d' ' -f1)"
  printf 'health=passed\n'
  printf 'rollback_image=%s\n' "${previous_image:-none}"
  printf 'rollback_release=%s\n' "${previous_release:-none}"
} >"${record}"
ln -sfn "${record}" "${state_dir}/last-successful.txt"
printf 'Deployment %s passed with digest %s.\n' "${git_sha}" "${running_digest}"
