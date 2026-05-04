ALTER TABLE public.report_drafts
  DROP CONSTRAINT IF EXISTS report_drafts_report_type_check;

ALTER TABLE public.report_drafts
  ADD CONSTRAINT report_drafts_report_type_check
  CHECK (
    report_type = ANY (ARRAY[
      'diagnostic',
      'scorecard',
      'rcc_summary',
      'implementation_update',
      'full_rgs_diagnostic',
      'fiverr_basic_diagnostic',
      'fiverr_standard_diagnostic',
      'fiverr_premium_diagnostic',
      'implementation_report',
      'tool_specific'
    ])
  );