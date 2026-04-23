-- P11.9 Operations Module: SOPs, bottlenecks, capacity, owner dependence

CREATE TABLE public.operational_sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  title text NOT NULL,
  category text,
  status text NOT NULL DEFAULT 'not_started',
  owner_role text,
  step_count integer,
  documented_level text NOT NULL DEFAULT 'none',
  last_reviewed_at date,
  tooling_used text,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_operational_sops_customer ON public.operational_sops(customer_id);
ALTER TABLE public.operational_sops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all on operational_sops" ON public.operational_sops
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Clients view own operational_sops" ON public.operational_sops
  FOR SELECT USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));
CREATE TRIGGER trg_operational_sops_updated BEFORE UPDATE ON public.operational_sops
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.operational_bottlenecks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  bottleneck_type text NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text,
  area text,
  severity text NOT NULL DEFAULT 'medium',
  frequency text NOT NULL DEFAULT 'occasional',
  owner_only boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  first_observed_at date,
  last_observed_at date,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_operational_bottlenecks_customer ON public.operational_bottlenecks(customer_id);
ALTER TABLE public.operational_bottlenecks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all on operational_bottlenecks" ON public.operational_bottlenecks
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Clients view own operational_bottlenecks" ON public.operational_bottlenecks
  FOR SELECT USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));
CREATE TRIGGER trg_operational_bottlenecks_updated BEFORE UPDATE ON public.operational_bottlenecks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.operational_capacity_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  team_size numeric,
  owner_hours_per_week numeric,
  delivery_hours_available numeric,
  delivery_hours_committed numeric,
  admin_hours_available numeric,
  admin_hours_committed numeric,
  sales_hours_available numeric,
  sales_hours_committed numeric,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_operational_capacity_snapshots_customer ON public.operational_capacity_snapshots(customer_id, snapshot_date DESC);
ALTER TABLE public.operational_capacity_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all on operational_capacity_snapshots" ON public.operational_capacity_snapshots
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Clients view own operational_capacity_snapshots" ON public.operational_capacity_snapshots
  FOR SELECT USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));
CREATE TRIGGER trg_operational_capacity_snapshots_updated BEFORE UPDATE ON public.operational_capacity_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.owner_dependence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  function_area text,
  task_name text NOT NULL,
  why_owner_only text,
  delegation_status text NOT NULL DEFAULT 'owner_only',
  replacement_ready text NOT NULL DEFAULT 'no',
  frequency text NOT NULL DEFAULT 'occasional',
  risk_level text NOT NULL DEFAULT 'medium',
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_owner_dependence_items_customer ON public.owner_dependence_items(customer_id);
ALTER TABLE public.owner_dependence_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all on owner_dependence_items" ON public.owner_dependence_items
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Clients view own owner_dependence_items" ON public.owner_dependence_items
  FOR SELECT USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));
CREATE TRIGGER trg_owner_dependence_items_updated BEFORE UPDATE ON public.owner_dependence_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();