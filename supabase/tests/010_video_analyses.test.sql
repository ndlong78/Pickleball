begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_temp;
select extensions.no_plan();
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','video-a@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','video-b@example.invalid');
create function pg_temp.as_user(uid text) returns void language plpgsql as $$ begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
end $$;
create function pg_temp.ok_payload() returns jsonb language sql as $$ select '{"analysis_version":"ready-v1","skill":"position","status":"ok","view_kind":"side","knee_angle":168.4,"hip_angle":150,"stance_ratio":null,"hand_height":0.05,"finding_primary":"knee_straight","finding_secondary":"hands_low","frames_total":40,"frames_valid":36,"engine":"mediapipe-1.2.3-pose_landmarker_lite","occurred_at":"2026-11-28T03:00:00Z"}'::jsonb $$;
grant execute on function pg_temp.as_user(text), pg_temp.ok_payload() to authenticated, anon;

-- Shape, ownership and grants.
select extensions.ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='public.video_analyses'::regclass),'RLS enabled and forced');
select extensions.ok(not has_table_privilege('authenticated','public.video_analyses','INSERT') and not has_table_privilege('authenticated','public.video_analyses','UPDATE') and not has_table_privilege('authenticated','public.video_analyses','DELETE'),'clients cannot write the table directly');
select extensions.ok(not has_table_privilege('anon','public.video_analyses','SELECT'),'anon cannot read the table');
select extensions.ok(not exists(select 1 from pg_attribute where attrelid='public.video_analyses'::regclass and attnum>0 and not attisdropped and attname ~ '(video|frame_data|landmark|blob|url)'),'no column can hold video, frames or landmarks');
select extensions.ok((select confdeltype='c' from pg_constraint where conrelid='public.video_analyses'::regclass and contype='f' and confrelid='auth.users'::regclass),'owner FK cascades on account deletion');
select extensions.ok(not exists(select 1 from pg_constraint where conrelid='pickleup_private.sync_changes'::regclass and contype='c' and pg_get_constraintdef(oid) like '%video_analyses%'),'not an entity kind of the shared sync log');
select extensions.is(pickleup_private.entity_spec('video_analyses'),null,'legacy and fenced writers have no spec for it');
select extensions.ok((select bool_and(p.prosecdef and p.proowner='pickleup_api'::regrole and p.proconfig @> array['search_path=""']) from pg_proc p where p.oid in (
 'public.record_video_analysis(uuid,jsonb,integer)'::regprocedure,'public.list_video_analyses(integer,timestamptz,integer)'::regprocedure,'public.delete_video_analysis(uuid,integer)'::regprocedure)),'RPCs are narrow-owner definers with empty search path');
select extensions.ok(has_function_privilege('authenticated','public.record_video_analysis(uuid,jsonb,integer)','EXECUTE') and has_function_privilege('authenticated','public.list_video_analyses(integer,timestamptz,integer)','EXECUTE') and has_function_privilege('authenticated','public.delete_video_analysis(uuid,integer)','EXECUTE'),'authenticated may call the RPCs');
select extensions.ok(not has_function_privilege('anon','public.record_video_analysis(uuid,jsonb,integer)','EXECUTE') and not has_function_privilege('anon','public.list_video_analyses(integer,timestamptz,integer)','EXECUTE') and not has_function_privilege('anon','public.delete_video_analysis(uuid,integer)','EXECUTE'),'anon may not call the RPCs');
select extensions.ok(not has_function_privilege('authenticated','pickleup_private.video_analysis_row(public.video_analyses)','EXECUTE'),'row serializer is private');

set local role authenticated;
select pg_temp.as_user('11111111-1111-4111-8111-111111111111');
select extensions.is(public.record_video_analysis('aaaaaaaa-0000-4000-8000-000000000001',pg_temp.ok_payload())->>'status','applied','A records an analysis');
select extensions.is(public.record_video_analysis('aaaaaaaa-0000-4000-8000-000000000001',pg_temp.ok_payload())->>'replayed','true','same event id and payload replays');
select extensions.is(public.record_video_analysis('aaaaaaaa-0000-4000-8000-000000000001',pg_temp.ok_payload()||'{"knee_angle":140}')->>'code','operation_id_reused','same event id with other payload is refused');
select extensions.is((public.record_video_analysis('aaaaaaaa-0000-4000-8000-000000000001',pg_temp.ok_payload())->'row'->>'knee_angle'),'168.4','stored values are returned');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload()||'{"landmarks":[]}')->>'code','invalid_request','unknown keys such as landmarks are refused');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload()-'skill')->>'code','invalid_request','required keys are enforced');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload()||'{"knee_angle":"168"}')->>'code','invalid_request','numbers must be JSON numbers');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload()||'{"frames_total":1.5}')->>'code','invalid_request','frame counts must be integers');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload()||'{"occurred_at":"2026-13-40T00:00:00Z"}')->>'code','invalid_request','invalid time is refused');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload()||'{"occurred_at":"2030-01-01T00:00:00Z"}')->>'code','future_time','far future time is refused');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload()||'{"skill":"smash"}')->>'code','constraint','unknown skill is refused');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload()||'{"knee_angle":400}')->>'code','constraint','angle out of range is refused');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload()||'{"frames_valid":50}')->>'code','constraint','valid frames cannot exceed total');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload()||'{"finding_secondary":"knee_straight"}')->>'code','constraint','two findings must differ');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload()||'{"finding_primary":"bad_posture"}')->>'code','constraint','finding ids come from an allowlist');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload()||'{"engine":"engine · with unicode"}')->>'code','constraint','engine id is plain ASCII');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload()||'{"status":"insufficient"}')->>'code','constraint','insufficient result cannot carry metrics');
select extensions.is(public.record_video_analysis(gen_random_uuid(),'{"analysis_version":"ready-v1","skill":"position","status":"insufficient","frames_total":15,"frames_valid":0,"engine":"x","occurred_at":"2026-11-28T03:01:00Z"}')->>'status','applied','insufficient result without metrics is stored');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload(),2)->>'status','upgrade_required','unknown protocol is refused');
select extensions.is(public.record_video_analysis(null,pg_temp.ok_payload())->>'code','invalid_request','event id is required');
select extensions.is(jsonb_array_length(public.list_video_analyses()->'rows'),2,'A lists own rows');
select extensions.is(public.list_video_analyses()->'rows'->0->>'status','insufficient','newest first');
select extensions.is(jsonb_array_length(public.list_video_analyses(1)->'rows'),1,'limit applies');
select extensions.is(jsonb_array_length(public.list_video_analyses(50,'2026-11-28T03:00:30Z')->'rows'),1,'p_before pages by occurred_at');
select extensions.is(public.list_video_analyses(0)->>'code','invalid_request','limit must be 1..200');
select extensions.ok(not (public.list_video_analyses()->'rows'->0 ? 'request_hash') and not (public.list_video_analyses()->'rows'->0 ? 'user_id'),'list hides request hash and owner');

select pg_temp.as_user('22222222-2222-4222-8222-222222222222');
select extensions.is(jsonb_array_length(public.list_video_analyses()->'rows'),0,'B cannot list A rows');
select extensions.is((select count(*)::int from public.video_analyses),0,'B cannot select A rows');
select extensions.is(public.delete_video_analysis((select id from public.video_analyses limit 1))->>'status','invalid','B sees no A id to delete');
reset role;
select set_config('pickleup.test_a_row',(select id::text from public.video_analyses where client_event_id='aaaaaaaa-0000-4000-8000-000000000001' and user_id='11111111-1111-4111-8111-111111111111'),true);
set local role authenticated;
select pg_temp.as_user('22222222-2222-4222-8222-222222222222');
select extensions.is(public.delete_video_analysis(current_setting('pickleup.test_a_row')::uuid)->>'status','not_found','B cannot delete A row by id');
select extensions.is(public.record_video_analysis('aaaaaaaa-0000-4000-8000-000000000001',pg_temp.ok_payload())->>'replayed','false','event ids are scoped per account');
select pg_temp.as_user('11111111-1111-4111-8111-111111111111');
select extensions.is(public.delete_video_analysis(current_setting('pickleup.test_a_row')::uuid)->>'status','deleted','A deletes own row');
select extensions.is(public.delete_video_analysis(current_setting('pickleup.test_a_row')::uuid)->>'status','not_found','second delete finds nothing');
select extensions.is(jsonb_array_length(public.list_video_analyses()->'rows'),1,'deleted row is gone');
reset role;

-- Quota: 2000 rows per account, counted under the per-account lock.
insert into public.video_analyses(user_id,client_event_id,request_hash,occurred_at,analysis_version,skill,status,frames_total,frames_valid,engine)
 select '11111111-1111-4111-8111-111111111111',gen_random_uuid(),repeat('a',64),'2026-11-01','ready-v1','position','insufficient',0,0,'x' from generate_series(1,1999);
set local role authenticated;
select pg_temp.as_user('11111111-1111-4111-8111-111111111111');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload())->>'status','quota_exceeded','2001st row is refused');
select pg_temp.as_user('22222222-2222-4222-8222-222222222222');
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload())->>'status','applied','quota is per account');
reset role;

set local role anon;
select extensions.throws_ok($$select public.record_video_analysis(gen_random_uuid(),'{}'::jsonb)$$,'42501',null,'anon record denied');
select extensions.throws_ok($$select public.list_video_analyses()$$,'42501',null,'anon list denied');
select extensions.throws_ok($$select count(*) from public.video_analyses$$,'42501',null,'anon table read denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated"}',true);
select extensions.is(public.record_video_analysis(gen_random_uuid(),pg_temp.ok_payload())->>'status','auth_required','token without subject is refused');
reset role;

delete from auth.users where id='11111111-1111-4111-8111-111111111111';
select extensions.is((select count(*)::int from public.video_analyses where user_id='11111111-1111-4111-8111-111111111111'),0,'account deletion removes all of its analyses');
select extensions.is((select count(*)::int from public.video_analyses where user_id='22222222-2222-4222-8222-222222222222'),2,'other accounts keep theirs');
select * from extensions.finish();
rollback;
