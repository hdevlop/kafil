#!/usr/bin/env bash
set -euo pipefail

public_origin="${1:-}"
if [[ -z "$public_origin" || "$public_origin" != https://* ]]; then
  echo "Usage: bash scripts/verifySecurityHeaders.sh https://your-kafil-origin" >&2
  exit 2
fi

public_origin="${public_origin%/}"
headers_file="$(mktemp)"
trap 'rm -f "$headers_file"' EXIT

header_value() {
  local name="$1"
  awk -v target="${name,,}:" '
    tolower($1) == target {
      sub(/^[^:]+:[[:space:]]*/, "")
      sub(/\r$/, "")
      value = $0
    }
    END { print value }
  ' "$headers_file"
}

require_exact() {
  local name="$1"
  local expected="$2"
  local actual
  actual="$(header_value "$name")"
  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL $name: expected '$expected', got '${actual:-<missing>}'" >&2
    return 1
  fi
}

require_contains() {
  local name="$1"
  local expected="$2"
  local actual
  actual="$(header_value "$name")"
  if [[ "$actual" != *"$expected"* ]]; then
    echo "FAIL $name: expected to contain '$expected', got '${actual:-<missing>}'" >&2
    return 1
  fi
}

require_absent() {
  local name="$1"
  local actual
  actual="$(header_value "$name")"
  if [[ -n "$actual" ]]; then
    echo "FAIL $name: expected it to be absent, got '$actual'" >&2
    return 1
  fi
}

verify_path() {
  local path="$1"
  curl --silent --show-error --dump-header "$headers_file" --output /dev/null \
    --max-redirs 0 "$public_origin$path"

  require_contains "Strict-Transport-Security" "max-age=31536000"
  require_contains "Strict-Transport-Security" "includeSubDomains"
  require_contains "Content-Security-Policy" "frame-ancestors 'none'"
  require_contains "Content-Security-Policy" "object-src 'none'"
  require_exact "X-Content-Type-Options" "nosniff"
  require_exact "X-Frame-Options" "DENY"
  require_exact "Referrer-Policy" "strict-origin-when-cross-origin"
  require_contains "Permissions-Policy" "camera=()"
  require_absent "X-Powered-By"
  require_absent "Server"
  echo "PASS $public_origin$path"
}

verify_path "/"
verify_path "/api/system/health"
