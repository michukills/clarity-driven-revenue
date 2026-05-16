-- P106 — dead-letter + worker telemetry for campaign video render jobs
ALTER TABLE public.campaign_video_render_jobs
  ADD COLUMN IF NOT EXISTS max_worker_attempts integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS dead_lettered_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS dead_letter_reason text NULL,
  ADD COLUMN IF NOT EXISTS worker_id text NULL,
  ADD COLUMN IF NOT EXISTS render_runtime_version text NULL;

-- Extend the status check constraint to include 'dead_lettered'
ALTER TABLE public.campaign_video_render_jobs
  DROP CONSTRAINT IF EXISTS campaign_video_render_jobs_status_chk;

ALTER TABLE public.campaign_video_render_jobs
  ADD CONSTRAINT campaign_video_render_jobs_status_chk CHECK (
    status IN ('queued','in_progress','draft_ready','failed','setup_required','dead_lettered')
  );