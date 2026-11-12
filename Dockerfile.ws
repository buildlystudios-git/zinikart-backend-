# 1. Base stage
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 2. Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 3. Runner stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-deprecation"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 wsuser

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN chown -R wsuser:nodejs /app
USER wsuser

EXPOSE 3001
ENV WS_PORT=3001

CMD ["pnpm", "start:chat"]

