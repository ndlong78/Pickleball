begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
do $$ declare result jsonb;changes jsonb;begin
 result:=public.apply_operation('44444444-4444-4444-8444-444444444444','profiles','self','put','0','{"display_name":"Synthetic upgrade","timezone":"UTC"}',1);
 if result->>'status'<>'applied' or result->>'replayed'<>'true' or result->'row'->>'revision'<>'1' then raise exception 'old manual receipt changed';end if;
 result:=public.get_import_status('55555555-5555-4555-8555-555555555555');
 if result->'import'->>'source_item_count'<>'3' or result->'import'->>'revision'<>'8' then raise exception 'manifest backfill lost counts/revision';end if;
 changes:=public.pull_changes();
 if changes->>'high_water'<>'2' or jsonb_array_length(changes->'changes')<>2 or changes->'changes'->1->'row'->>'source_item_count'<>'3' then raise exception 'manifest upgrade missing canonical change';end if;
end $$;
rollback;
