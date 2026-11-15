begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_temp;
select extensions.no_plan();
-- Advanced coach plans, readiness checks and tactical entries reach 4.0–5.0 through the real RPC path.
do $$ begin
 execute format('grant pickleup_api to %I with inherit false, set true', current_user);
end $$;
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','a@pickleup.invalid'),
 ('22222222-2222-4222-8222-222222222222','b@pickleup.invalid');
create function pg_temp.op(kind text, k text, rev text, payload jsonb default '{}'::jsonb, action text default 'put', op_id uuid default gen_random_uuid())
returns jsonb language sql as $$ select public.apply_operation(op_id,kind,k,action,rev,payload,1) $$;
create function pg_temp.as_user(uid text) returns void language plpgsql as $$ begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
end $$;
-- An advanced plan snapshot whose three exercises use the given lesson ids and weeks.
create function pg_temp.adv_plan(lvl text, ids text[], weeks int[]) returns jsonb language sql as $$
 select jsonb_build_object('id','PU31-20261115100000-1','version','3.1','createdAt','2026-11-15T10:00:00Z','level',lvl,
  'scores',jsonb_build_object('third',12,'reset',13,'movement',14,'counter',15,'doubles',16,'decision',17),
  'exercises',(select jsonb_agg(jsonb_build_object('id',ids[i],'week',weeks[i],'advanced',true,
    'focus',(array['third-choice','advanced-reset','counter-volley'])[i],'metric',(array['third','reset','counter'])[i],
    'skill',(array['strategy','position','volley'])[i],'skillName','Kiểm thử','name','Bài kiểm thử','setup','Chuẩn bị','instructions','Hướng dẫn',
    'measure','Cách đo','mistake','Lỗi','minutes',case when i=3 then 15 else 12 end,'baseline',12,'target',15) order by i) from generate_series(1,3) i),
  'minutes',jsonb_build_object('warmup',10,'drills',jsonb_build_array(12,12,15),'assessment',6,'cooldown',5),
  'checkpoint',jsonb_build_object('skill','third','baseline',12,'target',15,'attempts',20),'completedAt',null,'checkScore',null)
$$;
create function pg_temp.adv_row(lvl text, ids text[], weeks int[]) returns jsonb language sql as $$
 select jsonb_build_object('source','advanced','schema_version',1,'level_band',lvl,'plan_snapshot',pg_temp.adv_plan(lvl,ids,weeks))
$$;
-- Function level: ids 037…9999 and weeks up to 9999; everything older stays valid.
select extensions.ok(pickleup_private.plan_ok(pg_temp.adv_plan('3.0–3.5',array['ADV-PU-037','ADV-PU-038','ADV-PU-043'],array[37,38,43]),'advanced','3.0–3.5'),'plan with ADV-PU-037…043 stays valid');
select extensions.ok(pickleup_private.plan_ok(pg_temp.adv_plan('3.5–4.0',array['ADV-PU-057','ADV-PU-070','ADV-PU-080'],array[57,70,80]),'advanced','3.5–4.0'),'plan up to ADV-PU-080 stays valid');
select extensions.ok(pickleup_private.plan_ok(pg_temp.adv_plan('4.0–4.5',array['ADV-PU-081','ADV-PU-090','ADV-PU-092'],array[81,90,92]),'advanced','4.0–4.5'),'4.0–4.5 plan accepted');
select extensions.ok(pickleup_private.plan_ok(pg_temp.adv_plan('4.5–5.0',array['ADV-PU-093','ADV-PU-099','ADV-PU-104'],array[93,99,104]),'advanced','4.5–5.0'),'4.5–5.0 plan accepted');
select extensions.ok(pickleup_private.plan_ok(pg_temp.adv_plan('4.5–5.0',array['ADV-PU-100','ADV-PU-1000','ADV-PU-9999'],array[100,1000,9999]),'advanced','4.5–5.0'),'three- and four-digit lesson ids accepted');
select extensions.ok(not pickleup_private.plan_ok(pg_temp.adv_plan('4.0–4.5',array['ADV-PU-036','ADV-PU-090','ADV-PU-092'],array[36,90,92]),'advanced','4.0–4.5'),'ADV-PU-036 (below the first advanced lesson) rejected');
select extensions.ok(not pickleup_private.plan_ok(pg_temp.adv_plan('4.0–4.5',array['ADV-PU-0081','ADV-PU-090','ADV-PU-092'],array[81,90,92]),'advanced','4.0–4.5'),'zero-padded four-digit id rejected');
select extensions.ok(not pickleup_private.plan_ok(pg_temp.adv_plan('4.0–4.5',array['ADV-PU-10000','ADV-PU-090','ADV-PU-092'],array[81,90,92]),'advanced','4.0–4.5'),'five-digit id rejected');
select extensions.ok(not pickleup_private.plan_ok(pg_temp.adv_plan('4.0–4.5',array['ADV-PU-081','ADV-PU-090','ADV-PU-092'],array[81,90,10000]),'advanced','4.0–4.5'),'week above 9999 rejected');
select extensions.ok(not pickleup_private.plan_ok(pg_temp.adv_plan('4.0–4.5',array['ADV-PU-081','ADV-PU-090','ADV-PU-092'],array[81,90,0]),'advanced','4.0–4.5'),'week 0 rejected');
select extensions.ok(not pickleup_private.plan_ok(pg_temp.adv_plan('3.5–4.0',array['ADV-PU-081','ADV-PU-090','ADV-PU-092'],array[81,90,92]),'advanced','4.0–4.5'),'snapshot level must equal the row level');
select extensions.ok(not pickleup_private.plan_ok(pg_temp.adv_plan('4.0–4.5',array['serve-1','serve-2','serve-3'],array[1,2,3]),'basic','4.0–4.5'),'a basic plan is still a basic plan');
select extensions.ok((select p.prosecdef is false and p.proowner=(select relowner from pg_class where oid='public.personal_plans'::regclass) and p.proconfig @> array['search_path=""'] and p.provolatile='i' from pg_proc p where p.oid='pickleup_private.plan_ok(jsonb,text,text)'::regprocedure),'plan_ok keeps owner, volatility and empty search_path');
select extensions.ok(not has_function_privilege('anon','pickleup_private.plan_ok(jsonb,text,text)','EXECUTE'),'plan_ok still not executable by anon');
-- Table level, through apply_operation as an authenticated user.
set local role authenticated;
select pg_temp.as_user('11111111-1111-4111-8111-111111111111');
select extensions.is(pg_temp.op('personal_plans','cccccccc-cccc-4ccc-8ccc-cccccccccc01','0',pg_temp.adv_row('4.0–4.5',array['ADV-PU-081','ADV-PU-090','ADV-PU-092'],array[81,90,92]))->>'status','applied','4.0–4.5 advanced plan stored');
select extensions.is(pg_temp.op('personal_plans','cccccccc-cccc-4ccc-8ccc-cccccccccc02','0',pg_temp.adv_row('4.5–5.0',array['ADV-PU-093','ADV-PU-099','ADV-PU-104'],array[93,99,104]))->>'status','applied','4.5–5.0 advanced plan stored');
select extensions.is(pg_temp.op('personal_plans','cccccccc-cccc-4ccc-8ccc-cccccccccc03','0',jsonb_set(pg_temp.adv_row('4.5–5.0',array['ADV-PU-093','ADV-PU-099','ADV-PU-104'],array[93,99,104]),'{source}','"basic"'))->>'status','invalid','a basic plan cannot take a 4.0+ level');
select extensions.is(pg_temp.op('personal_plans','cccccccc-cccc-4ccc-8ccc-cccccccccc04','0',pg_temp.adv_row('4.5–5.0',array['ADV-PU-036','ADV-PU-099','ADV-PU-104'],array[36,99,104]))->>'status','invalid','advanced plan with a basic lesson id rejected');
select extensions.is(pg_temp.op('skill_assessments',gen_random_uuid()::text,'0','{"client_event_id":"aaaaaaaa-0000-4000-8000-000000000001","assessment_type":"advanced","scale":20,"scores":{"third":16,"reset":16,"movement":16,"counter":16,"doubles":16,"decision":16},"level_band":"4.0–4.5","average":16,"ready":true,"occurred_at":"2026-11-15T10:00:00Z"}')->>'status','applied','advanced readiness check at 4.0–4.5 stored');
select extensions.is(pg_temp.op('skill_assessments',gen_random_uuid()::text,'0','{"client_event_id":"aaaaaaaa-0000-4000-8000-000000000002","assessment_type":"advanced","scale":20,"scores":{"third":17,"reset":17,"movement":17,"counter":17,"doubles":17,"decision":17},"level_band":"4.5–5.0","average":17,"ready":true,"occurred_at":"2026-11-15T10:00:00Z"}')->>'status','applied','advanced readiness check at 4.5–5.0 stored');
select extensions.is(pg_temp.op('skill_assessments',gen_random_uuid()::text,'0','{"client_event_id":"aaaaaaaa-0000-4000-8000-000000000003","assessment_type":"stage","scale":20,"scores":{"serve":15,"return":15,"dink":15,"volley":15,"position":15,"strategy":15},"level_band":"4.0–4.5","average":15,"ready":true,"occurred_at":"2026-11-15T10:00:00Z"}')->>'status','invalid','a stage (1.0–3.0) check cannot take a 4.0+ level');
select extensions.is(pg_temp.op('training_entries','dddddddd-0000-4ddd-8ddd-000000000001','0','{"client_event_id":"dddddddd-0000-4ddd-8ddd-000000000001","plan_id":"cccccccc-cccc-4ccc-8ccc-cccccccccc01","exercise_id":"ADV-PU-081","skill":"strategy","level_band":"4.0–4.5","kind":"drill","hits":13,"attempts":20,"note":"Kiểm thử","conditions":{"feed":"partner","pace":"slow","target":"wide"},"occurred_at":"2026-11-15T10:00:00Z"}')->>'status','applied','training entry for ADV-PU-081 stored');
select extensions.is(pg_temp.op('training_entries','dddddddd-0000-4ddd-8ddd-000000000002','0','{"client_event_id":"dddddddd-0000-4ddd-8ddd-000000000002","plan_id":"cccccccc-cccc-4ccc-8ccc-cccccccccc01","exercise_id":"ADV-PU-0081","skill":"strategy","level_band":"4.0–4.5","kind":"drill","hits":13,"attempts":20,"note":"Kiểm thử","conditions":{"feed":"partner","pace":"slow","target":"wide"},"occurred_at":"2026-11-15T10:00:00Z"}')->>'status','invalid','malformed advanced exercise id rejected');
select extensions.is(pg_temp.op('training_entries','dddddddd-0000-4ddd-8ddd-000000000003','0','{"client_event_id":"dddddddd-0000-4ddd-8ddd-000000000003","plan_id":"cccccccc-cccc-4ccc-8ccc-cccccccccc01","exercise_id":"ADV-PU-036","skill":"strategy","level_band":"4.0–4.5","kind":"drill","hits":13,"attempts":20,"note":"Kiểm thử","conditions":{"feed":"partner","pace":"slow","target":"wide"},"occurred_at":"2026-11-15T10:00:00Z"}')->>'status','invalid','ADV-PU-036 rejected');
reset role;
select * from extensions.finish();
rollback;
