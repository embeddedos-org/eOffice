FROM node:20-alpine AS base
LABEL maintainer="embeddedos-org" description="Office Suite — EoS Enterprise"

WORKDIR /app
COPY package*.json ./
RUN npm install -g pnpm && pnpm install --prod && chown -R node:node /app
COPY . .

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:8080/health || exit 1
CMD ["node", "server.js"]
