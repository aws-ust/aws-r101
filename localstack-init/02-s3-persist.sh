#!/bin/sh
# LocalStack's free tier keeps S3 in memory, so uploads (payment QR, member
# photos, documents) vanish whenever the container restarts. Restore the last
# backup from the mounted host folder, then keep that backup in sync.
set -eu

BACKUP_DIR=/var/lib/aws-ust-s3

rm -f /tmp/aws-ust-s3-restored
mkdir -p "$BACKUP_DIR"
awslocal s3 sync "$BACKUP_DIR" "s3://$S3_BUCKET" --only-show-errors
touch /tmp/aws-ust-s3-restored

# Only start mirroring once the restore succeeded, so an empty bucket never
# overwrites a good backup. Temporary uploads under incoming/ are skipped.
(
  while true; do
    sleep 15
    awslocal s3 sync "s3://$S3_BUCKET" "$BACKUP_DIR" \
      --delete --exclude "incoming/*" --only-show-errors || true
  done
) >/dev/null 2>&1 &
