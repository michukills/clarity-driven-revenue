# Portal Security Verification Checklist (P18)

Manual verification steps for the RGS portal security model. Run these
after any change that touches authentication, RLS, the audit log, or a
sensitive call-site.

## 1. Browser Network tab

Open DevTools → Network and confirm none of the following ever appear in
a response body or request payload visible to the browser:

- `access_token` (other than the auth session token)
- `refresh_token` (other than the auth session token)
- `access_token_ciphertext`
- `refresh_token_ciphertext`
- `qb_get_connection_tokens`
- `qb_store_connection_tokens`
- `qb_token_encryption_key`
- `private.quickbooks_connection_tokens`

## 2. Client isolation

Sign in as Client A. Try to view another customer’s:

- reports
- tasks
- uploaded files
- audit log
- connector status
- AI recommendations
- diagnostic results

Each should return zero rows / “not found”, never another tenant’s data.

## 3. Admin isolation

Sign in as a client account and confirm admin-only notes, tools, and
pipeline data are not visible.

## 4. Audit log verification

Trigger each major action and confirm a row appears in
`portal_audit_log` for the current `customer_id`:

- report viewed / generated
- task status changed
- file uploaded / deleted
- connector connected / disconnected
- AI recommendation generated
- client record updated

## 5. Fail-closed behavior

If `customer_id` is missing or unclear, the app must show no sensitive
data and must not guess a tenant. The audit RPC must reject calls with
`null` customer or action.

## 6. RPC abuse checks

Using a logged-in client, attempt to call `log_portal_audit` with:

- another customer’s id → must error “not authorized for this customer”
- a 32 KB `details` payload → must error “audit details too large”
- 200 calls in 60 seconds → must error “audit rate limit exceeded”

Anonymous (signed-out) calls must error “invalid role”.

## 7. P19 Audit Wiring Verification

Trigger each of the following actions and confirm a single matching row
lands in `portal_audit_log` for the correct `customer_id`. Confirm the
`details` payload is **minimal** and **never** contains tokens, OAuth
codes, ciphertext, raw rows, file contents, prompts, AI responses, note
content, or before/after customer values.

- [ ] **report_generated** — admin sets a Business Control Report status
      to `published` in `/admin/reports/.../edit`. Payload should be
      `{ report_id, report_type }`.
- [ ] **report_viewed** — client opens a published report at
      `/portal/reports/:id`. Payload should be
      `{ report_id, report_type, source: "client_portal" }`.
- [ ] **task_assigned** — admin releases a top-3 client task via
      `releaseClientTask` in the Diagnostic Workspace. Payload should be
      `{ task_id, assigned_by: "admin" }`.
- [ ] **file_deleted** — currently no UI exposes deletion of
      `customer_uploads`. A `TODO(P19 audit)` marker is in
      `src/pages/admin/Files.tsx`. Re-verify once a delete UI ships.
- [ ] **connector_connected** — for non-QuickBooks providers, calling
      `connectIntegration` should produce
      `{ connector, provider, status: "connected" }`. For QuickBooks the
      event fires inside the `qb-oauth-callback` edge function — check
      the audit row after a real OAuth round-trip.
- [ ] **connector_disconnected** — call `disconnectIntegration` (or
      `setIntegrationStatus(_, "disconnected")`). Payload should be
      `{ connector, provider, status: "disconnected" }`.
- [ ] **data_import_started** — start a CSV/XLSX import in the wizard.
      Payload: `{ source: "upload", import_type, file_kind }`.
- [ ] **data_import_completed** — successful import. Payload:
      `{ source, import_type, row_count, trusted, staged, skipped }`.
- [ ] **admin_note_created** — add a note from `CustomerDetail` or
      `ClientBusinessControl`. Payload: `{ note_id, visibility }`.
- [ ] **admin_note_edited** — currently no edit UI; `TODO(P19 audit)`
      marker is in `src/pages/admin/CustomerDetail.tsx`. Re-verify once
      an edit UI ships.
- [ ] **ai_recommendation_generated** — run the priority engine via
      `generateRoadmap`. Payload:
      `{ roadmap_id, source, scored_count, regenerated }`.
- [ ] **client_record_updated** — admin edits a single field in
      `CustomerDetail`. Payload: `{ fields_changed: [<field_name>] }`.

### Helper hardening checks

- [ ] Pass a `details` object that includes `access_token`,
      `refresh_token`, `api_key`, `secret`, `ciphertext`,
      `authorization`, `oauth_code`, or `code` (e.g. via console). The
      stored row must NOT contain any of these keys.
- [ ] Force a transient RPC failure (e.g. take the network offline for
      <100 ms). The helper should retry once and emit a single
      `console.warn` containing the action name; for connector and
      data-import events the warning prefix must include `[critical]`.
- [ ] Calling `logPortalAudit` with a missing `customerId` must be a
      no-op and never reach the network.