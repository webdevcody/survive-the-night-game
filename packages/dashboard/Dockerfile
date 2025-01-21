FROM node:20-slim AS base

FROM base AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json* ./
COPY packages/game-shared/package.json ./packages/game-shared/
COPY packages/game-client/package.json ./packages/game-client/
COPY packages/dashboard/package.json ./packages/dashboard/

# Install dependencies
RUN npm ci

# Copy source files
COPY packages/game-shared ./packages/game-shared
COPY packages/game-client ./packages/game-client
COPY packages/dashboard ./packages/dashboard

WORKDIR /app/packages/dashboard

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/packages/dashboard/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/packages/dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/dashboard/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/packages/dashboard/run.sh ./run.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ./run.sh