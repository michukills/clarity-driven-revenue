
-- P18 — Operational profile: structured admin-only fields capturing the
-- diagnostic operating data the OS currently lacks (leads, close rate,
-- avg ticket, gross margin, AR, owner hours, team size, capacity,
-- change readiness, implementation capacity, decision bottleneck,
-- accountable owner, preferred cadence). Admin-only by RLS.
--
-- Additive only. Does not change any existing tables, policies, or flows.

CREATE TABLE IF NOT EXISTS public.customer_operational_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,

  -- Revenue & sales operating data
  monthly_leads integer,
  monthly_close_rate_pct numeric(5,2),
  average_ticket_usd numeric(12,2),
  monthly_revenue_usd numeric(14,2),
  gross_margin_pct numeric(5,2),
  ar_open_usd numeric(14,2),

  -- People & capacity
  owner_hours_per_week integer,
  team_size integer,
  crew_or_job_capacity text,
  accountable_owner_name text,
  accountable_owner_role text,

  -- Implementation readiness
  biggest_constraint text,
  owner_urgency text CHECK (owner_urgency IS NULL OR owner_urgency IN ('low','medium','high','critical')),
  change_readiness text CHECK (change_readiness IS NULL OR change_readiness IN ('low','medium','high')),
  implementation_capacity text CHECK (implementation_capacity IS NULL OR implementation_capacity IN ('low','medium','high')),
  decision_bottleneck text,
  implementation_failure_risk text,

  -- Cadence
  preferred_cadence text CHECK (preferred_cadence IS NULL OR preferred_cadence IN ('weekly','biweekly','monthly','adhoc')),
  preferred_channel text CHECK (preferred_channel IS NULL OR preferred_channel IN ('email','phone','sms','portal','meeting')),

  admin_notes text,

  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_operational_profile ENABLE ROW LEVEL SECURITY;

-- Admin-only — never client-readable. All fields are operating intelligence.
CREATE POLICY "Admin manage operational profile"
  ON public.customer_operational_profile
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER customer_operational_profile_touch
  BEFORE UPDATE ON public.customer_operational_profile
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
