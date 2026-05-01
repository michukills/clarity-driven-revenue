# Connector Readiness & Import History (P20.17)

The admin metrics importer panel includes a per-customer
**Connector Readiness & Import History** surface that summarizes the
state of every supported provider connector and recent ingest/import
activity.

## Statuses

| Status | Meaning |
|---|---|
| Connected | Live provider connection is active and reporting status. |
| Live sync configured | Live sync is configured server-side; tokens are never read by the browser. |
| Live sync not configured | No live API connection is configured yet for this provider. |
| Summary available | RGS has a normalized provider-period summary stored for this customer. |
| Imported into metrics | An admin imported the latest summary into `client_business_metrics`. |
| Normalized ingest available | Admins can paste/upload a safe normalized summary without live OAuth. |
| No summary on file | No provider summary has been ingested for this customer yet. |
| Planned | Connector is on the roadmap but not yet wired up. |
| Not applicable | This connector does not apply to this customer's industry. |
| Needs verification | Provider state is unclear; admin verification is required. |
| Error | Could not read provider state. |

## Distinguishing the three core concepts

- **Normalized ingest available** — admins can manually post a vetted,
  whitelisted JSON summary into the provider's `*_period_summaries`
  table via the Provider Summary Ingest panel. No live OAuth required.
- **Summary available** — at least one row exists in the provider's
  `*_period_summaries` table for this customer.
- **Imported into metrics** — an admin has pulled the latest summary
  through the snapshot importer into `client_business_metrics`.

These are explicitly **not** equivalent. Ingesting a summary does not
automatically update `client_business_metrics`; an admin must run the
snapshot import.

## QuickBooks vs Square / Stripe / Dutchie

- **QuickBooks** is the flagship live connector and uses real OAuth via
  the `quickbooks_*` edge functions. It can show **Connected**,
  **Summary available**, **No summary**, or **Imported into metrics**.
- **Square**, **Stripe**, and **Dutchie** currently have summary tables,
  mappers, and admin UI, but no live API/OAuth integration yet. They are
  shown as **Normalized ingest available** until a summary is on file
  and never as **Connected**.

## Dutchie applicability

Dutchie is regulated cannabis/MMJ retail and POS only. For non-cannabis
customers it always renders as **Not applicable**. We use cannabis/MMJ
wording — never **MMC**, and never healthcare/patient-care terminology.

## Audit / history surface

The history list reads from `public.portal_audit_log` (admins-only via
RLS) scoped to the selected customer and limited to recent provider
events:

- `data_import_started` (used for `provider_summary_ingested`)
- `data_import_completed` for sources `metrics_quickbooks`,
  `metrics_square`, `metrics_stripe`, `metrics_dutchie`, `metrics_csv`,
  `metrics_xlsx`
- `connector_connected` / `connector_disconnected`

Only a small whitelist of detail keys is rendered: `event`, `provider`,
`source`, `period_start`, `period_end`, `field_count`, `confidence`,
`readiness`. Anything else (tokens, account IDs, raw payloads) is
dropped before render by `safeAuditFromRow`.

## Intentionally not displayed

- Provider OAuth tokens, refresh tokens, ciphertext.
- Provider account IDs, location IDs.
- Raw period summary payloads or pasted JSON.
- Raw audit `details` blobs.

## Path to live integrations

Once a provider has a real OAuth flow + status endpoint, wire its live
connection signal into `ReadinessInputs.<provider>.liveConnected` (or
add a similar field) so the panel can promote it from
**Normalized ingest available** to **Connected** / **Live sync
configured** without any UI changes.