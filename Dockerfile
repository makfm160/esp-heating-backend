# 1. Alpine helyett a stabil Debian Slim alapra váltunk (Node 22)
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# 2. Függőségek
FROM base AS deps
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Sima npm install, a Debian alatt nem fog elhasalni
RUN npm install

# 3. Építés
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV DATABASE_URL="postgresql://mock:mock@localhost:5432/mock"
RUN npx prisma generate
RUN npm run build

# 4. Futási környezet
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]