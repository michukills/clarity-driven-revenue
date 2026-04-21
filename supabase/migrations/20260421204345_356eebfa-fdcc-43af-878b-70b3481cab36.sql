
-- 1) Expand pipeline_stage enum with new diagnostic + dual-track values
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'discovery_completed';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'proposal_sent';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'diagnostic_paid';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'decision_pending';
-- Diagnostic-only track
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'diagnostic_complete';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'follow_up_nurture';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'closed';
-- Implementation track
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'implementation_added';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'implementation_onboarding';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'tools_assigned';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'client_training_setup';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'implementation_active';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'waiting_on_client';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'review_revision_window';
ALTER TYPE public.pipeline_stage ADD VALUE IF NOT EXISTS 'implementation_complete';

-- 2) Add status + workflow fields on customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS track text NOT NULL DEFAULT 'shared',
  ADD COLUMN IF NOT EXISTS diagnostic_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS implementation_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS implementation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_unlocked boolean NOT NULL DEFAULT false;

-- 3) Tasks
CREATE TABLE IF NOT EXISTS public.customer_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.customer_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tasks" ON public.customer_tasks
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Customers view own tasks" ON public.customer_tasks
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_tasks.customer_id AND c.user_id = auth.uid()
  ));

-- 4) Implementation checklist items per customer
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage checklist" ON public.checklist_items
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Customers view own checklist" ON public.checklist_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = checklist_items.customer_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Customers update own checklist completion" ON public.checklist_items
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = checklist_items.customer_id AND c.user_id = auth.uid()
  ));

-- 5) Timeline (per-customer activity feed)
CREATE TABLE IF NOT EXISTS public.customer_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  detail text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage timeline" ON public.customer_timeline
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Customers view own timeline" ON public.customer_timeline
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_timeline.customer_id AND c.user_id = auth.uid()
  ));

-- 6) Customer file uploads (separate from internal admin files)
CREATE TABLE IF NOT EXISTS public.customer_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  uploaded_by uuid,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_url text,
  size_bytes integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage customer uploads" ON public.customer_uploads
  FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Customers view own uploads" ON public.customer_uploads
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_uploads.customer_id AND c.user_id = auth.uid()
  ));
CREATE POLICY "Customers create own uploads" ON public.customer_uploads
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_uploads.customer_id AND c.user_id = auth.uid()
  ));

-- 7) Storage bucket for customer uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-uploads', 'client-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read client uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-uploads' AND public.is_admin(auth.uid()));

CREATE POLICY "Customers read own uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'client-uploads'
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  );

CREATE POLICY "Customers upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'client-uploads'
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  );

CREATE POLICY "Admins write client uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-uploads' AND public.is_admin(auth.uid()));

-- 8) Auto-handler: when customers.stage moves to implementation_added,
-- unlock portal, set track + status, seed default implementation checklist,
-- and log timeline events.
CREATE OR REPLACE FUNCTION public.handle_customer_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_items text[] := ARRAY[
    'Kickoff call scheduled',
    'Workspace created and shared',
    'Login credentials delivered',
    'Initial tools assigned',
    'Onboarding worksheet completed',
    'Process map reviewed',
    'First implementation milestone',
    'Mid-implementation review',
    'Final review and handoff'
  ];
  item text;
  pos int := 0;
BEGIN
  -- Always update last_activity_at on any change
  NEW.last_activity_at := now();

  -- Detect transition into implementation_added
  IF NEW.stage = 'implementation_added' AND (OLD.stage IS DISTINCT FROM 'implementation_added') THEN
    NEW.track := 'implementation';
    NEW.implementation_status := 'onboarding';
    NEW.portal_unlocked := true;
    NEW.implementation_started_at := COALESCE(NEW.implementation_started_at, now());
    NEW.next_action := COALESCE(NEW.next_action, 'Send onboarding email and assign tools');

    -- Seed default checklist (only if none exist)
    IF NOT EXISTS (SELECT 1 FROM public.checklist_items WHERE customer_id = NEW.id) THEN
      FOREACH item IN ARRAY default_items LOOP
        INSERT INTO public.checklist_items (customer_id, title, position)
        VALUES (NEW.id, item, pos);
        pos := pos + 1;
      END LOOP;
    END IF;

    INSERT INTO public.customer_timeline (customer_id, event_type, title, detail)
    VALUES (NEW.id, 'implementation_started', 'Implementation add-on activated',
            'Workspace unlocked, default checklist created, ready for tool assignment.');
  END IF;

  -- Track diagnostic-only completion
  IF NEW.stage IN ('diagnostic_complete','follow_up_nurture') AND NEW.track = 'shared' THEN
    NEW.track := 'diagnostic_only';
  END IF;

  -- Log generic stage change
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.customer_timeline (customer_id, event_type, title, detail)
    VALUES (NEW.id, 'stage_change', 'Stage updated',
            COALESCE(OLD.stage::text, 'none') || ' → ' || NEW.stage::text);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_stage_change ON public.customers;
CREATE TRIGGER trg_customer_stage_change
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_customer_stage_change();

-- 9) Update touch_updated_at usage on new tables
DROP TRIGGER IF EXISTS trg_tasks_updated ON public.customer_tasks;
DROP TRIGGER IF EXISTS trg_checklist_updated ON public.checklist_items;

-- 10) Realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_timeline;
