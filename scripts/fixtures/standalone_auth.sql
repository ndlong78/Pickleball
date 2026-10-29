-- Local fallback only, NOT a Supabase migration and NOT used by CI.
-- This minimal Auth context fixture is not evidence that GoTrue/Auth flows work.
create schema auth;
create schema extensions;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role authenticator login noinherit password 'pickleup-local-only';
grant anon, authenticated to authenticator;
grant usage on schema public, auth, extensions to anon, authenticated;
create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
 nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
