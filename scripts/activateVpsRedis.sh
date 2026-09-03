#!/usr/bin/env bash
#
# Activate the required Redis rate-limit store on an existing Kafil VPS.
#
# This is a one-time migration for installations created before Redis became a
# production dependency. It is value-preserving and never prints a secret: the
# Redis URL is derived from the password already present in the protected
# infrastructure contract and appended to the application contract in place.
#
# Order matters. Redis must be healthy and answering PING before the
# application is recreated, or the app would come up against a store it cannot
# reach and fail closed on every throttled route.
#
set -Eeuo pipefail

readonly infra_env="${KAFIL_INFRA_ENV:-/opt/kafil/env/infrastructure.env}"
readonly app_env="${KAFIL_APP_ENV:-/opt/kafil/env/app.env}"
readonly release_dir="${KAFIL_RELEASE_DIR:-/opt/kafil/current}"
readonly compose_file="${release_dir}/compose.production.yml"
readonly stamp="$(date -u +%Y%m%dT%H%M%SZ)"

for required in "${infra_env}" "${app_env}" "${compose_file}"; do
  if [[ ! -r "${required}" ]]; then
    echo "Required file is not readable: ${required}" >&2
    exit 2
  fi
done

# Back up both protected contracts before touching either one.
readonly infra_backup="${infra_env}.bak-${stamp}"
readonly app_backup="${app_env}.bak-${stamp}"
umask 077
cp -p "${infra_env}" "${infra_backup}"
cp -p "${app_env}" "${app_backup}"
printf 'Backed up environment contracts with suffix .bak-%s\n' "${stamp}"

restore() {
  echo "Activation failed; restoring the previous environment contracts." >&2
  cp -p "${infra_backup}" "${infra_env}"
  cp -p "${app_backup}" "${app_env}"
}
trap restore ERR

set -a
# shellcheck disable=SC1090 -- the protected deployment environment is the contract.
source "${infra_env}"
set +a

if [[ -z "${REDIS_PASSWORD:-}" ]]; then
  echo "REDIS_PASSWORD is absent from the infrastructure contract; nothing to derive." >&2
  exit 3
fi

# Append the URL only when it is genuinely missing, so a rerun is a no-op
# rather than a duplicate key with a stale password.
if grep -q '^REDIS_URL=' "${app_env}"; then
  printf 'REDIS_URL is already present; leaving the application contract unchanged.\n'
else
  printf 'REDIS_URL=redis://:%s@redis:6379/0\n' "${REDIS_PASSWORD}" >>"${app_env}"
  printf 'Added REDIS_URL to the application contract.\n'
fi

if grep -q '^KAFIL_TRUSTED_PROXY_HOPS=' "${app_env}"; then
  printf 'KAFIL_TRUSTED_PROXY_HOPS is already present; leaving it unchanged.\n'
else
  # One known proxy: the edge terminates TLS and is the only ingress.
  printf 'KAFIL_TRUSTED_PROXY_HOPS=1\n' >>"${app_env}"
  printf 'Added KAFIL_TRUSTED_PROXY_HOPS to the application contract.\n'
fi

chmod 0600 "${infra_env}" "${app_env}"

compose=(docker compose --env-file "${infra_env}" -f "${compose_file}")

"${compose[@]}" config --quiet
printf 'Compose definition validated.\n'

# Bring Redis up alone and prove it answers before the app depends on it.
"${compose[@]}" up -d --no-deps redis

redis_ready=false
for _ in {1..30}; do
  if "${compose[@]}" exec -T redis \
    sh -ec 'redis-cli -a "$REDIS_PASSWORD" --no-auth-warning ping' 2>/dev/null | grep -qx PONG; then
    redis_ready=true
    break
  fi
  sleep 2
done

if [[ "${redis_ready}" != true ]]; then
  echo "Redis did not answer PING; the application was not recreated." >&2
  exit 4
fi
printf 'Redis PING: PONG\n'

# Only now is it safe to recreate the application against the new store.
"${compose[@]}" up -d --no-deps app

trap - ERR

if ! KAFIL_INFRA_ENV="${infra_env}" "${release_dir}/scripts/verifyVpsDeployment.sh"; then
  echo "Post-activation verification failed. The environment backups are retained at:" >&2
  echo "  ${infra_backup}" >&2
  echo "  ${app_backup}" >&2
  exit 5
fi

printf 'Redis activation complete. Backups retained at .bak-%s\n' "${stamp}"
