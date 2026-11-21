-- Run after the account-deletion SQL Editor bundle on a nine-migration database.
do $verify$
begin
 if (select array_agg(version::text order by version) from supabase_migrations.schema_migrations) is distinct from array['20261029000100','20261029000200','20261030000100','20261101000100','20261101000200','20261103000100','20261111000100','20261114000100','20261115000100','20261121000100']::text[] then raise exception 'migration history not recorded';end if;
 if not (select prosecdef and proconfig @> array['search_path=""'] from pg_catalog.pg_proc where oid='public.delete_own_account(text)'::regprocedure) then raise exception 'delete_own_account not a definer with empty search path';end if;
 if not has_function_privilege('authenticated','public.delete_own_account(text)','EXECUTE') or has_function_privilege('anon','public.delete_own_account(text)','EXECUTE') then raise exception 'delete_own_account grants wrong';end if;
end $verify$;
select 'VERIFIED' as status;
