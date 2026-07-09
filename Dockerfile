# 1. Építési fázis
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN rm -f .env

# Most már a jó verziókkal ez a sor is tökéletesen le fog futni a felhőben!
RUN DATABASE_URL=postgresql://localhost:5432/db npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN DATABASE_URL=postgresql://localhost:5432/db npm run build

# 2. Futási fázis
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "node_modules/.bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]