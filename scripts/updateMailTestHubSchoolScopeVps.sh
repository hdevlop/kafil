#!/usr/bin/env bash
set -euo pipefail

readonly source_dir="${MAIL_TEST_HUB_SOURCE_DIR:-/opt/mail-test-hub/source}"
readonly env_file="${MAIL_TEST_HUB_ENV_FILE:-/opt/mail-test-hub/hub.env}"
readonly helper="${source_dir}/scripts/configureMailTestHubVps.sh"
readonly override_file="${source_dir}/deploy/mail-test-hub/compose.dokploy.yml"
readonly edge_network="${MAIL_TEST_EDGE_NETWORK:-dokploy-network}"
readonly legacy_mailpit="${KAFIL_LEGACY_MAILPIT_CONTAINER:-kafil-demo-vdadlv-mailpit-1}"

for command in cmp cp date docker grep mktemp sed stat timeout tr wc; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "Required command is unavailable: ${command}" >&2
    exit 1
  fi
done

if [[ ! -f "${env_file}" || ! -f "${helper}" || ! -f "${override_file}" ]]; then
  echo "School scope updater prerequisites are missing." >&2
  exit 1
fi
if [[ "$(stat -c '%u' "${env_file}")" != "0" || "$(stat -c '%a' "${env_file}")" != "600" ]]; then
  echo "Mail-test hub environment must be root-owned with mode 0600." >&2
  exit 1
fi
if [[ "$(docker inspect --format '{{.State.Running}}' "${legacy_mailpit}" 2>/dev/null || true)" != "true" ]]; then
  echo "The existing Kafil Mailpit is not confirmed running." >&2
  exit 1
fi

old_scope_count="$(grep -oF 'school-e2e' "${env_file}" | wc -l | tr -d ' ')"
if [[ "${old_scope_count}" != "2" ]]; then
  echo "Expected exactly two legacy School scope fragments." >&2
  exit 1
fi

readonly timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
readonly backup_file="${env_file}.before-school-scope-${timestamp}"
expected_file="$(mktemp /opt/mail-test-hub/.school-scope-expected.XXXXXX)"
chmod 600 "${expected_file}"
cp --preserve=mode,ownership,timestamps "${env_file}" "${backup_file}"
chmod 600 "${backup_file}"

run_hub_helper() {
  timeout 10m env \
    KAFIL_RELEASE_DIR="${source_dir}" \
    MAIL_TEST_HUB_ENV_FILE="${env_file}" \
    MAIL_TEST_HUB_COMPOSE_OVERRIDE_FILE="${override_file}" \
    MAIL_TEST_EDGE_NETWORK="${edge_network}" \
    bash "${helper}"
}

run_rollback_helper() {
  timeout 5m env \
    KAFIL_RELEASE_DIR="${source_dir}" \
    MAIL_TEST_HUB_ENV_FILE="${env_file}" \
    MAIL_TEST_HUB_COMPOSE_OVERRIDE_FILE="${override_file}" \
    MAIL_TEST_EDGE_NETWORK="${edge_network}" \
    bash "${helper}"
}

rollback_required=0
finish() {
  status=$?
  trap - EXIT
  if [[ "${status}" != "0" && "${rollback_required}" == "1" ]]; then
    cp --preserve=mode,ownership,timestamps "${backup_file}" "${env_file}"
    chmod 600 "${env_file}"
    if ! run_rollback_helper >/dev/null 2>&1; then
      echo "Environment restored, but hub rollback validation failed." >&2
    else
      echo "School scope update failed and was rolled back." >&2
    fi
  fi
  rm -f "${expected_file}"
  exit "${status}"
}
trap finish EXIT

sed 's/school-e2e/school/g' "${backup_file}" > "${expected_file}"
rollback_required=1
sed -i 's/school-e2e/school/g' "${env_file}"

if ! cmp --silent "${expected_file}" "${env_file}"; then
  echo "Environment changed beyond the intended School scope replacement." >&2
  exit 1
fi
if grep -Fq 'school-e2e' "${env_file}"; then
  echo "Legacy School scope remains after replacement." >&2
  exit 1
fi
if ! grep -Fq '"recipientDomains":["school.test"]' "${env_file}"; then
  echo "School gateway scope was not updated." >&2
  exit 1
fi
if ! grep -Fq 'school\.test' "${env_file}"; then
  echo "School SMTP allowlist was not updated." >&2
  exit 1
fi
if ! grep -Fq 'c4a-sponsor.test' "${env_file}"; then
  echo "Kafil scope is missing after replacement." >&2
  exit 1
fi
if [[ "$(stat -c '%u' "${env_file}")" != "0" || "$(stat -c '%a' "${env_file}")" != "600" ]]; then
  echo "Mail-test hub environment ownership or mode changed." >&2
  exit 1
fi

run_hub_helper

if [[ "$(docker inspect --format '{{.State.Running}}' "${legacy_mailpit}" 2>/dev/null || true)" != "true" ]]; then
  echo "The existing Kafil Mailpit stopped during the scope update." >&2
  exit 1
fi

rollback_required=0
echo "School scope updated; credentials preserved; both app scopes authenticated."
