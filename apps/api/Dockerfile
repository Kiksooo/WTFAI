# Образ с Node и FFmpeg для генерации видео
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# В монорепо lockfile в корне; здесь только package.json — используем npm install
COPY package.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
