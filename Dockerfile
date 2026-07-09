FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./

# Telepítjük az openssl-t az Alpine-ra, ami az újabb Prisma verziókhoz KÖTELEZŐ
RUN apk add --no-cache openssl

COPY prisma ./prisma/

# Ha a 'mybooks'-nál működik az npm ci, itt is működnie kell, de ha mégis elakadna, 
# az npm install --legacy-peer-deps-szel kivédjük a verzió-ütközéseket
RUN npm install --legacy-peer-deps

ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
RUN DATABASE_URL=postgresql://localhost:5432/db ./node_modules/.bin/prisma generate
COPY . .

# Letöröljük a bemásolt .env-et a build idejére, hogy a Next.js véletlenül se tudja beolvasni
RUN rm -f .env

# Átverjük a Next.js-t a build fázisban egy minimális stringgel
RUN DATABASE_URL=postgresql://localhost:5432/db npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Szükséges futtatási függőség az Alpine-hoz a futtató fázisban is
RUN apk add --no-cache openssl

# Csak a kész, lefordított fájlokat és a szükséges node_modules-t visszük át a tiszta képbe
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

# A padlófűtés backend a 3000-es porton fog figyelni
EXPOSE 3000
CMD ["node", "node_modules/.bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
#CMD ["npx", "next", "start", "--hostname", "0.0.0.0", "--port", "3000"]