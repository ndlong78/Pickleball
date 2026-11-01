-- PR4b: additive fenced writer. Legacy/manual/import protocol1 stays intact.
-- Append-only operation/epoch binding is separate from existing receipts.
create table pickleup_private.sync_operation_epochs (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id uuid not null,
 epoch uuid not null,
 request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
 primary key(user_id,operation_id)
);
alter table pickleup_private.sync_operation_epochs enable row level security;
alter table pickleup_private.sync_operation_epochs force row level security;
create policy sync_operation_epochs_own on pickleup_private.sync_operation_epochs
 to pickleup_api using (user_id=pickleup_private.caller_uid()) with check(user_id=pickleup_private.caller_uid());
revoke all on pickleup_private.sync_operation_epochs from public,anon,authenticated;
grant select,insert on pickleup_private.sync_operation_epochs to pickleup_api;

create function pickleup_private.prepare_sync(p_protocol_version integer default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=pickleup_private.caller_uid(); head pickleup_private.sync_heads;
begin
 if uid is null then return jsonb_build_object('status','auth_required');end if;
 if p_protocol_version is distinct from 1 then return jsonb_build_object('status','upgrade_required');end if;
 begin insert into pickleup_private.sync_heads(user_id) values(uid) on conflict(user_id) do nothing;
 exception when foreign_key_violation then return jsonb_build_object('status','auth_required');end;
 select * into head from pickleup_private.sync_heads where user_id=uid for update;
 return jsonb_build_object('status','ok','epoch',head.epoch,'server_revision',head.server_revision::text);
end $$;

create function pickleup_private.apply_sync_operation(
 p_operation_id uuid,p_kind text,p_entity_key text,p_action text,p_expected_revision text,p_epoch uuid,
 p_payload jsonb default '{}'::jsonb,p_protocol_version integer default 1)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=pickleup_private.caller_uid(); current_epoch uuid; binding pickleup_private.sync_operation_epochs; digest text; result jsonb;
begin
 if uid is null then return jsonb_build_object('status','auth_required');end if;
 if p_protocol_version is distinct from 1 then return jsonb_build_object('status','upgrade_required');end if;
 if p_kind is null or p_kind not in ('user_preferences','practice_checkins') or p_operation_id is null or p_epoch is null
 or p_payload is null or not pickleup_private.json_small(p_payload,262144) then return jsonb_build_object('status','invalid','code','invalid_sync_request');end if;
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
 result:=pickleup_private.operation_core(p_operation_id,p_kind,p_entity_key,p_action,p_expected_revision,p_payload,p_protocol_version,null);
 return result||jsonb_build_object('epoch',current_epoch);
end $$;

grant create on schema public,pickleup_private to pickleup_api;
do $$ begin execute format('grant pickleup_api to %I with inherit false, set true',current_user);end $$;
alter function pickleup_private.prepare_sync(integer) owner to pickleup_api;
alter function pickleup_private.apply_sync_operation(uuid,text,text,text,text,uuid,jsonb,integer) owner to pickleup_api;
set role pickleup_api;
revoke all on function pickleup_private.prepare_sync(integer),pickleup_private.apply_sync_operation(uuid,text,text,text,text,uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function pickleup_private.prepare_sync(integer),pickleup_private.apply_sync_operation(uuid,text,text,text,text,uuid,jsonb,integer) to authenticated;
alter function pickleup_private.prepare_sync(integer) set schema public;
alter function pickleup_private.apply_sync_operation(uuid,text,text,text,text,uuid,jsonb,integer) set schema public;
reset role;
do $$ begin execute format('grant pickleup_api to %I with inherit false, set false',current_user);end $$;
revoke create on schema public,pickleup_private from pickleup_api;
notify pgrst,'reload schema';
