CREATE TABLE public.scorecard_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  business_name text NOT NULL,
  role text,
  phone text,

  source_page text,
  source_campaign text,
  user_agent text,

  answers jsonb NOT NULL DEFAULT '[]'::jsonb,

  rubric_version text NOT NULL DEFAULT 'v1',
  pillar_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  overall_score_estimate integer,
  overall_score_low integer,
  overall_score_high integer,
  overall_band smallint,
  overall_confidence text NOT NULL DEFAULT 'low',
  rationale text,
  missing_information jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_focus jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,

  ai_status text NOT NULL DEFAULT 'not_run',
  ai_model text,
  ai_version text,
  ai_payload jsonb,
  ai_rationale text,
  ai_confidence text,
  ai_missing_info jsonb,
  ai_run_at timestamptz,
  ai_run_by uuid,

  admin_final_score integer,
  admin_notes text,
  status text NOT NULL DEFAULT 'new',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT scorecard_runs_status_chk
    CHECK (status IN ('new','reviewed','converted','archived')),
  CONSTRAINT scorecard_runs_ai_status_chk
    CHECK (ai_status IN ('not_run','queued','running','succeeded','failed','disabled')),
  CONSTRAINT scorecard_runs_confidence_chk
    CHECK (overall_confidence IN ('low','medium','high'))
);

CREATE INDEX scorecard_runs_created_at_idx ON public.scorecard_runs (created_at DESC);
CREATE INDEX scorecard_runs_status_idx ON public.scorecard_runs (status);
CREATE INDEX scorecard_runs_email_idx ON public.scorecard_runs (lower(email));
CREATE INDEX scorecard_runs_business_idx ON public.scorecard_runs (lower(business_name));

CREATE TRIGGER scorecard_runs_set_updated_at
BEFORE UPDATE ON public.scorecard_runs
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.scorecard_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit scorecard runs"
ON public.scorecard_runs
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins read all scorecard runs"
ON public.scorecard_runs
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins update scorecard runs"
ON public.scorecard_runs
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins delete scorecard runs"
ON public.scorecard_runs
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));