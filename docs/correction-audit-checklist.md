# Correction & Reversibility Audit Checklist

P13.H foundation-repair checkpoint. Tracks whether every user-created data
surface supports edit / delete / correction so users do not get "stuck data".

| Surface | Create | Edit | Delete | Notes |
|---|---|---|---|---|
| Customers (admin) | ✅ | ✅ via detail page | ✅ Delete + Archive | toast on every action |
| Customer packages & lifecycle | ✅ | ✅ | n/a (toggle) | toast on save |
| Customer notes (admin) | ✅ | — | — | append-only by design |
| Customer tasks | ✅ | ✅ status | ✅ | toast on action |
| Checklist items | ✅ | ✅ complete toggle | ✅ | client + admin |
| Diagnostic intake answers | ✅ | ✅ | ✅ | client-owned |
| Connected source requests | ✅ | ✅ update note | n/a (admin closes) | request flow |
| Customer integrations (admin) | ✅ | ✅ status | ✅ | admin-only writes |
| CSV / Spreadsheet imports | ✅ | ✅ remap | ✅ delete staging | provenance preserved |
| Cash-flow entries | ✅ | ✅ | ✅ | client + admin |
| Expense entries | ✅ | ✅ | ✅ | client + admin |
| Financial categories | ✅ | ✅ | ✅ | defaults read-only |
| Business goals | ✅ | ✅ | ✅ | client + admin |
| Business financial periods | ✅ | ✅ | ✅ | client + admin |
| Cash position snapshots | ✅ | ✅ admin | ✅ admin | admin-only writes |
| Financial obligations | ✅ admin | ✅ admin | ✅ admin | admin-only |
| Customer impact ledger | ✅ admin | ✅ admin | ✅ admin | client_visible toggle |
| Business control reports | ✅ admin | ✅ via editor | ✅ | published is snapshot |
| Customer uploads (files) | ✅ | — | ✅ | immutable content |
| Resource / tool assignments | ✅ admin | ✅ | ✅ | per-client matrix |
| Client pipeline deals | ✅ admin | ✅ | ✅ | admin-managed |
| Client pipeline stages | ✅ admin | ✅ | ✅ | admin-managed |
| Customer stability scores | ✅ admin | ✅ admin | ✅ admin | history retained |

## Confirmation feedback (toast / banner)

All write paths above terminate in a `toast.success` or `toast.error`
(via sonner) or surface an inline error banner. No silent failures
identified during the P13.H audit.

## Known gaps

- `customer_notes` and `customer_timeline` are append-only by design —
  edits are intentionally not supported.
- Published reports (`business_control_reports.status='published'`) are
  immutable snapshots; corrections require publishing a new version.

