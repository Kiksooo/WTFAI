# Сборка API с FFmpeg. Railway при пустом Root Directory ищет именно Dockerfile в корне.
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps ./apps
RUN npm ci --workspace=api

WORKDIR /app/apps/api
RUN npx prisma generate && npm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
