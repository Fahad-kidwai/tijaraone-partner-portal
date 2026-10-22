#!/usr/bin/env bash
# TijaraOne monthly database backup (see docs/OPERATIONS.md).
#
# Dumps the database pointed to by DATABASE_URL_UNPOOLED (read from the
# environment — source .env.local or your host's env export first) into a
# dated .sql file OUTSIDE the repo. The connection string is passed to
# pg_dump via its argument and is never printed.
#
# Usage:
#   set -a; source .env.local; set +a   # or export the var yourself
#   ./scripts/backup.sh
#   BACKUP_DIR=/mnt/drive/backups ./scripts/backup.sh
#
# Requires: pg_dump (PostgreSQL client tools) on PATH.
# The dump contains client names and phone numbers — store it somewhere
# private (e.g. the business Drive folder), never commit it.
set -euo pipefail

: "${DATABASE_URL_UNPOOLED:?DATABASE_URL_UNPOOLED must be set in the environment}"

OUT_DIR="${BACKUP_DIR:-$HOME/tijaraone-backups}"
mkdir -p "$OUT_DIR"

STAMP="$(date +%Y-%m-%d)"
OUT="$OUT_DIR/tijaraone-$STAMP.sql"

pg_dump "$DATABASE_URL_UNPOOLED" --no-owner --no-privileges --file="$OUT"

echo "Backup written to $OUT ($(du -h "$OUT" | cut -f1))"
