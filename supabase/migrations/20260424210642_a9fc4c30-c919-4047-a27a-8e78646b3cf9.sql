DROP POLICY IF EXISTS "Anyone can submit scorecard runs" ON public.scorecard_runs;

CREATE POLICY "Anyone can submit scorecard runs"
ON public.scorecard_runs
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(first_name)) BETWEEN 1 AND 80
  AND length(btrim(last_name)) BETWEEN 1 AND 80
  AND length(btrim(business_name)) BETWEEN 1 AND 160
  AND length(btrim(email)) BETWEEN 5 AND 254
  AND position('@' in email) > 1
  AND position('.' in split_part(email, '@', 2)) > 0
  AND (role IS NULL OR length(role) <= 120)
  AND (phone IS NULL OR length(phone) <= 40)
  AND (source_page IS NULL OR length(source_page) <= 240)
  AND (source_campaign IS NULL OR length(source_campaign) <= 120)
  AND (user_agent IS NULL OR length(user_agent) <= 500)
  AND status = 'new'
  AND ai_status = 'not_run'
  AND admin_final_score IS NULL
  AND admin_notes IS NULL
);