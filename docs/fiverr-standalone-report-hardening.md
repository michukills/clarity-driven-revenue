# Fiverr / Standalone Report Hardening

Status: urgent production hardening pass.

## Diagnostic Report Worlds

RGS now keeps two report worlds separate:

- **Fiverr / standalone diagnostic reports**
  - Business Health Check Report
  - Business Systems Diagnostic Report
  - Priority Repair Roadmap Report
- **Full RGS paying-client diagnostic report**
  - Full RGS Business Stability Diagnostic Report

Fiverr reports can use score, gear, stability snapshot, and repair-roadmap
language according to the package, but they do not become the full RGS
client diagnostic. Admin report type, PDF title, metadata, scope boundary,
and filename all carry the selected report type.

## PDF Export

Admin diagnostic PDFs are generated from reviewed `client_safe` sections only.
The export helper builds exact filenames:

- `Business_Health_Check_Report_ClientName_Date.pdf`
- `Business_Systems_Diagnostic_Report_ClientName_Date.pdf`
- `Priority_Repair_Roadmap_Report_ClientName_Date.pdf`
- `Full_RGS_Business_Stability_Diagnostic_Report_ClientName_Date.pdf`

Tool-specific PDFs continue to use the P70 private `tool-reports` bucket,
signed URLs, and client-visible approval gate.

## Standalone Package Ladders

The standalone runner now has approved three-level ladders for:

- SOP / Training Bible
- Buyer Persona / ICP
- Workflow / Process Mapping
- Decision Rights / Accountability
- Revenue & Risk / Business Leakage

Each ladder defines package name, report name, purpose, includes, excludes,
PDF requirement, admin review requirement, client-visible approval gate, and
readiness score. The runner still creates `tool_specific` report drafts, so
there is no duplicate report system.

## Readiness Rules

A tool is sellable as a standalone deliverable only when:

- it has an approved three-level ladder
- report draft generation uses the existing tool-specific framework
- PDF export is real
- stored report artifacts are admin-only on creation
- client visibility requires explicit approval
- RLS and tenant isolation remain intact
- the scope boundary excludes implementation, ongoing support, professional
  advice, regulated certification, valuation, fiduciary conclusions, and
  promised outcomes

Tools without an approved ladder can still be reportable internally, but the
audit marks them not ready for standalone sale.

## AI

AI remains admin review assist only. It cannot change deterministic scores,
invent missing evidence, publish client-visible content, bypass RLS, or make
legal/tax/accounting/HR/compliance/fiduciary/valuation decisions.
