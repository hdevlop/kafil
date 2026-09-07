#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

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
for required in compose.production.yml deploy/Caddyfile scripts/verifyVpsDeployment.sh scripts/verifySecurityHeaders.sh release.sha256; do
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
previous_release=""
if [[ -L /opt/kafil/current ]]; then
  previous_release="$(readlink -f /opt/kafil/current)"
fi

  "${compose[@]}" pull app migrate notifications-worker
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

# Permissions are code-managed data, not schema. Reconcile them from the same
# candidate image after migrations and before replacing the running app. Keep
# the seed's value-bearing output in a protected log rather than deployment
# stdout; seed:admin performs its own exact role/permission verification.
auth_seed_log="${state_dir}/auth-seed-${git_sha}.log"
if ! "${compose[@]}" --profile tools run --rm --no-deps app \
  bun run seed:admin >"${auth_seed_log}" 2>&1; then
  echo "Auth seed reconciliation failed; the running application was not replaced." >&2
  exit 7
fi
echo "Auth seed reconciliation passed."

  ln -sfn "${release_dir}" /opt/kafil/current
  # The web app and the notification worker must run the same immutable image
  # revision. The worker is a non-HTTP process in the same image, so it is
  # replaced atomically with the app; never leave the previous worker draining
  # new-schema jobs or the new worker reading old code.
  "${compose[@]}" up -d --no-deps app notifications-worker

  rollback() {
    echo "Readiness failed; restoring the previous application image." >&2
    if [[ -z "${previous_image}" || -z "${previous_release}" || ! -d "${previous_release}" ]]; then
      echo "No previous application candidate is available." >&2
      return 1
    fi
    # A pre-Phase-E release has no notifications-worker service. Stop the
    # failed candidate worker first, then restore every service the previous
    # Compose definition actually owns.
    "${compose[@]}" stop notifications-worker || true
    export KAFIL_IMAGE="${previous_image}"
    local previous_compose=(docker compose --env-file "${infra_env}" -f "${previous_release}/compose.production.yml")
    local previous_services=(app)
    if "${previous_compose[@]}" config --services | grep -qx 'notifications-worker'; then
      previous_services+=(notifications-worker)
    fi
    "${previous_compose[@]}" up -d --no-deps "${previous_services[@]}"
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

# The application image is live, but the browser security headers are owned by
# the edge proxy rather than this release. Verify the public origin so a missing
# or reverted edge middleware fails the deployment instead of passing silently.
if [[ -z "${KAFIL_HOSTNAME:-}" ]]; then
  echo "KAFIL_HOSTNAME is unset; the public security headers cannot be verified." >&2
  exit 8
fi
security_headers=passed
if ! bash "${release_dir}/scripts/verifySecurityHeaders.sh" "https://${KAFIL_HOSTNAME}"; then
  security_headers=failed
fi

app_id="$("${compose[@]}" ps -q app)"
running_image="$(docker inspect --format '{{.Config.Image}}' "${app_id}")"
worker_id="$("${compose[@]}" ps -q notifications-worker)"
if [[ -z "${worker_id}" ]]; then
  echo "Notifications worker is not running after deploy; app and worker must share the same revision." >&2
  exit 6
fi
worker_image="$(docker inspect --format '{{.Config.Image}}' "${worker_id}")"
if [[ "${worker_image}" != "${running_image}" ]]; then
  echo "Application image ${running_image} does not match worker image ${worker_image}; both must run the same revision." >&2
  exit 6
fi
running_image_id="$(docker inspect --format '{{.Image}}' "${app_id}")"
worker_image_id="$(docker inspect --format '{{.Image}}' "${worker_id}")"
if [[ "${worker_image_id}" != "${running_image_id}" ]]; then
  echo "Application and notification worker tags match but their image content differs." >&2
  exit 6
fi
running_digest="$(docker image inspect "${running_image_id}" --format '{{index .RepoDigests 0}}' | sed 's/^.*@//')"
running_revision="$(docker image inspect "${running_image_id}" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')"
if [[ "${running_revision}" != "${git_sha}" ]]; then
  echo "Running image revision label does not match the requested Git SHA." >&2
  exit 6
fi
if [[ "${running_digest}" != "${expected_digest}" ]]; then
  echo "Running image digest does not match the verified release digest." >&2
  exit 6
fi
record="${state_dir}/deployment-${git_sha}.txt"
{
  printf 'deployed_at=%s\n' "$(date -u +%FT%TZ)"
  printf 'git_sha=%s\n' "${git_sha}"
  printf 'image=%s\n' "${running_image}"
  printf 'image_digest=%s\n' "${running_digest}"
  printf 'worker_image=%s\n' "${worker_image}"
  printf 'image_id=%s\n' "${running_image_id}"
  printf 'image_revision=%s\n' "${running_revision}"
  printf 'migration_log_sha256=%s\n' "$(sha256sum "${migration_log}" | cut -d' ' -f1)"
  printf 'auth_seed_log_sha256=%s\n' "$(sha256sum "${auth_seed_log}" | cut -d' ' -f1)"
  printf 'health=passed\n'
  printf 'security_headers=%s\n' "${security_headers}"
  printf 'rollback_image=%s\n' "${previous_image:-none}"
  printf 'rollback_release=%s\n' "${previous_release:-none}"
} >"${record}"
if [[ "${security_headers}" != passed ]]; then
  echo "Deployment ${git_sha} is live but the public security headers are non-compliant." >&2
  echo "The application image was not rolled back; edge header policy is owned by the proxy, not this release." >&2
  echo "Reattach the kafil-security middleware to the Kafil HTTPS router, then rerun:" >&2
  echo "  bash scripts/verifySecurityHeaders.sh https://${KAFIL_HOSTNAME}" >&2
  exit 8
fi
ln -sfn "${record}" "${state_dir}/last-successful.txt"
printf 'Deployment %s passed with digest %s.\n' "${git_sha}" "${running_digest}"
