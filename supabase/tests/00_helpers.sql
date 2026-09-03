-- =============================================================================
-- Test helpers — impersonate a user the way GoTrue does
-- =============================================================================
-- Supabase resolves auth.uid() from the `request.jwt.claims` GUC. Setting it
-- locally lets a pgTAP test act as any user without going through the API.
-- =============================================================================

-- pgtap is needed for this file's own plan (below); 10_* creates it too, harmlessly.
create extension if not exists pgtap;

create schema if not exists tests;

create or replace function tests.create_user(p_email text)
returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email,
                          encrypted_password, email_confirmed_at,
                          created_at, updated_at, raw_app_meta_data,
                          raw_user_meta_data)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', p_email, crypt('password', gen_salt('bf')), now(),
          now(), now(), '{"provider":"email","providers":["email"]}'::jsonb,
          json_build_object('full_name', p_email)::jsonb);
  return v_id;
end;
$$;

-- Become this user for the remainder of the transaction.
create or replace function tests.login(p_user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
                     json_build_object('sub', p_user_id::text,
                                       'role', 'authenticated')::text, true);
end;
$$;

-- Become an anonymous visitor (the public RSVP path).
create or replace function tests.logout()
returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', null, true);
end;
$$;

-- Back to superuser for test setup.
create or replace function tests.become_service_role()
returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', null, true);
end;
$$;

-- Count rows the CURRENT user can actually see through RLS.
create or replace function tests.visible_count(p_table text, p_where text default 'true')
returns int language plpgsql as $$
declare n int;
begin
  execute format('select count(*) from %I where %s', p_table, p_where) into n;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- The suite calls these helpers *while impersonating* — tests.login() switches
-- the role, so every later tests.* call is made as `authenticated`, which has
-- no usage on a schema created by postgres. Without this, the second login
-- fails with `permission denied for schema tests`.
--
-- Safe to grant broadly: this schema exists only in the local and CI database.
-- supabase/tests/ is never applied by `db push`, so it cannot reach production.
-- ---------------------------------------------------------------------------
grant usage on schema tests to public;
grant execute on all functions in schema tests to public;

-- ---------------------------------------------------------------------------
-- pg_prove treats every .sql file in this directory as a test file and fails
-- the entire run on any file without a TAP plan ("No plan found in TAP
-- output"), so this one asserts its own installation.
--
-- Deliberately NOT wrapped in begin/rollback: these helpers must still exist
-- when the next file opens its own session.
-- ---------------------------------------------------------------------------
select plan(1);
select has_schema('tests');
select * from finish();
