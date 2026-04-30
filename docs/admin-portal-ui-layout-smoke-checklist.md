# Admin & Client Portal UI Layout Smoke Checklist

Smoke pass for layout regressions across the RGS Operating System portals.
Run after any change that touches BCC, Customer Detail, dashboard cards, or
tool surfaces. This is a visual/manual check — pair with the unit tests in
`src/components/bcc/__tests__/cashFlowPanelLayout.test.tsx`.

## 1. Business Control Center → Cash Flow (desktop ≥ 1280px)
- [ ] Three metric cards render side-by-side ("Cash movement", "Upcoming",
      "Receivables & runway") and span the full container width.
- [ ] Labels stay on a single line; values right-align with tabular numbers.
- [ ] No card collapses into a narrow vertical strip.
- [ ] Divider lines between summary rows are visible.

## 2. Cash Flow (tablet ~ 768–1024px)
- [ ] Cards fall to 2-up (or 1-up if container narrows further) without
      clipping values.
- [ ] Importer callout ("CSV / Spreadsheet" + "QuickBooks") wraps cleanly.

## 3. Cash Flow (mobile ≤ 480px)
- [ ] Cards stack to a single column.
- [ ] Labels and values remain on the same row, with the value on the right.
- [ ] "Add entry" button stays visible in the section header.

## 4. Add entry button alignment
- [ ] Top-right of each ModuleCard, never overlapping the title/subtitle.
- [ ] Toggles between "Add entry" and "Close" without layout shift.

## 5. Empty state placement
- [ ] "No cash flow entries yet." renders inside the card area, centered,
      below the metric grid and importer callout — not floating detached.
- [ ] On Revenue tab: long emptyLabel string wraps without overflow.

## 6. Revenue / Expenses / Payroll / Invoices tabs
- [ ] Summary stat grid on Revenue tab uses 2-up on mobile, 4-up on desktop.
- [ ] Tables scroll horizontally on narrow viewports rather than clipping.
- [ ] Row action buttons (edit/delete) remain reachable.

## 7. Admin Customer Detail
- [ ] AdminCustomerMetricsPanel and AdminMetricContextPanel render without
      overlapping the leak intelligence panel.
- [ ] Source/origin badges stay legible on the Top-3 cards.

## 8. Client dashboard
- [ ] Tool tiles render in a responsive grid; titles do not clip.
- [ ] Locked/unlocked states visually distinct.

## 9. Tool matrix
- [ ] ClientToolMatrixCard rows align across columns; no horizontal scroll
      bleed on desktop.

## 10. Screenshot / demo readiness
- [ ] All BCC tabs screenshot cleanly at 1440×900 with no clipped text.
- [ ] No console errors on tab switch.

## 11. CSV / QuickBooks importers
- [ ] Cash Flow importer callout links route correctly:
      - Admin → `/admin/imports`
      - Client → `/portal/imports` (CSV) and `/portal/connected-sources` (QB)
- [ ] CsvImportWizard mounts on both admin and client import pages.
- [ ] QuickBooks status panel renders connection state honestly
      (`not_configured` / `disconnected` / `connected` / `expired` / etc.).
- [ ] No claim of OAuth/live sync for sources other than QuickBooks.