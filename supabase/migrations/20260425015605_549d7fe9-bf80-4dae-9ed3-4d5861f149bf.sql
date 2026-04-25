DROP POLICY IF EXISTS "Anyone can submit diagnostic interview" ON public.diagnostic_interview_runs;

CREATE POLICY "Public submit diagnostic interview"
  ON public.diagnostic_interview_runs
  FOR INSERT
  WITH CHECK (
    -- Either anonymous-with-email OR authenticated submitter matching auth.uid()
    (
      (auth.uid() IS NULL AND lead_email IS NOT NULL AND char_length(lead_email) >= 5)
      OR
      (auth.uid() IS NOT NULL AND submitted_by = auth.uid())
    )
    -- Block tampering with admin-controlled fields on insert
    AND status = 'new'
    AND ai_status = 'not_run'
    AND admin_notes IS NULL
    AND customer_id IS NULL
  );
