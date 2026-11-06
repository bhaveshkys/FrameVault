# Multi-stage Dockerfile for FrameVault Web Application
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.18.0 --activate

FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/figma-plugin/package.json ./apps/figma-plugin/

RUN pnpm install --frozen-lockfile

COPY . .

# Build both Figma plugin and web application
ENV NODE_ENV=production
RUN pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy package and node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/apps/figma-plugin/dist ./apps/figma-plugin/dist

# Expose port
EXPOSE 3000

# Mount persistent data volume for screenshots and store
VOLUME ["/app/apps/web/public/uploads", "/app/apps/web/.data"]

WORKDIR /app/apps/web
CMD ["node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
