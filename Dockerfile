# eOffice Multi-Stage Docker Build
# Stage 1: Build all apps
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
COPY apps/edocs/package.json apps/edocs/
COPY apps/esheets/package.json apps/esheets/
COPY apps/eslides/package.json apps/eslides/
COPY apps/email/package.json apps/email/
COPY apps/econnect/package.json apps/econnect/
COPY apps/eplanner/package.json apps/eplanner/
COPY apps/enotes/package.json apps/enotes/
COPY apps/edb/package.json apps/edb/
COPY apps/edrive/package.json apps/edrive/
COPY apps/eforms/package.json apps/eforms/
COPY apps/esway/package.json apps/esway/
COPY apps/launcher/package.json apps/launcher/
COPY apps/shared/ apps/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ packages/
COPY apps/ apps/
COPY web/ web/

# Build core package first, then all apps
RUN pnpm --filter @eoffice/core build || true
RUN for app in edocs esheets eslides email econnect eplanner enotes edb edrive eforms esway launcher; do \
      echo "Building $app..." && \
      cd /app/apps/$app && pnpm build || echo "WARN: $app build skipped"; \
    done

# Build server
RUN cd /app/packages/server && pnpm build || true

# Stage 2: Production image
FROM node:20-alpine AS production

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Install production dependencies only
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Copy built server
COPY --from=builder /app/packages/server/dist/ packages/server/dist/
COPY --from=builder /app/packages/core/dist/ packages/core/dist/

# Copy built frontend assets
COPY --from=builder /app/apps/*/dist/ /app/static/
COPY --from=builder /app/web/ /app/web/

# Create data directory
RUN mkdir -p /data/.eoffice

ENV NODE_ENV=production
ENV PORT=3001
ENV EOFFICE_DB_PATH=/data/.eoffice/eoffice.db

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "packages/server/dist/index.js"]
