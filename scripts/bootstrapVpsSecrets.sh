#!/usr/bin/env bash
set -Eeuo pipefail

readonly hostname="${1:-}"
readonly contact_email="${2:-}"
readonly app_env="/opt/kafil/env/app.env"
readonly infrastructure_env="/opt/kafil/env/infrastructure.env"

if [[ ! "${hostname}" =~ ^[a-z0-9.-]+$ ]]; then
  echo "A valid lowercase hostname is required." >&2
  exit 2
fi
if [[ ! "${contact_email}" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]]; then
  echo "A valid contact email is required." >&2
  exit 2
fi
if [[ -e "${app_env}" || -e "${infrastructure_env}" ]]; then
  echo "Refusing to overwrite an existing VPS environment file." >&2
  exit 3
fi

umask 077
install -d -m 0750 /opt/kafil/env /opt/kafil/releases /opt/kafil/state
install -d -m 0750 /srv/kafil/storage-demo /srv/kafil/storage-production
install -d -m 0750 /var/backups/kafil
chown 1000:1000 /srv/kafil/storage-demo

database_password="$(openssl rand -hex 32)"
jwt_access_secret="$(openssl rand -hex 48)"
jwt_refresh_secret="$(openssl rand -hex 48)"
encryption_key="$(openssl rand -hex 32)"
admin_password="Kf!$(openssl rand -hex 24)"
redis_password="$(openssl rand -hex 32)"

{
  printf 'DATABASE_URL=postgresql://kafil:%s@postgres:5432/kafil_demo\n' "${database_password}"
  printf 'FRONTEND_URL=https://%s\n' "${hostname}"
  printf 'JWT_ACCESS_SECRET=%s\n' "${jwt_access_secret}"
  printf 'JWT_REFRESH_SECRET=%s\n' "${jwt_refresh_secret}"
  printf 'NAJM_ENCRYPTION_KEY=%s\n' "${encryption_key}"
  printf 'KAFIL_ADMIN_EMAIL=%s\n' "${contact_email}"
  printf 'KAFIL_ADMIN_PASSWORD=%s\n' "${admin_password}"
  printf 'KAFIL_STORAGE_PATH=/srv/kafil/storage\n'
  printf 'LOG_FORMAT=json\nLOG_LEVEL=info\nNO_COLOR=1\n'
  printf 'NEXT_PUBLIC_FORM_FILL_ENABLED=false\n'
  printf 'EMAIL_PROVIDER=console\n'
  printf 'EMAIL_DEFAULT_FROM=Kafil Demo <%s>\n' "${contact_email}"
} >"${app_env}"

{
  printf 'COMPOSE_PROJECT_NAME=kafil\n'
  printf 'KAFIL_IMAGE=ghcr.io/hdevlop/kafil:sha-0000000000000000000000000000000000000000\n'
  printf 'KAFIL_HOSTNAME=%s\n' "${hostname}"
  printf 'ACME_EMAIL=%s\n' "${contact_email}"
  printf 'KAFIL_LOOPBACK_PORT=3300\n'
  printf 'KAFIL_STORAGE_HOST_PATH=/srv/kafil/storage-demo\n'
  printf 'POSTGRES_DB=kafil_demo\nPOSTGRES_USER=kafil\n'
  printf 'POSTGRES_PASSWORD=%s\n' "${database_password}"
  printf 'REDIS_PASSWORD=%s\n' "${redis_password}"
} >"${infrastructure_env}"

chmod 0600 "${app_env}" "${infrastructure_env}"
unset database_password jwt_access_secret jwt_refresh_secret encryption_key admin_password redis_password
printf 'Protected demo environments created at %s and %s.\n' "${app_env}" "${infrastructure_env}"
