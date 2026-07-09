FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat openssl openssl-dev dumb-init
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# A PRISMA_CLI_BINARY_TARGETS segít az Alpine Linuxnak, 
# az --ignore-scripts pedig megakadályozza, hogy az npm install alatt fusson el a Prisma
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
RUN npm install --ignore-scripts

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Itt generáljuk le tisztán a Prismát, egy kamu DATABASE_URL-lel, 
# hogy a build fázisban ne keressen valódi adatbázist
ENV DATABASE_URL="postgresql://mock:mock@localhost:5432/mock"
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]