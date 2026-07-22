#!/usr/bin/env bash
set -Eeuo pipefail

readonly backup_dir="${1:-}"
readonly infra_env="${KAFIL_INFRA_ENV:-/opt/kafil/env/infrastructure.env}"
readonly compose_file="${KAFIL_COMPOSE_FILE:-/opt/kafil/current/compose.production.yml}"
if [[ ! -d "${backup_dir}" ]]; then
  echo "Usage: $0 /var/backups/kafil/<timestamp>" >&2
  exit 2
fi
if [[ ! -r "${infra_env}" ]]; then
  echo "Infrastructure environment is not readable: ${infra_env}" >&2
  exit 2
fi

set -a
# shellcheck disable=SC1090
source "${infra_env}"
set +a
(cd "${backup_dir}" && sha256sum --check --strict SHA256SUMS)

readonly suffix="$(date -u +%Y%m%d%H%M%S)"
readonly restore_db="kafil_restore_${suffix}"
restore_storage="$(mktemp -d "/srv/kafil/restore-${suffix}.XXXXXX")"
compose=(docker compose --env-file "${infra_env}" -f "${compose_file}")

cleanup() {
  "${compose[@]}" exec -T postgres dropdb --if-exists \
    --username "${POSTGRES_USER}" "${restore_db}" >/dev/null 2>&1 || true
  rm -rf -- "${restore_storage}"
}
trap cleanup EXIT

"${compose[@]}" exec -T postgres createdb \
  --username "${POSTGRES_USER}" "${restore_db}"
"${compose[@]}" exec -T postgres pg_restore \
  --username "${POSTGRES_USER}" --dbname "${restore_db}" \
  --no-owner --no-privileges <"${backup_dir}/database.dump"
tar --extract --gzip --file "${backup_dir}/storage.tar.gz" \
  --directory "${restore_storage}"

table_count="$("${compose[@]}" exec -T postgres psql --tuples-only --no-align \
  --username "${POSTGRES_USER}" --dbname "${restore_db}" \
  --command "select count(*) from information_schema.tables where table_schema = 'public';")"
if [[ ! "${table_count}" =~ ^[1-9][0-9]*$ ]]; then
  echo "Restore rehearsal found no application tables." >&2
  exit 1
fi
printf 'Isolated restore passed: database=%s tables=%s storage=%s\n' \
  "${restore_db}" "${table_count}" "${restore_storage}"
