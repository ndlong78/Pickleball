begin;
-- Self-service account deletion (V5.36.0).
-- The caller deletes only its own Auth user; every PickleUp table references
-- auth.users(id) ON DELETE CASCADE, so profile, training data, import ledgers,
-- sync heads/receipts/changes and epoch fences go in the same transaction.
-- Guard: the access token must carry an authentication method (amr) newer than
-- ten minutes, i.e. the person has just verified an email code. A token that was
-- only refreshed keeps its original amr timestamp and is refused.
-- Owner: the migration role (postgres on Supabase), because pickleup_api must
-- never hold privileges on auth.users. No arguments name a user.
create function public.delete_own_account(p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_uid uuid := auth.uid();
 v_claims jsonb := auth.jwt();
 v_now numeric := floor(extract(epoch from clock_timestamp()));
 v_amr jsonb;
begin
 if v_uid is null or coalesce(v_claims->>'role','') <> 'authenticated' then
  return jsonb_build_object('status','auth_required');
 end if;
 if p_confirmation is distinct from 'delete-own-account-v1' then
  return jsonb_build_object('status','invalid');
 end if;
 v_amr := case when jsonb_typeof(v_claims->'amr') = 'array' then v_claims->'amr' else '[]'::jsonb end;
 if not exists (
  select 1 from jsonb_array_elements(v_amr) as e(item)
  where jsonb_typeof(e.item) = 'object'
    and jsonb_typeof(e.item->'timestamp') = 'number'
    and (e.item->>'timestamp')::numeric between v_now - 600 and v_now + 60
 ) then
  return jsonb_build_object('status','reauth_required');
 end if;
 delete from auth.users where id = v_uid;
 return jsonb_build_object('status','deleted');
end
$$;

revoke all on function public.delete_own_account(text) from public;
revoke all on function public.delete_own_account(text) from anon;
revoke all on function public.delete_own_account(text) from authenticated;
grant execute on function public.delete_own_account(text) to authenticated;
commit;
