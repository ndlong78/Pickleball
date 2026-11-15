begin;
-- Advanced personal coach, advanced readiness checks and tactical exercise ids reach 4.0–5.0.
-- Only widens what is accepted: every row already stored stays valid, no row is rewritten,
-- and no grant, owner, RLS policy, RPC or sync rule changes. plan_ok keeps its signature,
-- owner and EXECUTE grants (create or replace); only the ADV exercise id pattern
-- (ADV-PU-037…ADV-PU-9999) and the exercise week limit (1…9999) change.
create or replace function pickleup_private.plan_ok(j jsonb, src text, band text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare e jsonb; i integer:=0; advanced boolean:=src='advanced'; ks text[];
begin
 if not pickleup_private.json_small(j,65536) or not pickleup_private.keys_ok(j,
 array['id','version','createdAt','level','scores','exercises','minutes','checkpoint','completedAt','checkScore'] || case when advanced then array['matchFocus'] else array[]::text[] end,
 array['id','version','createdAt','level','scores','exercises','minutes','checkpoint']) then return false; end if;
 if jsonb_typeof(j->'id')<>'string' or length(j->>'id') not between 1 and 100
 or jsonb_typeof(j->'version')<>'string'
 or (j->>'version')<>(case when advanced then '3.1' else '2.4' end)
 or j->>'level'<>band or not pickleup_private.scores_ok(j->'scores',advanced,20)
 or jsonb_typeof(j->'exercises')<>'array' or jsonb_array_length(j->'exercises')<>3 then return false; end if;
 if not (j->>'createdAt' ~ '^\d{4}-\d{2}-\d{2}T') then return false; end if;
 perform (j->>'createdAt')::timestamptz;
 ks:=case when advanced then array['third','reset','movement','counter','doubles','decision'] else array['serve','return','dink','volley','position','strategy'] end;
 for e in select value from jsonb_array_elements(j->'exercises') loop
  i:=i+1;
  if not pickleup_private.keys_ok(e,array['id','skill','name','setup','instructions','measure','mistake','minutes','baseline','target','skillName'] || case when advanced then array['week','advanced','focus','metric'] else array[]::text[] end,
   array['id','skill','name','setup','instructions','measure','mistake','minutes','baseline','target','skillName'] || case when advanced then array['week','advanced','focus','metric'] else array[]::text[] end)
   or jsonb_typeof(e->'name')<>'string' or length(e->>'name') not between 1 and 200
   or jsonb_typeof(e->'setup')<>'string' or length(e->>'setup')>1000
   or jsonb_typeof(e->'instructions')<>'string' or length(e->>'instructions')>1800
   or jsonb_typeof(e->'measure')<>'string' or length(e->>'measure')>1800
   or jsonb_typeof(e->'mistake')<>'string' or length(e->>'mistake')>1800
   or jsonb_typeof(e->'skillName')<>'string' or length(e->>'skillName')>100
   or e->>'skill' not in ('serve','return','dink','volley','position','strategy')
   or not pickleup_private.int_between(e->'baseline',0,20) or not pickleup_private.int_between(e->'target',0,20)
   or e->'minutes'<>to_jsonb(case when i=3 then 15 else 12 end) then return false; end if;
  if advanced then
   if jsonb_typeof(e->'metric')<>'string' or jsonb_typeof(e->'focus')<>'string' or e->>'focus' not in ('third-drop','transition-reset','serve-return','kitchen-pressure','doubles-coverage','third-choice','advanced-reset','counter-volley','doubles-switch','defense-attack','tactical-choice') or not (e->>'id' ~ '^ADV-PU-(0(3[7-9]|[4-9][0-9])|[1-9][0-9]{2,3})$') or not coalesce(e->>'metric'=any(ks),false)
    or not coalesce(e->'advanced'='true'::jsonb,false) or not pickleup_private.int_between(e->'week',1,9999) then return false; end if;
  elsif not (e->>'id' ~ ('^'||(e->>'skill')||'-[1-4]$')) then return false;
  end if;
 end loop;
 if not pickleup_private.keys_ok(j->'checkpoint',array['skill','baseline','target','attempts'],array['skill','baseline','target','attempts'])
  or not (j->'checkpoint'->>'skill'=any(ks)) or j->'checkpoint'->'attempts'<>'20'::jsonb
  or not pickleup_private.int_between(j->'checkpoint'->'baseline',0,20)
  or not pickleup_private.int_between(j->'checkpoint'->'target',0,20)
  or j->'minutes'<>'{"warmup":10,"drills":[12,12,15],"assessment":6,"cooldown":5}'::jsonb then return false; end if;
 if j ? 'checkScore' and j->'checkScore'<>'null'::jsonb and not pickleup_private.int_between(j->'checkScore',0,20) then return false; end if;
 if j ? 'completedAt' and j->'completedAt'<>'null'::jsonb then
  if jsonb_typeof(j->'completedAt')<>'string' or length(j->>'completedAt')>40 or not (j->>'completedAt' ~ '^\d{4}-\d{2}-\d{2}T') then return false; end if;
  perform (j->>'completedAt')::timestamptz;
 end if;
 if j ? 'matchFocus' and j->'matchFocus'<>'null'::jsonb and not (j->>'matchFocus'=any(ks)) then return false; end if;
 return true;
exception when others then return false;
end $$;
do $advanced_levels$
declare found text;
begin
 -- Each unnamed table check is located by what it checks and must be unique, or the whole
 -- migration stops before changing anything.
 select conname into strict found from pg_catalog.pg_constraint
  where conrelid='public.personal_plans'::regclass and contype='c'
   and pg_catalog.pg_get_constraintdef(oid) like '%advanced%' and pg_catalog.pg_get_constraintdef(oid) like '%3.5–4.0%'
   and pg_catalog.pg_get_constraintdef(oid) not like '%plan_ok%';
 execute pg_catalog.format('alter table public.personal_plans drop constraint %I',found);
 select conname into strict found from pg_catalog.pg_constraint
  where conrelid='public.skill_assessments'::regclass and contype='c'
   and pg_catalog.pg_get_constraintdef(oid) like '%assessment_type%' and pg_catalog.pg_get_constraintdef(oid) like '%3.5–4.0%';
 execute pg_catalog.format('alter table public.skill_assessments drop constraint %I',found);
 select conname into strict found from pg_catalog.pg_constraint
  where conrelid='public.training_entries'::regclass and contype='c'
   and pg_catalog.pg_get_constraintdef(oid) like '%ADV-PU-%';
 execute pg_catalog.format('alter table public.training_entries drop constraint %I',found);
end $advanced_levels$;
alter table public.personal_plans add constraint personal_plans_source_level_check
 check((source='basic' and level_band in ('1.0–2.0','2.0–2.5','2.5–3.0')) or (source='advanced' and level_band in ('3.0–3.5','3.5–4.0','4.0–4.5','4.5–5.0')));
alter table public.skill_assessments add constraint skill_assessments_type_level_check
 check((assessment_type='self' and scale=2) or (assessment_type='stage' and scale=20 and level_band in ('1.0–2.0','2.0–2.5','2.5–3.0')) or (assessment_type='advanced' and scale=20 and level_band in ('3.0–3.5','3.5–4.0','4.0–4.5','4.5–5.0')));
alter table public.training_entries add constraint training_entries_exercise_id_check
 check(exercise_id ~ ('^'||skill||'-[1-4]$') or exercise_id ~ '^ADV-PU-(0(3[7-9]|[4-9][0-9])|[1-9][0-9]{2,3})$');
commit;
