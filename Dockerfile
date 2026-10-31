# syntax=docker/dockerfile:1
# One Dockerfile, three uses (docs/guides/docker.md):
#   dev      the toolchain for compose.dev.yaml (the repo is bind-mounted at /app)
#   build    installs, builds the game (dist/) and bundles the server (dist-server/)
#   runtime  the production image for compose.yaml: Node, the built game, the server, the migrations
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app

FROM base AS dev
# The named node_modules volume copies this folder's ownership when it's first created.
RUN mkdir -p /app/node_modules && chown -R node:node /app
COPY --chmod=755 docker/dev-entrypoint.sh /usr/local/bin/dev-entrypoint
USER node
ENTRYPOINT ["dev-entrypoint"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM base AS build
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm run build:server

FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    STATIC_DIR=/app/dist \
    MIGRATIONS_DIR=/app/migrations
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/server/db/migrations ./migrations
USER node
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "--enable-source-maps", "dist-server/index.mjs"]
