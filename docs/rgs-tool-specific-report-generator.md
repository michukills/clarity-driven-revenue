# Tool-Specific Report Generator + Separate PDF Storage Framework

## Audit summary

- **`report_drafts` table**: extended via migration to allow a new
  `tool_specific` value in `report_type`. All previous tier values
  (`full_rgs_diagnostic`, `fiverr_basic_diagnostic`,
  `fiverr_standard_diagnostic`, `fiverr_premium_diagnostic`,
  `implementation_report`, plus legacy `diagnostic`, `scorecard`,
  `rcc_summary`, `implementation_update`) remain valid. RLS unchanged
  (`Admins manage report drafts`).
- **PDF export** lives in `src/lib/exports.ts` (`generateRunPdf` /
  `PdfDoc`). Reused by the existing admin draft export path
  (`src/pages/admin/ReportDraftDetail.tsx`). The new tool-specific path
  uses the same helper — no parallel PDF system.
- **AI assist** (`supabase/functions/report-ai-assist`) is admin-gated
  and unchanged. Tool-specific drafts default to `generation_mode =
  'deterministic'` and `client_safe = false`. AI may be opt-in re-used
  later without code changes here.
- **Storage**: there are currently two private storage buckets
  (`resources`, `client-uploads`). No dedicated report-PDF bucket exists.
  Local PDF download is fully supported today; remote PDF archive to a
  tenant-safe bucket is **deferred** (see "Deferred" below).

## Why we extended `report_drafts` instead of creating a new table

`report_drafts` already provides:

- per-customer ownership (`customer_id`)
- admin-only RLS (`is_admin(auth.uid())`)
- versioning / history via `created_at` / `updated_at` and the
  `report_draft_learning_events` audit trail
- structured `draft_sections`, `recommendations`, `risks`,
  `missing_information`, `confidence`, `client_safe`, `admin_notes`
- `evidence_snapshot` JSON for source metadata
- the existing client-safe field allowlist
  (`src/lib/reports/clientSafeReportFields.ts`)

A new `tool_reports` table would have re-implemented all of this and
forked the security boundary. Extending the existing system is safer.

## New `tool_specific` report type

Defined in:

- `src/lib/reports/types.ts` — `ReportDraftType` union
- `src/lib/reports/reportTypeTemplates.ts` —
  `REPORT_TYPE_TEMPLATES.tool_specific` (label, scope boundary,
  exclusions, professional disclaimer)
- `src/lib/reports/draftService.ts` — `labelForType`
- DB constraint `report_drafts_report_type_check`

## Reusable framework

`src/lib/reports/toolReports.ts` exports:

- `REPORTABLE_TOOL_CATALOG` — single source of truth for which RGS
  tools may produce a standalone tool-specific report.
- `getReportableTool(toolKey)`, `isToolReportable(toolKey)`
- `generateToolSpecificDraft({ customerId, toolKey, sections, summary,
  sourceRecordId, title })` — inserts a `report_drafts` row with
  `report_type='tool_specific'`, `status='draft'`, `client_safe=false`.
- `buildToolReportPdfDoc(...)` — pure builder that filters to
  `client_safe` sections and appends the `tool_specific` scope
  boundary, exclusions, and professional review disclaimer.
- `buildToolReportFilename(...)`
- `downloadToolReportPdf(...)` — local PDF export.

Tool metadata (`tool_key`, `tool_name`, `service_lane`,
`source_record_id`, `summary`) rides inside `evidence_snapshot.notes`
so no schema migration is required to track the originating tool.

## Reportable tool catalog

| Tool | Lane | Client-facing eligible |
|---|---|---|
| Owner Diagnostic Interview | diagnostic | yes |
| 0–1000 Business Stability Scorecard | diagnostic | yes |
| RGS Stability Snapshot | diagnostic | yes |
| Priority Repair Map | diagnostic | yes |
| Financial Visibility Review | diagnostic | yes |
| Implementation Roadmap | implementation | yes |
| SOP / Training Bible | implementation | yes |
| Decision Rights & Accountability | implementation | yes |
| Workflow / Process Mapping | implementation | yes |
| Tool Assignment & Training Tracker | implementation | admin-only |
| Priority Action Tracker | rgs_control_system | yes |
| Owner Decision Dashboard | rgs_control_system | yes |
| Scorecard History / Stability Trend | rgs_control_system | yes |
| Monthly System Review | rgs_control_system | yes |
| Advisory Notes / Clarification Log | rgs_control_system | admin-only |

### Tools intentionally excluded

| Tool | Reason |
|---|---|
| Diagnostic Tool Sequence Manager | Orchestrator, not a deliverable. The downstream tools each report. |
| Admin Diagnostic Review Dashboard | Internal review surface, not a client deliverable. |
| Scope Boundary / Client Access Rules | Configuration surface, not a generated report. |
| Client Health / Renewal Risk | Admin internal; surfaces in admin notifications, not as a tool-specific PDF. |
| Industry Brain | Admin reference data, not a per-customer deliverable. |
| Walkthrough Videos | Static media, not a generated report. |
| Report Drafts | This is the report system itself. |
| Tool Library / Resource Center | Resource library, not a per-customer deliverable. |

## Admin workflow

1. Admin runs a tool for a customer.
2. Admin clicks "Generate tool-specific report" (uses
   `generateToolSpecificDraft`).
3. The new draft appears in the existing **Report Drafts** admin list
   (`/admin/report-drafts`), filterable by `report_type`.
4. Admin opens the draft in `ReportDraftDetail`, edits sections, and
   marks individual sections `client_safe`.
5. Admin approves the draft (status → `approved`).
6. Admin downloads the PDF from the same draft detail screen — the
   `tool_specific` scope boundary + exclusions + disclaimer are
   appended automatically by the existing PDF path. Tools that need an
   ad-hoc local PDF can also call `downloadToolReportPdf` directly.

## Client visibility

- A tool-specific draft is `client_safe = false` on creation.
- Clients only see tool-specific reports through the existing portal
  Reports surface, which already filters by published + ownership and
  uses `CLIENT_SAFE_REPORT_SELECT` (no `internal_notes` exposure).
- The bounded scope boundary copy makes clear that a tool-specific
  report is **not** the Full RGS Diagnostic, **not** Implementation,
  and **not** the RGS Control System™ subscription.

## PDF export / storage

- Local download is supported today via `downloadToolReportPdf` and
  the existing `ReportDraftDetail` Download PDF button (which respects
  the `tool_specific` scope boundary template).
- Filenames use `tool-report-<tool-slug>-<title-slug>-<YYYY-MM-DD>`,
  contain no IDs/emails/internal notes.

## Deferred

- **Remote PDF archive bucket** (e.g. `report-pdfs`) with admin/client
  RLS and signed URLs. Local export and the existing storage buckets
  are sufficient for current delivery; a dedicated tenant-safe report
  bucket can be added without breaking this framework.
- **Per-tool default section scaffolds**. Today each tool supplies its
  own bounded sections at call time. A future pass can move these into
  `REPORT_TYPE_TEMPLATES` so tools share scaffold libraries.
- **Wiring "Generate tool-specific report" buttons into every eligible
  tool page**. The framework is in place; per-tool buttons can be
  rolled out incrementally without further schema or security work.

## Security / access

- `report_drafts` RLS is unchanged: admin-only manage, clients read
  only published + owned via the existing client-safe column allowlist.
- No frontend secrets introduced.
- AI assist remains admin-triggered and backend-only.
- No fake proof / metrics / testimonials / videos / guarantees.
- No legal / tax / accounting / HIPAA / compliance advice introduced.