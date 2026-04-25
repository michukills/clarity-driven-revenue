-- P13.DiagnosticInterview.AI.1 — fix: grant INSERT to anon/authenticated and SELECT/UPDATE to authenticated.
-- RLS policies are already in place; without table GRANTs, even matching policies are blocked.
GRANT INSERT ON public.diagnostic_interview_runs TO anon, authenticated;
GRANT SELECT, UPDATE ON public.diagnostic_interview_runs TO authenticated;