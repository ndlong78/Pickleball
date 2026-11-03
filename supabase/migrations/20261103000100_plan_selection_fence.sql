-- PR5b1a: separate plan/selection capability, same epoch ledger and transaction lock.
-- No widening of the PR4b writer, RLS or client DML.
create function pickleup_private.apply_plan_operation(
 p_operation_id uuid,p_kind text,p_entity_key text,p_action text,p_expected_revision text,p_epoch uuid,
 p_payload jsonb default '{}'::jsonb,p_protocol_version integer default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=pickleup_private.caller_uid(); current_epoch uuid; binding pickleup_private.sync_operation_epochs; digest text; result jsonb;
begin
 if uid is null then return jsonb_build_object('status','auth_required');end if;
 if p_protocol_version is distinct from 1 then return jsonb_build_object('status','upgrade_required');end if;
 if p_kind is null or p_kind not in ('personal_plans','user_selections') or p_operation_id is null or p_epoch is null
 or p_entity_key is null or (p_kind='personal_plans' and p_entity_key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') or (p_kind='user_selections' and p_entity_key<>'self') or p_action is null or p_action not in ('put','delete','restore') or p_expected_revision is null or p_expected_revision !~ '^(0|[1-9][0-9]{0,18})$' or p_payload is null or jsonb_typeof(p_payload)<>'object' or not pickleup_private.json_small(p_payload,262144) then return jsonb_build_object('status','invalid','code','invalid_plan_request');end if;
 -- No implicit epoch creation in the writer: prepare_sync/pull precede dispatch.
 -- All old/manual/import writers and restore UPDATEs lock this same head row.
 select epoch into current_epoch from pickleup_private.sync_heads where user_id=uid for update;
 if not found or p_epoch is distinct from current_epoch then return jsonb_build_object('status','reset_required');end if;
 digest:=encode(sha256(convert_to(jsonb_build_array(p_kind,p_entity_key,p_action,p_expected_revision,p_epoch,p_payload,p_protocol_version)::text,'UTF8')),'hex');
 select * into binding from pickleup_private.sync_operation_epochs where user_id=uid and operation_id=p_operation_id;
 if found then
  if binding.epoch is distinct from current_epoch then return jsonb_build_object('status','invalid','code','operation_epoch_mismatch','epoch',current_epoch);end if;
  if binding.request_hash<>digest then return jsonb_build_object('status','invalid','code','operation_id_reused','epoch',current_epoch);end if;
 else
  -- Never adopt a legacy/import receipt under a newly supplied epoch.
  if exists(select 1 from pickleup_private.sync_receipts where user_id=uid and operation_id=p_operation_id) then
   return jsonb_build_object('status','invalid','code','operation_id_reused','epoch',current_epoch);
  end if;
  insert into pickleup_private.sync_operation_epochs(user_id,operation_id,epoch,request_hash) values(uid,p_operation_id,current_epoch,digest);
 end if;
 -- Plan content is immutable even when a caller resends an equal snapshot.
 -- A terminal rejected patch still consumes its exact epoch/request binding.
 if p_kind='personal_plans' and (p_action='restore' or p_action='put' and p_expected_revision<>'0') and not pickleup_private.keys_ok(p_payload,array['check_score','completed_at']) then
  result:=jsonb_build_object('status','invalid','code','immutable_plan_fields');
 else
  result:=pickleup_private.operation_core(p_operation_id,p_kind,p_entity_key,p_action,p_expected_revision,p_payload,p_protocol_version,null);
 end if;
 return result||jsonb_build_object('epoch',current_epoch);
end $$;

grant create on schema public,pickleup_private to pickleup_api;
do $$ begin execute format('grant pickleup_api to %I with inherit false, set true',current_user);end $$;
alter function pickleup_private.apply_plan_operation(uuid,text,text,text,text,uuid,jsonb,integer) owner to pickleup_api;
set role pickleup_api;
revoke all on function pickleup_private.apply_plan_operation(uuid,text,text,text,text,uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function pickleup_private.apply_plan_operation(uuid,text,text,text,text,uuid,jsonb,integer) to authenticated;
alter function pickleup_private.apply_plan_operation(uuid,text,text,text,text,uuid,jsonb,integer) set schema public;
reset role;
do $$ begin execute format('grant pickleup_api to %I with inherit false, set false',current_user);end $$;
revoke create on schema public,pickleup_private from pickleup_api;
notify pgrst,'reload schema';
