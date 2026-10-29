-- RPC protocol v1. All writes take the same per-user transactional row lock.
create function pickleup_private.entity_spec(kind text) returns jsonb
language sql immutable set search_path = '' as $$
 select case kind
 when 'profiles' then '{"key": "user_id", "append": false, "defaults": {"display_name": null}, "types": {"timezone": "string", "display_name": "string?"}}'::jsonb
 when 'user_preferences' then '{"key": "user_id", "append": false, "defaults": {"target_days": 3, "level_band": "1.0–2.0", "session_minutes": 45, "gentle": false, "goal_configured": null}, "types": {"target_days": "integer", "level_band": "string", "session_minutes": "integer", "gentle": "boolean", "goal_configured": "boolean?"}}'::jsonb
 when 'personal_plans' then '{"key": "id", "append": false, "defaults": {"schema_version": 1, "check_score": null, "completed_at": null, "legacy_id": null}, "types": {"source": "string", "schema_version": "integer", "level_band": "string", "plan_snapshot": "object", "check_score": "integer?", "completed_at": "timestamp?", "legacy_id": "string?"}}'::jsonb
 when 'academy_attempts' then '{"key": "id", "append": true, "defaults": {"conditions": null}, "types": {"client_event_id": "uuid", "lesson_id": "string", "skill": "string", "level_band": "string", "score": "integer", "occurred_at": "timestamp", "content_version": "string", "lesson_snapshot": "object", "conditions": "object?"}}'::jsonb
 when 'skill_assessments' then '{"key": "id", "append": true, "defaults": {"average": null, "ready": null, "level_band": null}, "types": {"client_event_id": "uuid", "assessment_type": "string", "scale": "integer", "scores": "object", "level_band": "string?", "occurred_at": "timestamp", "average": "number?", "ready": "boolean?"}}'::jsonb
 when 'practice_checkins' then '{"key": "local_date", "append": false, "defaults": {"status": null, "minutes": null, "lesson_id": null, "timezone_at_entry": null}, "types": {"status": "string", "minutes": "integer?", "lesson_id": "string?", "timezone_at_entry": "string"}}'::jsonb
 when 'training_entries' then '{"key": "id", "append": true, "defaults": {"conditions": null, "legacy_id": null, "legacy_plan_id": null, "note": ""}, "types": {"client_event_id": "uuid", "plan_id": "uuid", "exercise_id": "string", "skill": "string", "level_band": "string", "kind": "string", "hits": "integer", "attempts": "integer", "note": "string", "conditions": "object?", "occurred_at": "timestamp"}}'::jsonb
 when 'match_records' then '{"key": "id", "append": true, "defaults": {"note": "", "doubles_issue": null}, "types": {"client_event_id": "uuid", "mode": "string", "ours": "integer", "theirs": "integer", "focus": "string", "note": "string", "doubles_issue": "string?", "occurred_at": "timestamp"}}'::jsonb
 when 'user_selections' then '{"key": "user_id", "append": false, "defaults": {"selected_academy_lesson_id": null, "selected_personal_plan_id": null}, "types": {"selected_academy_lesson_id": "string?", "selected_personal_plan_id": "uuid?"}}'::jsonb
 else null end
$$;
create function pickleup_private.payload_ok(p jsonb, spec jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare k text; v jsonb; ty text;
begin
 if p is null or jsonb_typeof(p)<>'object' or not pickleup_private.json_small(p,262144) then return false; end if;
 for k,v in select key,value from jsonb_each(p) loop
  ty:=spec->'types'->>k;
  if ty is null then return false; end if;
  if v='null'::jsonb then if right(ty,1)<>'?' then return false; end if; continue; end if;
  ty:=replace(ty,'?','');
  if ty in ('string','number','boolean','object') then
   if jsonb_typeof(v)<>ty then return false; end if;
  elsif ty='integer' then
   if not pickleup_private.int_between(v,-2147483648,2147483647) then return false; end if;
  elsif ty='uuid' then
   if jsonb_typeof(v)<>'string' or not ((v#>>'{}') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') then return false; end if;
  elsif ty='timestamp' then
   if jsonb_typeof(v)<>'string' or length(v#>>'{}')>40 or not ((v#>>'{}') ~ '^\d{4}-\d{2}-\d{2}T') then return false; end if;
   perform (v#>>'{}')::timestamptz;
  else return false;
  end if;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function pickleup_private.entity_spec(text), pickleup_private.payload_ok(jsonb,jsonb) from public, anon, authenticated;
grant execute on function pickleup_private.entity_spec(text), pickleup_private.payload_ok(jsonb,jsonb) to pickleup_api;

create function public.apply_operation(
 p_operation_id uuid, p_kind text, p_entity_key text, p_action text,
 p_expected_revision text, p_payload jsonb default '{}'::jsonb, p_protocol_version integer default 1
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 uid uuid:=pickleup_private.caller_uid(); spec jsonb; key_col text; entity_key text; expected bigint;
 old_row jsonb; new_row jsonb; canonical jsonb; result jsonb; request_hash text; prior record;
 head bigint; epoch uuid; cols text; ts timestamptz:=statement_timestamp();
begin
 if uid is null then return jsonb_build_object('status','auth_required'); end if;
 if p_protocol_version is distinct from 1 then return jsonb_build_object('status','upgrade_required'); end if;
 spec:=pickleup_private.entity_spec(p_kind);
 if p_operation_id is null or spec is null or p_action is null or p_action not in ('put','delete','restore')
  or p_expected_revision is null or p_expected_revision !~ '^(0|[1-9][0-9]{0,18})$'
  or not pickleup_private.payload_ok(p_payload,spec) then
  return jsonb_build_object('status','invalid','code','invalid_request');
 end if;
 begin expected:=p_expected_revision::bigint;
  key_col:=spec->>'key';
  if key_col='id' then
   if length(p_entity_key)<>36 then raise invalid_text_representation; end if;
   entity_key:=(p_entity_key::uuid)::text;
  elsif key_col='local_date' then
   if p_entity_key !~ '^\d{4}-\d{2}-\d{2}$' then raise invalid_text_representation; end if;
   entity_key:=(p_entity_key::date)::text;
   if entity_key<>p_entity_key then raise invalid_text_representation; end if;
  else
   if p_entity_key is distinct from 'self' then raise invalid_text_representation; end if;
   entity_key:=uid::text;
  end if;
 exception when invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range then
  return jsonb_build_object('status','invalid','code','invalid_key_or_revision');
 end;
 if entity_key is null or (p_action='delete' and p_payload<>'{}'::jsonb and not (p_kind='practice_checkins' and pickleup_private.keys_ok(p_payload,array['timezone_at_entry']))) then return jsonb_build_object('status','invalid','code','invalid_request'); end if;
 request_hash:=encode(sha256(convert_to(jsonb_build_array(p_kind,entity_key,p_action,expected::text,p_payload,p_protocol_version)::text,'UTF8')),'hex');
 -- INSERT handles concurrent first use; the row lock serializes every mutation,
 -- including failures/receipts, until commit or rollback of the caller transaction.
 begin
  insert into pickleup_private.sync_heads(user_id) values(uid) on conflict(user_id) do nothing;
 exception when foreign_key_violation then return jsonb_build_object('status','auth_required');
 end;
 select h.server_revision,h.epoch into head,epoch from pickleup_private.sync_heads h where h.user_id=uid for update;
 select r.request_hash,r.result into prior from pickleup_private.sync_receipts r where r.user_id=uid and r.operation_id=p_operation_id;
 if found then
  if prior.request_hash<>request_hash then return jsonb_build_object('status','invalid','code','operation_id_reused'); end if;
  return prior.result||jsonb_build_object('replayed',true);
 end if;
 execute format('select to_jsonb(t) from public.%I t where t.user_id=$1 and t.%I::text=$2',p_kind,key_col) into old_row using uid,entity_key;
 if coalesce((old_row->>'revision')::bigint,0)<>expected then
  result:=jsonb_build_object('status','conflict','code','revision_mismatch','row',
   case when old_row is null then null else old_row||jsonb_build_object('revision',old_row->>'revision') end);
 elsif (spec->>'append')::boolean and old_row is not null and p_action<>'delete' then
  result:=jsonb_build_object('status','invalid','code','append_only');
 elsif p_action='restore' and (old_row is null or old_row->>'deleted_at' is null) then
  result:=jsonb_build_object('status','invalid','code','not_deleted');
 elsif old_row->>'deleted_at' is not null and p_action='put' then
  result:=jsonb_build_object('status','conflict','code','explicit_restore_required','row',old_row||jsonb_build_object('revision',old_row->>'revision'));
 elsif p_action='delete' and old_row is null and p_kind<>'practice_checkins' then
  result:=jsonb_build_object('status','conflict','code','not_found');
 else
  begin
   if p_kind='personal_plans' and old_row is not null and
    ((p_payload ? 'plan_snapshot' and p_payload->'plan_snapshot' is distinct from old_row->'plan_snapshot')
    or (p_payload ? 'source' and p_payload->'source' is distinct from old_row->'source')
    or (p_payload ? 'level_band' and p_payload->'level_band' is distinct from old_row->'level_band')) then
     raise check_violation using message='immutable_plan_snapshot';
   end if;
   if p_action='delete' and p_kind='personal_plans' and exists(
    select 1 from public.user_selections s where s.user_id=uid and s.selected_personal_plan_id=entity_key::uuid and s.deleted_at is null
   ) then raise check_violation using message='selected_plan_dependency'; end if;
   new_row:=coalesce(old_row,(spec->'defaults')||jsonb_build_object('created_at',ts,'source_kind','manual'))||p_payload
    ||jsonb_build_object('user_id',uid,key_col,entity_key,'revision',expected+1,'updated_at',ts,
     'deleted_at',case when p_action='delete' then to_jsonb(ts) else 'null'::jsonb end);
   if p_kind='practice_checkins' then
    if p_action='delete' then new_row:=new_row||'{"status":null,"minutes":null,"lesson_id":null}'::jsonb; end if;
    if new_row->>'timezone_at_entry' is null and p_action<>'delete' then raise check_violation using message='timezone_required'; end if;
    if new_row->>'timezone_at_entry' is not null and (entity_key::date)>(ts at time zone (new_row->>'timezone_at_entry'))::date then raise check_violation using message='future_checkin'; end if;
    if new_row->>'timezone_at_entry' is null and entity_key::date>(ts at time zone 'UTC')::date then raise check_violation using message='future_checkin'; end if;
   end if;
   if p_action<>'delete' and p_kind='user_selections' and new_row->>'selected_personal_plan_id' is not null and not exists(
    select 1 from public.personal_plans p where p.user_id=uid and p.id=(new_row->>'selected_personal_plan_id')::uuid and p.deleted_at is null
   ) then raise foreign_key_violation; end if;
   if p_action<>'delete' and p_kind='training_entries' and not exists(
    select 1 from public.personal_plans p where p.user_id=uid and p.id=(new_row->>'plan_id')::uuid and p.deleted_at is null
   ) then raise foreign_key_violation; end if;
   -- Event payload size independent of the larger plan cap.
   if (spec->>'append')::boolean and not pickleup_private.json_small(new_row,16384) then raise check_violation; end if;
   if old_row is null then
    execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I,$1) returning to_jsonb(%I.*)',p_kind,p_kind,p_kind) into canonical using new_row;
   else
    select string_agg(quote_ident(a.attname),',' order by a.attnum) into cols
     from pg_catalog.pg_attribute a where a.attrelid=format('public.%I',p_kind)::regclass and a.attnum>0 and not a.attisdropped
     and a.attname not in ('user_id',key_col);
    execute format('update public.%I t set (%s)=(select %s from jsonb_populate_record(null::public.%I,$1)) where t.user_id=$2 and t.%I::text=$3 returning to_jsonb(t)',p_kind,cols,cols,p_kind,key_col)
     into canonical using new_row,uid,entity_key;
   end if;
   canonical:=canonical||jsonb_build_object('revision',canonical->>'revision');
   update pickleup_private.sync_heads h set server_revision=h.server_revision+1 where h.user_id=uid returning h.server_revision into head;
   insert into pickleup_private.sync_changes(user_id,server_revision,entity_kind,entity_key,record_revision,row_snapshot,deleted_at)
    values(uid,head,p_kind,case when key_col='user_id' then 'self' else entity_key end,expected+1,canonical,(canonical->>'deleted_at')::timestamptz);
   result:=jsonb_build_object('status','applied','row',canonical,'server_revision',head::text,'epoch',epoch,'replayed',false);
  exception
   when integrity_constraint_violation or invalid_text_representation or datetime_field_overflow or invalid_parameter_value or numeric_value_out_of_range then
    -- No SQL error details: foreign IDs, constraint names or values must not leak.
    result:=jsonb_build_object('status','invalid','code','constraint_or_reference');
  end;
 end if;
 insert into pickleup_private.sync_receipts(user_id,operation_id,request_hash,protocol_version,result)
 values(uid,p_operation_id,request_hash,p_protocol_version,result);
 return result;
end $$;

create function public.pull_changes(p_after_revision text default '0', p_limit integer default 100,
 p_high_water text default null, p_epoch uuid default null, p_protocol_version integer default 1)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid:=pickleup_private.caller_uid(); head bigint; high_water bigint; after_rev bigint; epoch uuid; rows jsonb; next_rev bigint;
begin
 if uid is null then return jsonb_build_object('status','auth_required'); end if;
 if p_protocol_version is distinct from 1 then return jsonb_build_object('status','upgrade_required'); end if;
 if p_limit is null or p_limit not between 1 and 200 or p_after_revision is null or p_after_revision !~ '^(0|[1-9][0-9]{0,18})$'
  or (p_high_water is not null and p_high_water !~ '^(0|[1-9][0-9]{0,18})$') then return jsonb_build_object('status','invalid'); end if;
 begin after_rev:=p_after_revision::bigint; high_water:=p_high_water::bigint;
 exception when numeric_value_out_of_range then return jsonb_build_object('status','invalid'); end;
 select h.server_revision,h.epoch into head,epoch from pickleup_private.sync_heads h where h.user_id=uid;
 head:=coalesce(head,0);
 if (p_epoch is not null and p_epoch is distinct from epoch) or (after_rev>0 and p_epoch is null) or after_rev>head then
  return jsonb_build_object('status','reset_required','epoch',epoch);
 end if;
 high_water:=coalesce(high_water,head);
 if high_water>head or high_water<after_rev then return jsonb_build_object('status','invalid'); end if;
 select coalesce(jsonb_agg(jsonb_build_object('server_revision',c.server_revision::text,'entity_kind',c.entity_kind,'entity_key',c.entity_key,
  'record_revision',c.record_revision::text,'row',c.row_snapshot) order by c.server_revision),'[]'::jsonb),coalesce(max(c.server_revision),after_rev)
 into rows,next_rev from (select * from pickleup_private.sync_changes s where s.user_id=uid and s.server_revision>after_rev and s.server_revision<=high_water order by s.server_revision limit p_limit) c;
 return jsonb_build_object('status','ok','changes',rows,'next_revision',next_rev::text,'high_water',high_water::text,'epoch',epoch,'has_more',next_rev<high_water);
end $$;

-- Upgrade path from schema-only migration: snapshot any existing rows into the
-- same per-user log before exposing RPCs. Empty first installs do no work.
do $$
declare kind text; key_col text; r record; n bigint;
begin
 foreach kind in array array['profiles','user_preferences','personal_plans','academy_attempts','skill_assessments','legacy_score_snapshots','practice_checkins','training_entries','match_records','user_selections','legacy_imports','legacy_import_items'] loop
  key_col:=case when kind in ('profiles','user_preferences','user_selections') then 'user_id' when kind='practice_checkins' then 'local_date' else 'id' end;
  for r in execute format('select user_id,to_jsonb(t) as body from public.%I t order by user_id,%I',kind,key_col) loop
   insert into pickleup_private.sync_heads(user_id) values(r.user_id) on conflict(user_id) do nothing;
   perform 1 from pickleup_private.sync_heads where user_id=r.user_id for update;
   update pickleup_private.sync_heads set server_revision=server_revision+1 where user_id=r.user_id returning server_revision into n;
   insert into pickleup_private.sync_changes(user_id,server_revision,entity_kind,entity_key,record_revision,row_snapshot,deleted_at)
    values(r.user_id,n,kind,case when key_col='user_id' then 'self' else r.body->>key_col end,(r.body->>'revision')::bigint,
     r.body||jsonb_build_object('revision',r.body->>'revision'),(r.body->>'deleted_at')::timestamptz);
  end loop;
 end loop;
end $$;

-- Ownership gives these functions only a NOLOGIN/non-BYPASSRLS role's rights.
-- CREATE is needed solely for ALTER OWNER, then revoked.
grant create on schema public to pickleup_api;
-- PG16+ CREATEROLE creators have ADMIN but not necessarily SET membership.
-- Only the migration actor gets temporary SET, never authenticated/anon.
do $$ begin
 execute format('grant pickleup_api to %I with inherit false, set true', current_user);
end $$;
alter function public.apply_operation(uuid,text,text,text,text,jsonb,integer) owner to pickleup_api;
alter function public.pull_changes(text,integer,text,uuid,integer) owner to pickleup_api;
do $$ begin
 execute format('grant pickleup_api to %I with inherit false, set false', current_user);
end $$;
revoke create on schema public from pickleup_api;
revoke all on function public.apply_operation(uuid,text,text,text,text,jsonb,integer), public.pull_changes(text,integer,text,uuid,integer) from public, anon;
grant execute on function public.apply_operation(uuid,text,text,text,text,jsonb,integer), public.pull_changes(text,integer,text,uuid,integer) to authenticated;

notify pgrst, 'reload schema';
