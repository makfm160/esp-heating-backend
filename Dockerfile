# 1. Alapkép frissítése a legújabb Node 22-es LTS-re Alpine Linuxon
FROM node:22-alpine AS base

# 2. Függőségek telepítése + Prisma szükséges Linux csomagok (openssl)
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl openssl-dev dumb-init
WORKDIR /app

# Csak a csomaglistákat és a Prisma sémát másoljuk be a cache-elés miatt
COPY package*.json ./
COPY prisma ./prisma/

# Függőségek telepítése (a Prisma postinstall scriptje így már sikeresen lefut)
RUN npm install

# 3. Forráskód másolása és a Next.js build futtatása
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ha van Prisma séma, generáljuk le a klienst, majd buildeljük a Next.js-t
RUN npx prisma generate
RUN npm run build

# 4. Produkciós környezet összeállítása (Minimalista végső konténer)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# A standalone build használata, amit a next.config.ts-ben beállítottunk
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]