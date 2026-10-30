-- PR3b: local/staging contract only. No RLS or client table-write grant changes.
-- Factor the protocol1 implementation into one private worker; manual hashes stay
-- byte-for-byte compatible, and legacy context is callable only by the RPC owner.
alter table public.legacy_imports add column source_item_count bigint not null default 0 check(source_item_count between 0 and 10737418235);
-- Preserve any pre-existing operator/test manifests and publish the schema
-- projection change through the same per-user commit counter.
do $$ declare r record; body jsonb; n bigint; begin
 for r in select user_id,id from public.legacy_imports order by user_id,id loop
  insert into pickleup_private.sync_heads(user_id) values(r.user_id) on conflict(user_id) do nothing;
  perform 1 from pickleup_private.sync_heads where user_id=r.user_id for update;
  update public.legacy_imports set source_item_count=(counts->>'applied')::bigint+(counts->>'reused')::bigint+(counts->>'invalid')::bigint+(counts->>'unresolved')::bigint+(counts->>'local_only')::bigint,revision=revision+1,updated_at=statement_timestamp() where user_id=r.user_id and id=r.id returning to_jsonb(legacy_imports.*) into body;
  update pickleup_private.sync_heads set server_revision=server_revision+1 where user_id=r.user_id returning server_revision into n;
  insert into pickleup_private.sync_changes(user_id,server_revision,entity_kind,entity_key,record_revision,row_snapshot,deleted_at) values(r.user_id,n,'legacy_imports',r.id::text,(body->>'revision')::bigint,body||jsonb_build_object('revision',body->>'revision'),(body->>'deleted_at')::timestamptz);
 end loop;
end $$;

create function pickleup_private.operation_core(
 p_operation_id uuid, p_kind text, p_entity_key text, p_action text,
 p_expected_revision text, p_payload jsonb default '{}'::jsonb, p_protocol_version integer default 1, p_import_context jsonb default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 uid uuid:=pickleup_private.caller_uid(); spec jsonb; key_col text; entity_key text; expected bigint;
 old_row jsonb; new_row jsonb; canonical jsonb; result jsonb; request_hash text; prior record;
 head bigint; epoch uuid; cols text; ts timestamptz:=statement_timestamp();
begin
 if uid is null then return jsonb_build_object('status','auth_required'); end if;
 if p_protocol_version is distinct from 1 then return jsonb_build_object('status','upgrade_required'); end if;
 spec:=case when p_import_context is not null and p_kind='legacy_score_snapshots' then
  '{"key":"id","append":true,"defaults":{"source_date":null},"types":{"source_namespace":"string","source_key":"string","score":"integer","source_date":"timestamp?"}}'::jsonb
  else pickleup_private.entity_spec(p_kind) end;
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
 if p_import_context is not null then request_hash:=encode(sha256(convert_to(jsonb_build_array(request_hash,p_import_context)::text,'UTF8')),'hex'); end if;
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
   if p_import_context is not null then new_row:=new_row||jsonb_build_object('source_kind','legacy','source_fingerprint',p_import_context->>'fingerprint','source_path',p_import_context->>'path'); end if;
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

-- Custom version8 UUIDs, stable per owner/fingerprint/category/path. Not a secret.
create function pickleup_private.import_uuid(owner_id uuid, fingerprint text, category text, path text default '') returns uuid
language sql immutable set search_path='' as $$
 select (substr(h,1,8)||'-'||substr(h,9,4)||'-8'||substr(h,14,3)||'-8'||substr(h,18,3)||'-'||substr(h,21,12))::uuid
 from (select encode(sha256(convert_to(jsonb_build_array(owner_id,fingerprint,category,path)::text,'UTF8')),'hex') as h) s
$$;
create function pickleup_private.import_change(kind text, entity_key text, body jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare n bigint; canonical jsonb;
begin
 canonical:=body||jsonb_build_object('revision',body->>'revision');
 update pickleup_private.sync_heads set server_revision=server_revision+1 where user_id=pickleup_private.caller_uid() returning server_revision into n;
 insert into pickleup_private.sync_changes(user_id,server_revision,entity_kind,entity_key,record_revision,row_snapshot,deleted_at)
 values(pickleup_private.caller_uid(),n,kind,entity_key,(body->>'revision')::bigint,canonical,(body->>'deleted_at')::timestamptz);
 return canonical;
end $$;
create function pickleup_private.begin_import(
 p_operation_id uuid,p_source_fingerprint text,p_manifest_hash text,p_adapter_version text,p_source_schema text,
 p_source_item_count integer,p_excluded jsonb default '{"invalid":0,"unresolved":0,"local_only":0}'::jsonb,p_protocol_version integer default 1
) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=pickleup_private.caller_uid(); digest text; prior record; existing public.legacy_imports; result jsonb; excluded bigint;
begin
 if uid is null then return jsonb_build_object('status','auth_required'); end if;
 if p_protocol_version is distinct from 1 then return jsonb_build_object('status','upgrade_required'); end if;
 if p_excluded is null or jsonb_typeof(p_excluded)<>'object' then return jsonb_build_object('status','invalid','code','invalid_manifest'); end if;
 if p_operation_id is null or p_source_fingerprint is null or p_source_fingerprint!~'^[a-f0-9]{64}$' or p_manifest_hash is null or p_manifest_hash!~'^[a-f0-9]{64}$'
  or p_adapter_version is null or length(p_adapter_version) not between 1 and 40 or p_source_schema is null or length(p_source_schema) not between 1 and 40
  or p_source_item_count is null or p_source_item_count not between 0 and 1000000
  or p_excluded is null or not pickleup_private.keys_ok(p_excluded,array['invalid','unresolved','local_only'],array['invalid','unresolved','local_only'])
  or not pickleup_private.int_between(p_excluded->'invalid',0,1000000) or not pickleup_private.int_between(p_excluded->'unresolved',0,1000000) or not pickleup_private.int_between(p_excluded->'local_only',0,1000000)
 then return jsonb_build_object('status','invalid','code','invalid_manifest'); end if;
 excluded:=(p_excluded->>'invalid')::bigint+(p_excluded->>'unresolved')::bigint+(p_excluded->>'local_only')::bigint;
 if excluded>p_source_item_count then return jsonb_build_object('status','invalid','code','invalid_counts'); end if;
 -- No import starts while selected-source decisions remain unresolved.
 if (p_excluded->>'unresolved')::integer>0 then return jsonb_build_object('status','needs_review'); end if;
 digest:=encode(sha256(convert_to(jsonb_build_array('begin_import',p_source_fingerprint,p_manifest_hash,p_adapter_version,p_source_schema,p_source_item_count,p_excluded,p_protocol_version)::text,'UTF8')),'hex');
 begin insert into pickleup_private.sync_heads(user_id) values(uid) on conflict(user_id) do nothing;
 exception when foreign_key_violation then return jsonb_build_object('status','auth_required'); end;
 perform 1 from pickleup_private.sync_heads where user_id=uid for update;
 select request_hash,r.result into prior from pickleup_private.sync_receipts r where user_id=uid and operation_id=p_operation_id;
 if found then if prior.request_hash<>digest then return jsonb_build_object('status','invalid','code','operation_id_reused'); end if;return prior.result||jsonb_build_object('replayed',true);end if;
 select * into existing from public.legacy_imports where user_id=uid and source_fingerprint=p_source_fingerprint;
 if found then
  if existing.manifest_hash<>p_manifest_hash or existing.adapter_version<>p_adapter_version or existing.source_schema<>p_source_schema or existing.source_item_count<>p_source_item_count
   or existing.counts->'invalid'<>p_excluded->'invalid' or existing.counts->'local_only'<>p_excluded->'local_only'
  then return jsonb_build_object('status','conflict','code','manifest_changed'); end if;
  result:=jsonb_build_object('status','applied','import',to_jsonb(existing)||jsonb_build_object('revision',existing.revision::text),'resumed',true);
 else
  insert into public.legacy_imports(user_id,id,revision,created_at,updated_at,source_kind,source_fingerprint,adapter_version,source_schema,manifest_hash,status,counts,report,source_item_count)
  values(uid,pickleup_private.import_uuid(uid,p_source_fingerprint,'manifest'),1,statement_timestamp(),statement_timestamp(),'legacy',p_source_fingerprint,p_adapter_version,p_source_schema,p_manifest_hash,'staging',p_excluded||'{"applied":0,"reused":0}'::jsonb,'{"codes":[]}',p_source_item_count) returning * into existing;
  result:=jsonb_build_object('status','applied','import',pickleup_private.import_change('legacy_imports',existing.id::text,to_jsonb(existing)),'resumed',false);
 end if;
 insert into pickleup_private.sync_receipts(user_id,operation_id,request_hash,protocol_version,result) values(uid,p_operation_id,digest,1,result);
 return result;
exception when invalid_parameter_value or invalid_text_representation or numeric_value_out_of_range or integrity_constraint_violation then return jsonb_build_object('status','invalid','code','invalid_manifest');
end $$;

create function pickleup_private.import_batch(p_operation_id uuid,p_import_id uuid,p_expected_revision text,p_items jsonb,p_protocol_version integer default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=pickleup_private.caller_uid(); manifest public.legacy_imports; prior record; digest text; result jsonb;
 item jsonb; spec jsonb; path text; kind text; target text; mode text; item_digest text; item_id uuid; operation_id uuid; existing public.legacy_import_items;
 canonical jsonb; body jsonb; response jsonb; applied integer; reused integer; added integer:=0; results jsonb:='[]';
begin
 if uid is null then return jsonb_build_object('status','auth_required'); end if;
 if p_protocol_version is distinct from 1 then return jsonb_build_object('status','upgrade_required'); end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then return jsonb_build_object('status','invalid','code','invalid_batch'); end if;
 if p_operation_id is null or p_import_id is null or p_expected_revision is null or p_expected_revision!~'^(0|[1-9][0-9]{0,18})$'
  or p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 or not pickleup_private.json_small(p_items,524288)
 then return jsonb_build_object('status','invalid','code','invalid_batch'); end if;
 if (select count(distinct value->>'source_path') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then return jsonb_build_object('status','invalid','code','duplicate_or_missing_paths'); end if;
 perform 1 from pickleup_private.sync_heads where user_id=uid for update;
 if not found then return jsonb_build_object('status','invalid','code','import_not_available'); end if;
 digest:=encode(sha256(convert_to(jsonb_build_array('import_batch',p_import_id,p_expected_revision,p_items,1)::text,'UTF8')),'hex');
 select r.request_hash,r.result into prior from pickleup_private.sync_receipts r where user_id=uid and r.operation_id=p_operation_id;
 if found then if prior.request_hash<>digest then return jsonb_build_object('status','invalid','code','operation_id_reused'); end if;return prior.result||jsonb_build_object('replayed',true);end if;
 select * into manifest from public.legacy_imports where user_id=uid and id=p_import_id and deleted_at is null;
 if not found then return jsonb_build_object('status','invalid','code','import_not_available'); end if;
 if manifest.revision::text<>p_expected_revision then return jsonb_build_object('status','conflict','code','import_revision'); end if;
 if manifest.status<>'staging' then return jsonb_build_object('status','invalid','code','import_closed'); end if;
 -- Every operation below belongs to this subtransaction. Even helper receipts
 -- and head increments roll back if the last item conflicts or fails validation.
 begin
  for item in select value from jsonb_array_elements(p_items) loop
   response:=jsonb_build_object('status','invalid','code','invalid_item');
   if not pickleup_private.keys_ok(item,array['source_path','kind','entity_key','expected_revision','payload','mode'],array['source_path','kind','expected_revision','payload','mode'])
    or jsonb_typeof(item->'source_path')<>'string' or length(item->>'source_path') not between 1 and 500 or jsonb_typeof(item->'kind')<>'string'
    or jsonb_typeof(item->'expected_revision')<>'string' or (item->>'expected_revision')!~'^(0|[1-9][0-9]{0,18})$'
    or (item ? 'entity_key' and item->'entity_key'<>'null'::jsonb and (jsonb_typeof(item->'entity_key')<>'string' or length(item->>'entity_key')>100))
    or (item->>'mode') not in ('apply','reuse') or jsonb_typeof(item->'mode')<>'string'
   then raise exception sqlstate 'PU001'; end if;
   path:=item->>'source_path';kind:=item->>'kind';mode:=item->>'mode';
   spec:=case when kind='legacy_score_snapshots' then '{"key":"id"}'::jsonb else pickleup_private.entity_spec(kind) end;
   if spec is null then raise exception sqlstate 'PU001'; end if;
   item_digest:=encode(sha256(convert_to(item::text,'UTF8')),'hex');
   select * into existing from public.legacy_import_items where user_id=uid and import_id=p_import_id and source_path=path;
   if found then
    if existing.item_hash<>item_digest then response:=jsonb_build_object('status','invalid','code','source_path_reused');raise exception sqlstate 'PU001';end if;
    results:=results||jsonb_build_array(jsonb_build_object('source_path',path,'target_key',existing.target_key,'status','replayed'));continue;
   end if;
   item_id:=pickleup_private.import_uuid(uid,manifest.source_fingerprint,'item',path);
   operation_id:=pickleup_private.import_uuid(uid,manifest.source_fingerprint,'operation',path);
   if p_operation_id=operation_id then raise exception sqlstate 'PU001';end if;
   target:=item->>'entity_key';
   if mode='apply' and spec->>'key'='id' and item->>'expected_revision'='0' then
    -- Caller receives the stable ID in the response; plan references can then
    -- be supplied in subsequent batches. Arbitrary existing IDs require CAS/reuse.
    if target is not null then response:=jsonb_build_object('status','invalid','code','create_key_must_be_null');raise exception sqlstate 'PU001';end if;
    target:=pickleup_private.import_uuid(uid,manifest.source_fingerprint,kind,path)::text;
   end if;
   if mode='apply' then
    response:=pickleup_private.operation_core(operation_id,kind,target,'put',item->>'expected_revision',item->'payload',1,jsonb_build_object('fingerprint',manifest.source_fingerprint,'path',path));
    if response->>'status'<>'applied' then raise exception sqlstate 'PU001';end if;
   else
    -- Reuse is an explicit user decision to link an existing own row, not an
    -- assertion that equal timestamps/scores prove two events are identical.
    if not pickleup_private.keys_ok(item->'payload',array[]::text[]) or target is null then raise exception sqlstate 'PU001';end if;
    execute format('select to_jsonb(t) from public.%I t where t.user_id=$1 and %s and deleted_at is null',kind,
     case when spec->>'key'='user_id' then '$2=''self''' else format('t.%I::text=$2',spec->>'key') end) into body using uid,target;
    if body is null or body->>'revision'<>item->>'expected_revision' then response:=jsonb_build_object('status','conflict','code','reuse_revision');raise exception sqlstate 'PU001';end if;
   end if;
   insert into public.legacy_import_items(user_id,id,revision,created_at,updated_at,source_kind,source_fingerprint,source_path,import_id,target_kind,target_key,item_hash,batch_id,status)
    values(uid,item_id,1,statement_timestamp(),statement_timestamp(),'legacy',manifest.source_fingerprint,path,p_import_id,kind,target,item_digest,p_operation_id,case when mode='apply' then 'applied' else 'reused' end) returning to_jsonb(legacy_import_items.*) into canonical;
   perform pickleup_private.import_change('legacy_import_items',item_id::text,canonical);
   results:=results||jsonb_build_array(jsonb_build_object('source_path',path,'target_key',target,'status',case when mode='apply' then 'applied' else 'reused' end));added:=added+1;
  end loop;
  select count(*) filter(where status='applied'),count(*) filter(where status='reused') into applied,reused from public.legacy_import_items where user_id=uid and import_id=p_import_id;
  if applied::bigint+reused+(manifest.counts->>'invalid')::bigint+(manifest.counts->>'local_only')::bigint>manifest.source_item_count then response:=jsonb_build_object('status','invalid','code','source_count_exceeded');raise exception sqlstate 'PU001';end if;
  if added>0 then
   update public.legacy_imports set counts=counts||jsonb_build_object('applied',applied,'reused',reused),revision=revision+1,updated_at=statement_timestamp() where user_id=uid and id=p_import_id returning * into manifest;
   perform pickleup_private.import_change('legacy_imports',manifest.id::text,to_jsonb(manifest));
  end if;
  result:=jsonb_build_object('status','applied','import',to_jsonb(manifest)||jsonb_build_object('revision',manifest.revision::text),'items',results,'replayed',false);
  insert into pickleup_private.sync_receipts(user_id,operation_id,request_hash,protocol_version,result) values(uid,p_operation_id,digest,1,result);
 exception
  when sqlstate 'PU001' then return response||jsonb_build_object('batch_rolled_back',true);
  when integrity_constraint_violation or invalid_text_representation or datetime_field_overflow or numeric_value_out_of_range or invalid_parameter_value then return jsonb_build_object('status','invalid','code','constraint_or_reference','batch_rolled_back',true);
 end;
 return result;
end $$;

create function pickleup_private.finish_import(p_operation_id uuid,p_import_id uuid,p_expected_revision text,p_accept_quarantine boolean default false,p_protocol_version integer default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=pickleup_private.caller_uid(); manifest public.legacy_imports; digest text; prior record; result jsonb; actual_applied integer; actual_reused integer;
begin
 if uid is null then return jsonb_build_object('status','auth_required'); end if;
 if p_protocol_version is distinct from 1 then return jsonb_build_object('status','upgrade_required'); end if;
 if p_operation_id is null or p_import_id is null or p_expected_revision is null or p_expected_revision!~'^(0|[1-9][0-9]{0,18})$' then return jsonb_build_object('status','invalid');end if;
 perform 1 from pickleup_private.sync_heads where user_id=uid for update;
 digest:=encode(sha256(convert_to(jsonb_build_array('finish_import',p_import_id,p_expected_revision,p_accept_quarantine,1)::text,'UTF8')),'hex');
 select r.request_hash,r.result into prior from pickleup_private.sync_receipts r where user_id=uid and operation_id=p_operation_id;
 if found then if prior.request_hash<>digest then return jsonb_build_object('status','invalid','code','operation_id_reused');end if;return prior.result||jsonb_build_object('replayed',true);end if;
 select * into manifest from public.legacy_imports where user_id=uid and id=p_import_id and deleted_at is null;
 if not found then return jsonb_build_object('status','invalid','code','import_not_available');end if;
 if manifest.revision::text<>p_expected_revision then return jsonb_build_object('status','conflict','code','import_revision');end if;
 if manifest.status<>'staging' then return jsonb_build_object('status','invalid','code','import_closed');end if;
 select count(*) filter(where status='applied'),count(*) filter(where status='reused') into actual_applied,actual_reused from public.legacy_import_items where user_id=uid and import_id=p_import_id;
 if (manifest.counts->>'unresolved')::integer<>0 or actual_applied<>(manifest.counts->>'applied')::integer or actual_reused<>(manifest.counts->>'reused')::integer
  or actual_applied::bigint+actual_reused+(manifest.counts->>'invalid')::bigint+(manifest.counts->>'local_only')::bigint<>manifest.source_item_count
 then return jsonb_build_object('status','needs_review','code','reconcile_required');end if;
 if (manifest.counts->>'invalid')::integer>0 and p_accept_quarantine is not true then return jsonb_build_object('status','needs_review','code','quarantine_confirmation_required');end if;
 update public.legacy_imports set status='committed',revision=revision+1,updated_at=statement_timestamp(),report=jsonb_build_object('codes',case when (counts->>'invalid')::integer>0 then '["quarantine_accepted"]'::jsonb else '[]'::jsonb end) where user_id=uid and id=p_import_id returning * into manifest;
 result:=jsonb_build_object('status','applied','import',pickleup_private.import_change('legacy_imports',manifest.id::text,to_jsonb(manifest)),'replayed',false);
 insert into pickleup_private.sync_receipts(user_id,operation_id,request_hash,protocol_version,result) values(uid,p_operation_id,digest,1,result);
 return result;
end $$;
create function pickleup_private.get_import_status(p_import_id uuid,p_protocol_version integer default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=pickleup_private.caller_uid(); manifest public.legacy_imports;
begin
 if uid is null then return jsonb_build_object('status','auth_required');end if;
 if p_protocol_version is distinct from 1 then return jsonb_build_object('status','upgrade_required');end if;
 select * into manifest from public.legacy_imports where user_id=uid and id=p_import_id and deleted_at is null;
 if not found then return jsonb_build_object('status','invalid','code','import_not_available');end if;
 return jsonb_build_object('status','ok','import',to_jsonb(manifest)||jsonb_build_object('revision',manifest.revision::text));
end $$;

-- Same narrow owner and publication order as PR1a. The internal worker never
-- receives EXECUTE for authenticated; the manual wrapper always passes NULL.
grant create on schema public,pickleup_private to pickleup_api;
do $$ begin execute format('grant pickleup_api to %I with inherit false, set true',current_user);end $$;
alter function pickleup_private.operation_core(uuid,text,text,text,text,jsonb,integer,jsonb) owner to pickleup_api;
alter function pickleup_private.import_uuid(uuid,text,text,text) owner to pickleup_api;
alter function pickleup_private.import_change(text,text,jsonb) owner to pickleup_api;
alter function pickleup_private.begin_import(uuid,text,text,text,text,integer,jsonb,integer) owner to pickleup_api;
alter function pickleup_private.import_batch(uuid,uuid,text,jsonb,integer) owner to pickleup_api;
alter function pickleup_private.finish_import(uuid,uuid,text,boolean,integer) owner to pickleup_api;
alter function pickleup_private.get_import_status(uuid,integer) owner to pickleup_api;
set role pickleup_api;
revoke all on function pickleup_private.operation_core(uuid,text,text,text,text,jsonb,integer,jsonb),pickleup_private.import_uuid(uuid,text,text,text),pickleup_private.import_change(text,text,jsonb),pickleup_private.begin_import(uuid,text,text,text,text,integer,jsonb,integer),pickleup_private.import_batch(uuid,uuid,text,jsonb,integer),pickleup_private.finish_import(uuid,uuid,text,boolean,integer),pickleup_private.get_import_status(uuid,integer) from public,anon,authenticated;
create or replace function public.apply_operation(p_operation_id uuid,p_kind text,p_entity_key text,p_action text,p_expected_revision text,p_payload jsonb default '{}'::jsonb,p_protocol_version integer default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
begin return pickleup_private.operation_core(p_operation_id,p_kind,p_entity_key,p_action,p_expected_revision,p_payload,p_protocol_version,null);end $$;
revoke all on function public.apply_operation(uuid,text,text,text,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.apply_operation(uuid,text,text,text,text,jsonb,integer),pickleup_private.begin_import(uuid,text,text,text,text,integer,jsonb,integer),pickleup_private.import_batch(uuid,uuid,text,jsonb,integer),pickleup_private.finish_import(uuid,uuid,text,boolean,integer),pickleup_private.get_import_status(uuid,integer) to authenticated;
alter function pickleup_private.begin_import(uuid,text,text,text,text,integer,jsonb,integer) set schema public;
alter function pickleup_private.import_batch(uuid,uuid,text,jsonb,integer) set schema public;
alter function pickleup_private.finish_import(uuid,uuid,text,boolean,integer) set schema public;
alter function pickleup_private.get_import_status(uuid,integer) set schema public;
reset role;
do $$ begin execute format('grant pickleup_api to %I with inherit false, set false',current_user);end $$;
revoke create on schema public,pickleup_private from pickleup_api;
notify pgrst,'reload schema';
