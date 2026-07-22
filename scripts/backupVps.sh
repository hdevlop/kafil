#!/usr/bin/env bash
set -Eeuo pipefail

readonly infra_env="${KAFIL_INFRA_ENV:-/opt/kafil/env/infrastructure.env}"
readonly backup_env="${KAFIL_BACKUP_ENV:-/opt/kafil/env/backup.env}"
readonly compose_file="${KAFIL_COMPOSE_FILE:-/opt/kafil/current/compose.production.yml}"
readonly backup_root="${KAFIL_BACKUP_ROOT:-/var/backups/kafil}"

for protected_file in "${infra_env}" "${backup_env}"; do
  if [[ ! -r "${protected_file}" ]]; then
    echo "Protected environment is not readable: ${protected_file}" >&2
    exit 1
  fi
done
set -a
# shellcheck disable=SC1090
source "${infra_env}"
# shellcheck disable=SC1090
source "${backup_env}"
set +a

command -v restic >/dev/null || { echo "restic is required." >&2; exit 1; }
readonly stamp="$(date -u +%Y%m%dT%H%M%SZ)"
work_dir="$(mktemp -d "${backup_root}/.backup-${stamp}.XXXXXX")"
final_dir="${backup_root}/${stamp}"
trap 'test -d "${work_dir:-}" && rm -rf -- "${work_dir}"' EXIT

compose=(docker compose --env-file "${infra_env}" -f "${compose_file}")
"${compose[@]}" exec -T postgres pg_dump \
  --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" \
  --format custom --no-owner --no-privileges >"${work_dir}/database.dump"
tar --create --gzip --file "${work_dir}/storage.tar.gz" \
  --directory "${KAFIL_STORAGE_HOST_PATH}" .
(cd "${work_dir}" && sha256sum database.dump storage.tar.gz >SHA256SUMS)
restic backup --tag kafil --tag "${stamp}" "${work_dir}"
mv -- "${work_dir}" "${final_dir}"
trap - EXIT
printf 'Local backup retained at %s and copied to the configured restic repository.\n' "${final_dir}"
