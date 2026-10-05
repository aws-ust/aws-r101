#!/bin/sh
# Final S3 backup before LocalStack stops; see localstack-init/02-s3-persist.sh.
set -eu

# Skip if the startup restore never finished, so an empty bucket can't wipe the backup.
[ -f /tmp/aws-ust-s3-restored ] || exit 0

awslocal s3 sync "s3://$S3_BUCKET" /var/lib/aws-ust-s3 \
  --delete --exclude "incoming/*" --only-show-errors
