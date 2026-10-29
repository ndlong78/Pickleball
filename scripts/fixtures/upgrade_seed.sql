-- Synthetic upgrade fixture; executed only in verified ephemeral local project.
insert into auth.users(id,email) values('33333333-3333-4333-8333-333333333333','upgrade@pickleup.invalid');
insert into public.user_preferences(user_id,target_days,level_band,session_minutes,gentle,goal_configured,revision,created_at,updated_at)
values('33333333-3333-4333-8333-333333333333',2,'1.0–2.0',30,false,true,1,now(),now());
