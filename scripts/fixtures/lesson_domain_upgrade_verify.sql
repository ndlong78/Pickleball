-- Run after the C3 SQL Editor bundle on a seven-migration database.
do $verify$
begin
 if (select array_agg(version::text order by version) from supabase_migrations.schema_migrations) is distinct from array['20261029000100','20261029000200','20261030000100','20261101000100','20261101000200','20261103000100','20261111000100','20261114000100']::text[] then raise exception 'migration history not recorded';end if;
 perform 'PU-081'::pickleup_private.lesson_id,'PU-1000'::pickleup_private.lesson_id,'4.0–4.5'::pickleup_private.level_band,'4.5–5.0'::pickleup_private.level_band,'PU-001'::pickleup_private.lesson_id,'3.5–4.0'::pickleup_private.level_band;
 begin perform 'PU-0081'::pickleup_private.lesson_id;raise exception 'ambiguous id accepted';exception when check_violation then null;end;
 begin perform 'PU-000'::pickleup_private.lesson_id;raise exception 'zero id accepted';exception when check_violation then null;end;
 begin perform '4.0–5.0'::pickleup_private.level_band;raise exception 'unknown band accepted';exception when check_violation then null;end;
 if (select count(*) from pg_catalog.pg_constraint where conrelid='public.legacy_score_snapshots'::regclass and conname='legacy_score_snapshots_source_key_check')<>1 then raise exception 'snapshot key check missing';end if;
end $verify$;
select 'VERIFIED' as status;
