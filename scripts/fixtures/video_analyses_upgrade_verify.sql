-- Run after the video-analyses SQL Editor bundle on a ten-migration database.
do $verify$
begin
 if (select array_agg(version::text order by version) from supabase_migrations.schema_migrations) is distinct from array['20261029000100','20261029000200','20261030000100','20261101000100','20261101000200','20261103000100','20261111000100','20261114000100','20261115000100','20261121000100','20261128000100']::text[] then raise exception 'migration history not recorded';end if;
 if not (select relrowsecurity and relforcerowsecurity from pg_catalog.pg_class where oid='public.video_analyses'::regclass) then raise exception 'video_analyses RLS not forced';end if;
 if has_table_privilege('authenticated','public.video_analyses','INSERT') or has_table_privilege('anon','public.video_analyses','SELECT') then raise exception 'video_analyses table grants wrong';end if;
 if (select count(*) from pg_catalog.pg_proc p where p.oid in ('public.record_video_analysis(uuid,jsonb,integer)'::regprocedure,'public.list_video_analyses(integer,timestamptz,integer)'::regprocedure,'public.delete_video_analysis(uuid,integer)'::regprocedure)
   and p.prosecdef and p.proowner='pickleup_api'::regrole and p.proconfig @> array['search_path=""'])<>3 then raise exception 'video RPCs not narrow-owner definers';end if;
 if not has_function_privilege('authenticated','public.record_video_analysis(uuid,jsonb,integer)','EXECUTE') or has_function_privilege('anon','public.record_video_analysis(uuid,jsonb,integer)','EXECUTE') then raise exception 'video RPC grants wrong';end if;
 if exists(select 1 from pg_catalog.pg_constraint where conrelid='pickleup_private.sync_changes'::regclass and contype='c' and pg_catalog.pg_get_constraintdef(oid) like '%video_analyses%') then raise exception 'video kind leaked into the sync log';end if;
 if pg_catalog.has_function_privilege('pickleup_api','pickleup_private.video_analysis_row(public.video_analyses)','EXECUTE') is not true then raise exception 'serializer not usable by its owner';end if;
end $verify$;
select 'VERIFIED' as status;
