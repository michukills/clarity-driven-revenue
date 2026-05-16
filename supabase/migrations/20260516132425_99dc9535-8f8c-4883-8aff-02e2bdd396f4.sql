-- P98 — Campaign Video Engine Phase 1 schema

CREATE TABLE IF NOT EXISTS public.campaign_video_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_scope text NOT NULL DEFAULT 'customer',
  customer_id uuid NULL,
  rgs_workspace_key text NULL,
  campaign_brief_id uuid NULL,
  campaign_asset_id uuid NOT NULL,
  title text NULL,
  format text NOT NULL DEFAULT 'vertical_short_form',
  aspect_ratio text NULL,
  duration_seconds_min integer NULL,
  duration_seconds_max integer NULL,
  video_status text NOT NULL DEFAULT 'outline_draft',
  approval_status text NOT NULL DEFAULT 'draft',
  manual_publish_status text NOT NULL DEFAULT 'not_ready',
  outline jsonb NULL,
  scene_plan jsonb NULL,
  ai_confidence_level text NULL,
  ai_confidence_reason text NULL,
  missing_inputs text[] NOT NULL DEFAULT '{}',
  risk_warnings text[] NOT NULL DEFAULT '{}',
  human_review_checklist text[] NOT NULL DEFAULT '{}',
  claim_safety_notes text NULL,
  admin_notes text NULL,
  client_safe_summary text NULL,
  error_message text NULL,
  archived boolean NOT NULL DEFAULT false,
  created_by uuid NULL,
  reviewed_by uuid NULL,
  approved_by uuid NULL,
  approved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_video_projects_workspace_scope_chk
    CHECK (workspace_scope IN ('customer','rgs_internal')),
  CONSTRAINT campaign_video_projects_workspace_owner_chk CHECK (
    (workspace_scope = 'customer' AND customer_id IS NOT NULL)
    OR (workspace_scope = 'rgs_internal' AND rgs_workspace_key IS NOT NULL)
  ),
  CONSTRAINT campaign_video_projects_format_chk CHECK (
    format IN ('vertical_short_form','square_social','landscape_web')
  ),
  CONSTRAINT campaign_video_projects_video_status_chk CHECK (
    video_status IN (
      'not_started','outline_draft','scene_plan_ready',
      'render_queued','render_in_progress','render_draft_ready',
      'render_failed','render_setup_required','needs_revision',
      'approved','ready_for_manual_export','manual_publish_ready','archived'
    )
  ),
  CONSTRAINT campaign_video_projects_approval_chk CHECK (
    approval_status IN ('draft','needs_review','approved','rejected','archived')
  ),
  CONSTRAINT campaign_video_projects_publish_chk CHECK (
    manual_publish_status IN ('not_ready','ready_for_manual_export','manual_publish_ready','archived')
  ),
  CONSTRAINT campaign_video_projects_confidence_chk CHECK (
    ai_confidence_level IS NULL OR ai_confidence_level IN ('low','medium','high')
  )
);

CREATE INDEX IF NOT EXISTS idx_cvp_customer ON public.campaign_video_projects (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cvp_asset ON public.campaign_video_projects (campaign_asset_id);

ALTER TABLE public.campaign_video_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaign video projects"
  ON public.campaign_video_projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers view own campaign video projects"
  ON public.campaign_video_projects FOR SELECT TO authenticated
  USING (
    workspace_scope = 'customer'
    AND customer_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = campaign_video_projects.customer_id
        AND c.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.campaign_video_render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_video_project_id uuid NOT NULL REFERENCES public.campaign_video_projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'setup_required',
  output_storage_bucket text NULL,
  output_storage_path text NULL,
  error_message text NULL,
  requested_by uuid NULL,
  started_at timestamptz NULL,
  finished_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_video_render_jobs_status_chk CHECK (
    status IN ('queued','in_progress','draft_ready','failed','setup_required')
  )
);

CREATE INDEX IF NOT EXISTS idx_cvrj_project ON public.campaign_video_render_jobs (campaign_video_project_id, created_at DESC);

ALTER TABLE public.campaign_video_render_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaign video render jobs"
  ON public.campaign_video_render_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers view render jobs for their projects"
  ON public.campaign_video_render_jobs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_video_projects p
      JOIN public.customers c ON c.id = p.customer_id
      WHERE p.id = campaign_video_render_jobs.campaign_video_project_id
        AND p.workspace_scope = 'customer'
        AND c.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.campaign_video_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_video_project_id uuid NOT NULL REFERENCES public.campaign_video_projects(id) ON DELETE CASCADE,
  actor_user_id uuid NULL,
  action text NOT NULL,
  prior_status text NULL,
  new_status text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_video_reviews_action_chk CHECK (
    action IN (
      'request_revision','approve','reject','archive',
      'mark_ready_for_export','mark_manual_publish_ready','mark_exported','note'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_cvr_project ON public.campaign_video_reviews (campaign_video_project_id, created_at DESC);

ALTER TABLE public.campaign_video_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaign video reviews"
  ON public.campaign_video_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_cvp_updated_at
  BEFORE UPDATE ON public.campaign_video_projects
  FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

CREATE TRIGGER trg_cvrj_updated_at
  BEFORE UPDATE ON public.campaign_video_render_jobs
  FOR EACH ROW EXECUTE FUNCTION public.campaign_touch_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-video-assets', 'campaign-video-assets', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read campaign video assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'campaign-video-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write campaign video assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'campaign-video-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update campaign video assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'campaign-video-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete campaign video assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'campaign-video-assets' AND public.has_role(auth.uid(), 'admin'));
