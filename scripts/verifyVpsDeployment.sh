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
