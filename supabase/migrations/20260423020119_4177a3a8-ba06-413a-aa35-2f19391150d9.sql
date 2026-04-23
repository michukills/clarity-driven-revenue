-- P7.3 — RGS Review Queue lifecycle table
CREATE TABLE IF NOT EXISTS public.rgs_review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  weekly_checkin_id uuid NULL REFERENCES public.weekly_checkins(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'weekly_checkin',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz NULL,
  resolved_at timestamptz NULL,
  reviewed_by uuid NULL,
  resolution_note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rgs_review_requests_status_chk
    CHECK (status IN ('open','reviewing','follow_up_needed','resolved','dismissed')),
  CONSTRAINT rgs_review_requests_priority_chk
    CHECK (priority IN ('normal','urgent')),
  CONSTRAINT rgs_review_requests_source_chk
    CHECK (source IN ('weekly_checkin','manual'))
);

-- Dedupe: at most one queue row per weekly check-in
CREATE UNIQUE INDEX IF NOT EXISTS rgs_review_requests_checkin_uniq
  ON public.rgs_review_requests (weekly_checkin_id)
  WHERE weekly_checkin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS rgs_review_requests_customer_idx
  ON public.rgs_review_requests (customer_id);
CREATE INDEX IF NOT EXISTS rgs_review_requests_status_idx
  ON public.rgs_review_requests (status);

-- updated_at trigger
DROP TRIGGER IF EXISTS rgs_review_requests_touch_updated_at ON public.rgs_review_requests;
CREATE TRIGGER rgs_review_requests_touch_updated_at
BEFORE UPDATE ON public.rgs_review_requests
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.rgs_review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all on rgs_review_requests"
ON public.rgs_review_requests
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Clients view own rgs_review_requests"
ON public.rgs_review_requests
FOR SELECT
USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));
