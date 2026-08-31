#!/usr/bin/env bash
set -euo pipefail

readonly repo_root="${KAFIL_RELEASE_DIR:-/opt/kafil/current}"
readonly compose_file="${MAIL_TEST_HUB_COMPOSE_FILE:-${repo_root}/deploy/mail-test-hub/compose.yml}"
readonly compose_override_file="${MAIL_TEST_HUB_COMPOSE_OVERRIDE_FILE:-}"
readonly env_file="${MAIL_TEST_HUB_ENV_FILE:-/opt/mail-test-hub/hub.env}"

for command in docker curl sleep stat; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "Required command is unavailable: ${command}" >&2
    exit 1
  fi
done

if [[ ! -f "${compose_file}" || ! -f "${env_file}" ]]; then
  echo "Mail-test hub compose or environment file is missing." >&2
  exit 1
fi
if [[ -n "${compose_override_file}" && ! -f "${compose_override_file}" ]]; then
  echo "Mail-test hub Compose override file is missing." >&2
  exit 1
fi

if [[ "$(stat -c '%a' "${env_file}")" != "600" ]]; then
  echo "Mail-test hub environment file must have mode 0600." >&2
  exit 1
fi

compose=(docker compose --env-file "${env_file}" -f "${compose_file}")
if [[ -n "${compose_override_file}" ]]; then
  compose+=(-f "${compose_override_file}")
fi
"${compose[@]}" config --quiet
"${compose[@]}" up -d --build

dashboard_binding="$("${compose[@]}" port mailpit 8025)"
gateway_binding="$("${compose[@]}" port gateway 8080)"
if [[ ! "${dashboard_binding}" =~ ^127\.0\.0\.1:([0-9]+)$ ]]; then
  echo "Mailpit dashboard must bind only to IPv4 loopback." >&2
  exit 1
fi
dashboard_port="${BASH_REMATCH[1]}"
if [[ ! "${gateway_binding}" =~ ^127\.0\.0\.1:([0-9]+)$ ]]; then
  echo "Mail-test gateway must bind only to IPv4 loopback." >&2
  exit 1
fi
gateway_port="${BASH_REMATCH[1]}"

dashboard_status="000"
gateway_status="000"
for ((attempt = 1; attempt <= 40; attempt += 1)); do
  dashboard_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
    --connect-timeout 3 --max-time 10 "http://127.0.0.1:${dashboard_port}/api/v1/info" || true)"
  gateway_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
    --connect-timeout 3 --max-time 10 "http://127.0.0.1:${gateway_port}/api/v1/info" || true)"
  if [[ "${dashboard_status}" == "401" && "${gateway_status}" == "401" ]]; then
    break
  fi
  sleep 0.25
done

if [[ "${dashboard_status}" != "401" || "${gateway_status}" != "401" ]]; then
  echo "Mail-test hub did not enforce both authentication boundaries." >&2
  exit 1
fi

"${compose[@]}" exec -T gateway bun -e '
  const apps = JSON.parse(process.env.MAIL_TEST_GATEWAY_APPS_JSON ?? "[]");
  const token = apps[0]?.token;
  if (!token) process.exit(1);
  const response = await fetch("http://127.0.0.1:8080/api/v1/info", {
    headers: { Authorization: `Bearer ${token}` },
  });
  process.exit(response.ok ? 0 : 1);
'

echo "Mail-test hub ready on authenticated loopback dashboard and API ports."
