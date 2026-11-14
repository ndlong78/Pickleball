begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions,pg_temp;
select extensions.no_plan();
-- C3: lesson ids and level bands are wider; every earlier value stays valid.
select extensions.lives_ok($$select 'PU-001'::pickleup_private.lesson_id,'PU-080'::pickleup_private.lesson_id$$,'existing lesson ids stay valid');
select extensions.lives_ok($$select 'PU-081'::pickleup_private.lesson_id,'PU-999'::pickleup_private.lesson_id,'PU-1000'::pickleup_private.lesson_id,'PU-9999'::pickleup_private.lesson_id$$,'new lesson ids accepted');
select extensions.throws_ok($$select 'PU-000'::pickleup_private.lesson_id$$,'23514',null,'zero lesson id rejected');
select extensions.throws_ok($$select 'PU-0081'::pickleup_private.lesson_id$$,'23514',null,'zero-padded four-digit id rejected: one spelling per lesson');
select extensions.throws_ok($$select 'PU-81'::pickleup_private.lesson_id$$,'23514',null,'two-digit id rejected');
select extensions.throws_ok($$select 'PU-10000'::pickleup_private.lesson_id$$,'23514',null,'five-digit id rejected');
select extensions.throws_ok($$select 'ADV-PU-081'::pickleup_private.lesson_id$$,'23514',null,'prefixed id rejected');
select extensions.lives_ok($$select '1.0–2.0'::pickleup_private.level_band,'3.5–4.0'::pickleup_private.level_band$$,'existing level bands stay valid');
select extensions.lives_ok($$select '4.0–4.5'::pickleup_private.level_band,'4.5–5.0'::pickleup_private.level_band$$,'4.0–5.0 level bands accepted');
select extensions.throws_ok($$select '4.0–5.0'::pickleup_private.level_band$$,'23514',null,'merged band rejected');
select extensions.throws_ok($$select '5.0–5.5'::pickleup_private.level_band$$,'23514',null,'band above 5.0 rejected');
select extensions.is((select count(*)::int from pg_constraint where conrelid='public.legacy_score_snapshots'::regclass and contype='c' and pg_get_constraintdef(oid) like '%PU-0(0[1-9]|[1-7][0-9]|80)%'),0,'old snapshot key rule removed');
select extensions.is((select count(*)::int from pg_constraint where conrelid='public.legacy_score_snapshots'::regclass and conname='legacy_score_snapshots_source_key_check'),1,'snapshot key rule replaced exactly once');
-- Personal plans and stage/advanced assessments keep their own 1.0–4.0 rules.
select extensions.ok((select bool_or(pg_get_constraintdef(oid) like '%advanced%' and pg_get_constraintdef(oid) not like '%4.0–4.5%') from pg_constraint where conrelid='public.personal_plans'::regclass and contype='c'),'personal plan level rule unchanged');
select extensions.ok((select bool_or(pg_get_constraintdef(oid) like '%assessment_type%' and pg_get_constraintdef(oid) not like '%4.0–4.5%') from pg_constraint where conrelid='public.skill_assessments'::regclass and contype='c'),'assessment level rule unchanged');
select * from extensions.finish();
rollback;
