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