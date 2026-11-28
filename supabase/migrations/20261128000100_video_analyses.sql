begin;
-- Video movement analysis results (ADR-0006, ADR-0007, AGENTS [PROD-11]).
-- Stores only the summary a phone computed on-device: never video, frames or landmarks.
-- Separate store, NOT an entity kind of sync_changes: deployed clients abort a pull on any
-- unknown entity_kind (modules/data/pull-controller.js), so a new kind in the shared log would
-- break their goal/check-in/plan sync. These rows are reached only through the three RPCs below.
create table public.video_analyses (
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null default gen_random_uuid(),
 client_event_id uuid not null,
 request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default statement_timestamp(),
 occurred_at timestamptz not null check (occurred_at >= timestamptz '2026-01-01 00:00:00+00'),
 analysis_version text not null check (analysis_version ~ '^[a-z][a-z0-9]{0,15}-v[1-9][0-9]{0,3}$'),
 skill text not null check (skill in ('serve','return','dink','volley','position','strategy')),
 status text not null check (status in ('ok','insufficient')),
 view_kind text check (view_kind in ('side','front','oblique','unknown')),
 knee_angle numeric(4,1) check (knee_angle between 0 and 180),
 hip_angle numeric(4,1) check (hip_angle between 0 and 180),
 stance_ratio numeric(5,2) check (stance_ratio between 0 and 20),
 hand_height numeric(5,2) check (hand_height between -10 and 10),
 finding_primary text check (finding_primary in ('knee_straight','knee_soft','knee_deep','hip_upright','stance_narrow','stance_wide','hands_low')),
 finding_secondary text check (finding_secondary in ('knee_straight','knee_soft','knee_deep','hip_upright','stance_narrow','stance_wide','hands_low')),
 frames_total smallint not null check (frames_total between 0 and 1000),
 frames_valid smallint not null check (frames_valid between 0 and 1000),
 engine text not null check (engine ~ '^[A-Za-z0-9@./:+_ -]{1,64}$'),
 primary key (user_id, id),
 unique (user_id, client_event_id),
 check (frames_valid <= frames_total),
 check (finding_secondary is null or (finding_primary is not null and finding_secondary <> finding_primary)),
 check (status = 'ok' or (view_kind is null and knee_angle is null and hip_angle is null and stance_ratio is null
   and hand_height is null and finding_primary is null))
);
alter table public.video_analyses enable row level security;
alter table public.video_analyses force row level security;
revoke all on public.video_analyses from public, anon, authenticated;
grant select on public.video_analyses to authenticated;
grant select, insert, delete on public.video_analyses to pickleup_api;
create policy read_own on public.video_analyses for select to authenticated, pickleup_api using (user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy insert_own on public.video_analyses for insert to pickleup_api with check(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create policy delete_own on public.video_analyses for delete to pickleup_api using(user_id=(select auth.uid()) and (select auth.uid()) is not null);
create index video_analyses_timeline on public.video_analyses(user_id, occurred_at desc, id desc);

create function pickleup_private.video_analysis_row(r public.video_analyses) returns jsonb
language sql immutable set search_path = '' as $$
 select jsonb_build_object('id',r.id,'client_event_id',r.client_event_id,'occurred_at',r.occurred_at,'created_at',r.created_at,
  'analysis_version',r.analysis_version,'skill',r.skill,'status',r.status,'view_kind',r.view_kind,
  'knee_angle',r.knee_angle,'hip_angle',r.hip_angle,'stance_ratio',r.stance_ratio,'hand_height',r.hand_height,
  'finding_primary',r.finding_primary,'finding_secondary',r.finding_secondary,
  'frames_total',r.frames_total,'frames_valid',r.frames_valid,'engine',r.engine)
$$;

-- Append one analysis. Idempotent per client_event_id: the same id with the same payload replays,
-- with a different payload it is refused. At most 2000 rows per account (open sign-up).
create function pickleup_private.record_video_analysis(p_client_event_id uuid, p_payload jsonb, p_protocol_version integer default 1)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 uid uuid:=pickleup_private.caller_uid(); digest text; existing public.video_analyses; inserted public.video_analyses; n integer; at timestamptz;
 allowed text[]:=array['analysis_version','skill','status','frames_total','frames_valid','engine','occurred_at','view_kind',
  'knee_angle','hip_angle','stance_ratio','hand_height','finding_primary','finding_secondary'];
 required text[]:=array['analysis_version','skill','status','frames_total','frames_valid','engine','occurred_at'];
 k text;
begin
 if uid is null then return jsonb_build_object('status','auth_required'); end if;
 if p_protocol_version is distinct from 1 then return jsonb_build_object('status','upgrade_required'); end if;
 if p_client_event_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object'
  or not pickleup_private.json_small(p_payload,4096) or not pickleup_private.keys_ok(p_payload,allowed,required) then
  return jsonb_build_object('status','invalid','code','invalid_request');
 end if;
 foreach k in array array['analysis_version','skill','status','engine','occurred_at'] loop
  if jsonb_typeof(p_payload->k)<>'string' then return jsonb_build_object('status','invalid','code','invalid_request'); end if;
 end loop;
 foreach k in array array['view_kind','finding_primary','finding_secondary'] loop
  if p_payload ? k and jsonb_typeof(p_payload->k) not in ('string','null') then return jsonb_build_object('status','invalid','code','invalid_request'); end if;
 end loop;
 foreach k in array array['knee_angle','hip_angle','stance_ratio','hand_height'] loop
  if p_payload ? k and jsonb_typeof(p_payload->k) not in ('number','null') then return jsonb_build_object('status','invalid','code','invalid_request'); end if;
 end loop;
 if not pickleup_private.int_between(p_payload->'frames_total',0,1000) or not pickleup_private.int_between(p_payload->'frames_valid',0,1000)
  or length(p_payload->>'occurred_at')>40 or (p_payload->>'occurred_at') !~ '^\d{4}-\d{2}-\d{2}T' then
  return jsonb_build_object('status','invalid','code','invalid_request');
 end if;
 begin
  at:=(p_payload->>'occurred_at')::timestamptz;
 exception when invalid_text_representation or datetime_field_overflow or invalid_datetime_format then
  return jsonb_build_object('status','invalid','code','invalid_request');
 end;
 if at>statement_timestamp()+interval '1 day' then return jsonb_build_object('status','invalid','code','future_time'); end if;
 digest:=encode(sha256(convert_to(jsonb_build_array(p_client_event_id,p_payload,p_protocol_version)::text,'UTF8')),'hex');
 -- Serialise this account's writes so the replay check and the quota cannot race.
 perform pg_advisory_xact_lock(hashtextextended('pickleup-video:'||uid::text,0));
 select * into existing from public.video_analyses v where v.user_id=uid and v.client_event_id=p_client_event_id;
 if found then
  if existing.request_hash<>digest then return jsonb_build_object('status','invalid','code','operation_id_reused'); end if;
  return jsonb_build_object('status','applied','replayed',true,'row',pickleup_private.video_analysis_row(existing));
 end if;
 select count(*) into n from public.video_analyses v where v.user_id=uid;
 if n>=2000 then return jsonb_build_object('status','quota_exceeded','limit',2000); end if;
 begin
  insert into public.video_analyses(user_id,client_event_id,request_hash,occurred_at,analysis_version,skill,status,view_kind,
   knee_angle,hip_angle,stance_ratio,hand_height,finding_primary,finding_secondary,frames_total,frames_valid,engine)
  values(uid,p_client_event_id,digest,at,p_payload->>'analysis_version',p_payload->>'skill',p_payload->>'status',p_payload->>'view_kind',
   (p_payload->>'knee_angle')::numeric,(p_payload->>'hip_angle')::numeric,(p_payload->>'stance_ratio')::numeric,(p_payload->>'hand_height')::numeric,
   p_payload->>'finding_primary',p_payload->>'finding_secondary',(p_payload->>'frames_total')::smallint,(p_payload->>'frames_valid')::smallint,p_payload->>'engine')
  returning * into inserted;
 exception
  when integrity_constraint_violation or invalid_text_representation or numeric_value_out_of_range then
   -- No SQL error details: constraint names or values must not leak.
   return jsonb_build_object('status','invalid','code','constraint');
 end;
 return jsonb_build_object('status','applied','replayed',false,'row',pickleup_private.video_analysis_row(inserted));
end $$;

-- Own rows, newest first. p_before pages by occurred_at.
create function pickleup_private.list_video_analyses(p_limit integer default 50, p_before timestamptz default null, p_protocol_version integer default 1)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid:=pickleup_private.caller_uid(); rows jsonb;
begin
 if uid is null then return jsonb_build_object('status','auth_required'); end if;
 if p_protocol_version is distinct from 1 then return jsonb_build_object('status','upgrade_required'); end if;
 if p_limit is null or p_limit not between 1 and 200 then return jsonb_build_object('status','invalid','code','invalid_request'); end if;
 select coalesce(jsonb_agg(pickleup_private.video_analysis_row(v) order by v.occurred_at desc, v.id desc),'[]'::jsonb) into rows
  from (select * from public.video_analyses x where x.user_id=uid and (p_before is null or x.occurred_at<p_before)
        order by x.occurred_at desc, x.id desc limit p_limit) v;
 return jsonb_build_object('status','ok','rows',rows);
end $$;

-- Hard delete of one own row: nothing syncs these rows, so no tombstone is needed.
-- Encrypted backups still hold it until they expire (35 days, docs/ACCOUNT_OPERATIONS.md).
create function pickleup_private.delete_video_analysis(p_id uuid, p_protocol_version integer default 1)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid:=pickleup_private.caller_uid(); gone uuid;
begin
 if uid is null then return jsonb_build_object('status','auth_required'); end if;
 if p_protocol_version is distinct from 1 then return jsonb_build_object('status','upgrade_required'); end if;
 if p_id is null then return jsonb_build_object('status','invalid','code','invalid_request'); end if;
 delete from public.video_analyses v where v.user_id=uid and v.id=p_id returning v.id into gone;
 if gone is null then return jsonb_build_object('status','not_found'); end if;
 return jsonb_build_object('status','deleted','id',gone);
end $$;

-- Narrow owner, same pattern as the event and plan writers.
grant create on schema public,pickleup_private to pickleup_api;
do $$ begin execute format('grant pickleup_api to %I with inherit false, set true',current_user);end $$;
alter function pickleup_private.video_analysis_row(public.video_analyses) owner to pickleup_api;
alter function pickleup_private.record_video_analysis(uuid,jsonb,integer) owner to pickleup_api;
alter function pickleup_private.list_video_analyses(integer,timestamptz,integer) owner to pickleup_api;
alter function pickleup_private.delete_video_analysis(uuid,integer) owner to pickleup_api;
set role pickleup_api;
revoke all on function pickleup_private.video_analysis_row(public.video_analyses) from public,anon,authenticated;
revoke all on function pickleup_private.record_video_analysis(uuid,jsonb,integer) from public,anon,authenticated;
revoke all on function pickleup_private.list_video_analyses(integer,timestamptz,integer) from public,anon,authenticated;
revoke all on function pickleup_private.delete_video_analysis(uuid,integer) from public,anon,authenticated;
grant execute on function pickleup_private.record_video_analysis(uuid,jsonb,integer) to authenticated;
grant execute on function pickleup_private.list_video_analyses(integer,timestamptz,integer) to authenticated;
grant execute on function pickleup_private.delete_video_analysis(uuid,integer) to authenticated;
alter function pickleup_private.record_video_analysis(uuid,jsonb,integer) set schema public;
alter function pickleup_private.list_video_analyses(integer,timestamptz,integer) set schema public;
alter function pickleup_private.delete_video_analysis(uuid,integer) set schema public;
reset role;
do $$ begin execute format('grant pickleup_api to %I with inherit false, set false',current_user);end $$;
revoke create on schema public,pickleup_private from pickleup_api;
notify pgrst,'reload schema';
commit;
