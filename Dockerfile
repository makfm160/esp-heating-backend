FROM node:20-alpine AS builder
WORKDIR /app

# Szükséges Linux csomagok az Alpine-hoz
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

# Telepítjük a csomagokat (ez helyben lefut)
RUN npm install --legacy-peer-deps

COPY . .

# Letöröljük a .env-et, ha be lett volna másolva
RUN rm -f .env

# KIKAPCSOLJUK a Prisma ellenőrzést a Next.js build idejére
ENV NEXT_TELEMETRY_DISABLED=1
ENV PRISMA_CLIENT_ENGINE_TYPE='binary'

# Lefordítjuk a Next.js-t Prisma generálás nélkül
RUN DATABASE_URL=postgresql://localhost:5432/db npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# A futtató környezetnek is kell az openssl a Prisma miatt
RUN apk add --no-cache openssl

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

EXPOSE 3000

# A TRÜKK: Indításkor generáljuk le a Prismát, majd indítjuk a Next.js-t!
CMD ["sh", "-c", "npx prisma generate && node node_modules/.bin/next start --hostname 0.0.0.0 --port 3000"]