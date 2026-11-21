#!/usr/bin/env bash
# Encrypted logical backup of PickleUp data. Used by .github/workflows/db-backup.yml
# (real project, owner-configured secrets) and by backend CI against local Supabase.
# Inputs (environment): BACKUP_DB_URL, BACKUP_AGE_RECIPIENT, BACKUP_OUT_DIR.
# Output: one file <out>/pickleup-backup-<UTC stamp>.tar.age. Plaintext stays in a
# private temp dir that is removed on exit; nothing is printed except counts.
set -euo pipefail
: "${BACKUP_DB_URL:?BACKUP_DB_URL missing}" "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT missing}" "${BACKUP_OUT_DIR:?BACKUP_OUT_DIR missing}"
case "$BACKUP_AGE_RECIPIENT" in age1*) ;; *) echo "BACKUP_AGE_RECIPIENT must be an age public key (age1...)" >&2; exit 2;; esac
command -v age >/dev/null || { echo "age not installed" >&2; exit 2; }
IMAGE="${BACKUP_PG_IMAGE:-postgres:17}"
umask 077
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
# BACKUP_PG_DOCKER=0 uses host pg_dump/pg_restore (must match the server major); default is the postgres:17 image.
dump(){ if [ "${BACKUP_PG_DOCKER:-1}" = 0 ]; then OUT="$work" sh -c "$1"; else docker run --rm --network host -e BACKUP_DB_URL -e OUT=/out -v "$work:/out" "$IMAGE" sh -c "$1"; fi; }
# 1) Schema of app schemas (reference; a new project is rebuilt from supabase/migrations).
dump 'pg_dump "$BACKUP_DB_URL" --schema-only --no-owner --no-privileges --schema=public --schema=pickleup_private -f "$OUT/schema.sql"'
# 2) Data of app schemas and migration history.
dump 'pg_dump "$BACKUP_DB_URL" --data-only --format=custom --schema=public --schema=pickleup_private --schema=supabase_migrations -f "$OUT/data.dump"'
# 3) Auth identities needed to keep user ids and emails (sessions are not kept: users sign in again).
dump 'pg_dump "$BACKUP_DB_URL" --data-only --format=custom --table=auth.users --table=auth.identities -f "$OUT/auth.dump"'
for f in schema.sql data.dump auth.dump; do [ -s "$work/$f" ] || { echo "empty $f" >&2; exit 3; }; done
printf '{"app":"PickleUp","format":"db-backup-v1","createdAt":"%s","files":["schema.sql","data.dump","auth.dump"]}\n' "$stamp" > "$work/manifest.json"
mkdir -p "$BACKUP_OUT_DIR"
out="$BACKUP_OUT_DIR/pickleup-backup-$stamp.tar.age"
tar -C "$work" -cf - manifest.json schema.sql data.dump auth.dump | age -r "$BACKUP_AGE_RECIPIENT" -o "$out"
tables=$(dump 'pg_restore --list "$OUT/data.dump"' | grep -c 'TABLE DATA' || true)
echo "backup ok: $(basename "$out") bytes=$(stat -c %s "$out") app_tables=$tables"
