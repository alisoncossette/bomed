# ─── Build stage ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
RUN npm i -g pnpm@10

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

RUN pnpm install --frozen-lockfile
RUN npx prisma generate

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}
RUN pnpm run build

# ─── Production stage ───────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080

CMD ["sh", "-c", "npx prisma db push --skip-generate && node server.js"]
