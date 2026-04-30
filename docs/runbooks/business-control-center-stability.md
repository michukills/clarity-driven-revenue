# Manual verification checklist — Business Control Center stability

Use this checklist any time the public security wrappers, RLS policies,
or the internal RGS account record change. It complements the automated
regression suites:

- `src/lib/__tests__/publicSecurityWrappersRegression.test.ts` (vitest, source-of-truth for migration shape)
- `supabase/tests/public_security_wrappers.sql` (live-DB invariants; run with `psql "$SUPABASE_DB_URL" -f supabase/tests/public_security_wrappers.sql`)

The bug this checklist guards against produced the message
**“RGS internal record could not be initialized. Contact engineering.”**
caused by RLS policies hitting `permission denied for schema private`
because the public wrappers were not `SECURITY DEFINER`.

## Pre-flight (automated)

- [ ] `bunx vitest run src/lib/__tests__/publicSecurityWrappersRegression.test.ts` — all 33+ tests pass.
- [ ] `psql "$SUPABASE_DB_URL" -f supabase/tests/public_security_wrappers.sql` — every block prints `OK:` and the file ends with `all assertions passed`.

## Admin / platform owner verification

1. [ ] Log in as an admin or platform owner.
2. [ ] Open `/admin/rgs-business-control-center`.
3. [ ] Confirm the page renders with these tabs visible:
   - Overview
   - Revenue
   - Expenses
   - Payroll & Labor
   - Invoices
   - Cash Flow
   - Business Control Report
4. [ ] Confirm the message **“RGS internal record could not be initialized. Contact engineering.”** does **not** appear.
5. [ ] Confirm the **admin customer list** loads (`/admin/clients` or equivalent) and customers are visible.
6. [ ] Open the customer pipeline / CRM board and confirm the internal Revenue & Growth Systems account does **not** appear as a normal client card.

## Client portal verification

7. [ ] Log in as a normal (non-admin) client account.
8. [ ] Confirm the client portal dashboard loads without 403/permission errors.
9. [ ] Confirm the client cannot reach `/admin/rgs-business-control-center` (route should redirect or show forbidden).
10. [ ] Confirm the client only sees their own data (no internal RGS rows leak into reports, tasks, or uploads).

## Public surface verification

11. [ ] Open the public scorecard funnel logged out, complete a submission, and confirm the result page renders.
12. [ ] Confirm the homepage, pricing, and footer legal links all resolve (no 500s, no 403s).

## If any check fails

- Re-run the two automated suites first; they pinpoint which guarantee broke.
- Check the most recent migration in `supabase/migrations/` for any `CREATE OR REPLACE FUNCTION public.<wrapper>` that omits `SECURITY DEFINER`, drops `SET search_path TO 'public', 'private'`, or stops delegating to `private.<same name>`.
- Verify execute privileges with:
  ```sql
  SELECT p.proname,
         has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_exec,
         has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
         has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_exec
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'is_admin','has_role','is_platform_owner',
      'user_owns_customer','user_has_resource_assignment','resource_visibility_for'
    );
  ```
  Required state: `anon_exec = false`, `auth_exec = true`, `service_exec = true` for every row.