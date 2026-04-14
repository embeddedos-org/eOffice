# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
COPY packages/core/package.json packages/core/
COPY packages/ebot-client/package.json packages/ebot-client/
COPY packages/server/package.json packages/server/
COPY apps/launcher/package.json apps/launcher/
COPY apps/edocs/package.json apps/edocs/
COPY apps/enotes/package.json apps/enotes/
RUN npm install -g pnpm && pnpm install --workspace=packages/core --workspace=packages/ebot-client --workspace=packages/server --workspace=apps/launcher --workspace=apps/edocs --workspace=apps/enotes
COPY . .
RUN pnpm run build --filter=@eoffice/core
RUN pnpm run build --filter=@eoffice/ebot-client
RUN pnpm run build --filter=@eoffice/server
RUN pnpm run build --filter=@eoffice/launcher
RUN pnpm run build --filter=@eoffice/edocs
RUN pnpm run build --filter=@eoffice/enotes

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/server/dist ./server/
COPY --from=builder /app/apps/launcher/dist ./public/launcher/
COPY --from=builder /app/apps/edocs/dist ./public/edocs/
COPY --from=builder /app/apps/enotes/dist ./public/enotes/
COPY --from=builder /app/packages/server/package.json ./
RUN npm install -g pnpm && pnpm install --prod
EXPOSE 3001
CMD ["node", "server/index.js"]
