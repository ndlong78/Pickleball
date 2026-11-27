#!/usr/bin/env bash
# Restore a PickleUp encrypted backup (scripts/backup_db.sh, format db-backup-v1) into an EMPTY
# database that already has every migration applied. Used for the owner's restore drill
# (docs/ACCOUNT_OPERATIONS.md §3) and by backend CI against local Supabase.
#
# Inputs (environment):
#   RESTORE_DB_URL       target (Session pooler URI of a NEW project, or local CI database)
#   RESTORE_BACKUP_FILE  pickleup-backup-<stamp>.tar.age
#   RESTORE_AGE_KEY      path to the age private key file
#   RESTORE_EXPECT_COUNTS optional: file with "schema.table|n" lines (scripts/db_row_counts.sql
#                        output from the source) to compare after restore
#   BACKUP_PG_DOCKER=0   use host pg_restore/psql (must match the server major); default postgres:17 image
#
# Guards, all before anything is written:
#   - refuses the production project ref;
#   - the target must contain no app rows and no auth users;
#   - the target migration history must equal the one recorded in the backup.
# The restore itself is one transaction with triggers disabled (session_replication_role=replica),
# so the epoch-ledger trigger on sync_heads cannot double-write and any error writes nothing.
set -euo pipefail
: "${RESTORE_DB_URL:?RESTORE_DB_URL missing}" "${RESTORE_BACKUP_FILE:?RESTORE_BACKUP_FILE missing}" "${RESTORE_AGE_KEY:?RESTORE_AGE_KEY missing}"
PRODUCTION_REF="rfeoeagklmaqmkcdhprb"
case "$RESTORE_DB_URL" in *"$PRODUCTION_REF"*) echo "refusing: target is the production project ($PRODUCTION_REF)" >&2; exit 2;; esac
[ -f "$RESTORE_BACKUP_FILE" ] || { echo "backup file not found" >&2; exit 2; }
[ -f "$RESTORE_AGE_KEY" ] || { echo "age key not found" >&2; exit 2; }
command -v age >/dev/null || { echo "age not installed" >&2; exit 2; }
IMAGE="${BACKUP_PG_IMAGE:-postgres:17}"
here="$(cd "$(dirname "$0")" && pwd)"
umask 077
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
cp "$here/db_row_counts.sql" "$work/counts.sql"
pg(){ if [ "${BACKUP_PG_DOCKER:-1}" = 0 ]; then (cd "$work" && W="$work" sh -c "$1"); else docker run --rm --network host -e RESTORE_DB_URL -e W=/w -v "$work:/w" -w /w "$IMAGE" sh -c "$1"; fi; }

# 1) Decrypt into the private temp dir.
age -d -i "$RESTORE_AGE_KEY" "$RESTORE_BACKUP_FILE" | tar -C "$work" -xf -
grep -q '"format":"db-backup-v1"' "$work/manifest.json" || { echo "not a db-backup-v1 archive" >&2; exit 3; }
for f in data.dump auth.dump; do [ -s "$work/$f" ] || { echo "archive misses $f" >&2; exit 3; }; done

# 2) Plain SQL. Migration history is not restored: the target already has it from the migrations.
pg 'pg_restore -l "$W/data.dump" | grep -v " supabase_migrations " > "$W/data.list" &&
    pg_restore -L "$W/data.list" -f "$W/data.sql" "$W/data.dump" &&
    pg_restore -f "$W/auth.sql" "$W/auth.dump" &&
    pg_restore -a -n supabase_migrations -t schema_migrations -f "$W/migrations.sql" "$W/data.dump"'
awk '/^COPY supabase_migrations\.schema_migrations /{on=1;next} on&&/^\\\.$/{on=0} on{print $1}' "$work/migrations.sql" | sort > "$work/backup_versions"
[ -s "$work/backup_versions" ] || { echo "backup has no migration history" >&2; exit 3; }

# 3) Preflight on the target (read-only).
pg 'psql "$RESTORE_DB_URL" -X -At -v ON_ERROR_STOP=1 -c "select version from supabase_migrations.schema_migrations order by version"' | sort > "$work/target_versions"
if ! cmp -s "$work/backup_versions" "$work/target_versions"; then
  echo "refusing: target migration history differs from the backup" >&2
  diff "$work/backup_versions" "$work/target_versions" >&2 || true
  exit 4
fi
pg 'psql "$RESTORE_DB_URL" -X -At -F "|" -v ON_ERROR_STOP=1 -f "$W/counts.sql"' > "$work/before"
nonempty=$(awk -F'|' '$2 != 0' "$work/before")
if [ -n "$nonempty" ]; then echo "refusing: target is not empty:" >&2; echo "$nonempty" >&2; exit 4; fi

# 4) Restore in one transaction.
pg 'psql "$RESTORE_DB_URL" -X -q -v ON_ERROR_STOP=1 --single-transaction -c "SET session_replication_role = replica" -f "$W/auth.sql" -f "$W/data.sql"' > /dev/null

# 5) Counts after restore (table names and numbers only, no row content).
pg 'psql "$RESTORE_DB_URL" -X -At -F "|" -v ON_ERROR_STOP=1 -f "$W/counts.sql"' > "$work/after"
cat "$work/after"
if [ -n "${RESTORE_EXPECT_COUNTS:-}" ]; then
  if ! diff <(sort "$RESTORE_EXPECT_COUNTS") <(sort "$work/after") >&2; then echo "restore counts differ from source" >&2; exit 5; fi
  echo "restore ok: counts match source ($(wc -l < "$work/after") tables)"
else
  echo "restore ok: $(wc -l < "$work/after") tables restored; compare with the source counts"
fi
