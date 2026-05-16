# P106 — Production Dockerfile for the external Remotion render worker.
# Node 20 + Chromium + ffmpeg are required for headless Remotion renders.
FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    REMOTION_DISABLE_TELEMETRY=true

RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium ffmpeg fonts-liberation libnss3 libatk-bridge2.0-0 \
      libxkbcommon0 libgbm1 libasound2 libpangocairo-1.0-0 \
      libxcomposite1 libxdamage1 libxrandr2 libgtk-3-0 \
      ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --omit=dev=false --no-audit --no-fund
COPY src ./src
RUN npx tsc -p tsconfig.json

# Service-role key, REMOTION_WORKER_SHARED_SECRET, etc. are injected
# at runtime by the host (Fly secrets, Railway vars, etc.) — never baked in.
CMD ["node", "--enable-source-maps", "dist/index.js"]