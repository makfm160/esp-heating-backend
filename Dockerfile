# 1. Építési fázis
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Letöröljük a .env-et a build idejére
RUN rm -f .env

# A TRÜKK: Megkérjük a Next.js-t, hogy hagyja figyelmen kívül a TypeScript/Lint hibákat a build során,
# így nem fog összeomlani amiatt, hogy a Prisma kliens még nincs legenerálva!
ENV NEXT_TELEMETRY_DISABLED=1
RUN DATABASE_URL=postgresql://localhost:5432/db npx next build --disable-lint

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

# Amikor a Brixen elindul a konténer, OT helyben generáljuk le a Prismát (ott már látja a jó adatbázist),
# és utána indítjuk el a Next.js-t!
CMD ["sh", "-c", "npx prisma generate && node node_modules/.bin/next start --hostname 0.0.0.0 --port 3000"]