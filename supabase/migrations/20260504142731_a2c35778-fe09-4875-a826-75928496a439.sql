-- P65 — Report Generator Tiering: extend allowed report_drafts.report_type
-- values to support the five RGS report tiers without creating a parallel
-- report storage system. Existing values remain valid for back-compat.
ALTER TABLE public.report_drafts
  DROP CONSTRAINT IF EXISTS report_drafts_report_type_check;

ALTER TABLE public.report_drafts
  ADD CONSTRAINT report_drafts_report_type_check
  CHECK (
    report_type = ANY (ARRAY[
      -- legacy / pre-P65 types — preserved for back-compat
      'diagnostic',
      'scorecard',
      'rcc_summary',
      'implementation_update',
      -- P65 tier values
      'full_rgs_diagnostic',
      'fiverr_basic_diagnostic',
      'fiverr_standard_diagnostic',
      'fiverr_premium_diagnostic',
      'implementation_report'
    ])
  );