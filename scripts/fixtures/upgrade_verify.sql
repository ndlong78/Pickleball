begin;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
do $$ declare r jsonb; begin
 if not exists(select 1 from public.user_preferences where target_days=2 and revision=1 and goal_configured) then raise exception 'Upgrade lost existing row'; end if;
 r:=public.pull_changes();
 if jsonb_array_length(r->'changes')<>1 or r->'changes'->0->'row'->>'target_days'<>'2' then raise exception 'Upgrade snapshot missing from bootstrap'; end if;
 r:=public.apply_operation('33333333-3333-4333-8333-333333333334','user_preferences','self','put','1','{"target_days":4}',1);
 if r->>'status'<>'applied' or r->'row'->>'revision'<>'2' then raise exception 'Upgraded CAS failed'; end if;
end $$;
reset role;
delete from auth.users where id='33333333-3333-4333-8333-333333333333';
commit;
