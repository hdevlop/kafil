#!/usr/bin/env bash
set -Eeuo pipefail

readonly infra_env="${KAFIL_INFRA_ENV:-/opt/kafil/env/infrastructure.env}"
if [[ ! -r "${infra_env}" ]]; then
  echo "Infrastructure environment is not readable: ${infra_env}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090 -- the protected deployment environment is the contract.
source "${infra_env}"
set +a

readonly loopback_port="${KAFIL_LOOPBACK_PORT:-3300}"
readonly hostname="${KAFIL_HOSTNAME:?KAFIL_HOSTNAME is required}"
readonly local_base="http://127.0.0.1:${loopback_port}"
readonly public_base="https://${hostname}"

request_status() {
  local url="$1"
  curl --fail-with-body --silent --show-error \
    --connect-timeout 5 --max-time 15 --output /dev/null \
    --write-out '%{http_code}' "${url}"
}

assert_status() {
  local label="$1"
  local url="$2"
  shift 2
  local status
  status="$(request_status "${url}")"
  for expected in "$@"; do
    if [[ "${status}" == "${expected}" ]]; then
      printf '%s: %s\n' "${label}" "${status}"
      return 0
    fi
  done
  printf '%s: unexpected HTTP %s\n' "${label}" "${status}" >&2
  return 1
}

assert_status "local root" "${local_base}/" 200
assert_status "local dashboard" "${local_base}/dashboard" 200 302 303 307 308
assert_status "local liveness" "${local_base}/api/system/health" 200
assert_status "local readiness" "${local_base}/api/system/readiness" 200
assert_status "local MCP" "${local_base}/api/mcp/tools" 200 401 403

assert_status "public root" "${public_base}/" 200
assert_status "public dashboard" "${public_base}/dashboard" 200 302 303 307 308
assert_status "public liveness" "${public_base}/api/system/health" 200
assert_status "public readiness" "${public_base}/api/system/readiness" 200

redirect_status="$(curl --silent --show-error --connect-timeout 5 --max-time 15 \
  --output /dev/null --write-out '%{http_code}' "http://${hostname}/")"
case "${redirect_status}" in
  301|302|307|308) printf 'HTTP redirect: %s\n' "${redirect_status}" ;;
  *) echo "HTTP redirect: unexpected HTTP ${redirect_status}" >&2; exit 1 ;;
esac

# ---------------------------------------------------------------------------
# Runtime topology
#
# Rate limiting is only as strong as the assumptions behind its key: Redis must
# be the shared counter store, and every request must arrive through the edge
# proxy. Both are asserted here so a drifted deployment fails the gate instead
# of silently weakening login throttling.
# ---------------------------------------------------------------------------
readonly release_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly compose_file="${release_root}/compose.production.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to verify the runtime topology." >&2
  exit 1
fi

compose=(docker compose --env-file "${infra_env}" -f "${compose_file}")

container_id() {
  "${compose[@]}" ps -q "$1" 2>/dev/null || true
}

redis_id="$(container_id redis)"
if [[ -z "${redis_id}" ]]; then
  echo "Redis: not running; rate-limit counters would not survive a restart." >&2
  exit 1
fi

redis_health="$(docker inspect --format '{{.State.Health.Status}}' "${redis_id}" 2>/dev/null || echo unknown)"
if [[ "${redis_health}" != "healthy" ]]; then
  echo "Redis: unexpected health '${redis_health}'." >&2
  exit 1
fi
printf 'Redis health: %s\n' "${redis_health}"

# Redis must stay on the internal network with no host binding at all.
redis_ports="$(docker inspect --format '{{json .NetworkSettings.Ports}}' "${redis_id}")"
if [[ "${redis_ports}" != "{}" && "${redis_ports}" != *'":null'* ]]; then
  if grep -q 'HostPort' <<<"${redis_ports}"; then
    echo "Redis: refusing a published host port; it must remain internal." >&2
    exit 1
  fi
fi
printf 'Redis binding: internal only\n'

# The application must never be reachable except through the edge proxy, or a
# client could bypass the proxy and present its own forwarding headers.
app_id="$(container_id app)"
if [[ -z "${app_id}" ]]; then
  echo "Application: not running." >&2
  exit 1
fi

app_bindings="$(docker inspect \
  --format '{{range $p, $conf := .NetworkSettings.Ports}}{{range $conf}}{{$p}}={{.HostIp}} {{end}}{{end}}' \
  "${app_id}")"
for binding in ${app_bindings}; do
  host_ip="${binding#*=}"
  case "${host_ip}" in
    127.0.0.1|::1|localhost) ;;
    *)
      echo "Application: published on non-loopback address '${host_ip}'; the edge proxy must be the only ingress." >&2
      exit 1
      ;;
  esac
done
printf 'Application binding: loopback only\n'
