CREATE TABLE public.diagnostic_interview_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  scorecard_run_id uuid,
  submitted_by uuid,
  source text NOT NULL DEFAULT 'anonymous' CHECK (source IN ('anonymous','client','admin','scorecard')),

  lead_name text,
  lead_email text,
  lead_business text,
  lead_phone text,

  answers jsonb NOT NULL DEFAULT '{}'::jsonb,

  evidence_map jsonb NOT NULL DEFAULT '[]'::jsonb,
  system_dependency_map jsonb NOT NULL DEFAULT '[]'::jsonb,
  validation_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_information jsonb NOT NULL DEFAULT '[]'::jsonb,

  confidence text NOT NULL DEFAULT 'low' CHECK (confidence IN ('low','medium','high')),
  ai_status text NOT NULL DEFAULT 'not_run' CHECK (ai_status IN ('not_run','queued','complete','failed','disabled')),

  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','converted','archived')),
  admin_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT lead_email_len CHECK (lead_email IS NULL OR char_length(lead_email) <= 255),
  CONSTRAINT lead_name_len CHECK (lead_name IS NULL OR char_length(lead_name) <= 200),
  CONSTRAINT lead_business_len CHECK (lead_business IS NULL OR char_length(lead_business) <= 200),
  CONSTRAINT lead_phone_len CHECK (lead_phone IS NULL OR char_length(lead_phone) <= 50),
  CONSTRAINT admin_notes_len CHECK (admin_notes IS NULL OR char_length(admin_notes) <= 8000)
);

CREATE INDEX idx_dir_customer ON public.diagnostic_interview_runs(customer_id);
CREATE INDEX idx_dir_status ON public.diagnostic_interview_runs(status);
CREATE INDEX idx_dir_created ON public.diagnostic_interview_runs(created_at DESC);

ALTER TABLE public.diagnostic_interview_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit diagnostic interview"
  ON public.diagnostic_interview_runs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins manage diagnostic interview runs"
  ON public.diagnostic_interview_runs
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER diagnostic_interview_runs_touch_updated_at
  BEFORE UPDATE ON public.diagnostic_interview_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();
