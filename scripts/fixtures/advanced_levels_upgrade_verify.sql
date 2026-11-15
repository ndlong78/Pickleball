-- Run after the advanced-levels SQL Editor bundle on an eight-migration database.
do $verify$
begin
 if (select array_agg(version::text order by version) from supabase_migrations.schema_migrations) is distinct from array['20261029000100','20261029000200','20261030000100','20261101000100','20261101000200','20261103000100','20261111000100','20261114000100','20261115000100']::text[] then raise exception 'migration history not recorded';end if;
 if (select count(*) from pg_catalog.pg_constraint where conname in ('personal_plans_source_level_check','skill_assessments_type_level_check','training_entries_exercise_id_check'))<>3 then raise exception 'constraints missing';end if;
 if pg_catalog.pg_get_functiondef('pickleup_private.plan_ok(jsonb,text,text)'::regprocedure) not like '%9999%' then raise exception 'plan_ok not widened';end if;
 if exists(select 1 from pg_catalog.pg_constraint where conrelid in ('public.personal_plans'::regclass,'public.skill_assessments'::regclass,'public.training_entries'::regclass) and contype='c' and pg_catalog.pg_get_constraintdef(oid) like '%80)$%') then raise exception 'old ADV id limit still present';end if;
end $verify$;
select 'VERIFIED' as status;
