-- ============================================================
-- Business Control Center: 11 tables
-- ============================================================

-- 1) business_financial_periods
CREATE TABLE public.business_financial_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_label text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bfp_customer ON public.business_financial_periods(customer_id);

-- 10) financial_categories (created early so expense_entries can FK it)
CREATE TABLE public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  category_type text NOT NULL,
  name text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fc_customer ON public.financial_categories(customer_id);
CREATE INDEX idx_fc_type ON public.financial_categories(category_type);

-- 2) revenue_entries
CREATE TABLE public.revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.business_financial_periods(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  service_category text,
  client_or_job text,
  revenue_type text NOT NULL DEFAULT 'one_time',
  status text NOT NULL DEFAULT 'collected',
  source_channel text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_re_customer ON public.revenue_entries(customer_id);
CREATE INDEX idx_re_period ON public.revenue_entries(period_id);

-- 3) expense_entries
CREATE TABLE public.expense_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.business_financial_periods(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  vendor text,
  expense_type text NOT NULL DEFAULT 'variable',
  payment_status text NOT NULL DEFAULT 'paid',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ee_customer ON public.expense_entries(customer_id);
CREATE INDEX idx_ee_period ON public.expense_entries(period_id);

-- 4) payroll_entries
CREATE TABLE public.payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.business_financial_periods(id) ON DELETE SET NULL,
  pay_period_start date,
  pay_period_end date,
  person_name text,
  role text,
  gross_pay numeric NOT NULL DEFAULT 0,
  payroll_taxes_fees numeric NOT NULL DEFAULT 0,
  total_payroll_cost numeric NOT NULL DEFAULT 0,
  hours_worked numeric,
  labor_type text NOT NULL DEFAULT 'employee',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pe_customer ON public.payroll_entries(customer_id);
CREATE INDEX idx_pe_period ON public.payroll_entries(period_id);

-- 5) labor_entries
CREATE TABLE public.labor_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.business_financial_periods(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  person_name text,
  role text,
  job_or_project text,
  service_category text,
  hours_worked numeric,
  labor_cost numeric NOT NULL DEFAULT 0,
  billable_status text NOT NULL DEFAULT 'billable',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_le_customer ON public.labor_entries(customer_id);
CREATE INDEX idx_le_period ON public.labor_entries(period_id);

-- 6) invoice_entries
CREATE TABLE public.invoice_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.business_financial_periods(id) ON DELETE SET NULL,
  invoice_number text,
  invoice_date date,
  due_date date,
  client_or_job text,
  amount numeric NOT NULL DEFAULT 0,
  amount_collected numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ie_customer ON public.invoice_entries(customer_id);
CREATE INDEX idx_ie_period ON public.invoice_entries(period_id);

-- 7) cash_flow_entries
CREATE TABLE public.cash_flow_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.business_financial_periods(id) ON DELETE SET NULL,
  entry_date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  direction text NOT NULL DEFAULT 'cash_in',
  category text,
  description text,
  expected_or_actual text NOT NULL DEFAULT 'actual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cfe_customer ON public.cash_flow_entries(customer_id);
CREATE INDEX idx_cfe_period ON public.cash_flow_entries(period_id);

-- 8) business_goals
CREATE TABLE public.business_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.business_financial_periods(id) ON DELETE SET NULL,
  goal_type text NOT NULL,
  target_value numeric,
  current_value numeric,
  goal_label text,
  status text NOT NULL DEFAULT 'on_track',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bg_customer ON public.business_goals(customer_id);

-- 9) business_health_snapshots
CREATE TABLE public.business_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.business_financial_periods(id) ON DELETE SET NULL,
  overall_condition text,
  business_health_score numeric,
  revenue_stability_score numeric,
  margin_health_score numeric,
  payroll_load_score numeric,
  expense_control_score numeric,
  cash_visibility_score numeric,
  receivables_risk_score numeric,
  owner_dependency_signal_score numeric,
  top_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  revenue_leak_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  data_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  rgs_recommended_next_step text,
  owner_summary text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bhs_customer ON public.business_health_snapshots(customer_id);
CREATE INDEX idx_bhs_period ON public.business_health_snapshots(period_id);

-- 11) financial_imports
CREATE TABLE public.financial_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  period_id uuid REFERENCES public.business_financial_periods(id) ON DELETE SET NULL,
  import_type text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  file_name text,
  status text NOT NULL DEFAULT 'pending',
  row_count numeric,
  error_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fi_customer ON public.financial_imports(customer_id);

-- ============================================================
-- updated_at triggers (uses existing public.touch_updated_at)
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'business_financial_periods','financial_categories','revenue_entries',
    'expense_entries','payroll_entries','labor_entries','invoice_entries',
    'cash_flow_entries','business_goals','business_health_snapshots','financial_imports'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- Enable RLS + policies (admin manage all; client manage own via customers.user_id)
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'business_financial_periods','financial_categories','revenue_entries',
    'expense_entries','payroll_entries','labor_entries','invoice_entries',
    'cash_flow_entries','business_goals','business_health_snapshots','financial_imports'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format($f$
      CREATE POLICY "Admins manage all on %1$s"
      ON public.%1$I
      FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()))
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Clients view own on %1$s"
      ON public.%1$I
      FOR SELECT
      USING (
        customer_id IS NOT NULL
        AND public.user_owns_customer(auth.uid(), customer_id)
      )
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Clients insert own on %1$s"
      ON public.%1$I
      FOR INSERT
      WITH CHECK (
        customer_id IS NOT NULL
        AND public.user_owns_customer(auth.uid(), customer_id)
      )
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Clients update own on %1$s"
      ON public.%1$I
      FOR UPDATE
      USING (
        customer_id IS NOT NULL
        AND public.user_owns_customer(auth.uid(), customer_id)
      )
      WITH CHECK (
        customer_id IS NOT NULL
        AND public.user_owns_customer(auth.uid(), customer_id)
      )
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Clients delete own on %1$s"
      ON public.%1$I
      FOR DELETE
      USING (
        customer_id IS NOT NULL
        AND public.user_owns_customer(auth.uid(), customer_id)
      )
    $f$, t);
  END LOOP;
END $$;