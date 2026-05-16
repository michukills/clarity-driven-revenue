-- P99 — extend campaign_video_render_jobs with optional worker-reported metadata.
ALTER TABLE public.campaign_video_render_jobs
  ADD COLUMN IF NOT EXISTS bytes bigint NULL,
  ADD COLUMN IF NOT EXISTS mime_type text NULL,
  ADD COLUMN IF NOT EXISTS duration_seconds_actual numeric NULL,
  ADD COLUMN IF NOT EXISTS worker_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_worker_error text NULL;

CREATE INDEX IF NOT EXISTS idx_cvrj_status_queued
  ON public.campaign_video_render_jobs (status, created_at)
  WHERE status = 'queued';