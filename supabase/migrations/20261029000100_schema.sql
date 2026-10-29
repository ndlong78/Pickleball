-- PR1a: private-by-default relational schema. No production provisioning.
create schema if not exists pickleup_private;
revoke all on schema pickleup_private from public, anon, authenticated;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='pickleup_api') then
  create role pickleup_api nologin noinherit nobypassrls;
 elsif exists(select 1 from pg_roles where rolname='pickleup_api' and (rolcanlogin or rolinherit or rolsuper or rolbypassrls or rolcreaterole or rolcreatedb or rolreplication)) then
  raise exception 'pickleup_api must be an unprivileged NOLOGIN role';
 end if;
 if exists(select 1 from pg_auth_members where member='pickleup_api'::regrole) then
  raise exception 'pickleup_api must not inherit other roles';
 end if;
end $$;
grant usage on schema public, auth, pickleup_private to pickleup_api;
grant execute on function auth.uid() to pickleup_api;
alter default privileges in schema pickleup_private revoke execute on functions from public;

create function pickleup_private.keys_ok(j jsonb, allowed text[], required text[] default '{}')
returns boolean language sql immutable set search_path = '' as $$
 select coalesce(jsonb_typeof(j) = 'object'
 and not exists(select 1 from jsonb_object_keys(j) k where not (k = any(allowed)))
 and j ?& required and not exists(select 1 from unnest(required) k where j->k='null'::jsonb), false)
$$;
create function pickleup_private.int_between(j jsonb, lo integer, hi integer)
returns boolean language sql immutable set search_path = '' as $$
 select coalesce(jsonb_typeof(j)='number' and j::text ~ '^-?[0-9]+$'
 and (j::text)::numeric between lo and hi, false)
$$;
create function pickleup_private.json_depth(j jsonb) returns integer
language plpgsql immutable set search_path = '' as $$
declare v jsonb; d integer:=1;
begin
 if jsonb_typeof(j)='object' then
  for v in select value from jsonb_each(j) loop d:=greatest(d,1+pickleup_private.json_depth(v)); end loop;
 elsif jsonb_typeof(j)='array' then
  for v in select value from jsonb_array_elements(j) loop d:=greatest(d,1+pickleup_private.json_depth(v)); end loop;
 end if;
 return d;
end $$;
create function pickleup_private.json_small(j jsonb, cap integer) returns boolean
language sql immutable set search_path = '' as $$
 select j is null or (octet_length(j::text)<=cap and pickleup_private.json_depth(j)<=12)
$$;
create function pickleup_private.scores_ok(j jsonb, advanced boolean, maximum integer)
returns boolean language plpgsql immutable set search_path = '' as $$
declare ks text[] := case when advanced then array['third','reset','movement','counter','doubles','decision']
 else array['serve','return','dink','volley','position','strategy'] end; k text;
begin
 if not pickleup_private.keys_ok(j,ks,ks) then return false; end if;
 foreach k in array ks loop if not pickleup_private.int_between(j->k,0,maximum) then return false; end if; end loop;
 return true;
end $$;
create function pickleup_private.conditions_ok(j jsonb) returns boolean
language sql immutable set search_path = '' as $$
 select j is null or coalesce(pickleup_private.keys_ok(j,array['feed','pace','target'],array['feed','pace','target'])
 and j->>'feed' in ('partner','machine','rally') and j->>'pace' in ('slow','moderate','match')
 and j->>'target' in ('wide','standard','narrow'), false)
$$;
create function pickleup_private.timezone_ok(t text) returns boolean
language sql stable set search_path = '' as $$
 select exists(select 1 from pg_catalog.pg_timezone_names where name=t)
$$;
create function pickleup_private.plan_ok(j jsonb, src text, band text) returns boolean
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
   if jsonb_typeof(e->'metric')<>'string' or jsonb_typeof(e->'focus')<>'string' or e->>'focus' not in ('third-drop','transition-reset','serve-return','kitchen-pressure','doubles-coverage','third-choice','advanced-reset','counter-volley','doubles-switch','defense-attack','tactical-choice') or not (e->>'id' ~ '^ADV-PU-0(3[7-9]|[4-7][0-9]|80)$') or not coalesce(e->>'metric'=any(ks),false)
    or not coalesce(e->'advanced'='true'::jsonb,false) or not pickleup_private.int_between(e->'week',1,80) then return false; end if;
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
create domain pickleup_private.level_band as text check (value in ('1.0–2.0','2.0–2.5','2.5–3.0','3.0–3.5','3.5–4.0'));
create domain pickleup_private.skill as text check (value in ('serve','return','dink','volley','position','strategy'));
create domain pickleup_private.lesson_id as text check (value ~ '^PU-0(0[1-9]|[1-7][0-9]|80)$');
create domain pickleup_private.hash256 as text check (value ~ '^[0-9a-f]{64}$');

create table public.profiles (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null check (revision>=1),
 created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz,
 source_kind text not null default 'manual' check (source_kind in ('manual','legacy')),
 source_fingerprint pickleup_private.hash256,
 source_path text check (length(source_path) between 1 and 500),
 check (source_kind <> 'legacy' or source_fingerprint is not null),
 timezone text not null check (pickleup_private.timezone_ok(timezone)),
 display_name text check (length(display_name)<=80), primary key(user_id)
);
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update on public.profiles to pickleup_api;
create policy read_own on public.profiles for select to authenticated, pickleup_api using (user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy insert_own on public.profiles for insert to pickleup_api with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy update_own on public.profiles for update to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);

create table public.user_preferences (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null check (revision>=1),
 created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz,
 source_kind text not null default 'manual' check (source_kind in ('manual','legacy')),
 source_fingerprint pickleup_private.hash256,
 source_path text check (length(source_path) between 1 and 500),
 check (source_kind <> 'legacy' or source_fingerprint is not null),
 target_days smallint not null check (target_days between 1 and 5), level_band pickleup_private.level_band not null,
 session_minutes smallint not null check (session_minutes in (20,30,45,60)), gentle boolean not null,
 goal_configured boolean, primary key(user_id)
);
alter table public.user_preferences enable row level security;
alter table public.user_preferences force row level security;
revoke all on public.user_preferences from public, anon, authenticated;
grant select on public.user_preferences to authenticated;
grant select, insert, update on public.user_preferences to pickleup_api;
create policy read_own on public.user_preferences for select to authenticated, pickleup_api using (user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy insert_own on public.user_preferences for insert to pickleup_api with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy update_own on public.user_preferences for update to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);

create table public.personal_plans (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null check (revision>=1),
 created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz,
 source_kind text not null default 'manual' check (source_kind in ('manual','legacy')),
 source_fingerprint pickleup_private.hash256,
 source_path text check (length(source_path) between 1 and 500),
 check (source_kind <> 'legacy' or source_fingerprint is not null),
 id uuid not null, source text not null check (source in ('basic','advanced')), legacy_id text check(length(legacy_id)<=100),
 schema_version smallint not null check(schema_version=1), level_band pickleup_private.level_band not null,
 plan_snapshot jsonb not null, check_score smallint check(check_score between 0 and 20), completed_at timestamptz,
 primary key(user_id,id), check(pickleup_private.plan_ok(plan_snapshot,source,level_band)),
 check((source='basic' and level_band in ('1.0–2.0','2.0–2.5','2.5–3.0')) or (source='advanced' and level_band in ('3.0–3.5','3.5–4.0')))
);
alter table public.personal_plans enable row level security;
alter table public.personal_plans force row level security;
revoke all on public.personal_plans from public, anon, authenticated;
grant select on public.personal_plans to authenticated;
grant select, insert, update on public.personal_plans to pickleup_api;
create policy read_own on public.personal_plans for select to authenticated, pickleup_api using (user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy insert_own on public.personal_plans for insert to pickleup_api with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy update_own on public.personal_plans for update to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);

create table public.academy_attempts (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null check (revision>=1),
 created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz,
 source_kind text not null default 'manual' check (source_kind in ('manual','legacy')),
 source_fingerprint pickleup_private.hash256,
 source_path text check (length(source_path) between 1 and 500),
 check (source_kind <> 'legacy' or source_fingerprint is not null),
 id uuid not null, client_event_id uuid not null, lesson_id pickleup_private.lesson_id not null,
 skill pickleup_private.skill not null, level_band pickleup_private.level_band not null, score smallint not null check(score between 0 and 20),
 occurred_at timestamptz, content_version text not null check(length(content_version) between 1 and 40),
 lesson_snapshot jsonb not null check(pickleup_private.keys_ok(lesson_snapshot,array['title','assessment'],array['title']) and jsonb_typeof(lesson_snapshot->'title')='string' and length(lesson_snapshot->>'title') between 1 and 200 and (not (lesson_snapshot ? 'assessment') or (jsonb_typeof(lesson_snapshot->'assessment')='string' and length(lesson_snapshot->>'assessment')<=1800)) and pickleup_private.json_small(lesson_snapshot,16384)),
 conditions jsonb check(pickleup_private.conditions_ok(conditions)), primary key(user_id,id), unique(user_id,client_event_id),
 check(occurred_at is not null or source_kind='legacy')
);
alter table public.academy_attempts enable row level security;
alter table public.academy_attempts force row level security;
revoke all on public.academy_attempts from public, anon, authenticated;
grant select on public.academy_attempts to authenticated;
grant select, insert, update on public.academy_attempts to pickleup_api;
create policy read_own on public.academy_attempts for select to authenticated, pickleup_api using (user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy insert_own on public.academy_attempts for insert to pickleup_api with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy update_own on public.academy_attempts for update to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create index academy_attempts_timeline on public.academy_attempts(user_id,occurred_at desc,id);

create table public.skill_assessments (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null check (revision>=1),
 created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz,
 source_kind text not null default 'manual' check (source_kind in ('manual','legacy')),
 source_fingerprint pickleup_private.hash256,
 source_path text check (length(source_path) between 1 and 500),
 check (source_kind <> 'legacy' or source_fingerprint is not null),
 id uuid not null, client_event_id uuid not null, assessment_type text not null check(assessment_type in ('self','stage','advanced')),
 scale smallint not null, scores jsonb not null, level_band pickleup_private.level_band, occurred_at timestamptz,
 average numeric check(average between 0 and 20), ready boolean, primary key(user_id,id), unique(user_id,client_event_id),
 check(pickleup_private.scores_ok(scores,assessment_type='advanced',case when assessment_type='self' then 2 else 20 end)),
 check((assessment_type='self' and scale=2) or (assessment_type='stage' and scale=20 and level_band in ('1.0–2.0','2.0–2.5','2.5–3.0')) or (assessment_type='advanced' and scale=20 and level_band in ('3.0–3.5','3.5–4.0'))),
 check(assessment_type='self' or level_band is not null), check(occurred_at is not null or source_kind='legacy')
);
alter table public.skill_assessments enable row level security;
alter table public.skill_assessments force row level security;
revoke all on public.skill_assessments from public, anon, authenticated;
grant select on public.skill_assessments to authenticated;
grant select, insert, update on public.skill_assessments to pickleup_api;
create policy read_own on public.skill_assessments for select to authenticated, pickleup_api using (user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy insert_own on public.skill_assessments for insert to pickleup_api with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy update_own on public.skill_assessments for update to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create index skill_assessments_timeline on public.skill_assessments(user_id,occurred_at desc,id);

create table public.legacy_score_snapshots (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null check (revision>=1),
 created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz,
 source_kind text not null default 'manual' check (source_kind in ('manual','legacy')),
 source_fingerprint pickleup_private.hash256,
 source_path text check (length(source_path) between 1 and 500),
 check (source_kind <> 'legacy' or source_fingerprint is not null),
 id uuid not null, source_namespace text not null check(source_namespace in ('weekly','academy')),
 source_key text not null, score smallint not null check(score between 0 and 20), source_date timestamptz,
 primary key(user_id,id), unique(user_id,source_fingerprint,source_path),
 check(source_kind='legacy' and source_path is not null),
 check((source_namespace='weekly' and source_key ~ '^[0-5]$') or (source_namespace='academy' and source_key ~ '^PU-0(0[1-9]|[1-7][0-9]|80)$'))
);
alter table public.legacy_score_snapshots enable row level security;
alter table public.legacy_score_snapshots force row level security;
revoke all on public.legacy_score_snapshots from public, anon, authenticated;
grant select on public.legacy_score_snapshots to authenticated;
grant select, insert, update on public.legacy_score_snapshots to pickleup_api;
create policy read_own on public.legacy_score_snapshots for select to authenticated, pickleup_api using (user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy insert_own on public.legacy_score_snapshots for insert to pickleup_api with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy update_own on public.legacy_score_snapshots for update to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);

create table public.practice_checkins (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null check (revision>=1),
 created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz,
 source_kind text not null default 'manual' check (source_kind in ('manual','legacy')),
 source_fingerprint pickleup_private.hash256,
 source_path text check (length(source_path) between 1 and 500),
 check (source_kind <> 'legacy' or source_fingerprint is not null),
 local_date date not null check(local_date between date '1900-01-01' and date '9999-12-31'),
 status text, minutes smallint, lesson_id pickleup_private.lesson_id, timezone_at_entry text,
 primary key(user_id,local_date),
 check(timezone_at_entry is null or pickleup_private.timezone_ok(timezone_at_entry)),
 check(((deleted_at is not null and status is null and minutes is null) or (deleted_at is null and ((status='done' and minutes between 5 and 180 and minutes is not null) or (status='skipped' and minutes is null)))) is true),
 check(deleted_at is not null or (timezone_at_entry is not null or source_kind='legacy')),
 check(timezone_at_entry is null or local_date <= (now() at time zone timezone_at_entry)::date)
);
alter table public.practice_checkins enable row level security;
alter table public.practice_checkins force row level security;
revoke all on public.practice_checkins from public, anon, authenticated;
grant select on public.practice_checkins to authenticated;
grant select, insert, update on public.practice_checkins to pickleup_api;
create policy read_own on public.practice_checkins for select to authenticated, pickleup_api using (user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy insert_own on public.practice_checkins for insert to pickleup_api with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy update_own on public.practice_checkins for update to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);

create table public.training_entries (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null check (revision>=1),
 created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz,
 source_kind text not null default 'manual' check (source_kind in ('manual','legacy')),
 source_fingerprint pickleup_private.hash256,
 source_path text check (length(source_path) between 1 and 500),
 check (source_kind <> 'legacy' or source_fingerprint is not null),
 id uuid not null, client_event_id uuid not null, legacy_id text check(length(legacy_id)<=100),
 plan_id uuid, legacy_plan_id text check(length(legacy_plan_id)<=100), exercise_id text not null,
 skill pickleup_private.skill not null, level_band pickleup_private.level_band not null, kind text not null check(kind in ('drill','assessment')),
 hits smallint not null check(hits between 0 and 20), attempts smallint not null check(attempts=20),
 note text not null check(length(note)<=240), conditions jsonb check(pickleup_private.conditions_ok(conditions)), occurred_at timestamptz,
 primary key(user_id,id), unique(user_id,client_event_id), foreign key(user_id,plan_id) references public.personal_plans(user_id,id),
 check(exercise_id ~ ('^'||skill||'-[1-4]$') or exercise_id ~ '^ADV-PU-0(3[7-9]|[4-7][0-9]|80)$'),
 check(plan_id is not null or (source_kind='legacy' and legacy_plan_id is not null)), check(occurred_at is not null or source_kind='legacy')
);
alter table public.training_entries enable row level security;
alter table public.training_entries force row level security;
revoke all on public.training_entries from public, anon, authenticated;
grant select on public.training_entries to authenticated;
grant select, insert, update on public.training_entries to pickleup_api;
create policy read_own on public.training_entries for select to authenticated, pickleup_api using (user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy insert_own on public.training_entries for insert to pickleup_api with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy update_own on public.training_entries for update to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create index training_entries_timeline on public.training_entries(user_id,occurred_at desc,id);

create table public.match_records (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null check (revision>=1),
 created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz,
 source_kind text not null default 'manual' check (source_kind in ('manual','legacy')),
 source_fingerprint pickleup_private.hash256,
 source_path text check (length(source_path) between 1 and 500),
 check (source_kind <> 'legacy' or source_fingerprint is not null),
 id uuid not null, client_event_id uuid not null, mode text not null check(mode in ('singles','doubles')),
 ours smallint not null check(ours between 0 and 99), theirs smallint not null check(theirs between 0 and 99),
 focus text not null check(focus in ('third-drop','transition-reset','serve-return','kitchen-pressure','doubles-coverage','third-choice','advanced-reset','counter-volley','doubles-switch','defense-attack','tactical-choice')),
 note text not null check(length(note)<=280), doubles_issue text check(doubles_issue in ('middle','communication','transition','third','none')),
 occurred_at timestamptz, primary key(user_id,id), unique(user_id,client_event_id), check(occurred_at is not null or source_kind='legacy')
);
alter table public.match_records enable row level security;
alter table public.match_records force row level security;
revoke all on public.match_records from public, anon, authenticated;
grant select on public.match_records to authenticated;
grant select, insert, update on public.match_records to pickleup_api;
create policy read_own on public.match_records for select to authenticated, pickleup_api using (user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy insert_own on public.match_records for insert to pickleup_api with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy update_own on public.match_records for update to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create index match_records_timeline on public.match_records(user_id,occurred_at desc,id);

create table public.user_selections (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null check (revision>=1),
 created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz,
 source_kind text not null default 'manual' check (source_kind in ('manual','legacy')),
 source_fingerprint pickleup_private.hash256,
 source_path text check (length(source_path) between 1 and 500),
 check (source_kind <> 'legacy' or source_fingerprint is not null),
 selected_academy_lesson_id pickleup_private.lesson_id, selected_personal_plan_id uuid,
 primary key(user_id), foreign key(user_id,selected_personal_plan_id) references public.personal_plans(user_id,id)
);
alter table public.user_selections enable row level security;
alter table public.user_selections force row level security;
revoke all on public.user_selections from public, anon, authenticated;
grant select on public.user_selections to authenticated;
grant select, insert, update on public.user_selections to pickleup_api;
create policy read_own on public.user_selections for select to authenticated, pickleup_api using (user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy insert_own on public.user_selections for insert to pickleup_api with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy update_own on public.user_selections for update to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);

create table public.legacy_imports (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null check (revision>=1),
 created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz,
 source_kind text not null default 'manual' check (source_kind in ('manual','legacy')),
 source_fingerprint pickleup_private.hash256,
 source_path text check (length(source_path) between 1 and 500),
 check (source_kind <> 'legacy' or source_fingerprint is not null),
 id uuid not null, adapter_version text not null check(length(adapter_version) between 1 and 40),
 source_schema text not null check(length(source_schema) between 1 and 40), manifest_hash pickleup_private.hash256 not null,
 status text not null check(status in ('staging','committed','needs_review')),
 counts jsonb not null check(pickleup_private.keys_ok(counts,array['applied','reused','invalid','unresolved','local_only'],array['applied','reused','invalid','unresolved','local_only']) and pickleup_private.int_between(counts->'applied',0,2147483647) and pickleup_private.int_between(counts->'reused',0,2147483647) and pickleup_private.int_between(counts->'invalid',0,2147483647) and pickleup_private.int_between(counts->'unresolved',0,2147483647) and pickleup_private.int_between(counts->'local_only',0,2147483647)),
 report jsonb not null check(pickleup_private.keys_ok(report,array['codes'],array['codes']) and jsonb_typeof(report->'codes')='array' and pickleup_private.json_small(report,16384)),
 primary key(user_id,id), unique(user_id,source_fingerprint), check(source_kind='legacy')
);
alter table public.legacy_imports enable row level security;
alter table public.legacy_imports force row level security;
revoke all on public.legacy_imports from public, anon, authenticated;
grant select on public.legacy_imports to authenticated;
grant select, insert, update on public.legacy_imports to pickleup_api;
create policy read_own on public.legacy_imports for select to authenticated, pickleup_api using (user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy insert_own on public.legacy_imports for insert to pickleup_api with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy update_own on public.legacy_imports for update to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);

create table public.legacy_import_items (
 user_id uuid not null references auth.users(id) on delete cascade,
 revision bigint not null check (revision>=1),
 created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz,
 source_kind text not null default 'manual' check (source_kind in ('manual','legacy')),
 source_fingerprint pickleup_private.hash256,
 source_path text check (length(source_path) between 1 and 500),
 check (source_kind <> 'legacy' or source_fingerprint is not null),
 id uuid not null, import_id uuid not null, target_kind text not null check(target_kind in ('personal_plans','academy_attempts','skill_assessments','legacy_score_snapshots','practice_checkins','training_entries','match_records','user_preferences','user_selections','profiles')),
 target_key text not null check(length(target_key) between 1 and 100), item_hash pickleup_private.hash256 not null,
 batch_id uuid not null, status text not null check(status in ('applied','reused','invalid','unresolved','local_only')),
 report_code text check(length(report_code)<=80), primary key(user_id,id), unique(user_id,import_id,source_path),
 foreign key(user_id,import_id) references public.legacy_imports(user_id,id), check(source_kind='legacy' and source_path is not null)
);
alter table public.legacy_import_items enable row level security;
alter table public.legacy_import_items force row level security;
revoke all on public.legacy_import_items from public, anon, authenticated;
grant select on public.legacy_import_items to authenticated;
grant select, insert, update on public.legacy_import_items to pickleup_api;
create policy read_own on public.legacy_import_items for select to authenticated, pickleup_api using (user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy insert_own on public.legacy_import_items for insert to pickleup_api with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy update_own on public.legacy_import_items for update to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);

create index academy_attempts_lesson_timeline on public.academy_attempts(user_id,lesson_id,occurred_at desc,id);
create index training_entries_plan on public.training_entries(user_id,plan_id) where plan_id is not null;
create index user_selections_plan on public.user_selections(user_id,selected_personal_plan_id) where selected_personal_plan_id is not null;
create table pickleup_private.sync_heads (
 user_id uuid primary key references auth.users(id) on delete cascade,
 server_revision bigint not null default 0 check(server_revision>=0), epoch uuid not null default gen_random_uuid()
);
create table pickleup_private.sync_receipts (
 user_id uuid not null references auth.users(id) on delete cascade, operation_id uuid not null,
 request_hash text not null, protocol_version integer not null check(protocol_version=1),
 result jsonb not null, created_at timestamptz not null default now(), primary key(user_id,operation_id)
);
create table pickleup_private.sync_changes (
 user_id uuid not null references auth.users(id) on delete cascade, server_revision bigint not null check(server_revision>0),
 entity_kind text not null, entity_key text not null, record_revision bigint not null check(record_revision>0),
 row_snapshot jsonb not null, deleted_at timestamptz, primary key(user_id,server_revision),
 check(entity_kind in ('profiles','user_preferences','personal_plans','academy_attempts','skill_assessments','legacy_score_snapshots','practice_checkins','training_entries','match_records','user_selections','legacy_imports','legacy_import_items'))
);
alter table pickleup_private.sync_heads enable row level security;
alter table pickleup_private.sync_heads force row level security;
revoke all on pickleup_private.sync_heads from public, anon, authenticated;
grant select, insert, update on pickleup_private.sync_heads to pickleup_api;
create policy own on pickleup_private.sync_heads to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
alter table pickleup_private.sync_receipts enable row level security;
alter table pickleup_private.sync_receipts force row level security;
revoke all on pickleup_private.sync_receipts from public, anon, authenticated;
grant select, insert on pickleup_private.sync_receipts to pickleup_api;
create policy own on pickleup_private.sync_receipts to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
alter table pickleup_private.sync_changes enable row level security;
alter table pickleup_private.sync_changes force row level security;
revoke all on pickleup_private.sync_changes from public, anon, authenticated;
grant select, insert on pickleup_private.sync_changes to pickleup_api;
create policy own on pickleup_private.sync_changes to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null) with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);

revoke all on all functions in schema pickleup_private from public, anon, authenticated;
grant execute on all functions in schema pickleup_private to pickleup_api;
-- CHECK expressions run as the caller of SELECT/INSERT too. These pure validators
-- disclose no rows; their schema is not exposed by PostgREST.
grant usage on schema pickleup_private to authenticated;
grant execute on function pickleup_private.timezone_ok(text), pickleup_private.plan_ok(jsonb,text,text),
 pickleup_private.keys_ok(jsonb,text[],text[]), pickleup_private.int_between(jsonb,integer,integer),
 pickleup_private.scores_ok(jsonb,boolean,integer), pickleup_private.json_small(jsonb,integer),
 pickleup_private.json_depth(jsonb), pickleup_private.conditions_ok(jsonb) to authenticated;
