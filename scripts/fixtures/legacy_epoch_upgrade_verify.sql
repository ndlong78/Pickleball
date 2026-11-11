begin;
do $$ begin
 if not exists(select 1 from pickleup_private.legacy_write_epochs where user_id='33333333-3333-4333-8333-333333333333' and not legacy_allowed) then raise exception 'Existing head must fail closed';end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261111000100') then raise exception 'SQL Editor history missing';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
do $$ declare result jsonb;begin
 if not exists(select 1 from public.user_preferences where target_days=2 and revision=1) then raise exception 'Legacy upgrade lost row';end if;
 result:=public.apply_operation('33333333-3333-4333-8333-333333333334','user_preferences','self','put','0','{"target_days":2}',1);
 if result->>'status'<>'upgrade_required' then raise exception 'Backfilled user must upgrade even exact old replay';end if;
 result:=public.apply_sync_operation('33333333-3333-4333-8333-333333333335','user_preferences','self','put','1',(public.prepare_sync()->>'epoch')::uuid,'{"target_days":4}',1);
 if result->>'status'<>'applied' or result->'row'->>'revision'<>'2' then raise exception 'Fenced writer failed after SQL Editor upgrade';end if;
end $$;
reset role;
delete from auth.users where id='33333333-3333-4333-8333-333333333333';
commit;
