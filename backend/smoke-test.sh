#!/usr/bin/env bash
# Smoke test for a running local API. Run pnpm db:up, pnpm db:push, pnpm db:seed,
# and pnpm dev before this script.
set -euo pipefail

BASE_URL="${1:-http://localhost:8787}"
BASE_URL="${BASE_URL%/}"
UNKNOWN_ID="00000000-0000-4000-8000-000000000000"

request() {
  local method="$1" path="$2" data="${3:-}" auth="${4:-}"
  local args=(-sS -o /tmp/aws-ust-smoke-body -w '%{http_code}' -X "$method")
  [[ -n "$data" ]] && args+=(-H 'content-type: application/json' -d "$data")
  [[ -n "$auth" ]] && args+=(-H "Authorization: Bearer $auth")
  LAST_STATUS=$(curl "${args[@]}" "$BASE_URL$path")
  LAST_BODY=$(< /tmp/aws-ust-smoke-body)
}

expect() {
  local label="$1" status="$2"
  if [[ "$LAST_STATUS" != "$status" ]]; then
    echo "FAIL $label: expected $status, got $LAST_STATUS"
    echo "$LAST_BODY"
    exit 1
  fi
  echo "PASS $label"
}

request GET /health
expect "GET /health" 200

request POST /uploads/presign '{}'
expect "missing documents" 400

request POST /uploads/presign '{"documents":[{"documentType":"resume","fileName":"resume.pdf","sizeBytes":1,"checksumSha256":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="},{"documentType":"resume","fileName":"copy.pdf","sizeBytes":1,"checksumSha256":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="}]}'
expect "duplicate document type" 400

request POST /uploads/presign '{"documents":[{"documentType":"resume","fileName":"resume.txt","sizeBytes":1,"checksumSha256":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="},{"documentType":"transcript","fileName":"transcript.pdf","sizeBytes":10000001,"checksumSha256":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="}]}'
expect "invalid PDF name and size" 400

request GET "/applications/$UNKNOWN_ID/documents/resume"
expect "unauthenticated document access" 401

request POST /applications '{"firstName":"Smoke"}'
expect "application requires upload session" 400

rm -f /tmp/aws-ust-smoke-body
