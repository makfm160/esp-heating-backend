# 1. Teljes értékű Node 20 (Debian slim alap), nem Alpine!
FROM node:20-slim AS builder
WORKDIR /app

# Telepítjük a Prismához szükséges alapvető rendszercsomagokat
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

# Függőségek telepítése
RUN npm install --legacy-peer-deps

# Most már biztonságosan lefut a generálás, mert a Debian alatt stabil a Prisma motorja
RUN DATABASE_URL=postgresql://localhost:5432/db npx prisma generate

COPY . .

# Letöröljük a .env-et a build idejére
RUN rm -f .env

# Lefuttatjuk a Next.js buildet
RUN DATABASE_URL=postgresql://localhost:5432/db npm run build

# 2. Futási fázis (szintén a stabil Debian slim alapon)
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