-- P70 — Tool-Specific Report PDF storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('tool-reports', 'tool-reports', false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tool_report_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  report_draft_id uuid NOT NULL REFERENCES public.report_drafts(id) ON DELETE CASCADE,
  tool_key text NOT NULL,
  tool_name text NOT NULL,
  service_lane text NOT NULL,
  source_record_id uuid,
  source_record_type text,
  version integer NOT NULL DEFAULT 1,
  storage_bucket text NOT NULL DEFAULT 'tool-reports',
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  size_bytes integer,
  client_visible boolean NOT NULL DEFAULT false,
  generated_by uuid,
  generated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (storage_bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_tool_report_artifacts_customer
  ON public.tool_report_artifacts (customer_id);
CREATE INDEX IF NOT EXISTS idx_tool_report_artifacts_draft
  ON public.tool_report_artifacts (report_draft_id);
CREATE INDEX IF NOT EXISTS idx_tool_report_artifacts_tool
  ON public.tool_report_artifacts (tool_key);

CREATE TRIGGER tool_report_artifacts_touch
  BEFORE UPDATE ON public.tool_report_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.tool_report_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tool report artifacts"
  ON public.tool_report_artifacts FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Customers read approved own tool report artifacts"
  ON public.tool_report_artifacts FOR SELECT
  USING (
    archived_at IS NULL
    AND client_visible = true
    AND EXISTS (
      SELECT 1 FROM public.customers c
       WHERE c.id = tool_report_artifacts.customer_id
         AND c.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.report_drafts d
       WHERE d.id = tool_report_artifacts.report_draft_id
         AND d.status = 'approved'
         AND d.client_safe = true
    )
  );

CREATE POLICY "Admins read tool reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tool-reports' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins write tool reports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'tool-reports' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update tool reports"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'tool-reports' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'tool-reports' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete tool reports"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'tool-reports' AND public.is_admin(auth.uid()));

CREATE POLICY "Customers read approved own tool report objects"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'tool-reports'
    AND EXISTS (
      SELECT 1
        FROM public.tool_report_artifacts a
        JOIN public.customers c ON c.id = a.customer_id
        JOIN public.report_drafts d ON d.id = a.report_draft_id
       WHERE a.storage_bucket = 'tool-reports'
         AND a.storage_path = storage.objects.name
         AND a.client_visible = true
         AND a.archived_at IS NULL
         AND d.status = 'approved'
         AND d.client_safe = true
         AND c.user_id = auth.uid()
    )
  );