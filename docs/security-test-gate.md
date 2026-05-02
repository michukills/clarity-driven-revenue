# Security Test Gate (P30)

Short reference for the launch-safe CI gate.

## Commands

| Command | What it runs |
| --- | --- |
| `npm run test:security` | Security/role/tenant regression suites only. Fast. |
| `npm run test:contracts` | Voice, industry, connector, role, and tenant contract tests. |
| `npm test` | Full vitest suite. |
| `npm run typecheck` | `tsc --noEmit` against `tsconfig.app.json`. |
| `npm run lint` | ESLint. |
| `npm run test:ci` | Typecheck → lint → security tests → full tests → production build. The same gate CI runs. |

CI is wired in `.github/workflows/ci.yml` and runs on every PR and push to `main`.

## What the security tests protect

- **`roleGatingRegression`** — every `/admin/*` route uses `ProtectedRoute requireRole="admin"`, every `/portal/*` route uses `ProtectedRoute`, portal report queries exclude `internal_notes`, no service-role / live Stripe keys land in the frontend bundle, and tool-gated portal routes are wrapped in `ClientToolGuard`.
- **`tenantIsolationContract`** — portal pages derive the active customer from the session (`usePortalCustomerId` / `useAuth`) instead of URL params, `ReportView` and `Reports` filter by `status='published'`, `ClientToolGuard` defers to `get_effective_tools_for_customer`, admin preview-as-client is audit-logged, and public/portal pages do not import admin-only modules or server-only token helpers.
- **`edgeFunctionRoleContract`** — tenant-scoped functions call `getCallerUserId` + `callerCanUseCustomer`, admin-only functions use `requireAdmin` or an inline `user_roles` admin check before doing work, public webhooks validate signature/state and are pinned to `verify_jwt = false`, no edge function returns `access_token` / `refresh_token` to callers, and frontend code never references `qb_get_connection_tokens` / `qb_store_connection_tokens`.
- **`edgeFunctionSecurity`** — admin-only AI helpers verify JWTs in `supabase/config.toml`, gate on `requireAdmin` before touching the AI gateway, log runs to `ai_run_logs`, and report AI readiness without echoing secret values.
- **`connectorCopyContract`** — connector copy uses exact official brand spelling (QuickBooks, Stripe, Square, etc.), avoids implying partnership/endorsement, and never leaks healthcare framing into cannabis/Dutchie surfaces.
- **`portalSecurityHardeningP18` / `portalSecurityModel` / `supabaseSecurityHardening` / `publicSecurityWrappersRegression` / `portalAuditP19`** — RLS contract, audit-log RPC contract, and portal/auth security model.

## Intentionally excluded from secret scans

- `src/integrations/supabase/types.ts` — auto-generated; mirrors DB column names like `*_token_*` but does not embed any secret value.
- `src/lib/__tests__/*.test.ts` — tests legitimately reference banned identifiers as patterns to scan for.

## Frontend rules to keep the gate green

- **Never** reference `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_SERVICE`, `qb_get_connection_tokens`, `qb_store_connection_tokens`, `qb_token_encryption_key`, `pgp_sym_decrypt`, `sk_live_...`, or `sk_test_...` from any file under `src/`.
- **Never** import from `@/lib/admin/*`, `@/lib/internal/*`, `@/components/admin/*`, or `@/pages/admin/*` inside a public page or portal page.
- **Never** select `internal_notes` from a portal page.
- **Never** derive a customer/tenant id from `useParams` in a portal data page; resolve it via `usePortalCustomerId` so RLS + `previewCustomerId` are honored.

## Adding a new protected portal route

1. Wrap the element in `<ProtectedRoute>...</ProtectedRoute>`.
2. If the route is gated by tool assignment, also wrap with `<ClientToolGuard toolKey="...">` and add the path to the `mustGuard` allow-list in `roleGatingRegression.test.ts`.
3. Resolve the active customer via `usePortalCustomerId`, never via `useParams`.
4. If the route reads reports, scope the query and explicitly omit `internal_notes` from the `select` (P4.5 hygiene).

## Adding a new edge function

- **Tenant-scoped** (called by clients for their own customer): use `getCallerUserId(req)` and `callerCanUseCustomer(admin, userId, customerId)`; return 403 on failure.
- **Admin-only**: import and call `requireAdmin(req, corsHeaders)` from `_shared/admin-auth.ts` before invoking any provider/AI logic. Add the function name to the `adminOnly` array in `edgeFunctionRoleContract.test.ts` and the `aiFunctions` array in `edgeFunctionSecurity.test.ts` if it touches the AI gateway. Set `verify_jwt = true` in `supabase/config.toml`.
- **Public webhook / OAuth callback**: validate signature (HMAC) or `state` server-side. Set `verify_jwt = false` in `supabase/config.toml` and add the function to the `publicWebhook` array.
- **Never** return `access_token`, `refresh_token`, service-role keys, OAuth secrets, or `internal_notes` in a JSON response.
- Token storage and retrieval must go through the service-role-only RPCs `qb_store_connection_tokens` / `qb_get_connection_tokens` from a server-only client.