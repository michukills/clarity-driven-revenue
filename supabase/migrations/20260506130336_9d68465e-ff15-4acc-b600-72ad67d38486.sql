
CREATE TABLE IF NOT EXISTS public.rgs_timeline_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  reminder_key TEXT NOT NULL,
  reminder_label TEXT NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'admin_tracked',
  related_workflow TEXT,
  related_route TEXT,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  client_visible BOOLEAN NOT NULL DEFAULT false,
  client_safe_message TEXT,
  admin_notes TEXT,
  completed_by UUID,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rgs_timeline_reminders_customer
  ON public.rgs_timeline_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_rgs_timeline_reminders_due
  ON public.rgs_timeline_reminders(due_at)
  WHERE status <> 'completed';

ALTER TABLE public.rgs_timeline_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage timeline reminders" ON public.rgs_timeline_reminders;
CREATE POLICY "admins manage timeline reminders"
  ON public.rgs_timeline_reminders
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "clients read own visible reminders" ON public.rgs_timeline_reminders;
CREATE POLICY "clients read own visible reminders"
  ON public.rgs_timeline_reminders
  FOR SELECT
  TO authenticated
  USING (
    client_visible = true
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = rgs_timeline_reminders.customer_id
        AND c.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.update_rgs_timeline_reminders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rgs_timeline_reminders_updated_at ON public.rgs_timeline_reminders;
CREATE TRIGGER trg_rgs_timeline_reminders_updated_at
  BEFORE UPDATE ON public.rgs_timeline_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rgs_timeline_reminders_updated_at();

CREATE OR REPLACE FUNCTION public.get_client_timeline_reminders(_customer_id UUID)
RETURNS TABLE (
  id UUID,
  reminder_key TEXT,
  reminder_label TEXT,
  reminder_type TEXT,
  related_workflow TEXT,
  related_route TEXT,
  due_at TIMESTAMPTZ,
  status TEXT,
  client_safe_message TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.reminder_key,
    r.reminder_label,
    r.reminder_type,
    r.related_workflow,
    r.related_route,
    r.due_at,
    r.status,
    r.client_safe_message,
    r.completed_at,
    r.created_at
  FROM public.rgs_timeline_reminders r
  WHERE r.customer_id = _customer_id
    AND r.client_visible = true
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.id = _customer_id AND c.user_id = auth.uid()
      )
    )
  ORDER BY r.due_at NULLS LAST, r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_client_timeline_reminders(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_timeline_reminders(UUID) TO authenticated;
