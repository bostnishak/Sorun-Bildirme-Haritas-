# ─── Stage 1: Builder ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm install --legacy-peer-deps

COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY shared/ ../shared/

RUN npm run db:generate
RUN npm run build

# ─── Stage 2: Production ──────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache openssl dumb-init

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma


EXPOSE 3001

# Run migrations then start
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && dumb-init node dist/index.js"]
