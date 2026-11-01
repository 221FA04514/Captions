# Production Dockerfile for Bujjigadu Subtitle Studio
FROM node:20-bookworm-slim

# Install FFmpeg, libass, Fontconfig, and Telugu / Indic / Noto fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libass-dev \
    fonts-noto-core \
    fonts-noto-ui-core \
    fonts-deva \
    fonts-telu \
    fonts-telu-extra \
    fontconfig \
    ca-certificates \
    && fc-cache -f -v \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root and workspace manifests
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies cleanly
RUN npm ci

# Copy application source
COPY shared ./shared
COPY server ./server
COPY client ./client

# Build both backend (tsc) and frontend (vite)
RUN npm run build

# Configure production environment
ENV NODE_ENV=production
ENV PORT=10000
ENV HOST=0.0.0.0

EXPOSE 10000

# Start unified server (Express serves both /api and client/dist)
CMD ["node", "server/dist/server/src/server.js"]

