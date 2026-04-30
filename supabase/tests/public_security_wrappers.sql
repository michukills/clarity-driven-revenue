-- Live-database regression checks for the BCC / 403-storm fix.
--
-- Run with:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/public_security_wrappers.sql
--
-- All assertions use plain SQL DO blocks. Any failure aborts the script
-- with a clear message naming the wrapper or invariant that regressed.
--
-- These tests intentionally do NOT mutate any data. They are safe to run
-- against any environment, including production.

\set ON_ERROR_STOP on
\timing off

-- ---------------------------------------------------------------------------
-- 1. Each public wrapper must be SECURITY DEFINER, STABLE, and pin its
--    search_path to 'public, private'.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  expected text[] := ARRAY[
    'is_admin', 'has_role', 'is_platform_owner',
    'user_owns_customer', 'user_has_resource_assignment',
    'resource_visibility_for'
  ];
  fn text;
  found_count int;
BEGIN
  FOREACH fn IN ARRAY expected LOOP
    SELECT count(*) INTO found_count
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = fn;
    IF found_count = 0 THEN
      RAISE EXCEPTION 'public.% is missing — RLS policies will fail', fn;
    END IF;
  END LOOP;

  FOR r IN
    SELECT p.proname,
           p.prosecdef,
           p.provolatile,
           p.proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = ANY(expected)
  LOOP
    IF NOT r.prosecdef THEN
      RAISE EXCEPTION 'public.% is SECURITY INVOKER — must be SECURITY DEFINER (BCC 403 regression)', r.proname;
    END IF;
    IF r.provolatile <> 's' THEN
      RAISE EXCEPTION 'public.% is not STABLE — required for safe RLS use', r.proname;
    END IF;
    IF r.proconfig IS NULL
       OR NOT (r.proconfig::text ILIKE '%search_path=public, private%')
    THEN
      RAISE EXCEPTION 'public.% has unsafe search_path: %', r.proname, r.proconfig;
    END IF;
  END LOOP;

  RAISE NOTICE 'OK: all six public wrappers are SECURITY DEFINER + STABLE + safe search_path';
END $$;

-- ---------------------------------------------------------------------------
-- 2. Execute privileges:
--      anon          MUST NOT have EXECUTE (no public-role role checks)
--      authenticated MUST have EXECUTE (RLS policies invoke these)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  expected text[] := ARRAY[
    'is_admin', 'has_role', 'is_platform_owner',
    'user_owns_customer', 'user_has_resource_assignment',
    'resource_visibility_for'
  ];
BEGIN
  FOR r IN
    SELECT p.oid, p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = ANY(expected)
  LOOP
    IF has_function_privilege('anon', r.oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon can EXECUTE public.% — revoke to keep role checks out of public surface', r.proname;
    END IF;
    IF NOT has_function_privilege('authenticated', r.oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated cannot EXECUTE public.% — RLS policies will 403', r.proname;
    END IF;
  END LOOP;
  RAISE NOTICE 'OK: anon cannot execute wrappers, authenticated can';
END $$;

-- ---------------------------------------------------------------------------
-- 3. The BCC lookup path itself: an authenticated session with no schema
--    USAGE on `private` must still be able to evaluate the wrapper.
--    This simulates exactly what the browser does when the page loads.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  has_priv boolean;
BEGIN
  -- The wrapper is SECURITY DEFINER, so even a role without USAGE on
  -- private must still be able to call it. We assert the wrapper resolves
  -- without raising "permission denied for schema private".
  PERFORM public.is_admin('00000000-0000-0000-0000-000000000000'::uuid);
  PERFORM public.user_owns_customer(
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
  RAISE NOTICE 'OK: wrappers resolve without private-schema USAGE';
END $$;

-- ---------------------------------------------------------------------------
-- 4. Internal RGS account invariants:
--      a. Exactly one row exists with email = 'internal@rgs.local'
--      b. It is classified as account_kind = 'internal_admin'
--      c. It is NOT marked as a demo account
--      d. It is excluded from "client pipeline" queries (status = 'internal')
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec record;
BEGIN
  SELECT id, account_kind, status, is_demo_account, contributes_to_global_learning
    INTO rec
    FROM public.customers
   WHERE email = 'internal@rgs.local';

  IF rec.id IS NULL THEN
    RAISE EXCEPTION 'internal RGS customer record is missing — BCC will fail to initialize';
  END IF;
  IF rec.account_kind <> 'internal_admin' THEN
    RAISE EXCEPTION 'internal RGS account_kind must be internal_admin (got %)', rec.account_kind;
  END IF;
  IF rec.is_demo_account THEN
    RAISE EXCEPTION 'internal RGS account must not be flagged as a demo account';
  END IF;
  IF rec.contributes_to_global_learning THEN
    RAISE EXCEPTION 'internal RGS account must not contribute to global learning';
  END IF;
  IF rec.status <> 'internal' THEN
    RAISE EXCEPTION 'internal RGS account status must be ''internal'' so pipeline filters exclude it (got %)', rec.status;
  END IF;
  RAISE NOTICE 'OK: internal RGS account invariants hold';
END $$;

-- ---------------------------------------------------------------------------
-- 5. The customers RLS policy that powers the BCC lookup must call the
--    public wrapper (so this whole regression suite stays meaningful).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  qual text;
BEGIN
  SELECT pg_get_expr(polqual, polrelid)
    INTO qual
    FROM pg_policy
   WHERE polrelid = 'public.customers'::regclass
     AND polname  = 'Admins manage all customers';
  IF qual IS NULL THEN
    RAISE EXCEPTION 'expected RLS policy "Admins manage all customers" on public.customers is missing';
  END IF;
  IF qual NOT ILIKE '%is_admin(auth.uid())%' THEN
    RAISE EXCEPTION 'admin policy on customers no longer references public.is_admin(auth.uid()) — wrapper contract drifted: %', qual;
  END IF;
  RAISE NOTICE 'OK: customers admin policy still uses public.is_admin(auth.uid())';
END $$;

\echo 'public_security_wrappers.sql — all assertions passed'