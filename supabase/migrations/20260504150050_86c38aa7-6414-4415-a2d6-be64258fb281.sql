
CREATE TYPE public.walkthrough_video_status AS ENUM (
  'not_started', 'planned', 'recorded', 'uploaded', 'approved', 'archived'
);

CREATE TYPE public.walkthrough_caption_format AS ENUM (
  'plain_text', 'srt', 'vtt'
);

CREATE TABLE public.tool_walkthrough_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_key TEXT NOT NULL,
  title TEXT NOT NULL,
  short_description TEXT,
  video_url TEXT,
  embed_url TEXT,
  video_status public.walkthrough_video_status NOT NULL DEFAULT 'not_started',
  transcript TEXT,
  captions TEXT,
  caption_format public.walkthrough_caption_format,
  duration_seconds INTEGER,
  client_visible BOOLEAN NOT NULL DEFAULT false,
  internal_notes TEXT,
  archived_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tool_walkthrough_videos_tool_key ON public.tool_walkthrough_videos(tool_key);
CREATE INDEX idx_tool_walkthrough_videos_status ON public.tool_walkthrough_videos(video_status);

ALTER TABLE public.tool_walkthrough_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tool walkthrough videos"
  ON public.tool_walkthrough_videos
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER touch_tool_walkthrough_videos_updated_at
  BEFORE UPDATE ON public.tool_walkthrough_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.get_client_tool_walkthrough_videos()
RETURNS TABLE (
  id UUID,
  tool_key TEXT,
  title TEXT,
  short_description TEXT,
  video_url TEXT,
  embed_url TEXT,
  transcript TEXT,
  captions TEXT,
  caption_format public.walkthrough_caption_format,
  duration_seconds INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id, v.tool_key, v.title, v.short_description,
    v.video_url, v.embed_url, v.transcript, v.captions,
    v.caption_format, v.duration_seconds
  FROM public.tool_walkthrough_videos v
  WHERE auth.uid() IS NOT NULL
    AND v.video_status = 'approved'
    AND v.client_visible = true
    AND v.archived_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_tool_walkthrough_videos() TO authenticated;
