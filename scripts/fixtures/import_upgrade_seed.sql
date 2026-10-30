-- Synthetic upgrade probe on isolated local schema2 only, never production.
insert into auth.users(id,email) values('33333333-3333-4333-8333-333333333333','import-upgrade@pickleup.invalid');
set role authenticated;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',false);
select public.apply_operation('44444444-4444-4444-8444-444444444444','profiles','self','put','0','{"display_name":"Synthetic upgrade","timezone":"UTC"}',1)->>'status';
reset role;
insert into public.legacy_imports(user_id,id,revision,created_at,updated_at,source_kind,source_fingerprint,adapter_version,source_schema,manifest_hash,status,counts,report)
values('33333333-3333-4333-8333-333333333333','55555555-5555-4555-8555-555555555555',7,now(),now(),'legacy',repeat('a',64),'fixture1','fixture',repeat('b',64),'staging','{"applied":0,"reused":0,"invalid":1,"unresolved":0,"local_only":2}','{"codes":[]}');
