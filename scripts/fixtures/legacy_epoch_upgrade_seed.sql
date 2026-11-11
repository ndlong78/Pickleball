begin;
insert into auth.users(id,email) values('33333333-3333-4333-8333-333333333333','legacy-upgrade@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',true);
do $$ declare result jsonb;begin
 result:=public.apply_operation('33333333-3333-4333-8333-333333333334','user_preferences','self','put','0','{"target_days":2}',1);
 if result->>'status'<>'applied' then raise exception 'Could not seed legacy first epoch';end if;
end $$;
commit;
