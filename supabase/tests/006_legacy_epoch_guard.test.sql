begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_temp;
select extensions.no_plan();
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','legacy-a@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','legacy-b@example.invalid');
select extensions.ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='pickleup_private.legacy_write_epochs'::regclass),'legacy baseline FORCE RLS');
select extensions.ok(not has_table_privilege('authenticated','pickleup_private.legacy_write_epochs','SELECT,INSERT,UPDATE,DELETE'),'client baseline access denied');
select extensions.ok(not has_table_privilege('pickleup_api','pickleup_private.legacy_write_epochs','UPDATE,DELETE'),'baseline immutable to RPC owner');
select extensions.ok(not has_function_privilege('authenticated','pickleup_private.capture_first_write_epoch()','EXECUTE'),'client cannot invoke capture helper');
select extensions.ok((select prosecdef and proowner='pickleup_api'::regrole and proconfig @> array['search_path=""'] from pg_proc where oid='public.apply_operation(uuid,text,text,text,text,jsonb,integer)'::regprocedure),'legacy wrapper narrow owner and search path');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
select set_config('test.first_epoch',public.prepare_sync()->>'epoch',true);
select extensions.is(public.apply_operation('10000000-0000-4000-8000-000000000001','user_preferences','self','put','0','{"target_days":3}')->>'status','applied','new-user first epoch preserves protocol1');
select extensions.is(public.apply_operation('10000000-0000-4000-8000-000000000001','user_preferences','self','put','0','{"target_days":3}')->>'replayed','true','same first-epoch receipt replay intact');
reset role;
select extensions.is((select initial_epoch::text from pickleup_private.legacy_write_epochs where user_id='11111111-1111-4111-8111-111111111111'),current_setting('test.first_epoch'),'first head captures immutable baseline');
update pickleup_private.sync_heads set epoch='33333333-3333-4333-8333-333333333333' where user_id='11111111-1111-4111-8111-111111111111';
set local role authenticated;
select extensions.is(public.apply_operation(gen_random_uuid(),kind,'self','put','0','{}')->>'status','upgrade_required','legacy capability denied after rotation: '||kind)
 from unnest(array['user_preferences','practice_checkins','academy_attempts','skill_assessments','training_entries','match_records','personal_plans','user_selections']) as kinds(kind);
select extensions.is(public.apply_operation('10000000-0000-4000-8000-000000000001','user_preferences','self','put','0','{"target_days":3}')->>'code','epoch_required','old exact receipt cannot bypass epoch gate');
select extensions.is((select revision::text from public.user_preferences),'1','rejected writes leave business revision unchanged');
select extensions.is(public.prepare_sync()->>'server_revision','1','rejected writes do not advance cursor');
select extensions.is(public.apply_operation('10000000-0000-4000-8000-000000000002','profiles','self','put','0','{"display_name":"Synthetic","timezone":"UTC"}')->>'status','applied','profile contract remains available');
select extensions.is(public.apply_sync_operation('10000000-0000-4000-8000-000000000003','user_preferences','self','put','1','33333333-3333-4333-8333-333333333333','{"target_days":4}')->>'status','applied','current fenced writer still succeeds');
reset role;
select extensions.is((select count(*)::text from pickleup_private.sync_receipts where user_id='11111111-1111-4111-8111-111111111111'),'3','denied legacy calls add no receipts');
delete from pickleup_private.sync_heads where user_id='11111111-1111-4111-8111-111111111111';
set local role authenticated;
select extensions.is(public.apply_operation('10000000-0000-4000-8000-000000000004','user_preferences','self','put','2','{"target_days":5}')->>'status','upgrade_required','head recreation cannot adopt a new legacy epoch');
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
select extensions.is(public.apply_operation('10000000-0000-4000-8000-000000000005','user_preferences','self','put','0','{"target_days":2}')->>'status','applied','A epoch history does not disable new B first epoch');
select extensions.is((select user_id::text from public.user_preferences),'22222222-2222-4222-8222-222222222222','B sees only own row');
reset role;
select * from extensions.finish();
rollback;
