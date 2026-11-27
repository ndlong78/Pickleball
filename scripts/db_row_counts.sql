-- Row counts used to compare a source database with a restored copy (docs/ACCOUNT_OPERATIONS.md §3).
-- Read-only. Safe to paste into the Supabase SQL Editor of production or of a restore-drill project.
-- Output: one row per table, "schema.table" and its exact row count, ordered by name.
select tbl, n from (
  select table_schema || '.' || table_name as tbl,
    (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint as n
  from information_schema.tables
  where table_schema in ('public', 'pickleup_private') and table_type = 'BASE TABLE'
  union all select 'auth.users', count(*) from auth.users
  union all select 'auth.identities', count(*) from auth.identities
) counts
order by tbl;
