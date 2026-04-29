
-- =========================================================
-- P20.1 — Client task status + outcome loop
-- =========================================================

-- 1. client_task_activity (status changes, blocker notes, completion notes, admin notes)
CREATE TABLE IF NOT EXISTS public.client_task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_task_id uuid NOT NULL REFERENCES public.client_tasks(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_role text NOT NULL DEFAULT 'client' CHECK (actor_role IN ('client','admin','system')),
  activity_type text NOT NULL CHECK (activity_type IN (
    'status_changed','blocked_note_added','completion_note_added','admin_note_added','released','hidden'
  )),
  from_status text,
  to_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_task_activity_task
  ON public.client_task_activity(client_task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_task_activity_customer
  ON public.client_task_activity(customer_id, created_at DESC);

ALTER TABLE public.client_task_activity ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admin manage task activity"
  ON public.client_task_activity FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Client: SELECT only their own released visible task activity
CREATE POLICY "Client read own task activity"
  ON public.client_task_activity FOR SELECT
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND EXISTS (
      SELECT 1 FROM public.client_tasks t
      WHERE t.id = client_task_id
        AND t.client_visible = true
        AND t.released_at IS NOT NULL
    )
  );

-- Client: INSERT activity only for their own released visible tasks, as themselves, role=client
CREATE POLICY "Client insert own task activity"
  ON public.client_task_activity FOR INSERT
  WITH CHECK (
    public.user_owns_customer(auth.uid(), customer_id)
    AND actor_id = auth.uid()
    AND actor_role = 'client'
    AND EXISTS (
      SELECT 1 FROM public.client_tasks t
      WHERE t.id = client_task_id
        AND t.customer_id = client_task_activity.customer_id
        AND t.client_visible = true
        AND t.released_at IS NOT NULL
    )
  );

-- 2. Allow clients to UPDATE status (and only safe fields) on their own released visible tasks.
--    We add a column-restricted UPDATE policy. Postgres column-level grants combined with RLS:
--    keep RLS gating, then restrict allowed columns via a trigger that blocks edits to any
--    field other than status / updated_at when the actor is not admin.
CREATE POLICY "Client update own released task status"
  ON public.client_tasks FOR UPDATE
  USING (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND released_at IS NOT NULL
  )
  WITH CHECK (
    public.user_owns_customer(auth.uid(), customer_id)
    AND client_visible = true
    AND released_at IS NOT NULL
    AND status IN ('open','in_progress','blocked','done')
  );

-- Guard trigger: non-admin updaters can only change `status` and `updated_at`.
CREATE OR REPLACE FUNCTION public.client_tasks_guard_client_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Lock down everything except status; restore OLD values for any other field
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.roadmap_id IS DISTINCT FROM OLD.roadmap_id
     OR NEW.priority_score_id IS DISTINCT FROM OLD.priority_score_id
     OR NEW.rank IS DISTINCT FROM OLD.rank
     OR NEW.issue_title IS DISTINCT FROM OLD.issue_title
     OR NEW.why_it_matters IS DISTINCT FROM OLD.why_it_matters
     OR NEW.evidence_summary IS DISTINCT FROM OLD.evidence_summary
     OR NEW.priority_band IS DISTINCT FROM OLD.priority_band
     OR NEW.expected_outcome IS DISTINCT FROM OLD.expected_outcome
     OR NEW.next_step IS DISTINCT FROM OLD.next_step
     OR NEW.client_visible IS DISTINCT FROM OLD.client_visible
     OR NEW.released_at IS DISTINCT FROM OLD.released_at
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'clients may only update status on their tasks';
  END IF;

  IF NEW.status NOT IN ('open','in_progress','blocked','done') THEN
    RAISE EXCEPTION 'invalid client status';
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_tasks_guard_client_update ON public.client_tasks;
CREATE TRIGGER trg_client_tasks_guard_client_update
  BEFORE UPDATE ON public.client_tasks
  FOR EACH ROW EXECUTE FUNCTION public.client_tasks_guard_client_update();

-- 3. Extend recommendation_outcomes for the admin review loop.
ALTER TABLE public.recommendation_outcomes
  ADD COLUMN IF NOT EXISTS roadmap_id uuid REFERENCES public.execution_roadmaps(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority_score_id uuid REFERENCES public.priority_engine_scores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS outcome_status text NOT NULL DEFAULT 'pending_review'
    CHECK (outcome_status IN ('pending_review','outcome_validated','outcome_rejected','needs_follow_up')),
  ADD COLUMN IF NOT EXISTS client_completion_note text,
  ADD COLUMN IF NOT EXISTS admin_measured_result text,
  ADD COLUMN IF NOT EXISTS admin_impact_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contributes_same_industry boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contributes_cross_industry boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS industry_learning_event_id uuid REFERENCES public.industry_learning_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cross_industry_learning_event_id uuid REFERENCES public.cross_industry_learning_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Allow nullable outcome to support pending drafts (legacy CHECK kept for non-null values)
ALTER TABLE public.recommendation_outcomes
  ALTER COLUMN outcome DROP NOT NULL;

DROP TRIGGER IF EXISTS trg_recommendation_outcomes_touch ON public.recommendation_outcomes;
CREATE TRIGGER trg_recommendation_outcomes_touch
  BEFORE UPDATE ON public.recommendation_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_recommendation_outcomes_customer_status
  ON public.recommendation_outcomes(customer_id, outcome_status);
CREATE INDEX IF NOT EXISTS idx_recommendation_outcomes_task
  ON public.recommendation_outcomes(client_task_id);

-- Unique outcome draft per (customer, client_task) to keep idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uq_recommendation_outcomes_task
  ON public.recommendation_outcomes(client_task_id)
  WHERE client_task_id IS NOT NULL;

-- 4. Trigger: when a client_task transitions to 'done', upsert a pending outcome draft.
CREATE OR REPLACE FUNCTION public.client_tasks_create_outcome_on_done()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_rec uuid;
BEGIN
  IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'done') THEN
    SELECT source_recommendation_id INTO v_source_rec
      FROM public.priority_engine_scores
      WHERE id = NEW.priority_score_id;

    INSERT INTO public.recommendation_outcomes (
      customer_id, client_task_id, roadmap_id, priority_score_id,
      source_recommendation_id, outcome_status, completed_at, recorded_by
    )
    VALUES (
      NEW.customer_id, NEW.id, NEW.roadmap_id, NEW.priority_score_id,
      v_source_rec, 'pending_review', now(), auth.uid()
    )
    ON CONFLICT (client_task_id) DO UPDATE
      SET completed_at = COALESCE(public.recommendation_outcomes.completed_at, now()),
          outcome_status = CASE
            WHEN public.recommendation_outcomes.outcome_status IN ('outcome_validated','outcome_rejected')
              THEN public.recommendation_outcomes.outcome_status
            ELSE 'pending_review'
          END,
          updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_tasks_create_outcome_on_done ON public.client_tasks;
CREATE TRIGGER trg_client_tasks_create_outcome_on_done
  AFTER INSERT OR UPDATE OF status ON public.client_tasks
  FOR EACH ROW EXECUTE FUNCTION public.client_tasks_create_outcome_on_done();
