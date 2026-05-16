# RGS Remotion Render Worker

External Node 20 worker that produces real MP4 renders for the RGS Campaign Video Engine. **Not deployed inside Lovable** — Edge Functions run Deno and cannot host Chromium + ffmpeg for headless Remotion rendering.

## Flow

1. Worker polls `campaign-video-render-claim` with `x-remotion-worker-secret`.
2. Receives `{ render_job_id, scene_plan, output: { bucket, path } }`.
3. Renders MP4 via Remotion (Node + Chromium + ffmpeg).
4. Uploads to private bucket `campaign-video-assets` at `{customer_id}/{video_project_id}/{render_job_id}.mp4`.
5. POSTs to `campaign-video-render-callback` with success + metadata, or failure + safe one-line error.

The worker is the only component holding the service-role key and `REMOTION_WORKER_SHARED_SECRET`. Neither is ever shipped to the browser.

## Environment

Copy `.env.example` to `.env`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REMOTION_WORKER_SHARED_SECRET`
- `POLL_INTERVAL_MS` (optional, default 15000)
- `MAX_RENDER_SECONDS` (optional, default 300)

## Recommended deployment — Fly.io

```bash
cd worker/remotion-render-worker
fly launch --no-deploy
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... REMOTION_WORKER_SHARED_SECRET=...
fly deploy
```

Dockerfile must install `chromium` and `ffmpeg`. On Alpine: `chromium freetype harfbuzz ttf-freefont nss`.

## Alternatives

Railway, Render.com (Background Worker), Google Cloud Run.

## RGS-side configuration

Add the matching runtime secret to Lovable Cloud:

- `REMOTION_WORKER_SHARED_SECRET`

The three edge functions deploy automatically. They activate the moment the secret is set and a worker starts polling.

## What this worker NEVER does

- Post / schedule / publish to any platform
- Touch another customer's data
- Receive admin notes or internal AI prompts
- Mark a video approved or manual-publish-ready
- Write to a public bucket
